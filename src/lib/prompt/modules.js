// SPDX-License-Identifier: MIT
/**
 * Optional prompt modules, added when a request needs them (see select.js). Every API claim
 * here must match the Strudel documentation (strudel.cc/learn). Wording is our own.
 */

export const SYNTHESIS = `# Synthesis
## Envelope (ADSR)
- .attack(seconds), .decay(seconds), .release(seconds); .sustain(level) - sustain level (0-1)
- .adsr(a:d:s:r) - all at once: .adsr("0.01:0.2:0.5:0.1")

## FM Synthesis
- .fm(n) - FM modulation amount; .fmh(n) - FM harmonicity ratio
- .fmattack(n), .fmdecay(n), .fmsustain(n) - the FM envelope

## Vibrato
- .vib(hz) - vibrato rate in Hz, for example .vib(4); .vib("4:0.5") sets rate and depth together
- .vibmod(semitones) - vibrato depth in semitones; it only works when .vib() is also set

## Tone Shaping
- .vowel("a"|"e"|"i"|"o"|"u") - vowel filter
- .distort(amount) - waveshaping distortion; useful values are roughly 0-10 and it gets loud fast. .distort("3:0.5") also lowers the output level (amount:postgain)
- .crush(bits) - bitcrusher (1-16); .coarse(factor) - sample rate reduction
- .phaser(speed) - phaser effect; .phaserdepth(amount) - phaser depth`;

export const SAMPLES = `# Samples and Drum Machines
## Default Sounds (Always Available)
Drums: bd (kick), sd (snare), hh (closed hi-hat), oh (open hi-hat), cp (clap), rim (rimshot), ht / mt / lt (high / mid / low tom), cr (crash), rd (ride), cb (cowbell), sh (shaker), tb (tambourine), brk (break), misc
Other samples: clap, jazz, casio, piano, plus world and orchestral percussion such as agogo, bongo, conga, cajon, marimba, kalimba, harp
General MIDI instruments are named gm_<instrument>, for example gm_acoustic_bass, gm_electric_bass_finger, gm_piano, gm_epiano1, gm_violin, gm_string_ensemble_1, gm_synth_strings_1, gm_pad_warm, gm_lead_2_sawtooth, gm_flute, gm_marimba, gm_vibraphone, gm_church_organ, gm_trumpet
These names do NOT exist and fail with "sound ... not found": ch, kick, tom, snap, tabla, hand, bass, gm, perc (outside a drum machine bank). Use hh for a closed hat, bd for a kick, ht/mt/lt for toms, cp for a clap, gm_acoustic_bass or a synth for bass.

## Drum Machines (Use with .bank())
- Banks: RolandTR808, RolandTR909, RolandTR707, RolandTR606, RolandTR505, LinnDrum, AkaiLinn, AkaiMPC60, OberheimDMX, KorgMinipops, BossDR110, AlesisHR16, YamahaRX5, CasioSK1, EmuSP12. Short names such as "tr909" work too.
- A bank only has the drums it was built with (bd, sd, hh, oh, cp, rim, ht, mt, lt, cr, rd, cb, sh, tb and similar)
- Usage: s("bd sd hh").bank("RolandTR808"); patterned banks: s("bd sd").bank("<RolandTR808 RolandTR909>")

## Picking Samples
- s("hh").n("0 1 2 3") or s("hh:0 hh:1 hh:2") - cycle through the samples of a sound
- Numbers wrap: if only 4 samples, n("0 1 2 3 4 5") wraps 4→0, 5→1

## Sampler Controls
- .begin(point), .end(point) - start and end point (0-1)
- .speed(rate) - playback speed (negative = reverse)
- .cut(group) - cut group (stops other sounds in same group)
- .loop(1), .loopBegin(point), .loopEnd(point) - looping
- .chop(n) - chop into n slices; .slice(n, pattern) - slice and rearrange
- .splice(n, pattern) - like slice, but changes each slice's speed (and therefore its pitch) to fit its step
- .fit() - fit sample to event duration`;

export const HARMONY = `# Scales and Chords
- n("0 2 4 7").scale("C:minor") - notes from a scale (degrees counted from 0); patterned scales work too: .scale("<C:minor F:dorian>")
- chord("<C Am F G>").voicing() - chord symbols turned into playable voicings
- Chords by hand: note("<[c3,e3,g3] [a2,c3,e3] [f3,a3,c4]>").s("piano")
- .off(1/8, x => x.add(note(7))) - layer a copy, shifted later by 1/8 cycle, on top; here 7 semitones (a fifth) higher: note("c3 eb3 g3").off(1/8, x => x.add(note(7)))
- With scale degrees, shift by degrees with .scaleTranspose() after .scale(): n("0 2 4").scale("C:minor").off(1/8, x => x.scaleTranspose(4))
- Prefer scale degrees with .scale() for melodies, so every note stays in key when you change the scale`;

export const ARRANGEMENT = `# Arrangement
- arrange([4, a], [2, b]) - play pattern a for 4 cycles, then b for 2 cycles, and repeat: arrange([4, "<c a f e>(3,8)"], [2, "<g a>(5,8)"]).note()
- cat(a, b) - one pattern per cycle; "<a b>" in mini-notation alternates per cycle; "<a b>/2" changes every 2 cycles
- .mask("<1 1 0 1>") - silence a layer in some cycles (0 or ~ mutes), for example a hi-hat that drops out every fourth cycle
- .every(n, fn), .firstOf(n, fn), .lastOf(n, fn) - change something once every n cycles, for a fill or a variation
- Build a track as named layers, then combine them:
  stack(
    s("bd(3,8), sd(5,8)"),
    note("c2 eb2 g2 bb2").s("sawtooth").lpf(600),
    note("<[c4,e4,g4] [f4,a4,c5]>").s("piano").room(0.5)
  )`;

export const HYDRA = `# Hydra Visuals
## Initialization
await initHydra() // the first line of the code when using Hydra
await initHydra({detectAudio: true}) // audio-reactive visuals
await initHydra({feedStrudel: true}) // transform Strudel's own visuals

## Using Patterns in Hydra
H(pattern) - convert a Strudel pattern into a Hydra input. Example:
await initHydra()
let pattern = "3 4 5 [6 7]*2"
shape(H(pattern)).out(o0)
n(pattern).scale("A:minor").s("piano")

## Common Hydra Functions
- osc(freq, sync, offset) - oscillator; shape(sides, radius, smoothing) - shapes
- rotate(angle, speed) - rotation; modulate(source, amount), blend(source, amount)
- out(o0) - output to buffer o0`;

/** All optional modules, in the fixed order they are added in. */
export const MODULES = {
    synthesis: SYNTHESIS,
    samples: SAMPLES,
    harmony: HARMONY,
    arrangement: ARRANGEMENT,
    hydra: HYDRA,
};

export const MODULE_NAMES = Object.keys(MODULES);
