// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import {
    MAX_URL_LENGTH,
    STRUDEL_ORIGIN,
    decodeStrudelHash,
    encodeStrudelHash,
    shortHash,
    strudelUrl,
} from './strudelUrl';
import { patternSyntaxError } from './patternCheck';

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

describe('strudelUrl', () => {
    const played = (code) => decodeStrudelHash(new URL(strudelUrl(code)).hash);

    it('points at strudel.cc and decodes back to exactly the code it was given', () => {
        const url = strudelUrl('s("bd sd")');
        expect(url.startsWith(`${STRUDEL_ORIGIN}/#`)).toBe(true);
        expect(played('s("bd sd")')).toBe('s("bd sd")');
    });

    // #6: the URL used to be built from "normalised" code, after the code had been validated
    it('is lossless: decode(encode(x)) === x for any text', () => {
        const corpus = [
            's("A–B")', '// em — dash, en – dash\ns("bd")', "n('‘x’')", 'const label = "He said “hi”"',
            'ä ö å € 🎵', '\u0000\uFFFF', 'a\r\nb\rc', 'e\u0301 (combining)', '𝄞 𝕊 \u{1F3B9}', '\t  trailing  ',
            '`multi\nline “mini” notation`',
        ];
        for (const x of corpus) expect(played(x), JSON.stringify(x)).toBe(x);
        // and a run of every code point class in steps, as one string
        let all = '';
        for (let cp = 0; cp < 0x110000; cp += 997) if (cp < 0xd800 || cp > 0xdfff) all += String.fromCodePoint(cp);
        expect(played(all)).toBe(all);
    });

    it('code that validates stays valid once encoded for the player', async () => {
        const code = 'const label = "He said “hi”"; s("bd")';
        expect(await patternSyntaxError(code)).toBeNull();
        expect(await patternSyntaxError(played(code))).toBeNull();
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
