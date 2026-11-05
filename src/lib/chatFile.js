// SPDX-License-Identifier: MIT
import { generateId } from './utils';

/**
 * Chat backup files.
 *
 * Version 2 (current): `{ format, version: 2, exportedAt, chats: [...] }`, for one chat or many.
 * Before version 2 the app wrote a bare chat object (export of one chat) or a bare array of chats
 * (export of all chats). Both still import.
 *
 * Importing never trusts the file: each chat and message is rebuilt from the fields the app knows,
 * entries that cannot be shown are skipped (and counted), and every chat gets a fresh id so an
 * import can never overwrite or merge with an existing chat.
 */
export const CHAT_FILE_FORMAT = 'strudel-vibe-coder-chats';
export const CHAT_FILE_VERSION = 2;

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

function cleanMessage(m) {
    if (!isObject(m) || !ROLES.has(m.role) || typeof m.content !== 'string') return null;
    const message = { role: m.role, content: m.content };
    if (typeof m.code === 'string' || m.code === null) message.code = m.code;
    if (typeof m.model === 'string') message.model = m.model;
    if (m.stopped === true) message.stopped = true;
    if (m.truncated === true) message.truncated = true;
    return message;
}

function cleanChat(c, now, makeId) {
    if (!isObject(c) || !Array.isArray(c.messages)) return null;
    const messages = [];
    let skipped = 0;
    for (const m of c.messages) {
        const clean = cleanMessage(m);
        if (clean) messages.push(clean);
        else skipped++;
    }
    const name = typeof c.name === 'string' ? c.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    const created = typeof c.createdAt === 'string' && !Number.isNaN(Date.parse(c.createdAt)) ? c.createdAt : now.toISOString();
    return {
        chat: { id: makeId(), name: name || `Imported ${now.toLocaleTimeString()}`, messages, createdAt: created },
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
