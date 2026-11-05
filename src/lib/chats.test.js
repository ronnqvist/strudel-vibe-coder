// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { CHATS_KEY, CURRENT_CHAT_KEY, appendMessage, createChat, loadInitialChats, nameAfterFirstMessage, removeChat, resetChats, updateMessage, withMessageIds } from './chats';

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

    it('gives messages saved by earlier versions an id, and keeps everything else', () => {
        const old = { ...chat('a'), messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y', code: 'y', model: 'M', stopped: true }] };
        const { chats } = loadInitialChats(store({ [CHATS_KEY]: JSON.stringify([old]) }));
        expect(chats[0].messages.map(m => typeof m.id)).toEqual(['string', 'string']);
        expect(chats[0].messages.map((m) => { const copy = { ...m }; delete copy.id; return copy; })).toEqual(old.messages);
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

describe('chat updates applied to the chat as it is now (#7)', () => {
    const ids = () => { let n = 0; return () => `m${++n}`; };

    it('withMessageIds fills in only missing ids and returns the same chat when none are missing', () => {
        const c = { ...chat('a'), messages: [{ id: 'k', role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] };
        expect(withMessageIds(c, ids()).messages.map(m => m.id)).toEqual(['k', 'm1']);
        const complete = withMessageIds(c, ids());
        expect(withMessageIds(complete)).toBe(complete);
    });

    it('an edit made while a request runs survives the reply', () => {
        let state = appendMessage({ ...chat('a'), messages: [{ id: '1', role: 'user', content: 'first' }, { id: '2', role: 'assistant', content: 'r1' }] },
            { id: '3', role: 'user', content: 'second' }); // request starts here
        state = updateMessage(state, '1', { content: 'first (edited)' }); // user edits during generation
        state = appendMessage(state, { id: '4', role: 'assistant', content: 'r2' }); // reply arrives
        expect(state.messages.map(m => m.content)).toEqual(['first (edited)', 'r1', 'second', 'r2']);
    });

    it('a rename made while a request runs survives, and only a default name is replaced', () => {
        let state = appendMessage({ ...chat('a'), name: 'New Chat' }, { id: '1', role: 'user', content: 'acid techno bass with a long description' });
        expect(nameAfterFirstMessage(state, 'acid techno bass with a long description').name).toBe('acid techno bass with a long d...');
        state = { ...state, name: 'Mine' }; // renamed during generation
        expect(nameAfterFirstMessage(appendMessage(state, { id: '2', role: 'assistant', content: 'r' }), 'acid').name).toBe('Mine');
    });

    it('names a chat only after its first message', () => {
        const state = { ...chat('a'), name: 'New Chat', messages: [{ id: '1', role: 'user', content: 'a' }, { id: '2', role: 'assistant', content: 'b' }, { id: '3', role: 'user', content: 'c' }] };
        expect(nameAfterFirstMessage(state, 'c').name).toBe('New Chat');
    });

    it('updateMessage leaves the chat alone when the message is gone', () => {
        const c = chat('a');
        expect(updateMessage(c, 'missing', { content: 'x' })).toBe(c);
    });
});
