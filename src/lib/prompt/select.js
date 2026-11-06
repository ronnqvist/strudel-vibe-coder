// SPDX-License-Identifier: MIT
/**
 * Which optional modules a request gets. Simple, deterministic rules on the user's words, the
 * pattern on the stage and the preferences. Never a model call.
 */
import { MODULE_NAMES } from './modules';
import { cleanPrefs } from './preferences';

const RULES = {
    synthesis: {
        text: /\b(synth\w*|bass\w*|lead|pad|pluck|wobble|acid|fm|supersaw|saw(tooth)?|square|sine|triangle|envelope|adsr|vibrato|distort\w*|filter\w*|timbre|tone|sound design|303)\b/i,
        code: /\.s\(\s*["'`](sawtooth|square|triangle|sine|supersaw|pulse|white|pink|brown|crackle)|\.(fm|fmh|vib|vibmod|adsr|attack|decay|sustain|release|distort|vowel|crush)\(/,
    },
    samples: {
        // drums and genres, sampled and General MIDI instruments, world and auxiliary percussion
        // (including names that do not exist, such as tabla or tom, so the module's warning applies)
        text: /\b(drums?|beat\w*|kit|kicks?|snares?|hi-?hats?|hats?|claps?|percussion|perc|breaks?|breakbeat|samples?|sampled|bank|808|909|707|606|linn|groove|rhythm|boom ?bap|techno|house|jungle|dnb|drum ?and ?bass|trap|hip ?hop|piano|e-?piano|rhodes|organ|violins?|cello|strings|flutes?|trumpets?|brass|marimba|vibraphone|kalimba|harp|casio|bongos?|congas?|cajon|agogo|tabla|toms?|cowbell|ride|crash|shaker|tambourine|rimshot|gm)\b/i,
        code: /\.bank\(|\bs\(\s*["'`][^"'`]*\b(bd|sd|hh|oh|cp|rim|lt|mt|ht|cr|rd|cb|sh|tb|brk|piano|casio|jazz|marimba|kalimba|harp)\b|gm_\w+|\.(chop|slice|splice|begin|end|speed|cut|loop|loopBegin|loopEnd|loopAt|fit)\(/,
    },
    harmony: {
        text: /\b(chords?|progressions?|scales?|keys?|minor|major|dorian|lydian|phrygian|mixolydian|melod\w*|harmon\w*|arpeggi\w*|arp|voicings?|jazz\w*|lush|notes?)\b/i,
        code: /\.scale\(|\bchord\(|\.voicing\(|\.off\(/,
    },
    arrangement: {
        text: /\b(song|track|sections?|intro|outro|verse|chorus|bridge|build-?up|build|drop|breakdown|arrange\w*|structure|transitions?|longer|evolv\w*|develop\w*|variation)\b/i,
        code: /\barrange\(|\.mask\(|\.(firstOf|lastOf)\(/,
    },
    hydra: {
        text: /\b(visuals?|hydra|video|graphics|shapes?|colou?rs?|kaleid\w*|psychedelic|audio-?reactive)\b/i,
        code: /initHydra\(|\bH\(/,
    },
};

/**
 * @param {{ userText?: string, selectedCode?: string, prefs?: { visuals: string, explanation: string } }} input
 * @returns {string[]} module names, in the fixed order of MODULE_NAMES
 */
export function selectModules({ userText = '', selectedCode = '', prefs } = {}) {
    const p = cleanPrefs(prefs);
    const firstDraft = !selectedCode.trim();
    const wanted = new Set();
    for (const [name, rule] of Object.entries(RULES)) {
        if (name === 'hydra') continue;
        if (rule.text.test(userText) || rule.code.test(selectedCode)) wanted.add(name);
    }
    // A first draft usually needs both drums and synths; a revision only what it touches.
    if (firstDraft) {
        wanted.add('samples');
        wanted.add('synthesis');
    }
    const asksForVisuals = RULES.hydra.text.test(userText);
    const hasVisuals = RULES.hydra.code.test(selectedCode);
    if (p.visuals === 'always' || asksForVisuals || (p.visuals === 'auto' && hasVisuals)) wanted.add('hydra');
    return MODULE_NAMES.filter(name => wanted.has(name));
}
