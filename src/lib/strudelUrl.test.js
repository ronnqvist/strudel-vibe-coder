import { describe, expect, it } from 'vitest';
import {
    MAX_URL_LENGTH,
    STRUDEL_ORIGIN,
    decodeStrudelHash,
    encodeStrudelHash,
    normalizeTypography,
    shortHash,
    strudelUrl,
} from './strudelUrl';

describe('encodeStrudelHash / decodeStrudelHash', () => {
    it('round-trips ASCII code', () => {
        const code = 'note("c e g").s("piano")\n$: s("bd sd")';
        expect(decodeStrudelHash(encodeStrudelHash(code))).toBe(code);
    });

    it('round-trips Unicode, including astral-plane characters', () => {
        const code = '// ä ö å € — “smart quotes” 🎵\ns("bd sd")';
        expect(decodeStrudelHash(encodeStrudelHash(code))).toBe(code);
    });

    it('encodes UTF-8 bytes (what strudel.cc decodes), not Latin-1', () => {
        // "ä" is C3 A4 in UTF-8 -> base64 "w6Q="
        expect(encodeStrudelHash('ä')).toBe(encodeURIComponent('w6Q='));
    });

    it('escapes base64 characters that are special in URLs', () => {
        const encoded = encodeStrudelHash('~~~>>>???');
        expect(encoded).not.toMatch(/[+/=]/);
        expect(decodeStrudelHash(encoded)).toBe('~~~>>>???');
    });

    it('handles empty and missing input', () => {
        expect(encodeStrudelHash('')).toBe('');
        expect(encodeStrudelHash(undefined)).toBe('');
        expect(decodeStrudelHash('')).toBe('');
    });

    it('accepts a leading # when decoding', () => {
        expect(decodeStrudelHash('#' + encodeStrudelHash('s("bd")'))).toBe('s("bd")');
    });

    it('round-trips very long input (1 MB)', () => {
        const code = 's("bd sd hh oh")\n'.repeat(60_000);
        expect(code.length).toBeGreaterThan(1_000_000);
        expect(decodeStrudelHash(encodeStrudelHash(code))).toBe(code);
    });
});

describe('normalizeTypography', () => {
    it('replaces smart quotes and dashes, keeps everything else', () => {
        expect(normalizeTypography('s(“bd”) ‘x’ a–b a—b ä 🎵')).toBe('s("bd") \'x\' a-b a-b ä 🎵');
    });

    it('returns an empty string for missing input', () => {
        expect(normalizeTypography(undefined)).toBe('');
    });
});

describe('strudelUrl', () => {
    it('points at strudel.cc and decodes back to the normalised code', () => {
        const url = strudelUrl('s(“bd sd”)');
        expect(url.startsWith(`${STRUDEL_ORIGIN}/#`)).toBe(true);
        expect(decodeStrudelHash(new URL(url).hash)).toBe('s("bd sd")');
    });

    it('exceeds MAX_URL_LENGTH for oversized code, so the player can refuse it', () => {
        const big = 'x'.repeat(Math.ceil(MAX_URL_LENGTH * 0.75) + 10);
        expect(strudelUrl(big).length).toBeGreaterThan(MAX_URL_LENGTH);
        expect(strudelUrl('s("bd")').length).toBeLessThan(MAX_URL_LENGTH);
    });
});

describe('shortHash', () => {
    it('is stable, 8 hex digits, and differs for different input', () => {
        expect(shortHash('s("bd")')).toMatch(/^[0-9a-f]{8}$/);
        expect(shortHash('s("bd")')).toBe(shortHash('s("bd")'));
        expect(shortHash('s("bd")')).not.toBe(shortHash('s("sd")'));
        expect(shortHash('')).toBe('811c9dc5');
    });
});
