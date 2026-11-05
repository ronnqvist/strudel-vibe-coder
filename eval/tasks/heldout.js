// SPDX-License-Identifier: MIT
/**
 * Held-out tasks: not looked at while changing the prompt, so results on them show whether a
 * change generalises. Keep them out of prompt work.
 */
import { PARSES_AS_STRUDEL, has, lacks, reply } from './helpers.js';

const GARAGE = `setcpm(132/4)
$: s("bd ~ ~ bd ~ ~ bd ~, ~ sd, hh*8?").bank("RolandTR909")
$: chord("<Fm9 Bbm9>").voicing().s("sawtooth").lpf(1500).room(0.4)`;

export const HELDOUT_TASKS = [
    { id: 'held-draft-reggae', kind: 'draft', prompt: 'laid-back dub reggae', checks: [PARSES_AS_STRUDEL, has('slow tempo', String.raw`setcpm\(([6-9]\d)\/4\)|setcps\(0\.[23]`)],
        mock: [reply('setcpm(75/4)\n$: s("~ ~ bd ~, ~ rim").bank("RolandTR808").delay(0.4).delaytime(0.375)\n$: note("<g1 c2>").s("sawtooth").lpf(300)')] },
    { id: 'held-draft-jazz', kind: 'draft', prompt: 'late night jazz chords', checks: [PARSES_AS_STRUDEL, has('chords', String.raw`chord\(|\[[a-g][#b]?\d,`)],
        mock: [reply('$: chord("<Dm9 G13 Cmaj9 A7b13>").voicing().s("gm_epiano1").room(0.5)\n$: s("~ rd ~ rd").gain(0.5)')] },
    { id: 'held-constraint-orbit', kind: 'constraint', prompt: 'two layers: dry drums and a very wet reverb pad', checks: [has('separate orbits', String.raw`orbit\(\d\)`), has('reverb', String.raw`room\(`)],
        mock: [reply('$: s("bd sd").orbit(1)\n$: chord("<C Am>").voicing().s("sawtooth").room(0.9).roomsize(8).orbit(2)'), reply('$: s("bd sd")\n$: note("c3").s("sawtooth").room(0.9)')] },
    { id: 'held-constraint-length', kind: 'constraint', prompt: 'a 4-bar loop, under 8 lines of code', checks: [lacks('more than 8 lines', String.raw`^(?:.*\n){8,}`)],
        mock: [reply('$: s("bd*4, hh*8")\n$: note("<c2 eb2 f2 g2>").s("sawtooth")')] },
    { id: 'held-revise-key', kind: 'revision', prompt: 'move it to G minor', current: GARAGE,
        checks: [has('G minor somewhere', String.raw`G\d?:minor|Gm`)],
        preserve: ['setcpm(132/4)', 's("bd ~ ~ bd ~ ~ bd ~, ~ sd, hh*8?").bank("RolandTR909")'],
        mock: [reply(GARAGE.replace('<Fm9 Bbm9>', '<Gm9 Cm9>'))] },
    { id: 'held-revise-filter', kind: 'revision', prompt: 'open the filter slowly over 8 cycles', current: GARAGE,
        checks: [has('a slow filter sweep', String.raw`lpf\((sine|saw|tri|perlin)[^)]*\)[^\n]*slow\(8\)|lpf\([^)]*slow\(8\)`)],
        preserve: ['s("bd ~ ~ bd ~ ~ bd ~, ~ sd, hh*8?").bank("RolandTR909")'],
        mock: [reply(GARAGE.replace('lpf(1500)', 'lpf(saw.range(300, 4000).slow(8))'))] },
    { id: 'held-fail-error', kind: 'failure', prompt: 'anything', expectStatus: 'error', checks: [], mock: [{ content: 'par', end: 'error' }] },
    { id: 'held-fail-silence', kind: 'failure', prompt: 'drums, then silence for a cycle', checks: [lacks('silence used as a function', String.raw`silence\(\)`)],
        mock: [reply('$: cat(s("bd*4"), silence)'), reply('$: cat(s("bd*4"), silence())')] },
];
