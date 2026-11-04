# Grok Build handoff: sync strudel.grok.me with upstream strudel-vibe-coder

This is a complete brief for updating the app at https://strudel.grok.me/. Everything needed is in this document; you do not need access to any repository. Where source code is given, copy it exactly, then adapt only the parts this brief says are platform specific.

## 1. Upstream, licence, and what this sync is

- Upstream repository: https://github.com/ronnqvist/strudel-vibe-coder
- Upstream code this brief is based on: commit `250786e6cbd6ba923d846a186ddfa948574784c9`. (If that work reached `main` through a squash merge, the commit on `main` has a different id but identical code.)
- Upstream is now **MIT licensed, Copyright (c) 2025-2026 Simon Rönnqvist**. Versions up to the tag `agpl-final` were published under AGPL-3.0-only.
- Upstream no longer uses `@strudel/embed`. The player is a small, independently written iframe component that opens strudel.cc directly.
- **Strudel itself** stays what it is: a separate project, licensed AGPL-3.0-or-later by the Strudel/TidalCycles community. The app opens https://strudel.cc in an iframe and does not distribute Strudel's code. Mentioning AGPL in the Strudel attribution is correct and expected.

The downstream app is a separate codebase (React with SSR routes, built in Grok Build). This is not a copy-over: keep the downstream structure, design and Grok features, and bring in the upstream changes listed below.

## 2. Keep exactly as they are (Grok platform and downstream features)

- Grok subscription as the **default provider** (Grok auth); BYOK OpenRouter stays an option.
- Header text "Grok · your subscription", the Chats and Settings buttons.
- The mobile **Chat / Stage** tabs, the **"Describe a groove."** empty state and the starter chips **"acid techno bass"**, **"dusty boom bap"**, **"lush ambient pads"**.
- Every Grok platform piece: `https://grok.com/grok-app-builder/extensions.js`, the `/__grok/*` manifest and icons, the "Created with Grok / Remix" banner, the `grok-project-id` meta tags, Grok provider auth, and the fonts from fonts.bunny.net.
- The downstream localStorage keys: `svc.apiKey`, `svc.models`, `svc.model`, `svc.chats`, `svc.chat`, `svc.code` (see section 8).

## 3. Remove `@strudel/embed` completely

1. Remove the `@strudel/embed` dependency, its lazy-loaded chunk (currently `/assets/embed-*.js`, for example `embed-DRuD08HT.js`), the dynamic `import()` that loads it, every `<strudel-repl>` element, and any CSS or TypeScript declarations for `strudel-repl`.
2. Replace the player with the `StrudelFrame` component and the `strudelUrl` encoder below (section 4). Render `<StrudelFrame code={currentCode} />` where `<strudel-repl>` was, inside the Stage panel.
3. Keep the Stage panel **mounted** when the Chat tab is in front (hide it with CSS, do not unmount it), so music keeps playing while the user chats.

## 4. The new player (copy verbatim)

How it works, verified against strudel.cc:
- strudel.cc loads code from the URL fragment: `https://strudel.cc/#<base64>`. The base64 payload is decoded as **UTF-8**, so the encoder is UTF-8 → base64 → `encodeURIComponent`. Non-ASCII text, including emoji, round-trips. (Base64 of Latin-1 bytes does not: ä/ö/å turn into U+FFFD. Do not "sanitise" characters away any more.)
- Smart quotes and en/em dashes are still replaced by straight quotes and hyphens, because typographic quotes are a syntax error in Strudel.
- Audio starts after a click inside the frame with **no `allow` attribute**; do not add `autoplay`, `microphone` or `midi`.
- `referrerPolicy="no-referrer"`, `loading="eager"`, and a `title`.
- The iframe is keyed by a short hash of the URL, so new code remounts the player.
- Chromium blocks iframe URLs over 2 MiB; above 2,000,000 characters the component shows a message with "Copy code" and "Open strudel.cc" instead of a broken frame.

The component uses Tailwind classes from upstream's theme (`bg-cyber-black`, `text-cyber-neon`, …). Swap them for the downstream design; keep the behaviour. If the downstream code is TypeScript, add types; nothing else needs to change.

**`src/lib/strudelUrl.js`**

~~~~js
// SPDX-License-Identifier: MIT
/**
 * Build strudel.cc URLs that open the REPL with a given piece of code.
 *
 * strudel.cc loads code from the URL fragment: `https://strudel.cc/#<base64>`.
 * Behaviour verified empirically against strudel.cc (Chromium, 2026-11-04):
 * - The base64 payload is decoded as UTF-8. Non-ASCII text, including emoji,
 *   round-trips unchanged; base64 of Latin-1 bytes does not (ä/ö/å turn into U+FFFD).
 * - A URI-encoded payload (`+`, `/`, `=` escaped) is accepted.
 * - Chromium refuses to navigate an iframe whose URL exceeds 2 MiB
 *   (the frame ends up at `about:blank#blocked`); 1.9 million characters still loaded.
 */

export const STRUDEL_ORIGIN = 'https://strudel.cc';

/** Longest iframe URL we hand to the browser. Chromium's hard limit is 2,097,152 characters. */
export const MAX_URL_LENGTH = 2_000_000;

/**
 * Replace typographic punctuation that LLMs like to emit with its ASCII form.
 * Curly quotes inside code are syntax errors in JavaScript, so this is applied
 * to the whole text, comments included. All other characters are kept.
 * @param {string} code
 * @returns {string}
 */
export function normalizeTypography(code) {
    if (!code) return '';
    return code
        .replace(/[‘’]/g, "'") // single smart quotes
        .replace(/[“”]/g, '"') // double smart quotes
        .replace(/[–—]/g, '-'); // en and em dashes
}

function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Encode code for the strudel.cc URL fragment: UTF-8 -> base64 -> URI component.
 * @param {string} code
 * @returns {string}
 */
export function encodeStrudelHash(code) {
    return encodeURIComponent(bytesToBase64(new TextEncoder().encode(code ?? '')));
}

/**
 * Inverse of {@link encodeStrudelHash}. Accepts the fragment with or without a leading `#`.
 * @param {string} hash
 * @returns {string}
 */
