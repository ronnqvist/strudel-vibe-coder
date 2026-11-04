// SPDX-License-Identifier: MIT
import { generateId } from './utils';

export const CHATS_KEY = 'openrouter_chats';
export const CURRENT_CHAT_KEY = 'openrouter_current_chat_id';

/**
 * @typedef {{ role: 'user' | 'assistant', content: string, code?: string | null, model?: string }} ChatMessage
 * @typedef {{ id: string, name: string, messages: ChatMessage[], createdAt: string }} Chat
 */

/** @returns {Chat} */
export function createChat() {
    return {
        id: generateId(),
        name: 'New Chat',
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
    chats = chats.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages));

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
