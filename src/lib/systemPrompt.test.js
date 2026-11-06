// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT } from './systemPrompt';

// Facts below were checked against strudel.cc (its sounds list, reference tab, docs, and by playing code in the REPL).

/** Sound names the prompt declares non-existent. */
const ABSENT = ['ch', 'kick', 'tom', 'snap', 'tabla', 'hand', 'bass', 'gm'];

describe('system prompt: things that used to be wrong', () => {
    it('no longer forbids non-ASCII text; it asks for straight quotes only', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/Use Only ASCII/i);
        expect(SYSTEM_PROMPT).toMatch(/Straight quotes only/);
        expect(SYSTEM_PROMPT).toMatch(/Accented letters, emoji and other Unicode are fine/);
    });

    it('does not claim that .add() does not exist, and says what it does', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\.add\(\) is not a function/);
        expect(SYSTEM_PROMPT).toMatch(/\.add\(\) adds values of the same kind/);
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
        expect(SYSTEM_PROMPT).toMatch(/every line that starts with `\$:`/);
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
    it('the full prompt asks for Hydra visuals and teaching comments, and a fenced js block', () => {
        expect(SYSTEM_PROMPT).toMatch(/Include Hydra visuals with the music/);
        expect(SYSTEM_PROMPT).toMatch(/explain what each section does for someone new to live coding/);
        expect(SYSTEM_PROMPT).toMatch(/```javascript/);
    });

    it('contains no unescaped template markers left over from the move into a template literal', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\\`/);
        expect(SYSTEM_PROMPT).not.toMatch(/\$\{/);
    });
});

/**
 * #8: API facts checked against the Strudel documentation on 2026-11-05.
 * Each row: what the prompt must say (or must not say), and the page that backs it.
 * Wording in the prompt is our own; nothing is copied from the documentation.
 *
 * Also checked on 2026-11-05 in the real strudel.cc REPL (headless Chromium, Playwright: code
 * opened through the URL fragment, then Play): an example of every corrected fact (delay/delaytime/
 * delayfeedback and "level:time:feedback", room/roomsize(5), vib/vibmod and "rate:depth", silence
 * in a stack, ?0.3, n + scale, a patterned scale, chord().voicing(), sine.range().slow(),
 * rand.range().segment() + scale, degradeBy, distort("3:0.5"), lpq(40), velocity, two orbits, the
 * corrected Hydra example) and the app's starter pattern evaluated and were scheduled with no
 * error. Controls: silence() fails with "silence is not a function", and s("kick") reports
 * "sound kick not found", so the check does detect errors. Not checked: what it sounds like
 * (headless, no listening).
 */