export function decodeStrudelHash(hash) {
    const payload = decodeURIComponent((hash ?? '').replace(/^#/, ''));
    return new TextDecoder().decode(base64ToBytes(payload));
}

/**
 * Full strudel.cc URL for the given code, after typography normalisation.
 * @param {string} code
 * @returns {string}
 */
export function strudelUrl(code) {
    return `${STRUDEL_ORIGIN}/#${encodeStrudelHash(normalizeTypography(code))}`;
}

/**
 * Short, stable FNV-1a (32-bit) hash of a string, as 8 hex digits.
 * Used as a React key so the iframe remounts when the code changes.
 * @param {string} text
 * @returns {string}
 */
export function shortHash(text) {
    let h = 0x811c9dc5;
    const s = text ?? '';
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}
~~~~

**`src/components/StrudelFrame.jsx`**

~~~~jsx
// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { MAX_URL_LENGTH, normalizeTypography, shortHash, strudelUrl } from '../lib/strudelUrl';

/**
 * Shows the strudel.cc REPL in an iframe, preloaded with `code`.
 *
 * - No `allow` attribute: audio starts after a click inside the frame without one
 *   (verified in Chromium). Nothing else (microphone, MIDI, ...) is delegated.
 * - `referrerPolicy="no-referrer"`: strudel.cc does not need to know which page embeds it.
 * - `loading="eager"`: the player is the main panel and is visible immediately.
 * - The iframe is keyed by a short hash of the code, so new code remounts the REPL.
 */
const StrudelFrame = ({ code }) => {
    const src = strudelUrl(code);
    const [copied, setCopied] = useState(false);

    if (src.length > MAX_URL_LENGTH) {
        const copy = async () => {
            try {
                await navigator.clipboard.writeText(normalizeTypography(code));
                setCopied(true);
            } catch {
                setCopied(false);
            }
        };
        return (
            <div role="alert" className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-gray-300 bg-cyber-black">
                <p className="text-cyber-neon font-bold">This pattern is too large to open in the player.</p>
                <p className="text-sm">
                    Browsers cannot load a URL of {src.length.toLocaleString()} characters
                    (the limit here is {MAX_URL_LENGTH.toLocaleString()}). Copy the code and paste it into strudel.cc instead.
                </p>
                <div className="flex gap-2">
                    <button onClick={copy} className="px-3 py-2 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                        {copied ? 'Copied' : 'Copy code'}
                    </button>
                    <a href="https://strudel.cc/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                        Open strudel.cc
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-cyber-black border-t border-cyber-gray relative">
            <iframe
                key={shortHash(src)}
                src={src}
                title="Strudel live-coding REPL (strudel.cc)"
                loading="eager"
                referrerPolicy="no-referrer"
                className="block w-full h-full border-0"
            />
        </div>
    );
};

export default StrudelFrame;
~~~~

## 5. Footer, licence links and notices

- Replace the footer text "Based on strudel-vibe-coder (AGPL-3.0)" with:
  - "Based on [strudel-vibe-coder](https://github.com/ronnqvist/strudel-vibe-coder) (MIT)", linking the source, and a link "MIT License" to https://github.com/ronnqvist/strudel-vibe-coder/blob/main/LICENSE
  - "Music engine: [Strudel (strudel.cc)](https://strudel.cc/), AGPL-3.0, by the Strudel/TidalCycles community ([source](https://codeberg.org/uzu/strudel))"
- Upstream's notice for the parts that are loaded at runtime but not distributed applies to the downstream app as well. Include it in the downstream notices:

~~~~md
## Loaded at runtime, not distributed by this project

- **[Strudel](https://strudel.cc/)**: AGPL-3.0-or-later, by the Strudel/TidalCycles community. Source: <https://codeberg.org/uzu/strudel>. The app opens `https://strudel.cc/` in an iframe, with the code in the URL fragment. Strudel's code is served by strudel.cc and is not part of this repository or its build. strudel.cc itself loads its sound samples (from `strudel.b-cdn.net`) and the Hydra visual synth (from `unpkg.com`). The licensing of Strudel's default sound banks is documented in Strudel's repository.
- **[OpenRouter](https://openrouter.ai/)**: a third-party API that the browser calls directly, with the user's own key. Covered by OpenRouter's terms, not by a software licence.
~~~~

- **Generate your own third-party notices for your own bundle.** The downstream app ships different packages (SSR framework, router, fonts, Grok platform code), so upstream's list of bundled packages does not apply. List every package in the production bundle with its licence, include their licence texts, link the notices from the settings/about area, and check that no AGPL package is bundled (`@strudel/embed` was the only one upstream had).

## 6. Upstream improvements to adopt

Adapt each to the downstream codebase. Where code is given, it is the upstream implementation; keep its behaviour.

### 6.1 Code extraction (robust)
Only `js` / `javascript` / `strudel` fenced blocks count (untagged blocks only as a fallback; shell, JSON and so on are ignored). With several blocks, the last substantial one wins: an updated pattern beats the earlier version, and a short trailing snippet does not replace the main pattern. Unterminated fences (replies cut off by the token limit) are handled. There is **no guessing from prose**: a reply without a code block loads nothing. The attribution comment is written once, never twice. Use the same function for generated replies and for the "load into player" button, and read the message text (so edits are respected).

Upstream's attribution line reads `// Generated by <model> via https://ronnqvist.github.io/strudel-vibe-coder/`. Downstream, write your own app URL (https://strudel.grok.me/) in `attributionLine`. For an OpenRouter `~…-latest` alias, name the model that actually answered (the `model` field of the streamed chunks), not the alias.

**`src/lib/extractCode.js`**

~~~~js
// SPDX-License-Identifier: MIT
import { attributionLine } from '../config';

const JS_LANGUAGES = new Set(['js', 'javascript', 'strudel', 'jsx']);

/**
 * A trailing block shorter than this fraction of the longest block is treated as
 * a side snippet ("to change the tempo use setcps(...)"), not as the updated pattern.
 */
const SIDE_SNIPPET_RATIO = 0.5;

/**
 * Parse the fenced code blocks of a markdown reply.
 * A fence that is opened but never closed (reply cut off by the token limit) runs to the end.
 * @param {string} text
 * @returns {{ lang: string, code: string }[]}
 */
function parseFences(text) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let current = null;
    for (const line of lines) {
        const open = !current && line.match(/^\s{0,3}(`{3,}|~{3,})\s*([\w+-]*)[^\n]*$/);
        if (open) {
            current = { fence: open[1], lang: open[2].toLowerCase(), lines: [] };
        } else if (current) {
            const trimmed = line.trim();
            const closes = trimmed.length >= current.fence.length && trimmed === current.fence[0].repeat(trimmed.length);
            if (closes) {
                blocks.push({ lang: current.lang, code: current.lines.join('\n') });
                current = null;
            } else {
                current.lines.push(line);
            }
        }
    }
    if (current) blocks.push({ lang: current.lang, code: current.lines.join('\n') });
    return blocks;
}

/**
 * Pick the Strudel code out of a model reply.
 *
 * - Only JavaScript blocks (```js, ```javascript, ```strudel) count; untagged blocks are
 *   used only when there is no tagged JavaScript block. Shell, JSON etc. are ignored.
 * - With several candidates, the last one wins unless it is a short side snippet compared to
 *   the longest block, in which case the last substantial block wins.
 * - Text without a fenced block yields '' (no guessing from prose).
 * @param {string} content
 * @returns {string} trimmed code, or '' when there is none
 */
export function extractCode(content) {
    if (!content) return '';
    const blocks = parseFences(content).map(b => ({ ...b, code: b.code.trim() })).filter(b => b.code);

    let candidates = blocks.filter(b => JS_LANGUAGES.has(b.lang));
    if (candidates.length === 0) candidates = blocks.filter(b => b.lang === '');
    if (candidates.length === 0) return '';

    const longest = Math.max(...candidates.map(b => b.code.length));
    const substantial = candidates.filter(b => b.code.length >= longest * SIDE_SNIPPET_RATIO);
    return substantial[substantial.length - 1].code;
}

/**
 * Put the attribution comment on top of `code`, once. Returns '' for empty code.
 * @param {string} code
 * @param {string} [modelLabel] when missing, the code is returned unchanged
 */
export function withAttribution(code, modelLabel) {
    if (!code) return '';
    if (!modelLabel || /^\/\/ Generated by .+ via /.test(code)) return code;
    return `${attributionLine(modelLabel)}\n${code}`;
}

/**
 * The code a chat message stands for, as the player should get it.
 * Reads the message text (so edits made in the chat are respected) and attributes it
 * to the model that wrote it.
 * @param {{ content?: string, model?: string }} message
 */
export function codeFromMessage(message) {
    return withAttribution(extractCode(message?.content), message?.model);
}
~~~~

`attributionLine` comes from upstream's config:

**`src/config.js`**

~~~~js
// SPDX-License-Identifier: MIT
// App-wide constants. Anything a fork or a downstream deployment is likely to change lives here.

export const APP_NAME = 'Strudel Vibe Coder';
export const APP_URL = 'https://ronnqvist.github.io/strudel-vibe-coder/';
export const REPO_URL = 'https://github.com/ronnqvist/strudel-vibe-coder';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * The comment written at the top of every generated pattern.
 * @param {string} modelLabel human-readable model name
 */
export function attributionLine(modelLabel) {
    return `// Generated by ${modelLabel} via ${APP_URL}`;
}

export const MODELS_API_URL = 'https://openrouter.ai/api/v1/models';

/**
 * Default and suggested models. The `~…-latest` ids are OpenRouter aliases that always point at
 * the newest model of a family, so this list does not go stale when a new version is released.
 * Change this list to change what new users see.
 */
export const DEFAULT_MODEL_ID = '~x-ai/grok-latest';
export const RECOMMENDED_MODELS = [
    { id: '~x-ai/grok-latest', name: 'Grok (latest)' },
    { id: '~anthropic/claude-opus-latest', name: 'Claude Opus (latest)' },
    { id: '~openai/gpt-sol-latest', name: 'GPT Sol (latest)' },
    { id: '~deepseek/deepseek-flash-latest', name: 'DeepSeek Flash (latest)' },
];

/** The bookmarks earlier versions started everyone with; used to tell an untouched list from a customised one. */
export const LEGACY_DEFAULT_BOOKMARK_IDS = [
    'anthropic/claude-opus-4.5',
    'google/gemini-3-pro-preview',
    'openai/gpt-5.1',
];

/** Suggestions shown in an empty chat. Plain ASCII, so they work with any model. */
export const STARTER_PROMPTS = ['acid techno bass', 'dusty boom bap', 'lush ambient pads'];
~~~~

### 6.2 System prompt (corrected)
Use this prompt for both providers (Grok and OpenRouter). Compared with the earlier version it fixes factual errors that made models write failing code: `ch`, `kick`, `tom`, `snap`, `tabla`, `hand`, `bass` and `gm` are not Strudel sounds; the drum machine banks are named `LinnDrum`, `AlesisHR16`, `BossDR110`, `YamahaRX5` and so on; `.add()` exists; `.compressor()` (not `.compress()`) is the dynamics compressor. The old "ASCII only" rule is replaced by "straight quotes only", since UTF-8 now reaches the player intact. Keep Hydra visuals and teaching comments on by default.

**`src/lib/systemPrompt.js`**

~~~~js
// SPDX-License-Identifier: MIT
/**
 * The instructions every conversation starts with.
 *
 * Keep the claims in here factual: a wrong sound name or function description makes models
 * write code that does not run. src/lib/systemPrompt.test.js guards the corrections made so far.
 */
export const SYSTEM_PROMPT = `You are a Strudel+Hydra Live Coding Expert. Generate executable, idiomatic Strudel code that runs correctly in the strudel.cc REPL on the first attempt.

# DEFAULT BEHAVIOR

## Include Hydra Visuals by Default
IMPORTANT: Unless the user explicitly asks you NOT to include visuals, ALWAYS include Hydra visual code alongside the music. Initialize Hydra with \`await initHydra()\` and create visuals that complement the music. Use audio-reactive visuals when appropriate with \`await initHydra({detectAudio: true})\`.

## Add Live Coding Comments by Default
IMPORTANT: Unless the user explicitly asks you NOT to include comments, ALWAYS add helpful inline comments that explain what each section does. These comments should help a newbie understand how to modify and "live code" with the Strudel patterns. Explain key parameters, suggest variations, and note what can be tweaked in real-time.

## Straight Quotes Only
CRITICAL: Typographic characters break the code. Strudel rejects smart quotes (“ ” ‘ ’) with "Unexpected character". In code always use straight quotes (", ') and a plain hyphen-minus (-). Accented letters, emoji and other Unicode are fine inside // comments and inside strings.

# CRITICAL: What Strudel IS and IS NOT

Strudel is a JavaScript-based implementation of TidalCycles for live coding music in the browser. It uses FUNCTIONAL REACTIVE PROGRAMMING with pattern-based composition, NOT imperative JavaScript.

## ❌ ANTI-PATTERNS - DO NOT USE:
- ❌ NO standard JavaScript loops: for, while, forEach
- ❌ NO Math.random() - use Strudel's randomness functions instead
- ❌ NO imperative state management or variables for pattern generation
- ❌ NO setInterval, setTimeout, or other timing functions
- ❌ NO nested function calls like s("piano", note("c e g"))
- ❌ NO imperative array manipulation for sequences
- ❌ NO undocumented methods: STRICTLY do NOT use any JavaScript methods, functions, or APIs that are not explicitly mentioned in this documentation. If it's not here, it likely doesn't exist in the Strudel REPL environment.

## ⚠️ COMMON ERRORS TO AVOID - READ CAREFULLY:
- ⚠️ "Error: got undefined instead of pattern": This is the #1 error. It happens when:
  1. You declare a variable but don't use it in the final expression.
  2. You use \`console.log()\` (returns undefined).
  3. You use a function that doesn't return a pattern.
  FIX: Ensure the LAST line of your code is the pattern you want to play, or put \`$:\` in front of each pattern you want to play (several \`$:\` lines play together, for example \`$: s("bd*4")\` and \`$: note("c2 g2").s("sawtooth")\`). Do NOT leave dangling variable declarations.
- ⚠️ "Error: .every() expects 2 inputs but got 3": .every() takes EXACTLY two arguments: (cycles, function). 
  - WRONG: .every(4, 0.5, fast) 
  - CORRECT: .every(4, x => x.fast(2))
- ⚠️ "Error: .on() is not a function": .on() is deprecated or doesn't exist. Use .every() or .sometimes() instead.
- ⚠️ .add() adds numbers or patterns together, for example n("0 2 4").add("<0 3>"). It does NOT layer sounds: use stack() to layer patterns.

## ✅ CORRECT PATTERNS - ALWAYS USE:
- ✅ Method chaining: note("c e g").s("piano").room(0.5)
- ✅ Mini-notation for sequences: "bd sd [~ bd] sd"
- ✅ Strudel's randomness: .sometimes(), .rarely(), ? in mini-notation
- ✅ Pattern functions: stack(), cat(), seq()
- ✅ Time modifiers: .fast(), .slow(), .every()

# Mini-Notation Syntax (Complete Reference)

Mini-notation is Strudel's pattern language. Use it inside strings with s(), note(), n(), etc.

## Basic Sequences
- Space-separated events: "c e g b" (4 events per cycle)
- Each event gets equal time in the cycle

## Subdivision with Brackets []
- [b4 c5] - nest events (subdivide time)
- "e5 [b4 c5] d5" - b4 and c5 share the time of one event
- Unlimited nesting: "e5 [b4 [c5 d5]]"

## Rests
- ~ - silence/rest
- "bd ~ sd ~" - kick on 1, snare on 3

## Polyphony/Chords (Commas)
- [c3,e3,g3] - play simultaneously (chord)
- "bd sd, hh*8" - layer patterns (comma outside brackets)

## Multiplication * (Speed Up)
- *2 - play twice as fast
- "bd*4" - 4 kicks per cycle
- "[c e g]*2" - sequence plays twice

## Division / (Slow Down)
- /2 - play over 2 cycles
- "[c e g a]/2" - sequence spans 2 cycles
- Works with decimals: /2.5

## Angle Brackets <> (Alternate Per Cycle)
- <a b c> - one per cycle (a on cycle 1, b on cycle 2, c on cycle 3)
- "<bd sd cp>" - different drum each cycle
- Auto-adjusts length: "<a b c d e>" - 5 cycles to complete

## Elongation @ (Temporal Weight)
- @2 - make event twice as long
- "<[c,e,g]@2 [d,f,a] [e,g,b]>" - first chord is longer

## Replication ! (Repeat Without Speeding Up)
- !2 - repeat event (doesn't change speed)
- "<[c,e,g]!2 [d,f,a]>" - first chord appears twice

## Randomness
- ? - 50% chance of playing
- ?0.3 - 30% chance of playing
- "bd*8?" - randomly skip some kicks
- | - random choice: "bd|sd|cp" picks one randomly

## Euclidean Rhythms (beats, segments, offset)
- (3,8) - 3 beats distributed over 8 segments
- "bd(3,8)" - Euclidean kick pattern
- "bd(3,8,2)" - offset by 2 steps
- Great for polyrhythms: "bd(3,8), sd(5,8)"

## Sound Selection with :
- hh:0 - select first hihat sample
- "hh:0 hh:1 hh:2 hh:3" - cycle through samples
- Works with n() too: s("hh").n("0 1 2 3")

# Core Functions and Method Chaining

## Pattern Creation
- s("bd sd hh") - play samples by name
- note("c e g") - play notes (letter notation)
- n("0 2 4") - play notes (numeric, semitones from root)
- sound("piano") or .s("piano") - select sound/instrument

## Method Chaining Order
1. Start with pattern creation: note(), s(), n()
2. Add sound selection: .s(), .sound(), .bank()
3. Add effects: .lpf(), .room(), .delay()
4. Add time modifiers: .fast(), .slow(), .every()

Example: note("c e g").s("sawtooth").lpf(800).fast(2)

## Pattern Combination Functions
- stack(pattern1, pattern2, ...) - layer patterns (play simultaneously)
- cat(pattern1, pattern2, ...) - concatenate (play sequentially)
- seq(pattern1, pattern2, ...) - sequence patterns
- silence() - create silence
- run(n) - ascending sequence 0 to n-1

Example:
stack(
  s("bd sd"),
  s("hh*8"),
  note("c eb g").s("sawtooth")
)

# Time Modifiers (Essential for Variation)

- .slow(n) - slow down by factor n
- .fast(n) - speed up by factor n
- .early(n) - shift earlier by n cycles
- .late(n) - shift later by n cycles
- .rev() - reverse pattern
- .palindrome() - play forward then backward
- .iter(n) - rotate pattern over n cycles
- .every(n, fn) - apply function every n cycles
- .sometimes(fn) - apply function 50% of the time
- .rarely(fn) - apply function 25% of the time
- .often(fn) - apply function 75% of the time
- .euclid(beats, segments) - apply Euclidean rhythm
- .ply(n) - repeat each event n times

Examples:
- s("bd sd").every(4, rev) - reverse every 4th cycle
- note("c e g").sometimes(x => x.fast(2)) - occasionally double speed
- s("hh*8").rarely(x => x.gain(0)) - occasionally mute

# Samples and Sound Banks

## Default Sounds (Always Available)
Drums: bd (kick), sd (snare), hh (closed hi-hat), oh (open hi-hat), cp (clap), rim (rimshot), ht / mt / lt (high / mid / low tom), cr (crash), rd (ride), cb (cowbell), sh (shaker), tb (tambourine), brk (break), misc
Other samples: clap, jazz, casio, piano, plus world and orchestral percussion such as agogo, bongo, conga, cajon, marimba, kalimba, harp
General MIDI instruments are named gm_<instrument>, for example gm_acoustic_bass, gm_electric_bass_finger, gm_piano, gm_epiano1, gm_violin, gm_string_ensemble_1, gm_synth_strings_1, gm_pad_warm, gm_lead_2_sawtooth, gm_flute, gm_marimba, gm_vibraphone, gm_church_organ, gm_trumpet
These names do NOT exist and fail with "sound ... not found": ch, kick, tom, snap, tabla, hand, bass, gm, perc (outside a drum machine bank). Use hh for a closed hat, bd for a kick, ht/mt/lt for toms, cp for a clap, gm_acoustic_bass or a synth for bass.

## Drum Machines (Use with .bank())
- Banks: RolandTR808, RolandTR909, RolandTR707, RolandTR606, RolandTR505, LinnDrum, AkaiLinn, AkaiMPC60, OberheimDMX, KorgMinipops, BossDR110, AlesisHR16, YamahaRX5, CasioSK1, EmuSP12. Short names such as "tr909" work too.
- A bank only has the drums it was built with (bd, sd, hh, oh, cp, rim, ht, mt, lt, cr, rd, cb, sh, tb and similar)
- Usage: s("bd sd hh").bank("RolandTR808")
- Pattern banks: s("bd sd").bank("<RolandTR808 RolandTR909>")

## Sound Selection
- s("hh").n("0 1 2 3") - cycle through samples
- s("hh:0 hh:1 hh:2") - select in mini-notation
- Numbers wrap: if only 4 samples, n("0 1 2 3 4 5") wraps 4→0, 5→1

# Synths and Waveforms

## Basic Waveforms
- sawtooth, square, triangle, sine, supersaw, pulse
- Noise: white, pink, brown, crackle
- Usage: note("c e g").s("sawtooth")

## FM Synthesis Parameters
- .fm(n) - FM modulation amount
- .fmh(n) - FM harmonicity ratio
- .fmattack(n) - FM envelope attack
- .fmdecay(n) - FM envelope decay
- .fmsustain(n) - FM envelope sustain

## Vibrato
- .vib(n) - vibrato amount
- .vibmod(n) - vibrato modulation

# Audio Effects (Comprehensive)

## Filters
- .lpf(freq) - lowpass filter (20-20000 Hz)
- .hpf(freq) - highpass filter
- .bpf(freq) - bandpass filter
- .lpq(resonance) - lowpass resonance (0-30)
- .hpq(resonance) - highpass resonance
- .bpq(resonance) - bandpass resonance
- .vowel("a"|"e"|"i"|"o"|"u") - vowel filter

## Envelope (ADSR)
- .attack(seconds) - attack time
- .decay(seconds) - decay time
- .sustain(level) - sustain level (0-1)
- .release(seconds) - release time
- .adsr(a:d:s:r) - all at once: .adsr("0.01:0.2:0.5:0.1")

## Dynamics
- .gain(level) - volume (0-1, can go higher)
- .velocity(level) - MIDI-style velocity
- .compressor("threshold:ratio:knee:attack:release") - dynamics compressor, for example .compressor("-20:20:10:.002:.02")
- (.compress(start, end) is NOT dynamics compression: it squeezes the events into part of each cycle)

## Panning
- .pan(position) - stereo position (0=left, 0.5=center, 1=right)
- .jux(fn) - apply function to right channel only
- .juxBy(amount, fn) - partial stereo separation

## Waveshaping/Distortion
- .distort(amount) - distortion (0-1)
- .crush(bits) - bitcrusher (1-16)
- .coarse(factor) - sample rate reduction

## Global Effects (Applied to Entire Mix)
- .delay(time) - delay time (0-1)
- .delayfeedback(amount) - delay feedback (0-1)
- .room(size) - reverb amount (0-1)
- .roomsize(size) - reverb room size (0-1)
- .phaser(speed) - phaser effect
- .phaserdepth(amount) - phaser depth

## Sampler-Specific Effects
- .begin(point) - start point (0-1)
- .end(point) - end point (0-1)
- .speed(rate) - playback speed (negative = reverse)
- .cut(group) - cut group (stops other sounds in same group)
- .loop(1) - loop sample
- .loopBegin(point) - loop start point
- .loopEnd(point) - loop end point
- .chop(n) - chop into n slices
- .slice(n, pattern) - slice and rearrange
- .splice(n, pattern) - slice with time-stretching
- .fit() - fit sample to event duration

# Hydra Visual Integration

## Initialization (REQUIRED for visuals)
await initHydra() // Must be first line if using Hydra

## Hydra Options
await initHydra({detectAudio: true}) // Enable audio reactivity
await initHydra({feedStrudel: true}) // Transform Strudel visuals

## Using Patterns in Hydra
H(pattern) - convert Strudel pattern to Hydra input
Example:
await initHydra()
let pattern = "3 4 5 [6 7]*2"
shape(H(pattern)).out(o0)
note(pattern).s("piano")

## Common Hydra Functions
- osc(freq, sync, offset) - oscillator
- shape(sides, radius, smoothing) - shapes
- rotate(angle, speed) - rotation
- modulate(source, amount) - modulation
- blend(source, amount) - blending
- out(o0) - output to buffer o0

# Tempo Control

setcpm(bpm/4) - set the tempo in BPM (4 beats per cycle), for example setcpm(120/4)
setcps(n) - set cycles per second
- 0.5 cps ≈ 120 BPM (at 4/4 time)
- 1 cps ≈ 240 BPM
- Default is usually 0.5

# Common Pattern Examples

## Basic Beat
s("bd sd [~ bd] sd, hh*8")

## Euclidean Drums
s("bd(3,8), sd(5,8,2), hh(7,8)")

## Bassline
note("c2 [eb2 g2] c2 bb1").s("sawtooth").lpf(800)

## Chord Progression
note("<[c3,e3,g3] [a2,c3,e3] [f3,a3,c4]>").s("piano")

## Layered Composition
stack(
  s("bd(3,8), sd(5,8)"),
  note("c2 eb2 g2 bb2").s("sawtooth").lpf(600),
  note("<[c4,e4,g4] [f4,a4,c5]>").s("piano").room(0.5)
)

# Code Structure Best Practices

1. Initialize Hydra first (if using): await initHydra()
2. Use backticks \` for multi-line mini-notation
3. Use double quotes " for single-line mini-notation  
4. Use single quotes ' for regular strings (not parsed as patterns)
5. Comment sections clearly with //
6. One pattern per line for readability
7. Chain methods in logical order: sound → effects → time

# Strudel vs Standard JavaScript

- Tidal's $ operator reverses in Strudel: foo $ bar becomes bar.foo()
- No custom operators - use named functions
- Pattern-first thinking: build patterns, then transform them
- Declarative, not imperative: describe what you want, not how to do it

# Output Format

Present code in markdown code blocks:
\`\`\`javascript
// Your Strudel code here
\`\`\`

For explanations, use clear markdown with headings and lists.
For code generation, prioritize working code over explanation.
ALWAYS double-check syntax before responding - one-shot correctness is critical.
`;
~~~~

### 6.3 Streaming with Stop
Stream replies (OpenRouter: `stream: true`, Server-Sent Events). Show the text live. The Send button becomes **Stop** while a reply arrives, and Esc also stops it, unless a dialog used that key press to close itself. Stopping aborts the request (`AbortController`), keeps the text received so far marked "stopped", and does **not** load a half-finished pattern into the player. Stopping before any text arrived adds no empty reply. A stream that fails midway keeps the partial text and adds the error. Apply the same to the Grok provider if its API streams; otherwise at least support cancelling the request.

This parser handles events split across network chunks, including a multi-byte character or a CRLF pair cut in half, and comment keep-alives:

**`src/lib/sse.js`**

~~~~js
// SPDX-License-Identifier: MIT

/**
 * Parse a Server-Sent Events stream and yield the `data` payload of each event.
 *
 * Handles events split across network chunks (including a multi-byte character or a
 * CRLF pair cut in half), `\n`, `\r\n` and `\r` line endings, multi-line `data:` fields,
 * and comment lines (`: OPENROUTER PROCESSING` keep-alives). Other fields are ignored.
 * The `[DONE]` sentinel is yielded like any other payload; the caller decides what it means.
 *
 * @param {ReadableStream<Uint8Array>} body
 * @returns {AsyncGenerator<string>}
 */
export async function* readSSE(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const events = function* (text) {
        for (const raw of text.split('\n\n')) {
            const data = [];
            for (const line of raw.split('\n')) {
                if (line === '' || line.startsWith(':')) continue;
                const colon = line.indexOf(':');
                const field = colon === -1 ? line : line.slice(0, colon);
                if (field !== 'data') continue;
                const value = colon === -1 ? '' : line.slice(colon + 1);
                data.push(value.startsWith(' ') ? value.slice(1) : value);
            }
            if (data.length > 0) yield data.join('\n');
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // A trailing "\r" may be the first half of "\r\n": wait for the next chunk.
            const pending = buffer.endsWith('\r') ? '\r' : '';
            const complete = pending ? buffer.slice(0, -1) : buffer;
            const normalised = complete.replace(/\r\n?/g, '\n');

            const lastBoundary = normalised.lastIndexOf('\n\n');
            if (lastBoundary === -1) {
                buffer = normalised + pending;
                continue;
            }
            yield* events(normalised.slice(0, lastBoundary));
            buffer = normalised.slice(lastBoundary + 2) + pending;
        }
        buffer += decoder.decode();
        const rest = buffer.replace(/\r\n?/g, '\n');
        if (rest.trim() !== '') yield* events(rest);
    } finally {
        reader.releaseLock();
    }
}
~~~~

OpenRouter specifics: each `data:` payload is JSON with `choices[0].delta.content` and `model`; `[DONE]` ends the stream; a payload with an `error` object means the provider failed midway. If a response arrives as `application/json` instead, treat it as a normal non-streamed completion.

### 6.4 Key in the address, key storage, referer
- A key passed as `#sk-or-v1-…` is read **once**, percent-decoded (downstream already decodes), and **removed from the address bar** with `history.replaceState`. It is used in memory only and never stored. Do it once, outside React state initialisers (React StrictMode runs initialisers twice; the second run would no longer find the key). In an SSR app, run it on the client only.
- **"Remember key on this device"** in settings, on by default (existing stored keys keep working). Off: the key is removed from storage and lives in memory for the tab only. A **"Forget key"** button clears the stored key, the in-memory key and any temporary URL key. Store the choice as `svc.rememberKey` ("true"/"false"; missing means on).
- The `HTTP-Referer` header sent to OpenRouter must be origin + path only (`location.origin + location.pathname`), never the full URL, which can contain the key.

**`src/lib/urlKey.js`**

~~~~js
// SPDX-License-Identifier: MIT

const KEY_HASH_PREFIX = '#sk-or-v1-';

/**
 * A key can be handed to the app in the address: `https://…/#sk-or-v1-…`.
 * Read it and remove it from the address bar straight away (history.replaceState also
 * rewrites the current history entry), so it is not left in the URL, in screenshots,
 * in the back/forward history of this tab, or in the referrer of links followed later.
 * The key is returned for use in memory only; it is never written to storage.
 * Hashes that are not a key are left alone.
 *
 * @param {{ location: Location, history: History } | undefined} win
 * @returns {string} the key, or '' when the address holds none
 */
export function takeKeyFromHash(win) {
    if (!win) return '';
    const { location, history } = win;
    const hash = location.hash || '';
    if (!hash.startsWith(KEY_HASH_PREFIX)) return '';

    let key = hash.slice(1);
    try {
        key = decodeURIComponent(key);
    } catch {
        // not valid percent-encoding: use it as it is
    }
    try {
        history.replaceState(history.state, '', location.pathname + location.search);
    } catch {
        // some embedding contexts forbid replaceState; the key is still used in memory
    }
    return key.trim();
}

/**
 * The key found in the address when the page loaded. Computed once, at module load, on purpose:
 * React may run state initialisers twice in development, and the second run would no longer
 * find the key in the address.
 */
export const urlKey = takeKeyFromHash(typeof window === 'undefined' ? undefined : window);

/** The page URL without hash and query: what is sent to OpenRouter as the app's identity. */
export function appReferer(loc = window.location) {
    return `${loc.origin}${loc.pathname}`;
}
~~~~

### 6.5 Models (OpenRouter option)
Suggested OpenRouter models are the aliases that always point at the newest version of a family: `~x-ai/grok-latest`, `~anthropic/claude-opus-latest`, `~openai/gpt-sol-latest`, `~deepseek/deepseek-flash-latest`. Upstream also has a searchable model browser over https://openrouter.ai/api/v1/models (public, no key sent; filters for free models, aliases and provider; `:batch` variants and non-text models hidden), "not listed" badges for bookmarks OpenRouter no longer lists, and an explicit "Remove unavailable" button. Nothing is deleted or switched automatically. Adopt this for the OpenRouter option if it fits the downstream settings; the Grok subscription stays the default provider.

### 6.6 Accessibility
- Every icon-only button has an accessible name (`aria-label`); icons are `aria-hidden`.
- Clickable rows (chats, bookmarks) are real buttons; the import control is a real button that opens a hidden file input.
- Row actions that appear on hover also appear on keyboard focus (`group-focus-within`) and always on touch screens (`pointer: coarse`).
- Modal dialogs: `role="dialog"`, `aria-modal`, labelled; focus moves in on open, Tab stays inside, Esc closes, focus returns to the button that opened it. Non-modal panels (the chat list) get the same without the Tab trap.
- A polite status region announces "Generating a reply", "Reply received", "Generation stopped" and errors.
- One clearly visible focus ring for every control; no text dimmed with opacity below WCAG AA contrast.
- Check with axe-core: zero violations in the main view, chat list and settings.

The dialog behaviour upstream uses:

**`src/hooks/useDialog.js`**

~~~~js
// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => el.getClientRects().length > 0;

/**
 * Behaviour shared by the app's dialogs and overlay panels.
 *
 * - on open, focus moves into the dialog (first control, or the dialog itself)
 * - on close, focus returns to what had it before (the button that opened it)
 * - Escape closes it; the event is marked handled so that nothing else (such as "Esc stops
 *   generating") also reacts to the same key press
 * - with `trap`, Tab and Shift+Tab cycle inside the dialog (use for modal dialogs)
 *
 * @param {{ onClose: () => void, trap?: boolean }} options
 * @returns {{ attach: (node: HTMLElement | null) => void, onKeyDown: (e: React.KeyboardEvent) => void }}
 *   use as `const { attach, onKeyDown } = useDialog(...)` and `<div ref={attach} onKeyDown={onKeyDown}>`
 */
export function useDialog({ onClose, trap = false }) {
    const nodeRef = useRef(null);
    const attach = useCallback((node) => { nodeRef.current = node; }, []);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    useEffect(() => {
        const previous = document.activeElement;
        const node = nodeRef.current;
        const first = node && [...node.querySelectorAll(FOCUSABLE)].find(isVisible);
        (first || node)?.focus();
        return () => {
            if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
        };
    }, []);

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeRef.current();
            return;
        }
        if (!trap || e.key !== 'Tab' || !nodeRef.current) return;
        const items = [...nodeRef.current.querySelectorAll(FOCUSABLE)].filter(isVisible);
        if (items.length === 0) {
            e.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!nodeRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && (active === first || active === nodeRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return { attach, onKeyDown };
}
~~~~

### 6.7 Chat import and export
- Export the versioned format `{ "format": "strudel-vibe-coder-chats", "version": 2, "exportedAt": "<ISO date>", "chats": [ ... ] }` for one chat or all chats, as a Blob download (not a `data:` URL). Each chat is `{ id, name, messages: [{ role, content, code?, model?, stopped? }], createdAt }`.
- Import must accept: that format; the older bare chat object and bare array of chats (upstream's earlier exports); and **the downstream app's own existing export files** (whatever shape they have today, so users' backups keep working).
- Never trust a file: rebuild chats and messages from known fields only, skip and count entries that cannot be shown, give every imported chat a fresh id, refuse files over 20 MB, and show a clear message for invalid JSON or unrelated files.

**`src/lib/chatFile.js`**

~~~~js
// SPDX-License-Identifier: MIT
import { generateId } from './utils';

/**
 * Chat backup files.
 *
 * Version 2 (current): `{ format, version: 2, exportedAt, chats: [...] }`, for one chat or many.
 * Before version 2 the app wrote a bare chat object (export of one chat) or a bare array of chats
 * (export of all chats). Both still import.
 *
 * Importing never trusts the file: each chat and message is rebuilt from the fields the app knows,
 * entries that cannot be shown are skipped (and counted), and every chat gets a fresh id so an
 * import can never overwrite or merge with an existing chat.
 */
export const CHAT_FILE_FORMAT = 'strudel-vibe-coder-chats';
export const CHAT_FILE_VERSION = 2;

/** Largest backup file the import accepts. Chats live in localStorage, which holds only a few MB anyway. */
export const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024;

const MAX_NAME_LENGTH = 200;
const ROLES = new Set(['user', 'assistant']);

/** An error whose message is meant to be shown to the user as it is. */
export class ChatFileError extends Error {}

/**
 * @typedef {import('./chats').Chat} Chat
 * @typedef {{ chats: Chat[], skippedChats: number, skippedMessages: number, version: number, warnings: string[] }} ChatFileResult
 */

/**
 * @param {Chat[]} chats
 * @param {Date} [now]
 */
export function buildExport(chats, now = new Date()) {
    return { format: CHAT_FILE_FORMAT, version: CHAT_FILE_VERSION, exportedAt: now.toISOString(), chats };
}

/**
 * A file name that is safe on every platform. A single-chat export is named after the chat;
 * "export all" is always a dated backup, even when there happens to be only one chat.
 * @param {Chat[]} chats
 * @param {{ all?: boolean, now?: Date }} [options]
 */
export function exportFileName(chats, { all = false, now = new Date() } = {}) {
    if (!all && chats.length === 1) {
        const slug = String(chats[0].name || 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
        return `strudel-chat-${slug || 'chat'}.json`;
    }
    return `strudel-chats-backup-${now.toISOString().slice(0, 10)}.json`;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanMessage(m) {
    if (!isObject(m) || !ROLES.has(m.role) || typeof m.content !== 'string') return null;
    const message = { role: m.role, content: m.content };
    if (typeof m.code === 'string' || m.code === null) message.code = m.code;
    if (typeof m.model === 'string') message.model = m.model;
    if (m.stopped === true) message.stopped = true;
    return message;
}

function cleanChat(c, now, makeId) {
    if (!isObject(c) || !Array.isArray(c.messages)) return null;
    const messages = [];
    let skipped = 0;
    for (const m of c.messages) {
        const clean = cleanMessage(m);
        if (clean) messages.push(clean);
        else skipped++;
    }
    const name = typeof c.name === 'string' ? c.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    const created = typeof c.createdAt === 'string' && !Number.isNaN(Date.parse(c.createdAt)) ? c.createdAt : now.toISOString();
    return {
        chat: { id: makeId(), name: name || `Imported ${now.toLocaleTimeString()}`, messages, createdAt: created },
        skippedMessages: skipped,
    };
}

/**
 * Read a backup file's text.
 * @param {string} text
 * @param {{ now?: Date, makeId?: () => string }} [options]
 * @returns {ChatFileResult}
 * @throws {ChatFileError} when the file is not a chat backup or holds no usable chat
 */
export function parseChatFile(text, { now = new Date(), makeId = generateId } = {}) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new ChatFileError('This file is not valid JSON.');
    }

    let rawChats;
    let version = 1;
    const warnings = [];
    if (Array.isArray(data)) {
        rawChats = data; // legacy "Export All"
    } else if (isObject(data) && data.format === CHAT_FILE_FORMAT && Array.isArray(data.chats)) {
        version = Number.isInteger(data.version) ? data.version : CHAT_FILE_VERSION;
        rawChats = data.chats;
        if (version > CHAT_FILE_VERSION) {
            warnings.push(`This file was made by a newer version of the app (format ${version}); it was imported as far as this version understands it.`);
        }
    } else if (isObject(data) && Array.isArray(data.messages)) {
        rawChats = [data]; // legacy single chat
    } else {
        throw new ChatFileError('This file does not look like a Strudel Vibe Coder chat backup.');
    }

    const chats = [];
    let skippedChats = 0;
    let skippedMessages = 0;
    for (const raw of rawChats) {
        const result = cleanChat(raw, now, makeId);
        if (result) {
            chats.push(result.chat);
            skippedMessages += result.skippedMessages;
        } else {
            skippedChats++;
        }
    }
    if (chats.length === 0) throw new ChatFileError('No chats found in this file.');
    return { chats, skippedChats, skippedMessages, version, warnings };
}

/** One-line summary of an import for the user. */
export function describeImport({ chats, skippedChats, skippedMessages, warnings }) {
    const parts = [`Imported ${chats.length} chat${chats.length === 1 ? '' : 's'}.`];
    const skipped = [];
    if (skippedChats) skipped.push(`${skippedChats} chat${skippedChats === 1 ? '' : 's'}`);
    if (skippedMessages) skipped.push(`${skippedMessages} message${skippedMessages === 1 ? '' : 's'}`);
    if (skipped.length) parts.push(`Skipped ${skipped.join(' and ')} that could not be read.`);
    return [...parts, ...warnings].join(' ');
}
~~~~

`generateId` is upstream's small helper:

**`src/lib/utils.js`**

~~~~js
// SPDX-License-Identifier: MIT
export function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
}
~~~~

### 6.8 Content-Security-Policy
Add a CSP derived from what **the downstream app** actually loads; do not copy upstream's policy. Upstream's is below for reference. Downstream needs additions for at least: the Grok platform script `https://grok.com/grok-app-builder/extensions.js`, the Grok provider and auth endpoints, `https://fonts.bunny.net` (`style-src` and `font-src`), and the `/__grok/*` manifest and icons (same origin). Keep `frame-src https://strudel.cc` and `connect-src` for OpenRouter. If the SSR framework injects inline scripts (hydration data), use nonces or hashes rather than `'unsafe-inline'`. If the platform lets you set HTTP response headers, prefer a header over `<meta>`, and then also set `frame-ancestors`. Test the deployed app with the policy enforced and fix every violation before shipping.

**`scripts/csp.js`**

~~~~js
// SPDX-License-Identifier: MIT
/**
 * Content-Security-Policy for the production build, derived from what the app actually loads:
 *
 * - its own script and stylesheet (no inline script, no inline style, no eval)
 * - icons are inline SVG elements and there are no web fonts or images from elsewhere
 * - connect-src: the OpenRouter API, called straight from the browser
 * - frame-src: the Strudel player, https://strudel.cc, shown in an iframe
 *
 * What runs inside the strudel.cc iframe (its scripts, samples from strudel.b-cdn.net, Hydra from
 * unpkg.com) is governed by strudel.cc's own policy, not by this one: frame-src only decides
 * which address the iframe may open.
 *
 * Limits of a policy delivered through <meta>: it cannot set `frame-ancestors` (so it does not
 * stop other sites from embedding this app), `sandbox`, or a reporting endpoint. Those need real
 * HTTP response headers, which GitHub Pages does not let us set.
 */
export const CSP_DIRECTIVES = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'connect-src': ['https://openrouter.ai'],
    'frame-src': ['https://strudel.cc'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'none'"],
};

/** @param {Record<string, string[]>} [directives] */
export function buildCsp(directives = CSP_DIRECTIVES) {
    return Object.entries(directives)
        .map(([name, sources]) => `${name} ${sources.join(' ')}`)
        .join('; ');
}
~~~~

## 7. Things not to bring over

Upstream's GitHub Pages workflow, `docs/` build output, OpenRouter-only defaults, upstream's attribution URL, and its `THIRD_PARTY_NOTICES.md` bundle list.

## 8. Data compatibility (existing users must not lose anything)

- Keep reading and writing `svc.apiKey`, `svc.models`, `svc.model`, `svc.chats`, `svc.chat`, `svc.code`. Do not rename them. New: `svc.rememberKey`.
- On first load after the update, existing chats, the current chat, the saved code, the selected model and the stored key must all still be there.
- Repair rather than crash: corrupt JSON, a current-chat id that no longer exists, or the string "null" as an id fall back to the first chat (or a fresh one when none exist).
- If bookmarks are migrated to the new suggested models, keep any list the user customised exactly as it is, and keep the currently selected model bookmarked.
- Users' existing downstream export files and upstream export files (section 6.7) must import.

## 9. Acceptance criteria (verify each on the deployed app)

1. The deployed bundle contains no `@strudel/embed` code, no `embed-*.js` chunk and no `strudel-repl` element: search every deployed JavaScript file for `strudel-repl` and `@strudel/embed`, and check the network panel for an `embed-` chunk.
2. The player iframe `src` starts with `https://strudel.cc/#`, and base64-decoding the part after `#` (after `decodeURIComponent`, as UTF-8) gives exactly the current code.
3. Audio plays after a user click inside the player.
4. Unicode round-trips: code containing `ä ö å € — "smart quotes"` and an emoji shows in the strudel.cc editor with ä ö å € and the emoji intact, and the smart quotes and dashes straightened.
5. Opening `https://strudel.grok.me/#sk-or-v1-test` leaves an address bar without the key, nothing is written to storage, and the referer sent to OpenRouter has no `#`.
6. The licence, source and Strudel links in the footer and settings work; the footer no longer says "Based on strudel-vibe-coder (AGPL-3.0)". AGPL still appears in the Strudel attribution; that is correct.
7. Existing chats, the key, the selected model and the saved code survive the update (test with a browser profile that used the previous version).
8. An upstream export file (version 2) and an older downstream export file both import.
9. With the CSP enforced there are no `securitypolicyviolation` events in normal use, including Grok sign-in, the Grok banner, fonts and the player.
10. axe-core reports no violations in the main view, chat list and settings, on desktop and phone widths.

## 10. Manual test checklist

- [ ] New user: Grok is the default provider; switching to OpenRouter with a key works.
- [ ] Type or pick a starter chip; the reply streams; the pattern loads into the Stage; press play; you hear it.
- [ ] Press Stop (and Esc) during a reply: the partial text stays, marked stopped; the player is not changed.
- [ ] Hydra visuals appear for a pattern that uses `await initHydra()`.
- [ ] Phone: Chat/Stage tabs; music keeps playing while Chat is in front; a new pattern marks the Stage tab instead of jumping to it.
- [ ] Settings: remember key on/off, Forget key, model choice; Esc closes and focus returns.
- [ ] Keyboard only: reach and use every control, including chat rename, export and delete.
- [ ] Export all chats, clear site data, import the file: everything is back.
- [ ] Footer links (MIT licence, source, Strudel, Strudel source) open the right pages.
- [ ] Grok banner, Remix, sign-in and the platform extension still work.

## 11. Known limitations

- The player depends on strudel.cc's `#<base64>` URL loading, a public but informal contract that strudel.cc could change.
- New code remounts the player, which stops the music that was playing (same as before).
- iframe URLs above about 2 MiB cannot be opened (the component shows a copy/open fallback).
- localStorage holds only a few MB; very large chat histories can fail to save, so recommend exporting.
- An error reply stays in the conversation and is sent back to the model as context on the next turn.
- A `<meta>` CSP cannot set `frame-ancestors`, `sandbox` or a reporting endpoint.

## 12. Rollback

Before starting, note the current Grok Build version of strudel.grok.me. If anything in sections 9 or 10 fails in production, restore that previous version in Grok Build (version history / restore), then fix and redeploy. The data stays compatible both ways because the `svc.*` keys keep their meaning; the only new key, `svc.rememberKey`, is ignored by the previous version.
