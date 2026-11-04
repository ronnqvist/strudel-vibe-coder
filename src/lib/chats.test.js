// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { CHATS_KEY, CURRENT_CHAT_KEY, createChat, loadInitialChats, removeChat, resetChats } from './chats';

const store = (data) => ({ getItem: (k) => (k in data ? data[k] : null) });
const chat = (id) => ({ id, name: id, messages: [], createdAt: '2025-11-27T00:00:00.000Z' });

describe('loadInitialChats', () => {
    it('creates one chat when storage is empty', () => {
        const { chats, currentId } = loadInitialChats(store({}));
        expect(chats).toHaveLength(1);
        expect(currentId).toBe(chats[0].id);
    });

    it('keeps stored chats and the stored current id', () => {
        const data = { [CHATS_KEY]: JSON.stringify([chat('a'), chat('b')]), [CURRENT_CHAT_KEY]: 'b' };
        expect(loadInitialChats(store(data))).toEqual({ chats: [chat('a'), chat('b')], currentId: 'b' });
    });

    it('repairs the string "null" stored by older builds', () => {
        const data = { [CHATS_KEY]: JSON.stringify([chat('a')]), [CURRENT_CHAT_KEY]: 'null' };
        expect(loadInitialChats(store(data)).currentId).toBe('a');
    });

    it('falls back to the first chat when the stored id no longer exists', () => {
        const data = { [CHATS_KEY]: JSON.stringify([chat('a'), chat('b')]), [CURRENT_CHAT_KEY]: 'gone' };
        expect(loadInitialChats(store(data)).currentId).toBe('a');
    });

    it('survives corrupt JSON and non-array data', () => {
        expect(loadInitialChats(store({ [CHATS_KEY]: '{oops' })).chats).toHaveLength(1);
        expect(loadInitialChats(store({ [CHATS_KEY]: '{"a":1}' })).chats).toHaveLength(1);
    });

    it('drops entries that are not chats but keeps the rest unchanged', () => {
        const data = { [CHATS_KEY]: JSON.stringify([null, { id: 1 }, chat('ok')]) };
        expect(loadInitialChats(store(data)).chats).toEqual([chat('ok')]);
    });
});

describe('removeChat', () => {
    it('keeps the current chat when another one is removed', () => {
        expect(removeChat([chat('a'), chat('b')], 'a', 'b')).toEqual({ chats: [chat('a')], currentId: 'a' });
    });

    it('moves to the first remaining chat when the current one is removed', () => {
        expect(removeChat([chat('a'), chat('b'), chat('c')], 'b', 'b').currentId).toBe('a');
    });

    it('creates a fresh chat when the last chat is removed', () => {
        const { chats, currentId } = removeChat([chat('a')], 'a', 'a');
        expect(chats).toHaveLength(1);
        expect(chats[0].id).not.toBe('a');
        expect(currentId).toBe(chats[0].id);
    });
});

describe('resetChats / createChat', () => {
    it('resetChats returns exactly one empty current chat', () => {
        const { chats, currentId } = resetChats();
        expect(chats).toHaveLength(1);
        expect(chats[0].messages).toEqual([]);
        expect(currentId).toBe(chats[0].id);
    });

    it('createChat uses the default name and a unique id', () => {
        expect(createChat().name).toBe('New Chat');
        expect(createChat().id).not.toBe(createChat().id);
    });
});