const FACTS = [
    { fact: 'delay is the level of the echoes; delaytime is the time in seconds', must: [/\.delay\(level\) - how loud the echoes are/, /\.delaytime\(seconds\) - time between echoes in seconds/], mustNot: [/\.delay\(time\)/], doc: 'https://strudel.cc/learn/effects/#delay' },
    { fact: 'delayfeedback of 1 or more keeps growing', must: [/1 or more keeps getting louder/], doc: 'https://strudel.cc/learn/effects/#delayfeedback' },
    { fact: 'roomsize ranges 0-10 and recalculates the reverb', must: [/\.roomsize\(size\) - size of the reverb room \(0-10\)/], mustNot: [/roomsize\(size\) - reverb room size \(0-1\)/], doc: 'https://strudel.cc/learn/effects/#roomsize' },
    { fact: 'room is the reverb level', must: [/\.room\(level\) - how much reverb/], doc: 'https://strudel.cc/learn/effects/#room' },
    { fact: 'delay and reverb are shared per orbit', must: [/share one delay and one reverb/, /\.orbit\(2\)/], mustNot: [/Applied to Entire Mix/], doc: 'https://strudel.cc/learn/effects/#orbits' },
    { fact: 'vib is the vibrato rate in Hz', must: [/\.vib\(hz\) - vibrato rate in Hz/], mustNot: [/\.vib\(n\) - vibrato amount/], doc: 'https://strudel.cc/learn/synths/#vibrato' },
    { fact: 'vibmod is the depth in semitones and needs vib', must: [/\.vibmod\(semitones\) - vibrato depth in semitones; it only works when \.vib\(\) is also set/], doc: 'https://strudel.cc/learn/synths/#vibmod' },
    { fact: 'silence is a constant, not a function', must: [/silence - a pattern that plays nothing/], mustNot: [/silence\(\) - /], doc: 'https://strudel.cc/learn/factories/#silence' },
    { fact: 'the number after ? is the chance of removal', must: [/\?0\.3 - 30% chance of being removed/], mustNot: [/30% chance of playing/], doc: 'https://strudel.cc/learn/mini-notation/' },
    { fact: 'n() picks scale degrees with .scale(), sample numbers without', must: [/scale degrees counted from 0/], mustNot: [/semitones from root/], doc: 'https://strudel.cc/learn/tonal/' },
    { fact: 'lpq ranges 0-50', must: [/\.lpq\(resonance\) - lowpass resonance \(0-50\)/], mustNot: [/\(0-30\)/], doc: 'https://strudel.cc/learn/effects/#lpq' },
    { fact: 'distort is useful up to about 10', must: [/useful values are roughly 0-10/], mustNot: [/distortion \(0-1\)/], doc: 'https://strudel.cc/learn/effects/#distort' },
    { fact: 'velocity is 0-1 and multiplies gain', must: [/velocity from 0 to 1, multiplied with gain/], mustNot: [/MIDI-style velocity/], doc: 'https://strudel.cc/learn/effects/#velocity' },
    { fact: 'splice changes speed, so pitch', must: [/changes each slice's speed \(and therefore its pitch\)/], mustNot: [/time-stretching/], doc: 'https://strudel.cc/learn/samples/' },
    { fact: 'scale, chord and voicing are documented and allowed', must: [/\.scale\("C:minor"\)/, /chord\("<C Am F G>"\)\.voicing\(\)/], mustNot: [/STRICTLY do NOT use any JavaScript methods, functions, or APIs that are not explicitly mentioned/], doc: 'https://strudel.cc/learn/tonal/' },
    { fact: 'signals with range and segment', must: [/\.range\(low, high\)/, /\.segment\(n\)/], doc: 'https://strudel.cc/learn/signals/' },
    { fact: 'the Hydra example plays audible notes', must: [/n\(pattern\)\.scale\("A:minor"\)\.s\("piano"\)/], mustNot: [/note\(pattern\)\.s\("piano"\)/], doc: 'https://strudel.cc/learn/hydra/' },
];

describe('system prompt: Strudel API facts (#8)', () => {
    for (const { fact, must = [], mustNot = [], doc } of FACTS) {
        it(`${fact} (${doc})`, () => {
            for (const re of must) expect(SYSTEM_PROMPT).toMatch(re);
            for (const re of mustNot) expect(SYSTEM_PROMPT).not.toMatch(re);
        });
    }

    it('never calls silence as a function, except to say not to', () => {
        const calls = [...SYSTEM_PROMPT.matchAll(/silence\(\)/g)].map(m => SYSTEM_PROMPT.slice(Math.max(0, m.index - 4), m.index));
        expect(calls).toEqual(['not ']);
    });

    it('every example that sets .delay() in a chain is described as a level, never as a time', () => {
        for (const m of SYSTEM_PROMPT.matchAll(/\.delay\(([^)]*)\)\s*-\s*([^\n]*)/g)) expect(m[2]).not.toMatch(/time/i);
    });
});

describe('system prompt: pitch-shifting examples that really shift pitch (review F9)', () => {
    // Checked 2026-11-06 in the strudel.cc REPL with queryArc: after n() / note() / .scale(), a bare
    // number or string given to .add() changes nothing; the offset must be wrapped the same way
    // (n(…) or note(…)), or the scale shift done with .scaleTranspose().
    it('never adds a bare number or string after n(), note() or .scale()', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\b(n|note)\("[^"]*"\)(\.scale\("[^"]*"\))?\.add\(\s*["\d]/);
        expect(SYSTEM_PROMPT).not.toMatch(/\.scale\("[^"]*"\)\.off\([^)]*x\.add\(\s*\d/);
        expect(SYSTEM_PROMPT).not.toMatch(/\.off\(1\/8, x => x\.add\(\d+\)\)/);
    });
    it('shows the forms that work', () => {
        expect(SYSTEM_PROMPT).toMatch(/n\("0 2 4"\)\.add\(n\("<0 3>"\)\)/);
        expect(SYSTEM_PROMPT).toMatch(/x => x\.add\(note\(7\)\)/);
        expect(SYSTEM_PROMPT).toMatch(/\.scaleTranspose\(4\)/);
    });
});

// Fact check of the prompt by a third reviewer; each point checked in the strudel.cc REPL
// (queryArc, its loaded sound list) or against strudel.cc/learn before it was changed.
describe('review pass 1c: prompt fact check', () => {
    it('the mask example mutes the cycle it says it mutes (learn/conditional-modifiers, mini-notation)', () => {
        // "<1 1 0 1>" mutes the third of every four cycles, not the fourth
        expect(SYSTEM_PROMPT).not.toContain('.mask("<1 1 0 1>")');
        expect(SYSTEM_PROMPT).toMatch(/\.mask\("<1 1 1 0>"\)[^\n]*every fourth cycle/);
    });
    it('does not forbid variables, which the Hydra example itself uses', () => {
        expect(SYSTEM_PROMPT).toMatch(/let pattern = /);
        expect(SYSTEM_PROMPT).not.toMatch(/NO imperative state management or variables/);
    });
    it('shared delay and reverb on one orbit overwrite each other unpredictably (learn/effects#orbits)', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/last setting wins/);
        expect(SYSTEM_PROMPT).toMatch(/share one delay and one reverb[^\n]*unpredictabl/);
    });
    it('does not promise default sounds are "always available"; they load on first use (learn/samples)', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/Always Available/);
    });
    it('gives the lowpass range as the docs do, and the chaining order as a convention', () => {
        expect(SYSTEM_PROMPT).not.toMatch(/20-20000 Hz/);
        expect(SYSTEM_PROMPT).not.toMatch(/Chain methods in this order/);
    });
    it('keeps the facts the REPL confirmed: no standalone perc, .on() does not exist, all 15 banks exist', () => {
        expect(SYSTEM_PROMPT).toMatch(/perc \(outside a drum machine bank\)/);
        expect(SYSTEM_PROMPT).toMatch(/\.on\(\) does not exist/);
        expect(SYSTEM_PROMPT).toMatch(/LinnDrum, AkaiLinn/);
    });
});
