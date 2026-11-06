// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { MAX_REVISIONS, addRevision, adoptLegacyCode, previousRevision, restorePrevious, selectRevision, selectedRevision, stageCode } from './revisions';
import { CHATS_KEY, CURRENT_CHAT_KEY, LEGACY_CODE_KEY, appendMessage, loadInitialChats, updateMessage } from './chats';

const ids = () => { let n = 0; return () => `r${++n}`; };
const now = new Date('2026-11-05T12:00:00.000Z');
const chat = (id = 'a', extra = {}) => ({ id, name: id, messages: [], createdAt: '2026-01-01T00:00:00.000Z', ...extra });
const opts = (makeId = ids()) => ({ makeId, now });

describe('revisions', () => {
    it('a chat without revisions has an empty stage', () => {
        expect(selectedRevision(chat())).toBeNull();
        expect(stageCode(chat())).toBe('');
        expect(stageCode(undefined)).toBe('');
    });

    it('addRevision stores the exact code, selects it, and remembers the previous selection', () => {
        const o = opts();
        const one = addRevision(chat(), { code: 's("bd")', origin: 'reply', messageId: 'm1', model: 'M' }, o);
        expect(one.revision).toEqual({ id: 'r1', code: 's("bd")', origin: 'reply', messageId: 'm1', model: 'M', createdAt: now.toISOString() });
        expect(stageCode(one.chat)).toBe('s("bd")');
        const two = addRevision(one.chat, { code: 's("sd")', origin: 'edited', repaired: true }, o);
        expect(two.revision).toMatchObject({ id: 'r2', repaired: true });
        expect(two.chat.selectedRevisionId).toBe('r2');
        expect(previousRevision(two.chat).code).toBe('s("bd")');
    });

    it('identical code reuses the existing revision instead of storing a copy', () => {
        const o = opts();
        let c = addRevision(chat(), { code: 'x', origin: 'reply' }, o).chat;
        c = addRevision(c, { code: 'y', origin: 'reply' }, o).chat;
        const again = addRevision(c, { code: 'x', origin: 'message' }, o);
        expect(again.revision.id).toBe('r1');
        expect(again.chat.revisions).toHaveLength(2);
        expect(again.chat.selectedRevisionId).toBe('r1');
        expect(again.chat.previousRevisionId).toBe('r2');
    });

    it('selectRevision and restorePrevious move between two revisions; unknown ids are ignored', () => {
        const o = opts();
        let c = addRevision(chat(), { code: 'x', origin: 'reply' }, o).chat;
        c = addRevision(c, { code: 'y', origin: 'reply' }, o).chat;
        c = restorePrevious(c);
        expect(stageCode(c)).toBe('x');
        c = restorePrevious(c);
        expect(stageCode(c)).toBe('y');
        expect(selectRevision(c, 'nope')).toBe(c);
        expect(restorePrevious(chat())).toEqual(chat());
    });

    it(`keeps at most ${MAX_REVISIONS} revisions, never dropping the selected or previous one`, () => {
        const o = opts();
        let c = addRevision(chat(), { code: 'first', origin: 'reply' }, o).chat;
        c = selectRevision(addRevision(c, { code: 'second', origin: 'reply' }, o).chat, 'r1'); // r1 selected, r2 previous
        for (let i = 0; i < MAX_REVISIONS; i++) c = selectRevision(addRevision(c, { code: `p${i}`, origin: 'reply' }, o).chat, 'r1');
        expect(c.revisions.length).toBeLessThanOrEqual(MAX_REVISIONS);
        expect(c.revisions.some(r => r.id === 'r1')).toBe(true);
        expect(c.revisions.some(r => r.id === c.previousRevisionId)).toBe(true);
    });

    it('a reply finishing in a background chat changes only that chat (#7)', () => {
        const o = opts();
        const chats = [chat('a'), addRevision(chat('b'), { code: 'b-pattern', origin: 'reply' }, o).chat];
        // A's reply arrives while B is active: the update is applied to A only
        const next = chats.map(c => (c.id === 'a' ? addRevision(appendMessage(c, { id: 'm', role: 'assistant', content: 'x' }), { code: 'a-pattern', origin: 'reply', messageId: 'm' }, o).chat : c));
        expect(stageCode(next.find(c => c.id === 'b'))).toBe('b-pattern');
        expect(stageCode(next.find(c => c.id === 'a'))).toBe('a-pattern');
    });

    it('an edit made during an in-flight request survives adding the reply and its revision (#7)', () => {
        const o = opts();
        let c = appendMessage(chat('a', { messages: [{ id: '1', role: 'user', content: 'first' }] }), { id: '2', role: 'user', content: 'second' });
        c = updateMessage(c, '1', { content: 'first (edited)' });
        c = addRevision(appendMessage(c, { id: '3', role: 'assistant', content: 'r' }), { code: 'x', origin: 'reply', messageId: '3' }, o).chat;
        expect(c.messages.map(m => m.content)).toEqual(['first (edited)', 'second', 'r']);
        expect(stageCode(c)).toBe('x');
    });
});

