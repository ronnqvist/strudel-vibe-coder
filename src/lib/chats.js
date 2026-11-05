// SPDX-License-Identifier: MIT
import { generateId } from './utils';

export const CHATS_KEY = 'openrouter_chats';
export const CURRENT_CHAT_KEY = 'openrouter_current_chat_id';

/**
 * @typedef {{ id?: string, role: 'user' | 'assistant', content: string, code?: string | null, model?: string,
 *   status?: string, stopped?: boolean, truncated?: boolean, finishReason?: string, error?: string, usage?: object,
 *   revisionId?: string }} ChatMessage
 * @typedef {{ id: string, name: string, messages: ChatMessage[], createdAt: string,
 *   revisions?: import('./revisions').Revision[], selectedRevisionId?: string | null, previousRevisionId?: string | null }} Chat
 *
 * Every field added after the first version is optional, and older fields keep their meaning, so
 * chats saved by any version load in any other version.
 */

export const DEFAULT_CHAT_NAME = 'New Chat';

/** @returns {Chat} */
export function createChat() {
    return {
        id: generateId(),
        name: DEFAULT_CHAT_NAME,
        messages: [],
        createdAt: new Date().toISOString(),
    };
}

/**
 * Read chats from storage once, at startup. Always returns at least one chat and
 * a current id that exists. Handles missing or corrupt data, and the string "null"
 * that older builds stored as the current id after the last chat was deleted.
 * @param {Pick<Storage, 'getItem'>} [storage]
 * @returns {{ chats: Chat[], currentId: string }}
 */
export function loadInitialChats(storage = localStorage) {
    let chats = [];
    try {
        const saved = storage.getItem(CHATS_KEY);
        if (saved) chats = JSON.parse(saved);
    } catch {
        chats = [];
    }
    if (!Array.isArray(chats)) chats = [];
    chats = chats.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)).map(c => withMessageIds(c));

    if (chats.length === 0) {
        const chat = createChat();
        return { chats: [chat], currentId: chat.id };
    }
    const stored = storage.getItem(CURRENT_CHAT_KEY);
    const currentId = chats.some(c => c.id === stored) ? stored : chats[0].id;
    return { chats, currentId };
}

/**
 * Remove one chat. If it was the current chat the first remaining chat becomes
 * current; if none remain a fresh chat is created, so there is always a chat.
 * @param {Chat[]} chats
 * @param {string} currentId
 * @param {string} removeId
 * @returns {{ chats: Chat[], currentId: string }}
 */
export function removeChat(chats, currentId, removeId) {
    const remaining = chats.filter(c => c.id !== removeId);
    if (remaining.length === 0) return resetChats();
    const stillThere = remaining.some(c => c.id === currentId);
    return { chats: remaining, currentId: stillThere ? currentId : remaining[0].id };
}

/** All chats deleted: start over with one empty chat. */
export function resetChats() {
    const chat = createChat();
    return { chats: [chat], currentId: chat.id };
}

/**
 * The chat with an id on every message (messages saved by earlier versions have none).
 * Returns the same object when nothing was missing.
 * @param {Chat} chat
 * @param {() => string} [makeId]
 */
export function withMessageIds(chat, makeId = generateId) {
    if (chat.messages.every(m => typeof m?.id === 'string' && m.id)) return chat;
    return { ...chat, messages: chat.messages.map(m => (typeof m?.id === 'string' && m.id ? m : { ...m, id: makeId() })) };
}

/**
 * State changes for one chat. They take the chat as it is *now* (use them inside a functional
 * update), so a change made while a request was running (an edit, a rename) is never overwritten
 * by a copy taken when the request started.
 */

/** @param {Chat} chat @param {ChatMessage} message */
export function appendMessage(chat, message) {
    return { ...chat, messages: [...chat.messages, message] };
}

/** @param {Chat} chat @param {string} id @param {Partial<ChatMessage>} patch */
export function updateMessage(chat, id, patch) {
    if (!chat.messages.some(m => m.id === id)) return chat;
    return { ...chat, messages: chat.messages.map(m => (m.id === id ? { ...m, ...patch } : m)) };
}

/** True for a name the app gave the chat itself (not one the user chose). */
export function hasDefaultName(chat) {
    return chat.name === DEFAULT_CHAT_NAME || chat.name.startsWith('Chat ');
}

/**
 * Name a chat after its first message, unless the user has named it.
 * @param {Chat} chat
 * @param {string} text the first message
 */
export function nameAfterFirstMessage(chat, text) {
    if (!hasDefaultName(chat) || chat.messages.filter(m => m.role === 'user').length !== 1) return chat;
    return { ...chat, name: text.slice(0, 30) + (text.length > 30 ? '...' : '') };
}
