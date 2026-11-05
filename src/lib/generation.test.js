// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { STATUSES, announcement, apiConversation, canAutoLoad, messageStatus, notLoadedNotice, replyMessage, statusBadge, withCurrentPattern } from './generation';

describe('canAutoLoad', () => {
    it('allows only a completed reply', () => {
        expect(STATUSES.filter(canAutoLoad)).toEqual(['completed']);
    });
});

describe('statusBadge / notLoadedNotice / announcement', () => {
    it('has a badge for every status except completed', () => {
        expect(statusBadge('completed')).toBeNull();
        for (const s of STATUSES.filter(s => s !== 'completed')) expect(statusBadge(s)?.label).toBeTruthy();
    });
    it('explains why incomplete code was not loaded', () => {
        expect(notLoadedNotice('interrupted')).toMatch(/interrupted.*previous pattern is still loaded/);
        expect(notLoadedNotice('truncated')).toMatch(/cut off/);
        expect(notLoadedNotice('completed')).toBe('');
    });
    it('announces each outcome', () => {
        expect(announcement({ status: 'completed', code: 'x' }, 'loaded')).toBe('Reply received. The pattern was loaded into the player.');
        expect(announcement({ status: 'completed', code: 'x' }, 'invalid')).toMatch(/syntax error/);
        expect(announcement({ status: 'completed', code: null })).toBe('Reply received');
        expect(announcement({ status: 'interrupted' })).toMatch(/interrupted/);
        expect(announcement({ status: 'error', error: { message: 'boom' } })).toBe('Error: boom');
    });
});

describe('messageStatus', () => {
    it('reads status, and the flags and error text of messages saved by earlier versions', () => {
        expect(messageStatus({ role: 'user', content: 'x' })).toBeUndefined();
        expect(messageStatus({ role: 'assistant', content: 'x', status: 'refused' })).toBe('refused');
        expect(messageStatus({ role: 'assistant', content: 'x', truncated: true })).toBe('truncated');
        expect(messageStatus({ role: 'assistant', content: 'x', stopped: true })).toBe('aborted');
        expect(messageStatus({ role: 'assistant', content: 'Error: Invalid key' })).toBe('error');
        expect(messageStatus({ role: 'assistant', content: 'Error: in my code?', model: 'M' })).toBe('completed');
        expect(messageStatus({ role: 'assistant', content: '```js\ns("bd")\n```', model: 'M' })).toBe('completed');
    });
});

describe('apiConversation', () => {
    it('sends role and content of user turns and completed replies only', () => {
        const messages = [
            { id: '1', role: 'user', content: 'a' },
            { id: '2', role: 'assistant', content: 'partial', status: 'interrupted', model: 'M' },
            { id: '3', role: 'assistant', content: 'Error: Invalid key' },
            { id: '4', role: 'user', content: 'b' },
            { id: '5', role: 'assistant', content: 'good', model: 'M', code: 'x' },
        ];
        expect(apiConversation(messages)).toEqual([
            { role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'assistant', content: 'good' },
        ]);
    });
});

describe('replyMessage', () => {
    const base = { content: '```js\ns("bd")\n```', code: 'c', modelLabel: 'M', finishReason: 'stop', error: null, usage: null };
    const id = () => 'id1';
    it('stores status and the flags earlier versions read', () => {
        expect(replyMessage({ ...base, status: 'completed' }, 'X', id)).toEqual({ id: 'id1', role: 'assistant', content: base.content, code: 'c', model: 'M', status: 'completed', finishReason: 'stop' });
        expect(replyMessage({ ...base, status: 'aborted', finishReason: null }, 'X', id)).toMatchObject({ status: 'aborted', stopped: true });
        expect(replyMessage({ ...base, status: 'truncated' }, 'X', id)).toMatchObject({ status: 'truncated', truncated: true });
    });
    it('an error without text becomes a plain "Error:" line without a model, as before', () => {
        const m = replyMessage({ ...base, content: '', code: null, status: 'error', error: { message: 'Invalid key' } }, 'X', id);
        expect(m).toMatchObject({ content: 'Error: Invalid key', status: 'error' });
        expect(m.model).toBeUndefined();
        expect(messageStatus(m)).toBe('error');
    });
    it('an error after some text keeps the text and the error message', () => {
        expect(replyMessage({ ...base, content: 'part', status: 'error', error: { message: 'boom' } }, 'X', id)).toMatchObject({ content: 'part', error: 'boom', model: 'M' });
    });
});

describe('withCurrentPattern', () => {
    const convo = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'slower please' }];
    it('puts the selected pattern before the newest user message, in the request only', () => {
        const out = withCurrentPattern(convo, 's("bd")');
        expect(out.slice(0, 2)).toEqual(convo.slice(0, 2));
        expect(out[2].content).toMatch(/currently in the player[\s\S]*```js\ns\("bd"\)\n```[\s\S]*My request:\nslower please$/);
        expect(convo[2].content).toBe('slower please'); // not mutated
    });
    it('sends the conversation unchanged without a pattern', () => {
        expect(withCurrentPattern(convo, '')).toBe(convo);
        expect(withCurrentPattern(convo, null)).toBe(convo);
    });
});
