// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { reportSave, saveFailureEpisode, subscribeSaveStatus } from './saveStatus';

describe('saveStatus', () => {
    it('reports a new episode each time saving starts failing, and 0 while it works', () => {
        let calls = 0;
        const unsubscribe = subscribeSaveStatus(() => calls++);
        reportSave(true);
        expect(saveFailureEpisode()).toBe(0);
        reportSave(false);
        const first = saveFailureEpisode();
        expect(first).toBeGreaterThan(0);
        reportSave(false); // still failing: same episode, no notification
        expect(saveFailureEpisode()).toBe(first);
        reportSave(true);
        expect(saveFailureEpisode()).toBe(0);
        reportSave(false);
        expect(saveFailureEpisode()).toBe(first + 1);
        expect(calls).toBe(3);
        unsubscribe();
        reportSave(true);
    });

    it('keeps failing while any saved value fails, so a working chats save does not hide a failed mirror (review G2)', () => {
        reportSave(false, 'current chat');
        reportSave(true); // the chats were saved
        expect(saveFailureEpisode()).toBeGreaterThan(0);
        reportSave(true, 'current chat');
        expect(saveFailureEpisode()).toBe(0);
    });
});
