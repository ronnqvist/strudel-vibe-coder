// SPDX-License-Identifier: MIT
import { generateId } from './utils';
import { stripAttribution } from './extractCode';

/**
 * Pattern revisions: the patterns a chat has put on the stage.
 *
 * Each chat keeps its own list of revisions and its own selection, and the stage shows the
 * selected revision of the chat being viewed. A reply that finishes in another chat adds a
 * revision to that chat only.
 *
 * A revision stores the exact code that was validated and played (see preparePattern), so it does
 * not change when a chat message is edited later. Revisions are created when a pattern is
 * loaded, never back-filled for old messages, so storage grows only with what was played.
 *
 * Pure functions; use them inside a functional chat update.
 */

/**
 * @typedef {'reply' | 'message' | 'edited' | 'legacy' | 'starter'} RevisionOrigin
 *   reply:   loaded automatically from a completed reply
 *   message: loaded from a chat message with "Use this version"
 *   edited:  pasted by the user (code edited in the Strudel editor, which does not sync back)
 *   legacy:  the pattern an earlier version of the app had in the player
 *   starter: the welcome pattern of a first visit (not sent to the model as the pattern to change)
 * @typedef {{ id: string, code: string, origin: RevisionOrigin, messageId?: string, model?: string,
 *   repaired?: true, createdAt: string }} Revision
 * @typedef {import('./chats').Chat} Chat
 */

export const REVISION_ORIGINS = ['reply', 'message', 'edited', 'legacy', 'starter'];

/** Revisions kept per chat (the selected and the previous one are always kept as well). */
export const MAX_REVISIONS = 50;

/** @param {Chat | undefined} chat @returns {Revision | null} */
export function selectedRevision(chat) {
    if (!chat?.selectedRevisionId || !Array.isArray(chat.revisions)) return null;
    return chat.revisions.find(r => r.id === chat.selectedRevisionId) ?? null;
}

/** @param {Chat | undefined} chat @returns {Revision | null} */
export function previousRevision(chat) {
    if (!chat?.previousRevisionId || !Array.isArray(chat.revisions)) return null;
    return chat.revisions.find(r => r.id === chat.previousRevisionId) ?? null;
}

/** The code on the stage for this chat ('' when it has none). */
export function stageCode(chat) {
    return selectedRevision(chat)?.code ?? '';
}

/**
 * Select a revision. The one selected before becomes "previous", for "Restore previous".
 * @param {Chat} chat
 * @param {string} id
 */
export function selectRevision(chat, id) {
    if (chat.selectedRevisionId === id || !chat.revisions?.some(r => r.id === id)) return chat;
    return { ...chat, selectedRevisionId: id, previousRevisionId: chat.selectedRevisionId ?? null };
}

/** Go back to the revision selected before the current one (pressing it again goes forward). */
export function restorePrevious(chat) {
    const previous = previousRevision(chat);
    if (!previous) return chat;
    return { ...chat, selectedRevisionId: previous.id, previousRevisionId: chat.selectedRevisionId ?? null };
}

function trim(revisions, keep) {
    if (revisions.length <= MAX_REVISIONS) return revisions;
    const excess = revisions.length - MAX_REVISIONS;
    let dropped = 0;
    return revisions.filter(r => {
        if (dropped >= excess || keep.has(r.id)) return true;
        dropped++;
        return false;
    });
}

/**
 * Put `code` on this chat's stage. Reuses an existing revision with identical code (and selects it)
 * instead of storing a copy.
 *
 * @param {Chat} chat
 * @param {{ code: string, origin: RevisionOrigin, messageId?: string, model?: string, repaired?: boolean }} input
 * @param {{ makeId?: () => string, now?: Date }} [options]
 * @returns {{ chat: Chat, revision: Revision }}
 */
export function addRevision(chat, { code, origin, messageId, model, repaired }, { makeId = generateId, now = new Date() } = {}) {
    const revisions = Array.isArray(chat.revisions) ? chat.revisions : [];
    const existing = revisions.find(r => r.code === code);
    if (existing) {
        // Same code again, from another message: reuse the revision and point it at that message
        const moved = messageId && existing.messageId !== messageId
            ? { ...existing, messageId, origin, ...(model && { model }) }
            : existing;
        const next = moved === existing ? chat : { ...chat, revisions: revisions.map(r => (r.id === existing.id ? moved : r)) };
        return { chat: selectRevision(next, existing.id), revision: moved };
    }

    const revision = {
        id: makeId(),
        code,
        origin,
        ...(messageId && { messageId }),
        ...(model && { model }),
        ...(repaired && { repaired: true }),
        createdAt: now.toISOString(),
    };
    const previous = chat.selectedRevisionId ?? null;
    const keep = new Set([revision.id, previous].filter(Boolean));
    return {
        chat: { ...chat, revisions: trim([...revisions, revision], keep), selectedRevisionId: revision.id, previousRevisionId: previous },
        revision,
    };
}

/**
 * Migration of the single global pattern of earlier versions (`openrouter_current_code`): if it
 * differs from what this chat has on its stage, it becomes this chat's selected revision.
 * Idempotent, because the app keeps writing that key with the active chat's stage code: the two
 * differ only after an earlier version ran (including a rollback and a return to this version).
 *
 * @param {Chat} chat
 * @param {string | null | undefined} code
 * @param {{ makeId?: () => string, now?: Date }} [options]
 */
export function adoptLegacyCode(chat, code, options) {
    if (!code || !code.trim() || stageCode(chat) === code) return chat;
    return addRevision(chat, { code, origin: 'legacy' }, options).chat;
}

/**
 * The code to tell the model about as "the pattern in the player", or ''. The untouched starter
 * pattern of a first visit is left out, and so is the app's attribution line, so that a model
 * revising another model's pattern does not copy the old attribution.
 */
export function patternForRequest(chat) {
    const revision = selectedRevision(chat);
    if (!revision) return '';
    // The untouched starter of a first visit is not the user's pattern. Once the chat has messages,
    // a starter on stage (for example after "Restore previous") was put there on purpose.
    const untouchedStarter = revision.origin === 'starter' && !chat.messages?.some(m => m.role === 'user');
    return untouchedStarter ? '' : stripAttribution(revision.code);
}

/**
 * A message's code was edited: its revisions no longer show what it says, so they stop pointing
 * at it (the pattern on stage stays as it is; "Use this version" makes the edited code a revision).
 * @param {Chat} chat
 * @param {string} messageId
 */
export function detachMessage(chat, messageId) {
    if (!chat.revisions?.some(r => r.messageId === messageId)) return chat;
    return {
        ...chat,
        revisions: chat.revisions.map(r => {
            if (r.messageId !== messageId) return r;
            const copy = { ...r };
            delete copy.messageId;
            return copy;
        }),
    };
}
