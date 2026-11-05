// SPDX-License-Identifier: MIT
import { generateId } from './utils';
import { STATUSES } from './generation';
import { MAX_REVISIONS, REVISION_ORIGINS } from './revisions';

/**
 * Chat backup files.
 *
 * Version 3 (current): as version 2, and chats may carry their pattern revisions
 * (`revisions`, `selectedRevisionId`, `previousRevisionId`) and messages their `id`, `status`,
 * `finishReason`, `error`, `usage` and `revisionId`. Earlier versions of the app import a version 3
 * file with a "newer version" note and keep the messages.
 * Version 2: `{ format, version: 2, exportedAt, chats: [...] }`, for one chat or many.
 * Before version 2 the app wrote a bare chat object (export of one chat) or a bare array of chats
 * (export of all chats). Both still import.
 *
 * Importing never trusts the file: each chat and message is rebuilt from the fields the app knows,
 * entries that cannot be shown are skipped (and counted), and every chat gets a fresh id so an
 * import can never overwrite or merge with an existing chat.
 */
export const CHAT_FILE_FORMAT = 'strudel-vibe-coder-chats';
export const CHAT_FILE_VERSION = 3;

/** Largest backup file the import accepts. Chats live in localStorage, which holds only a few MB anyway. */
export const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024;

const MAX_NAME_LENGTH = 200;
const ROLES = new Set(['user', 'assistant']);

/** An error whose message is meant to be shown to the user as it is. */
export class ChatFileError extends Error {}

/**
 * @typedef {import('./chats').Chat} Chat
 * @typedef {{ chats: Chat[], skippedChats: number, skippedMessages: number, version: number, warnings: string[] }} ChatFileResult
 */

/**
 * @param {Chat[]} chats
 * @param {Date} [now]
 */
export function buildExport(chats, now = new Date()) {
    return { format: CHAT_FILE_FORMAT, version: CHAT_FILE_VERSION, exportedAt: now.toISOString(), chats };
}

/**
 * A file name that is safe on every platform. A single-chat export is named after the chat;
 * "export all" is always a dated backup, even when there happens to be only one chat.
 * @param {Chat[]} chats
 * @param {{ all?: boolean, now?: Date }} [options]
 */
export function exportFileName(chats, { all = false, now = new Date() } = {}) {
    if (!all && chats.length === 1) {
        const slug = String(chats[0].name || 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
        return `strudel-chat-${slug || 'chat'}.json`;
    }
    return `strudel-chats-backup-${now.toISOString().slice(0, 10)}.json`;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v);
const shortText = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

function cleanUsage(u) {
    if (!isObject(u)) return undefined;
    const usage = {};
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens', 'cost']) {
        if (typeof u[key] === 'number' && Number.isFinite(u[key])) usage[key] = u[key];
    }
    return Object.keys(usage).length ? usage : undefined;
}

function cleanMessage(m) {
    if (!isObject(m) || !ROLES.has(m.role) || typeof m.content !== 'string') return null;
    const message = { role: m.role, content: m.content };
    if (isId(m.id)) message.id = m.id;
    if (typeof m.code === 'string' || m.code === null) message.code = m.code;
    if (typeof m.model === 'string') message.model = m.model;
    if (STATUSES.includes(m.status)) message.status = m.status;
    const finishReason = shortText(m.finishReason, 40);
    if (finishReason) message.finishReason = finishReason;
    const error = shortText(m.error, 1000);
    if (error) message.error = error;
    const usage = cleanUsage(m.usage);
    if (usage) message.usage = usage;
    if (isId(m.revisionId)) message.revisionId = m.revisionId;
    if (m.stopped === true) message.stopped = true;
    if (m.truncated === true) message.truncated = true;
    return message;
}

function cleanRevision(r, now) {
    if (!isObject(r) || !isId(r.id) || typeof r.code !== 'string' || !REVISION_ORIGINS.includes(r.origin)) return null;
    const revision = { id: r.id, code: r.code, origin: r.origin };
    if (isId(r.messageId)) revision.messageId = r.messageId;
    const model = shortText(r.model, 200);
    if (model) revision.model = model;
    if (r.repaired === true) revision.repaired = true;
    revision.createdAt = typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt)) ? r.createdAt : now.toISOString();
    return revision;
}

