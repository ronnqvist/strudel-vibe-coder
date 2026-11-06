// SPDX-License-Identifier: MIT
/**
 * Core Strudel guidance, always included. Every API claim here must match the Strudel
 * documentation (strudel.cc/learn); src/lib/systemPrompt.test.js checks the corrected ones.
 * Wording is our own.
 */
export const CORE = `# What Strudel Is
Strudel is a JavaScript implementation of TidalCycles for live coding music in the browser. It is pattern-based and declarative, NOT imperative JavaScript.

## ❌ Do Not Use
- ❌ NO standard JavaScript loops: for, while, forEach
- ❌ NO Math.random() - use Strudel's randomness functions instead
- ❌ NO imperative state management or variables for pattern generation
- ❌ NO setInterval, setTimeout, or other timing functions
- ❌ NO nested function calls like s("piano", note("c e g"))
- ❌ NO invented functions: prefer the functions described here. Other functions documented in the Strudel reference are fine, but never guess a function name, and never use browser or Node APIs (DOM, fetch, timers).

## ⚠️ Common Errors
- ⚠️ "Error: got undefined instead of pattern": the last line is not a pattern (a variable declaration, console.log(), or a function that returns nothing). End with the pattern, or use \`$:\` lines.
- ⚠️ .every() takes EXACTLY two arguments: (cycles, function). WRONG: .every(4, 0.5, fast). CORRECT: .every(4, x => x.fast(2))
- ⚠️ .on() does not exist. Use .every() or .sometimes() instead.
- ⚠️ .add() adds values of the same kind: after n(…) add n(…), after note(…) add note(…), for example n("0 2 4").add(n("<0 3>")) or note("c3 e3").add(note(12)). A bare number or string added after n() or note() changes nothing. It does NOT layer sounds: use stack() to layer patterns.

# Mini-Notation
Mini-notation is Strudel's pattern language, used inside strings with s(), note(), n(), etc.
- Space-separated events share a cycle equally: "c e g b" (4 events per cycle)
- [b4 c5] - nest events (subdivide time): "e5 [b4 c5] d5"; nesting can go deeper: "e5 [b4 [c5 d5]]"
- ~ - silence/rest: "bd ~ sd ~"
- [c3,e3,g3] - play simultaneously (chord); "bd sd, hh*8" - layer patterns (comma outside brackets)
- *2 - play twice as fast: "bd*4" (4 kicks per cycle), "[c e g]*2"
- /2 - play over 2 cycles: "[c e g a]/2"; decimals work: /2.5
- <a b c> - one per cycle: "<bd sd cp>"; "<a b c d e>" takes 5 cycles
- @2 - make an event twice as long: "<[c,e,g]@2 [d,f,a] [e,g,b]>"
- !2 - repeat an event without speeding up: "<[c,e,g]!2 [d,f,a]>"
- ? - 50% chance of playing; ?0.3 - 30% chance of being removed (the event plays about 70% of the time): "bd*8?"
- | - random choice: "bd|sd|cp" picks one randomly
- (3,8) - Euclidean rhythm, 3 beats over 8 steps: "bd(3,8)"; offset: "bd(3,8,2)"; polyrhythms: "bd(3,8), sd(5,8)"
- hh:0 - pick a sample of a sound: "hh:0 hh:1 hh:2 hh:3"

# Core Functions
- s("bd sd hh") - play samples by name; sound("piano") or .s("piano") - select sound/instrument
- note("c e g") - play notes (letter names such as c3, eb4, or MIDI numbers)
- n("0 2 4") - numbers: with .scale("C:minor") they are scale degrees counted from 0; without a scale they choose the sample number of a sound
- stack(pattern1, pattern2, ...) - layer patterns (play simultaneously)
- cat(pattern1, pattern2, ...) - one pattern per cycle, in turn; seq(pattern1, pattern2, ...) - all of them within one cycle
- silence - a pattern that plays nothing (a constant: write silence, not silence())
- run(n) - ascending sequence 0 to n-1
- Waveforms for synths: sawtooth, square, triangle, sine, supersaw, pulse; noise: white, pink, brown, crackle. Usage: note("c e g").s("sawtooth")
- Chain methods in this order: create (s, note, n) → sound (.s, .bank) → effects (.lpf, .room, .delay) → time (.fast, .slow, .every). Example: note("c e g").s("sawtooth").lpf(800).fast(2)

## Signals and Randomness
- sine, saw, tri, square, perlin, rand - continuous signals between 0 and 1; .range(low, high) rescales them, for example .lpf(sine.range(400, 4000).slow(4))
- .segment(n) - samples a continuous signal n times per cycle, for example n(rand.range(0, 7).segment(8)).scale("C:minor")
- .degradeBy(0.3) - removes about 30% of the events at random
- .sometimes(fn) 50%, .rarely(fn) 25%, .often(fn) 75% of the time

## Time Modifiers
- .slow(n), .fast(n) - slow down or speed up by factor n
- .early(n), .late(n) - shift by n cycles
- .rev() - reverse; .palindrome() - forward then backward; .iter(n) - rotate over n cycles
- .every(n, fn) - apply function every n cycles, for example s("bd sd").every(4, rev)
- .euclid(beats, segments) - Euclidean rhythm; .ply(n) - repeat each event n times

# Mixing Basics
- .gain(level) - volume (0-1, can go higher); .velocity(level) - velocity from 0 to 1, multiplied with gain
- .pan(position) - 0=left, 0.5=center, 1=right; .jux(fn) - apply function to right channel only; .juxBy(amount, fn) - partial stereo separation
- .lpf(freq) - lowpass filter (20-20000 Hz); .hpf(freq) - highpass; .bpf(freq) - bandpass
- .lpq(resonance) - lowpass resonance (0-50); .hpq(resonance) - highpass resonance (0-50); .bpq(resonance) - bandpass resonance
- .compressor("threshold:ratio:knee:attack:release") - dynamics compressor, for example .compressor("-20:20:10:.002:.02"). (.compress(start, end) is NOT dynamics compression: it squeezes the events into part of each cycle)

## Delay and Reverb (Shared per Orbit)
Patterns on the same orbit (the default is 1) share one delay and one reverb, so the last setting wins. Give patterns that need different delay or reverb settings their own orbit: .orbit(2).
- .delay(level) - how loud the echoes are (0-1)
- .delaytime(seconds) - time between echoes in seconds, for example .delaytime(0.25)
- .delayfeedback(amount) - how much each echo feeds the next (0-1; 1 or more keeps getting louder)
- .room(level) - how much reverb (0-1)
- .roomsize(size) - size of the reverb room (0-10); changing it recalculates the reverb, so change it rarely

# Tempo
setcpm(bpm/4) - set the tempo in BPM (4 beats per cycle), for example setcpm(120/4)
setcps(n) - set cycles per second; 0.5 cps ≈ 120 BPM (at 4/4 time), and 0.5 is usually the default

# Examples
- Basic beat: s("bd sd [~ bd] sd, hh*8")
- Euclidean drums: s("bd(3,8), sd(5,8,2), hh(7,8)")
- Bassline: note("c2 [eb2 g2] c2 bb1").s("sawtooth").lpf(800)

# Code Style
- Backticks \` for multi-line mini-notation, double quotes " for single-line mini-notation, single quotes ' for plain strings (not parsed as patterns)
- One pattern per line; comment sections with //
- Tidal's $ operator reverses in Strudel: foo $ bar becomes bar.foo()`;
