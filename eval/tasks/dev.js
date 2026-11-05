// SPDX-License-Identifier: MIT
/**
 * Development tasks: used while changing the prompt. Kinds:
 * draft (first pattern), constraint (explicit requirements), revision (change one thing, keep the
 * rest), failure (how the app handles bad endings). `mock` holds canned replies for mock mode
 * (repeated in turn over the runs); they are realistic, not perfect, so the scores vary.
 */
import { PARSES_AS_STRUDEL, has, lacks, reply } from './helpers.js';

const ACID = `setcpm(130/4)
$: s("bd*4, ~ cp, hh*8").bank("RolandTR909")
$: note("<c2 c2 eb2 g1>*4").s("sawtooth").lpf(sine.range(300, 2000).slow(4)).lpq(20)`;

const BOOMBAP = `setcpm(88/4)
$: s("bd ~ ~ bd, ~ sd, hh*8").bank("RolandTR808").swingBy(1/6, 8)
$: n("0 2 4 2").scale("C:minor").s("piano").room(0.4)`;

export const DEV_TASKS = [
    // first drafts
    { id: 'draft-acid', kind: 'draft', prompt: 'acid techno bass', checks: [PARSES_AS_STRUDEL, has('has a bass line', String.raw`note\(|n\(`)],
        mock: [reply(ACID), reply(ACID.replace('lpq(20)', 'lpq(25)'))] },
    { id: 'draft-boombap', kind: 'draft', prompt: 'dusty boom bap', checks: [PARSES_AS_STRUDEL, has('has drums', String.raw`\bs\("[^"]*\bbd`)],
        mock: [reply(BOOMBAP)] },
    { id: 'draft-ambient', kind: 'draft', prompt: 'lush ambient pads', checks: [PARSES_AS_STRUDEL, has('slow or long notes', String.raw`\.slow\(|@\d|attack\(|release\(`)],
        mock: [reply('$: chord("<Cmaj7 Am7 Fmaj7 G7>").voicing().s("sawtooth").lpf(1200).attack(1).release(2).room(0.8).roomsize(6)')] },
    { id: 'draft-dnb', kind: 'draft', prompt: 'fast drum and bass break', checks: [PARSES_AS_STRUDEL, has('fast tempo (170+ BPM)', String.raw`setcpm\((1[7-9]\d|2\d\d)\/4\)|setcps\(0\.(7[1-9]|[89])`)],
        mock: [reply('setcpm(174/4)\n$: s("bd ~ ~ bd ~ ~ sd ~, hh*16?").bank("RolandTR909")\n$: note("<e1 g1>").s("sawtooth").lpf(400)'), reply('setcpm(160/4)\n$: s("bd sd, hh*8")')] },
    { id: 'draft-chiptune', kind: 'draft', prompt: 'happy chiptune melody', checks: [PARSES_AS_STRUDEL, has('square or pulse wave', String.raw`"(square|pulse)"`)],
        mock: [reply('$: n("0 2 4 7 4 2").scale("C:major").s("square").fast(2).gain(0.5)\n$: s("bd sd").bank("CasioSK1")')] },
    // explicit constraints
    { id: 'constraint-tempo-bank', kind: 'constraint', prompt: 'a house beat at 124 BPM using the TR-909, no melody', checks: [
        has('tempo 124 BPM', String.raw`setcpm\(124\/4\)|setcpm\(31\)|setcps\(124\/240\)`),
        has('uses RolandTR909', String.raw`bank\("(RolandTR909|tr909)"\)`),
        lacks('no melodic part', String.raw`\bnote\(|\bn\("[^"]*"\)\.scale`)],
        mock: [reply('setcpm(124/4)\n$: s("bd*4, ~ cp, [~ hh]*4, oh(3,8)").bank("RolandTR909")'), reply('setcpm(124/4)\n$: s("bd*4, ~ cp").bank("RolandTR909")\n$: note("c3 e3").s("piano")')] },
    { id: 'constraint-key', kind: 'constraint', prompt: 'a melody in D dorian, piano only', checks: [
        has('D dorian scale', String.raw`scale\("D\d?:dorian"\)`),
        has('piano', String.raw`"piano"`),
        lacks('no drums', String.raw`\bs\("[^"]*\b(bd|sd|hh)\b`)],
        mock: [reply('$: n("0 2 4 <3 5> 4 2").scale("D:dorian").s("piano").room(0.3)')] },
    { id: 'constraint-no-visuals', kind: 'constraint', prompt: 'minimal techno, no visuals please', checks: [lacks('no Hydra', 'initHydra'), PARSES_AS_STRUDEL],
        mock: [reply('setcpm(128/4)\n$: s("bd*4, hh*8").bank("RolandTR808")'), reply('await initHydra()\nosc(10).out()\n$: s("bd*4")')] },
    { id: 'constraint-visuals', kind: 'constraint', prompt: 'a trippy beat with audio-reactive visuals', checks: [has('Hydra initialised', String.raw`await initHydra\(`), has('sends output', String.raw`\.out\(`)],
        mock: [reply('await initHydra({detectAudio: true})\nosc(10, 0.1, 1.2).modulate(noise(3)).out()\n$: s("bd*4, hh*8")')] },
    { id: 'constraint-delay', kind: 'constraint', prompt: 'hi-hats with a quarter-second echo', checks: [
        has('delaytime set', String.raw`delaytime\(0?\.25\)|delay\("[^"]*:0?\.25`),
        lacks('delay used as a time', String.raw`\.delay\(0?\.25\)(?!\.delaytime)`)],
        mock: [reply('$: s("hh*8").delay(0.5).delaytime(0.25).delayfeedback(0.4)'), reply('$: s("hh*8").delay(0.25)')] },
    // revisions: change one thing, keep the rest
    { id: 'revise-tempo', kind: 'revision', prompt: 'make it a bit slower, keep everything else', current: ACID,
        checks: [has('slower than 130 BPM', String.raw`setcpm\((1[0-2]\d|\d\d)\/4\)`)],
        preserve: ['$: s("bd*4, ~ cp, hh*8").bank("RolandTR909")', '.lpf(sine.range(300, 2000).slow(4))'],
        mock: [reply(ACID.replace('130/4', '120/4')), reply(ACID.replace('130/4', '118/4').replace('lpq(20)', 'lpq(10)'))] },
    { id: 'revise-swap-bank', kind: 'revision', prompt: 'swap the drums to the 808', current: ACID,
        checks: [has('uses the 808', String.raw`bank\("(RolandTR808|tr808)"\)`)],
        preserve: ['setcpm(130/4)', 'note("<c2 c2 eb2 g1>*4").s("sawtooth")'],
        mock: [reply(ACID.replace('RolandTR909', 'RolandTR808'))] },
    { id: 'revise-add-layer', kind: 'revision', prompt: 'add a pad on top', current: BOOMBAP,
        checks: [has('a new layer', String.raw`(\$:[\s\S]*){3}|stack\(`)],
        preserve: ['s("bd ~ ~ bd, ~ sd, hh*8").bank("RolandTR808")', 'n("0 2 4 2").scale("C:minor").s("piano")'],
        mock: [reply(`${BOOMBAP}\n$: chord("<Cm7 Fm7>").voicing().s("sawtooth").lpf(800).room(0.6).gain(0.4)`), reply('setcpm(88/4)\n$: chord("<Cm7 Fm7>").voicing().s("sawtooth")')] },
    { id: 'revise-remove-hats', kind: 'revision', prompt: 'remove the hi-hats', current: BOOMBAP,
        checks: [lacks('no hi-hats', String.raw`\bhh\b`)],
        preserve: ['setcpm(88/4)', 'n("0 2 4 2").scale("C:minor").s("piano").room(0.4)'],
        mock: [reply(BOOMBAP.replace(', hh*8', ''))] },
    { id: 'revise-after-edit', kind: 'revision', prompt: 'more reverb on the piano', current: '// edited in Strudel\nsetcpm(90/4)\n$: s("bd sd").bank("RolandTR707")\n$: n("0 3 5").scale("A:minor").s("piano")',
        checks: [has('reverb on the piano', String.raw`"piano"\)[^\n]*\.room\(`)],
        preserve: ['// edited in Strudel', 's("bd sd").bank("RolandTR707")'],
        mock: [reply('// edited in Strudel\nsetcpm(90/4)\n$: s("bd sd").bank("RolandTR707")\n$: n("0 3 5").scale("A:minor").s("piano").room(0.7)')] },
    // failure cases: the app must classify these, and must not load them
    { id: 'fail-interrupted', kind: 'failure', prompt: 'long evolving techno track', expectStatus: 'interrupted', checks: [],
        mock: [{ content: 'Here:\n```javascript\nsetcpm(128/4)\n$: s("bd*4', end: 'none' }] },
    { id: 'fail-truncated', kind: 'failure', prompt: 'an epic 10 minute arrangement', expectStatus: 'truncated', checks: [],
        mock: [{ content: '```javascript\narrange([8, s("bd*4")], [8, s("bd*4, hh*8")])', end: 'length' }] },
    { id: 'fail-refused', kind: 'failure', prompt: 'something the provider refuses', expectStatus: 'refused', checks: [],
        mock: [{ content: 'I can\'t help with that.', end: 'content_filter' }] },
    { id: 'fail-curly-quotes', kind: 'failure', prompt: 'a simple beat', checks: [PARSES_AS_STRUDEL],
        mock: [reply('s(“bd sd”).bank(‘RolandTR909’)')] },
    { id: 'fail-math-random', kind: 'failure', prompt: 'random hi-hats using Math.random', checks: [lacks('no Math.random', String.raw`Math\.random`), has('Strudel randomness instead', String.raw`\?|degradeBy|sometimes|rand`)],
        mock: [reply('$: s("hh*16?").degradeBy(0.2)'), reply('$: s("hh*16").gain(Math.random())')] },
];
