// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from 'vitest';
import { appReferer, takeKeyFromHash } from './urlKey';

function fakeWindow(hash, { pathname = '/strudel-vibe-coder/', search = '' } = {}) {
    return {
        location: { hash, pathname, search },
        history: { state: { s: 1 }, replaceState: vi.fn() },
    };
}

describe('takeKeyFromHash', () => {
    it('returns the key and removes the hash from the address, keeping path and query', () => {
        const win = fakeWindow('#sk-or-v1-abc123', { search: '?lang=en' });
        expect(takeKeyFromHash(win)).toBe('sk-or-v1-abc123');
        expect(win.history.replaceState).toHaveBeenCalledOnce();
        expect(win.history.replaceState).toHaveBeenCalledWith({ s: 1 }, '', '/strudel-vibe-coder/?lang=en');
    });

    it('decodes a percent-encoded key', () => {
        expect(takeKeyFromHash(fakeWindow('#sk-or-v1-a%2Bb%3D'))).toBe('sk-or-v1-a+b=');
    });

    it('uses a key as it is when it is not valid percent-encoding', () => {
        expect(takeKeyFromHash(fakeWindow('#sk-or-v1-100%'))).toBe('sk-or-v1-100%');
    });

    it('leaves other hashes and an empty hash untouched', () => {
        for (const hash of ['', '#', '#section', '#sk-or-v2-nope', '#SK-OR-V1-upper']) {
            const win = fakeWindow(hash);
            expect(takeKeyFromHash(win)).toBe('');
            expect(win.history.replaceState).not.toHaveBeenCalled();
        }
    });

    it('still returns the key when replaceState is not allowed', () => {
        const win = fakeWindow('#sk-or-v1-abc');
        win.history.replaceState = () => { throw new Error('SecurityError'); };
        expect(takeKeyFromHash(win)).toBe('sk-or-v1-abc');
    });

    it('returns an empty string without a window', () => {
        expect(takeKeyFromHash(undefined)).toBe('');
    });
});

describe('appReferer', () => {
    it('is origin plus path, without query or hash', () => {
        expect(appReferer({ origin: 'https://ronnqvist.github.io', pathname: '/strudel-vibe-coder/', search: '?a=1', hash: '#sk-or-v1-x' }))
            .toBe('https://ronnqvist.github.io/strudel-vibe-coder/');
    });
});
