import { describe, expect, it } from 'vitest';
import { extractCode, formatDate, generateId } from './utils';

describe('generateId', () => {
    it('returns a non-empty alphanumeric string', () => {
        expect(generateId()).toMatch(/^[a-z0-9]+$/);
    });

    it('returns different values on successive calls', () => {
        const ids = new Set(Array.from({ length: 100 }, generateId));
        expect(ids.size).toBe(100);
    });
});

describe('formatDate', () => {
    it('returns an empty string for missing input', () => {
        expect(formatDate(undefined)).toBe('');
        expect(formatDate('')).toBe('');
    });

    it('formats an ISO date string', () => {
        const iso = '2025-11-27T12:00:00.000Z';
        expect(formatDate(iso)).toBe(new Date(iso).toLocaleString());
    });
});

describe('extractCode (current behaviour)', () => {
    it('extracts the first fenced js block', () => {
        expect(extractCode('Here:\n```js\ns("bd sd")\n```\n')).toBe('s("bd sd")');
    });

    it('returns an empty string when there is no fence', () => {
        expect(extractCode('no code here')).toBe('');
        expect(extractCode('')).toBe('');
    });
});
