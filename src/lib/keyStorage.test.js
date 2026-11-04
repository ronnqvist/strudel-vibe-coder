// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import {
    API_KEY_STORAGE_KEY,
    REMEMBER_KEY_STORAGE_KEY,
    loadApiKey,
    persistApiKey,
    persistRemember,
    readRemember,
} from './keyStorage';

function memoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        data,
        getItem: (k) => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
    };
}

describe('readRemember', () => {
    it('is on by default, so keys stored by earlier versions keep working', () => {
        expect(readRemember(memoryStorage())).toBe(true);
        expect(readRemember(memoryStorage({ [API_KEY_STORAGE_KEY]: 'sk-or-v1-old' }))).toBe(true);
    });

    it('is off only when the user turned it off', () => {
        expect(readRemember(memoryStorage({ [REMEMBER_KEY_STORAGE_KEY]: 'false' }))).toBe(false);
        expect(readRemember(memoryStorage({ [REMEMBER_KEY_STORAGE_KEY]: 'true' }))).toBe(true);
    });

    it('defaults to on when storage throws', () => {
        expect(readRemember({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
    });
});

describe('loadApiKey', () => {
    it('loads the stored key while remembering is on', () => {
        expect(loadApiKey(memoryStorage({ [API_KEY_STORAGE_KEY]: 'sk-or-v1-old' }))).toBe('sk-or-v1-old');
    });

    it('returns nothing when remembering is off, even if a key is still stored', () => {
        expect(loadApiKey(memoryStorage({ [API_KEY_STORAGE_KEY]: 'sk-or-v1-old', [REMEMBER_KEY_STORAGE_KEY]: 'false' }))).toBe('');
    });

    it('returns an empty string when nothing is stored or storage throws', () => {
        expect(loadApiKey(memoryStorage())).toBe('');
        expect(loadApiKey({ getItem: () => { throw new Error('blocked'); } })).toBe('');
    });
});

describe('persistApiKey', () => {
    it('writes the key while remembering is on', () => {
        const s = memoryStorage();
        persistApiKey(s, 'sk-or-v1-new', true);
        expect(s.data[API_KEY_STORAGE_KEY]).toBe('sk-or-v1-new');
    });

    it('removes the key from storage when remembering is turned off', () => {
        const s = memoryStorage({ [API_KEY_STORAGE_KEY]: 'sk-or-v1-old' });
        persistApiKey(s, 'sk-or-v1-old', false);
        expect(API_KEY_STORAGE_KEY in s.data).toBe(false);
    });

    it('does not throw when storage is unavailable', () => {
        const broken = { setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('full'); } };
        expect(() => persistApiKey(broken, 'k', true)).not.toThrow();
        expect(() => persistApiKey(broken, 'k', false)).not.toThrow();
    });
});

describe('persistRemember', () => {
    it('stores the choice as "true" or "false"', () => {
        const s = memoryStorage();
        persistRemember(s, false);
        expect(s.data[REMEMBER_KEY_STORAGE_KEY]).toBe('false');
        persistRemember(s, true);
        expect(s.data[REMEMBER_KEY_STORAGE_KEY]).toBe('true');
    });
});
