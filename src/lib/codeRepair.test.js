// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { repairTypography } from './codeRepair';

describe('repairTypography', () => {
    it('turns curly quotes used as delimiters into straight ones', () => {
        expect(repairTypography('s(“bd sd”)')).toBe('s("bd sd")');
        expect(repairTypography('s(‘bd’)')).toBe("s('bd')");
        expect(repairTypography('s(“bd sd”).bank(‘RolandTR909’)')).toBe('s("bd sd").bank(\'RolandTR909\')');
    });

    it('keeps what is inside a curly-quoted string', () => {
        expect(repairTypography('s(“it’s a – b”)')).toBe('s("it’s a – b")');
    });

    it('leaves straight-quoted strings, template literals and comments untouched', () => {
        const code = 'const a = "He said “hi” – ok"; const b = \'‘x’\'; const c = `bd “x” — sd`; // it’s — fine\n/* “block” – */ s(“hh”)';
        expect(repairTypography(code)).toBe('const a = "He said “hi” – ok"; const b = \'‘x’\'; const c = `bd “x” — sd`; // it’s — fine\n/* “block” – */ s("hh")');
    });

    it('turns en and em dashes in code into a minus', () => {
        expect(repairTypography('gain(1 – 0.5).pan(1 — 0.2)')).toBe('gain(1 - 0.5).pan(1 - 0.2)');
    });

    it('respects escapes inside straight strings', () => {
        expect(repairTypography('s("a \\" “b”") + s(“c”)')).toBe('s("a \\" “b”") + s("c")');
    });

    it('does not run a curly string past the end of its line', () => {
        expect(repairTypography('s(“bd)\ns(“sd”)')).toBe('s("bd)\ns("sd")');
    });

    it('changes nothing else', () => {
        for (const code of ['', 's("bd")', 'ä ö å € 🎵', '// “only a comment”']) expect(repairTypography(code)).toBe(code);
        expect(repairTypography(undefined)).toBe('');
    });
});