describe('migration of the global pattern of earlier versions', () => {
    const store = (data) => ({ getItem: (k) => (k in data ? data[k] : null) });

    it('adoptLegacyCode makes it the selected revision when it differs, and is idempotent', () => {
        const c = adoptLegacyCode(chat(), '$: s("hh*8")', opts());
        expect(selectedRevision(c)).toMatchObject({ code: '$: s("hh*8")', origin: 'legacy' });
        expect(adoptLegacyCode(c, '$: s("hh*8")', opts())).toBe(c);
        expect(adoptLegacyCode(chat(), '', opts())).toEqual(chat());
        expect(adoptLegacyCode(chat(), null, opts())).toEqual(chat());
    });

    it('a rollback that changed the pattern is picked up again, without losing the newer revision', () => {
        let c = addRevision(chat(), { code: 'new', origin: 'reply' }, opts()).chat;
        c = adoptLegacyCode(c, 'set by the old version', opts(() => 'legacy1'));
        expect(stageCode(c)).toBe('set by the old version');
        expect(c.revisions.map(r => r.code)).toEqual(['new', 'set by the old version']);
    });

    it('loadInitialChats gives the current chat the stored pattern, and no other chat', () => {
        const data = {
            [CHATS_KEY]: JSON.stringify([chat('a'), chat('b', { messages: [{ role: 'user', content: 'x' }] })]),
            [CURRENT_CHAT_KEY]: 'b',
            [LEGACY_CODE_KEY]: '$: s("hh*8")',
        };
        const { chats, currentId } = loadInitialChats(store(data));
        expect(currentId).toBe('b');
        expect(stageCode(chats.find(c => c.id === 'b'))).toBe('$: s("hh*8")');
        expect(stageCode(chats.find(c => c.id === 'a'))).toBe('');
        expect(chats.find(c => c.id === 'b').messages[0].content).toBe('x');
    });

    it('a stored pattern without any chats goes into the fresh chat', () => {
        const { chats } = loadInitialChats(store({ [LEGACY_CODE_KEY]: 's("bd")' }));
        expect(stageCode(chats[0])).toBe('s("bd")');
    });
});

describe('starter pattern', () => {
    const store = (data) => ({ getItem: (k) => (k in data ? data[k] : null) });
    it('a first visit starts with the starter pattern on stage; it is not sent as the pattern to change', async () => {
        const { STARTER_PATTERN } = await import('../config');
        const { patternForRequest } = await import('./revisions');
        const { chats } = loadInitialChats(store({}));
        expect(selectedRevision(chats[0])).toMatchObject({ code: STARTER_PATTERN, origin: 'starter' });
        expect(patternForRequest(chats[0])).toBe('');
    });
    it('a returning user with no chats does not get it again', () => {
        const { chats } = loadInitialChats(store({ [CHATS_KEY]: '[]', [CURRENT_CHAT_KEY]: 'x' }));
        expect(stageCode(chats[0])).toBe('');
    });
    it('the starter pattern is valid JavaScript', async () => {
        const { STARTER_PATTERN } = await import('../config');
        const { patternSyntaxError } = await import('./patternCheck');
        expect(await patternSyntaxError(STARTER_PATTERN)).toBeNull();
    });
});

describe('the pattern sent with a request (review F1)', () => {
    it('leaves out the app\'s attribution line, so a different model does not keep the old one', async () => {
        const { patternForRequest } = await import('./revisions');
        const c = addRevision(chat('a', { messages: [{ id: '1', role: 'user', content: 'x' }] }), { code: '// Generated by Model A via https://ronnqvist.github.io/strudel-vibe-coder/\ns("bd")', origin: 'reply' }, opts()).chat;
        expect(patternForRequest(c)).toBe('s("bd")');
    });
});
