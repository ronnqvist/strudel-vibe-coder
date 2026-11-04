// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from './systemPrompt';

// Facts below were checked against strudel.cc (its sounds list, reference tab, docs, and by playing code in the REPL).

/** Sound names the prompt declares non-existent. */
const ABSENT = ['ch', 'kick', 'tom', 'snap', 'tabla', 'hand', 'bass', 'gm'];

describe('system prompt: things that used to be wrong', () => {
    it('no longer forbids non-ASCII text; it asks for straight quotes only', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/Use Only ASCII/i);
        expect(SYSTEM_PROMPT).toMatch(/Straight Quotes Only/);
        expect(SYSTEM_PROMPT).toMatch(/Accented letters, emoji and other Unicode are fine/);
    });

    it('does not claim that .add() does not exist, and says what it does', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\.add\(\) is not a function/);
        expect(SYSTEM_PROMPT).toMatch(/\.add\(\) adds numbers or patterns together/);
    });

    it('describes dynamics compression with .compressor, and .compress as the time function', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\.compress\(amount\)/);
        expect(SYSTEM_PROMPT).toMatch(/\.compressor\("threshold:ratio:knee:attack:release"\)/);
        expect(SYSTEM_PROMPT).toMatch(/\.compress\(start, end\) is NOT dynamics compression/);
    });

    it('uses real drum machine bank names', () => {
        expect(SYSTEM_PROMPT).not.toContain('LinndDrumm');
        expect(SYSTEM_PROMPT).not.toMatch(/Alesis, Boss, Korg, Yamaha/); // these are brands, not bank names
        expect(SYSTEM_PROMPT).not.toMatch(/\b(Alesis|Boss|Korg|Yamaha)\b(?![A-Za-z0-9])/);
        for (const real of ['RolandTR808', 'RolandTR909', 'LinnDrum', 'AlesisHR16', 'BossDR110', 'YamahaRX5']) expect(SYSTEM_PROMPT).toContain(real);
    });

    it('lists only default drum names that exist, and says which common names do not', () => {
        expect(SYSTEM_PROMPT).toMatch(/Drums: bd \(kick\), sd \(snare\), hh \(closed hi-hat\)/);
        expect(SYSTEM_PROMPT).not.toMatch(/Drums: bd, sd, hh, oh, ch/);
        expect(SYSTEM_PROMPT).toMatch(/These names do NOT exist and fail with "sound \.\.\. not found": ch, kick, tom, snap, tabla, hand, bass, gm/);
        expect(SYSTEM_PROMPT).toMatch(/gm_acoustic_bass/);
    });

    it('offers $: as the way to play several patterns, instead of .out()', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/explicitly call `\.out\(\)`/);
        expect(SYSTEM_PROMPT).toMatch(/put `\$:` in front of each pattern/);
    });

    it('mentions setcpm for BPM', () => {
        expect(SYSTEM_PROMPT).toMatch(/setcpm\(bpm\/4\)/);
    });
});

describe('system prompt: its own examples', () => {
    it('never use a sound name that the prompt itself says does not exist', () => {
        const strings = [...SYSTEM_PROMPT.matchAll(/\b(?:s|sound)\("([^"]*)"\)/g)].map(m => m[1]);
        expect(strings.length).toBeGreaterThan(5);
        const tokens = strings.flatMap(str => str.split(/[\s,*/<>[\](){}!@?~|:.\d]+/).filter(Boolean));
        for (const name of ABSENT) expect(tokens, `example uses "${name}"`).not.toContain(name);
    });
});

describe('system prompt: behaviour the app relies on', () => {
    it('asks for Hydra visuals and teaching comments by default, and a fenced js block', () => {
        expect(SYSTEM_PROMPT).toMatch(/await initHydra\(\)/);
        expect(SYSTEM_PROMPT).toMatch(/Add Live Coding Comments by Default/);
        expect(SYSTEM_PROMPT).toMatch(/```javascript/);
    });

    it('contains no unescaped template markers left over from the move into a template literal', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\\`/);
        expect(SYSTEM_PROMPT).not.toMatch(/\$\{/);
    });
});