/** The revision fields of a chat, cleaned: unknown or duplicate entries dropped, selection kept only if it exists. */
function cleanRevisions(c, now) {
    if (!Array.isArray(c.revisions)) return {};
    const seen = new Set();
    const revisions = [];
    for (const raw of c.revisions) {
        const r = cleanRevision(raw, now);
        if (r && !seen.has(r.id)) {
            seen.add(r.id);
            revisions.push(r);
        }
    }
    const kept = revisions.slice(-MAX_REVISIONS);
    const ids = new Set(kept.map(r => r.id));
    for (const key of ['selectedRevisionId', 'previousRevisionId']) {
        // keep a selected or previous revision even when it is older than the last MAX_REVISIONS
        const r = revisions.find(x => x.id === c[key]);
        if (r && !ids.has(r.id)) { kept.unshift(r); ids.add(r.id); }
    }
    if (kept.length === 0) return {};
    const result = { revisions: kept };
    if (ids.has(c.selectedRevisionId)) result.selectedRevisionId = c.selectedRevisionId;
    if (ids.has(c.previousRevisionId)) result.previousRevisionId = c.previousRevisionId;
    return result;
}

function cleanChat(c, now, makeId) {
    if (!isObject(c) || !Array.isArray(c.messages)) return null;
    const messages = [];
    const messageIds = new Set();
    let skipped = 0;
    for (const m of c.messages) {
        const clean = cleanMessage(m);
        if (!clean) {
            skipped++;
            continue;
        }
        if (clean.id && messageIds.has(clean.id)) delete clean.id; // a fresh one is assigned on import
        if (clean.id) messageIds.add(clean.id);
        messages.push(clean);
    }
    const name = typeof c.name === 'string' ? c.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    const created = typeof c.createdAt === 'string' && !Number.isNaN(Date.parse(c.createdAt)) ? c.createdAt : now.toISOString();
    return {
        chat: { id: makeId(), name: name || `Imported ${now.toLocaleTimeString()}`, messages, createdAt: created, ...cleanRevisions(c, now) },
        skippedMessages: skipped,
    };
}

/**
 * Read a backup file's text.
 * @param {string} text
 * @param {{ now?: Date, makeId?: () => string }} [options]
 * @returns {ChatFileResult}
 * @throws {ChatFileError} when the file is not a chat backup or holds no usable chat
 */
export function parseChatFile(text, { now = new Date(), makeId = generateId } = {}) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new ChatFileError('This file is not valid JSON.');
    }

    let rawChats;
    let version = 1;
    const warnings = [];
    if (Array.isArray(data)) {
        rawChats = data; // legacy "Export All"
    } else if (isObject(data) && data.format === CHAT_FILE_FORMAT && Array.isArray(data.chats)) {
        version = Number.isInteger(data.version) ? data.version : CHAT_FILE_VERSION;
        rawChats = data.chats;
        if (version > CHAT_FILE_VERSION) {
            warnings.push(`This file was made by a newer version of the app (format ${version}); it was imported as far as this version understands it.`);
        }
    } else if (isObject(data) && Array.isArray(data.messages)) {
        rawChats = [data]; // legacy single chat
    } else {
        throw new ChatFileError('This file does not look like a Strudel Vibe Coder chat backup.');
    }

    const chats = [];
    let skippedChats = 0;
    let skippedMessages = 0;
    for (const raw of rawChats) {
        const result = cleanChat(raw, now, makeId);
        if (result) {
            chats.push(result.chat);
            skippedMessages += result.skippedMessages;
        } else {
            skippedChats++;
        }
    }
    if (chats.length === 0) throw new ChatFileError('No chats found in this file.');
    return { chats, skippedChats, skippedMessages, version, warnings };
}

/** One-line summary of an import for the user. */
export function describeImport({ chats, skippedChats, skippedMessages, warnings }) {
    const parts = [`Imported ${chats.length} chat${chats.length === 1 ? '' : 's'}.`];
    const skipped = [];
    if (skippedChats) skipped.push(`${skippedChats} chat${skippedChats === 1 ? '' : 's'}`);
    if (skippedMessages) skipped.push(`${skippedMessages} message${skippedMessages === 1 ? '' : 's'}`);
    if (skipped.length) parts.push(`Skipped ${skipped.join(' and ')} that could not be read.`);
    return [...parts, ...warnings].join(' ');
}
