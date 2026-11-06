# Grok Build handoff: sync strudel.grok.me with upstream strudel-vibe-coder

This brief is complete on its own: you don't need access to any repository. Where source code is given, copy it, then adapt only the parts marked as platform-specific. All upstream code is MIT licensed.

## 1. What this sync is

- Upstream: https://github.com/ronnqvist/strudel-vibe-coder (MIT, Copyright (c) 2025-2026 Simon Rönnqvist).
- The **previous sync** was based on upstream commit `250786e6cbd6ba923d846a186ddfa948574784c9`. This brief is a **delta** from that commit.
- The **implementation** this brief describes is upstream commit `9f0eff6d4dbc14df1187633a32cbbc990c7f49a4`. That commit contains every module below. If it reaches `main` through a squash merge, the commit on `main` has a different id but the same code.
- Strudel is a separate AGPL-3.0 project. The app opens https://strudel.cc in an iframe. Do not bundle Strudel code, do not add `@strudel/embed`, and do not read or script the iframe. All of that is unchanged from the previous sync.

The downstream app is its own codebase (TanStack Start). This is not a copy-over: keep its structure, and port the behaviour and the modules below.

## 2. Keep exactly as they are

- **Provider:** "Grok · provided by this app" stays the default provider. It is served through same-origin `POST /api/grok-stream`, and BYOK OpenRouter stays an option.
- **Look and layout:** keep the header text and layout, the Chat / Stage tabs on mobile, and the "Describe a groove." empty state.
- **Starter content:** keep downstream's starter pattern and the chips **acid techno bass**, **dusty boom bap** and **lush ambient pads**.
- **Grok platform pieces:**
  - `extensions.js`
  - `/__grok/*`
  - the Created with Grok / Remix banner
  - the `grok-project-id` meta tags
  - Grok auth
  - fonts.bunny.net
- **CSP:** keep your HTTP-header CSP. Adapt it to your own setup; do not copy upstream's `<meta>` policy. Upstream added no new hosts.
- **Storage:** keep the localStorage keys `svc.apiKey`, `svc.models`, `svc.model`, `svc.chats`, `svc.chat`, `svc.code` and `svc.rememberKey` (section 6).
- **Provider code:** adapt the provider code to your two paths (Grok and OpenRouter). Do not copy upstream's OpenRouter-only defaults or its attribution URL.

## 3. What changed upstream since `250786e`

1. **Syntax check before load.** A pattern that doesn't parse (checked with acorn, without running it) never replaces the pattern that is playing. Downstream already has this.
2. **How a reply ended.** Every reply now has an explicit status: `completed`, `interrupted`, `truncated`, `aborted`, `refused` or `error`. Only `completed` may load into the player. The other states are marked in the chat, offer Retry, and are left out of the context sent back to the model.
3. **Lossless player code.** The strudel.cc URL carries exactly the validated code. Typography repair is a separate, syntax-aware step that runs **before** validation, only when the code doesn't parse, and is kept only if the repaired code parses.
4. **Per-chat patterns.** Each chat has its own pattern revisions and its own selected revision. The stage shows the viewed chat's selection. A reply that finishes in another chat changes only that chat. There is one request per chat, with its own AbortController: Stop and Esc cancel only the viewed chat's request, and other chats stay usable.
5. **No lost edits.** Every write after an `await` uses a functional update, so an edit or rename made during generation is no longer overwritten.
6. **Current pattern in every request.** The selected pattern is attached to the newest user message, in the request only.
   - **Use edited code:** paste code back from strudel.cc, which does not sync edits.
   - **Fix an error:** send a pasted player error together with the pattern on stage.
   - **Use this version** and **Restore previous** switch revisions.
   - **Open in Strudel** opens the pattern in a new tab.
7. **Corrected system prompt (upstream issue #8),** now composed per request. The composition is: output contract → core → modules chosen by simple word rules (synthesis, samples, harmony, arrangement, Hydra) → preferences → the user's own instructions. It has a `PROMPT_VERSION`, which is stored with each reply.
8. **Settings > Music.**
   - Hydra visuals: auto (the default), always, or never.
   - Comments: minimal, brief (the default), or teaching.
   - Advanced: up to 2,000 characters of the user's own music instructions.
9. **Smaller changes:**
   - a visible warning plus export when saving chats fails
   - export file format 3 (revisions included; formats 1 and 2 still import)
   - the chat no longer jumps to the bottom while the user reads further up
   - the model list shows context and output limits
   - a quick double Enter sends one request
10. **Fixes from an independent review of upstream (13 findings, all fixed before this handoff):**
   - The attribution line always names the model that wrote this version, and is left out of the pattern sent to the model.
   - A connection that breaks after text has arrived is `interrupted`, keeping the text. A stream that sends nothing is `error`. A reply that didn't complete and has no text gets a short explanation instead of an empty bubble.
   - Imports read `cutOff`, and failed replies stored as text ending in `

Error: …` count as errors (section 6).
   - A revision reused for a new message moves to that message.
   - Deleting a chat stops its request.
   - Background replies are announced under the chat's current name.
   - Notices are set or cleared on every reply.
   - Switching chats closes an open message edit.
   - "Fix an error" appears only when there is a pattern to send, and it keeps the pasted text if there is no key.
   - "Use this version" appears only on replies that contain code.
   - Two prompt examples didn't change the pitch (`.add` after `n()`, and `.off` after `.scale()`). They are corrected and checked in strudel.cc (`PROMPT_VERSION` 2.0.1).
   - The samples module is chosen for instrument requests.
   - Escape and Tab keep working in a dialog after its focused button disappears. The Chats panel is modal. Small text meets 4.5:1 contrast.
11. **Fixes from a second independent review of upstream (6 findings, all fixed before this handoff):**
   - The code check fails closed: if the parser file can't be loaded (for example in a tab opened before a deploy), nothing is loaded and the notice says to reload. The parser is preloaded at startup.
   - If saving the current chat id or the player mirror fails, the mirror is removed, so a reload can't bring back an older pattern or put another chat's pattern into the chat that opens (section 6).
   - An imported pattern that doesn't parse is not selected; it stays in the chat's data.
   - Switching chats always starts a fresh player, even when both chats have the same pattern.
   - API keys are removed from provider and network errors before they are shown, stored, exported or logged.
   - The reply header wraps on narrow phones.
12. **A fact check of the prompt against strudel.cc/learn** (each point checked in the real REPL): the `.mask` example now mutes the cycle it describes; patterns on one orbit overwrite each other's delay and reverb unpredictably; a `let`/`const` holding a pattern is allowed; default sounds are "loaded by default"; the lowpass range and the chaining order are worded as the docs give them. `PROMPT_VERSION` is now **2.0.2**; the system prompt you use on the Grok path must be this one.

## 4. Check downstream for the same defects

Everything below was observed in the deployed client bundle of strudel.grok.me on 2026-11-05 (`/assets/routes-*.js`). Server code was not visible. Verify each item on your side and fix it as described in section 5.

1. **A reply that ends without a terminal signal is treated as complete** (upstream #5).
   - **Observed:** the stream reader stops on `[DONE]`, and a reply whose stream simply closes (EOF) counts as complete if any text arrived. Only `finish_reason: "length"` is guarded (`cutOff`). `content_filter`, and `finish_reason: "error"` without an error object, also count as success.
   - **Grok path:** `/api/grok-stream` goes through the same reader, so the same applies there. Confirm whether your server forwards `finish_reason` and `[DONE]` at all.
2. **Typography is normalised after validation** (upstream #6).
   - **Observed:** acorn validates the raw code, and curly quotes and dashes are then replaced everywhere when the URL is built. So valid code with “ ” inside a string can reach strudel.cc as invalid code, and code with curly delimiters is refused even though a repair would fix it.
3. **One global pattern** (upstream #7).
   - **Observed:** `svc.code` is a single value, and a reply that finishes in another chat replaces the stage of the chat being viewed. There is one abort ref and one busy flag.
   - **Downstream only:** the streaming bubble renders in whichever chat is active, with no chat-id check, so a reply that is still arriving appears in the wrong chat.
   - **Also check:** whether a reply is written from a snapshot taken when the request started. In upstream, that made an edit or rename made during generation disappear.
4. **Wrong Strudel facts in the system prompt** (upstream #8).
   - **Observed:** the prompt in the client bundle is the old upstream text, wrong facts included (`.delay(time)`, `roomsize` 0-1, `vib`/`vibmod`, `silence()`).
   - **Grok path:** the client sends no system prompt to `/api/grok-stream`, so check which prompt your server uses and replace it as well.

## 5. Modules to port

Copy these files. Each heading names the upstream path; put them wherever fits your tree, but keep the module boundaries. The tests that cover them are listed in section 8.

### 5.1 Stream end states

`generateStrudelCode` is OpenRouter-specific (endpoint, headers, `SYSTEM_PROMPT` default). **Platform-specific:** keep your provider switch and your error scrubbing (keys removed, 280-character cap; upstream's `redact()` does the key part, so apply both), and keep `temperature`/`max_tokens` if you want them. Port the part between `let content` and the `return`: how terminal signals map to a status. Your Grok path needs the same status logic. If your server does not emit `finish_reason` or `[DONE]`, make it do so; otherwise every Grok reply will count as `interrupted`.

#### `src/lib/openrouter.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * OpenRouter API Client
 */
import { OPENROUTER_API_URL } from '../config';
import { extractCode, withAttribution } from './extractCode';
import { readSSE } from './sse';
import { SYSTEM_PROMPT } from './systemPrompt';
import { appReferer } from './urlKey';

/**
 * @typedef {'completed' | 'interrupted' | 'truncated' | 'aborted' | 'refused' | 'error'} GenerationStatus
 *
 * - completed:   the provider said the reply is finished (`finish_reason` stop or similar, or `[DONE]`)
 * - interrupted: the stream closed, or the connection broke, after some text and before any
 *                terminal signal; the text may be cut off anywhere
 * - truncated:   the provider stopped at its output-token limit (`finish_reason: "length"`)
 * - aborted:     the user stopped the request
 * - refused:     the model or provider declined (`finish_reason: "content_filter"` or a refusal)
 * - error:       the request or the stream failed (HTTP error, network error, error chunk, empty reply)
 *
 * Only a `completed` reply may be loaded into the player automatically.
 */

/**
 * @typedef {{
 *   role: 'assistant', status: GenerationStatus, content: string, code: string | null,
 *   finishReason: string | null, nativeFinishReason: string | null,
 *   error: { message: string, code?: number | string, type?: string } | null,
 *   usage: object | null, resolvedModel: string | null, modelLabel: string,
 *   stopped: boolean, truncated: boolean,
 * }} GenerationResult
 */

/** Status for a reply that reached a terminal signal, from its normalised finish_reason. */
function statusFromFinish(finishReason, refused) {
    if (refused || finishReason === 'content_filter') return 'refused';
    if (finishReason === 'length') return 'truncated';
    if (finishReason === 'error') return 'error';
    return 'completed'; // stop, tool_calls, null with [DONE], or a value added later
}

const KEY_PATTERNS = [/\bsk-or-[A-Za-z0-9_-]{8,}/g, /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi];

/**
 * Remove API keys from text that came from the provider or the network, before it is shown,
 * stored in the chat, exported or logged: the exact key of this request, and anything that looks
 * like an OpenRouter key or a bearer token.
 * @param {unknown} text
 * @param {string} [apiKey]
 */
export function redact(text, apiKey) {
    if (typeof text !== 'string') return text;
    let out = apiKey && apiKey.length >= 8 ? text.split(apiKey).join('[redacted]') : text;
    for (const pattern of KEY_PATTERNS) out = out.replace(pattern, '[redacted]');
    return out;
}

/** The parts of a provider error that are kept: message, code and type, with keys removed. */
function errorInfo(err, fallback, apiKey) {
    const info = { message: redact(err?.message || fallback, apiKey) };
    if (err?.code !== undefined) info.code = redact(err.code, apiKey);
    const type = err?.metadata?.error_type ?? err?.type;
    if (type) info.type = redact(type, apiKey);
    return info;
}

/**
 * Ask the model for Strudel code and stream the reply.
 *
 * Never throws once the request has been made: every outcome is a result with a `status`.
 * Only a missing API key throws (before any request).
 *
 * @param {string} apiKey
 * @param {string} model OpenRouter model id
 * @param {{ role: string, content: string }[]} conversation the whole conversation so far,
 *   including the user's newest message as its last entry (it is not appended again here)
 * @param {string} [modelName] display name used in the attribution line
 * @param {{ signal?: AbortSignal, onText?: (textSoFar: string) => void, systemPrompt?: string }} [options]
 *   `signal` stops the request; the text received so far is then returned with status `aborted`.
 *   `onText` is called with the full reply text every time it grows.
 *   `systemPrompt` is the composed prompt for this request (default: the full SYSTEM_PROMPT).
 * @returns {Promise<GenerationResult>}
 *   `resolvedModel` is the concrete model that answered (differs from `model` for `~...-latest` aliases);
 *   `modelLabel` is what to show for it: the concrete model for an alias, the display name otherwise.
 *   `stopped` and `truncated` mirror `status` for code (and stored chats) that predate `status`.
 */
export async function generateStrudelCode(apiKey, model, conversation, modelName, { signal, onText, systemPrompt = SYSTEM_PROMPT } = {}) {
    const cleanApiKey = apiKey?.trim();
    if (!cleanApiKey) {
        throw new Error("API Key is required");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        ...conversation
    ];

    let content = "";
    let resolvedModel = null;
    let finishReason = null;
    let nativeFinishReason = null;
    let usage = null;
    let refused = false;
    let terminal = false;
    let streaming = false;
    let error = null;
    let status;

    // Errors keep only a cleaned summary (see errorInfo), and only that is logged: a raw error
    // body or exception could contain the key
    const failure = (err, fallback) => errorInfo(err, fallback, cleanApiKey);

    const grow = (text) => {
        if (!text) return;
        content += text;
        onText?.(content);
    };

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${cleanApiKey}`,
                "HTTP-Referer": appReferer(), // Identifies the app to OpenRouter; never includes the URL hash
                "X-Title": "Strudel Vibe Coder", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
            }),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            error = failure(errorData.error, `OpenRouter API Error: ${response.status} ${response.statusText}`);
            if (error.code === undefined) error.code = response.status;
            console.error("OpenRouter Error Response:", error);
        } else {
            const contentType = response.headers?.get?.("content-type") || "";
            if (contentType.includes("application/json") || !response.body) {
                // The provider ignored `stream: true` and sent the whole reply at once.
                // A JSON body that parsed is complete, so a missing finish_reason does not mean it was cut off.
                const data = await response.json();
                resolvedModel = data.model || null;
                usage = data.usage || null;
                const choice = data.choices?.[0];
                if (data.error && !choice) {
                    error = failure(data.error, "The model reported an error");
                } else if (!choice) {
                    error = { message: "No response from model" };
                } else {
                    const refusal = choice.message?.refusal;
                    if (refusal) refused = true;
                    grow(choice.message?.content || refusal || "");
                    finishReason = choice.finish_reason || null;
                    nativeFinishReason = choice.native_finish_reason || null;
                    if (data.error) error = failure(data.error, "The model reported an error");
                    terminal = true;
                }
            } else {
                streaming = true;
                for await (const payload of readSSE(response.body)) {
                    if (payload === "[DONE]") {
                        terminal = true;
                        break;
                    }
                    let chunk;
                    try {
                        chunk = JSON.parse(payload);
                    } catch {
                        continue; // ignore a malformed event rather than lose the whole reply
                    }
                    if (chunk.error) {
                        // Mid-stream failure: OpenRouter ends the stream after this event (HTTP status stays 200)
                        error = failure(chunk.error, "The model reported an error");
                        break;
                    }
                    resolvedModel = chunk.model || resolvedModel;
                    if (chunk.usage) usage = chunk.usage;
                    const choice = chunk.choices?.[0];
                    const refusal = choice?.delta?.refusal;
                    if (refusal) {
                        refused = true;
                        grow(refusal);
                    }
                    grow(choice?.delta?.content);
                    if (choice?.finish_reason) {
                        finishReason = choice.finish_reason;
                        nativeFinishReason = choice.native_finish_reason || nativeFinishReason;
                        terminal = true; // a final chunk counts as the end even if [DONE] never arrives
                    }
                }
            }
        }
    } catch (err) {
        if (err?.name === "AbortError" || signal?.aborted) {
            status = "aborted";
        } else if (streaming && content) {
            // The connection broke while the reply was arriving (for example the network went away):
            // the text so far is kept and marked as interrupted, like a stream that closed early.
            status = "interrupted";
            error = failure(err, "The connection was interrupted");
            console.error("OpenRouter stream interrupted:", error);
        } else {
            error = failure(err, "The request failed");
            console.error("OpenRouter API Error:", error);
        }
    }

    if (!status) {
        if (error) status = "error";
        else if (!terminal && !content.trim()) {
            // The stream closed without sending anything: nothing to keep, so this is an error
            status = "error";
            error = { message: "No response from model" };
        } else if (!terminal) status = "interrupted";
        else status = statusFromFinish(finishReason, refused);
    }
    if (status === "error" && !error) error = { message: "The model reported an error" };
    if (status === "completed" && !content.trim()) {
        status = "error";
        error = { message: "No response from model" };
    }

    // For a `~...-latest` alias, name the model that really answered
    const modelLabel = resolvedModel && resolvedModel !== model ? resolvedModel : (modelName || model);
    const code = withAttribution(extractCode(content), modelLabel) || null;
    return {
        role: "assistant",
        status,
        content,
        code,
        finishReason,
        nativeFinishReason,
        error,
        usage,
        resolvedModel,
        modelLabel,
        stopped: status === "aborted",
        truncated: status === "truncated",
    };
}
~~~~

#### `src/lib/generation.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * What the app does with a finished request, by its status (see GenerationStatus in openrouter.js).
 * Pure functions, so the rules are tested without React.
 */

/** @typedef {import('./openrouter').GenerationStatus} GenerationStatus */

import { generateId } from './utils';

export const STATUSES = ['completed', 'interrupted', 'truncated', 'aborted', 'refused', 'error'];

/** Only a reply the provider said was finished may replace the pattern in the player by itself. */
export function canAutoLoad(status) {
    return status === 'completed';
}

/**
 * Short badge text and a longer explanation for a reply that did not complete. `null` for completed.
 * @param {GenerationStatus | undefined} status
 */
export function statusBadge(status) {
    switch (status) {
        case 'interrupted': return { label: 'interrupted', title: 'The connection closed before the reply was finished; the code may be incomplete' };
        case 'truncated': return { label: 'cut off', title: 'The model stopped at its length limit; the code may be incomplete' };
        case 'aborted': return { label: 'stopped', title: 'You stopped this reply' };
        case 'refused': return { label: 'refused', title: 'The model or provider declined this request' };
        case 'error': return { label: 'error', title: 'The request failed' };
        default: return null;
    }
}

/** Why a reply's code was not loaded into the player, for the notice above the player. `''` when it may load. */
export function notLoadedNotice(status) {
    switch (status) {
        case 'interrupted': return 'Not loaded into the player: the reply was interrupted before it finished, so its code may be incomplete. The previous pattern is still loaded.';
        case 'truncated': return 'Not loaded into the player: the reply was cut off at the model\'s length limit, so its code is incomplete. The previous pattern is still loaded.';
        case 'refused': return 'Not loaded into the player: the model declined this request. The previous pattern is still loaded.';
        default: return '';
    }
}

/**
 * The screen-reader announcement once a request has ended.
 * @param {{ status: GenerationStatus, code?: string | null, error?: { message: string } | null }} result
 * @param {'loaded' | 'invalid' | 'unchecked' | 'not-loaded' | 'none'} [load] what happened to the code
 */
export function announcement(result, load = 'none') {
    switch (result.status) {
        case 'aborted': return 'Generation stopped';
        case 'interrupted': return 'The reply was interrupted. The pattern was not loaded.';
        case 'truncated': return 'Reply was cut off at the length limit. The pattern was not loaded.';
        case 'refused': return 'The model declined the request. The pattern was not loaded.';
        case 'error': return `Error: ${result.error?.message || 'the request failed'}`;
        default:
            if (!result.code) return 'Reply received';
            if (load === 'loaded') return 'Reply received. The pattern was loaded into the player.';
            if (load === 'invalid') return 'Reply received. The pattern has a syntax error and was not loaded.';
            if (load === 'unchecked') return 'Reply received. The pattern could not be checked and was not loaded. Reload the page.';
            return 'Reply received';
    }
}

/**
 * The status of a stored message, including messages saved before `status` existed
 * (`stopped` / `truncated` / `cutOff` flags, and error replies stored as plain "Error: ..." text or
 * as partial text ending in "\n\nError: ...").
 * @param {{ role: string, status?: string, stopped?: boolean, truncated?: boolean, content?: string, model?: string }} message
 * @returns {GenerationStatus | undefined} undefined for user messages
 */
export function messageStatus(message) {
    if (message?.role !== 'assistant') return undefined;
    if (STATUSES.includes(message.status)) return message.status;
    if (message.truncated || message.cutOff) return 'truncated'; // cutOff: as strudel.grok.me stores it
    if (message.stopped) return 'aborted';
    if (typeof message.content === 'string') {
        if (!message.model && message.content.startsWith('Error: ')) return 'error';
        // strudel.grok.me stored a failed reply as its partial text followed by "\n\nError: …"
        if (/\n\nError: [^\n]*$/.test(message.content)) return 'error';
    }
    return 'completed';
}

/**
 * The messages to send to the model: role and content only, without replies that failed or did
 * not finish (they would teach the model a broken pattern or an error text).
 * @param {object[]} messages
 */
export function apiConversation(messages) {
    return messages
        .filter(m => m.role === 'user' || messageStatus(m) === 'completed')
        .map(m => ({ role: m.role, content: m.content }));
}

/**
 * The chat message stored for a finished request.
 * Keeps the `stopped` / `truncated` flags of earlier versions next to `status`, so an earlier
 * version of the app (after a rollback) still marks these replies.
 * @param {import('./openrouter').GenerationResult} result
 * @param {string} [modelName] fallback when the result names no model
 * @param {{ makeId?: () => string, promptVersion?: string }} [options] `promptVersion`: of the system prompt used
 */
const EMPTY_REPLY_TEXT = {
    truncated: 'The model reached its length limit before writing any reply text.',
    refused: 'The model declined this request.',
    interrupted: 'The connection closed before any reply text arrived.',
};

export function replyMessage(result, modelName, { makeId = generateId, promptVersion } = {}) {
    const empty = !(result.content ?? '').trim();
    const plainError = result.status === 'error' && empty;
    const content = plainError
        ? `Error: ${result.error?.message || 'the request failed'}`
        : (empty && EMPTY_REPLY_TEXT[result.status]) || result.content;
    return {
        id: makeId(),
        role: 'assistant',
        content,
        code: result.code ?? null,
        ...(!plainError && { model: result.modelLabel ?? modelName }),
        status: result.status,
        ...(result.finishReason && { finishReason: result.finishReason }),
        ...(result.error && result.content && { error: result.error.message }),
        ...(result.usage && { usage: result.usage }),
        ...(promptVersion && { promptVersion }),
        ...(result.status === 'aborted' && { stopped: true }),
        ...(result.status === 'truncated' && { truncated: true }),
    };
}
~~~~

`sse.js` is unchanged since `250786e`; keep your copy (`Kn`). Note a difference: your stream loop throws on a malformed event ("The reply stream was interrupted."), while upstream skips it. Either is acceptable, but with upstream's statuses a thrown malformed event becomes `error`, not `interrupted`.

### 5.2 Lossless encoding and syntax-aware repair

Remove `normalizeTypography` from URL building (your `vn` inside `xn`). The copy-to-clipboard fallback must also copy the exact code. `extractCode.js` picks the code block out of a reply and handles the attribution line (`withAttribution` replaces an existing one; `stripAttribution` is used before the pattern is sent to the model). Its `attributionLine` comes from your `config` (use your own URL).

#### `src/lib/extractCode.js`

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

/** The app's own attribution comment, when it is the first line. */
const ATTRIBUTION_LINE = /^\/\/ Generated by .+ via https?:\/\/\S+[ \t]*(\r?\n|$)/;

/**
 * The code without the app's attribution comment on its first line (other comments are kept).
 * @param {string} code
 */
export function stripAttribution(code) {
    return (code ?? '').replace(ATTRIBUTION_LINE, '');
}

/**
 * Put the attribution comment for `modelLabel` on top of `code`, once. An attribution line that
 * is already there (for example kept by a model revising another model's pattern) is replaced,
 * so the code always names the model that wrote this version. Returns '' for empty code.
 * @param {string} code
 * @param {string} [modelLabel] when missing, the code is returned unchanged
 */
export function withAttribution(code, modelLabel) {
    if (!code) return '';
    if (!modelLabel) return code;
    return `${attributionLine(modelLabel)}\n${stripAttribution(code)}`;
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

#### `src/lib/strudelUrl.js`

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
 * - The encoding is lossless for any JavaScript string that is valid UTF-16.
 * - Chromium refuses to navigate an iframe whose URL exceeds 2 MiB
 *   (the frame ends up at `about:blank#blocked`); 1.9 million characters still loaded.
 */

export const STRUDEL_ORIGIN = 'https://strudel.cc';

/** Longest iframe URL we hand to the browser. Chromium's hard limit is 2,097,152 characters. */
export const MAX_URL_LENGTH = 2_000_000;

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
 * Full strudel.cc URL for exactly the given code (lossless: decoding the fragment gives `code` back).
 * Any repair of the code happens before validation (preparePattern in patternCheck.js), never here.
 * @param {string} code
 * @returns {string}
 */
export function strudelUrl(code) {
    return `${STRUDEL_ORIGIN}/#${encodeStrudelHash(code)}`;
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

#### `src/lib/codeRepair.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * Repair the typographic punctuation models sometimes put in code: curly quotes used as string
 * delimiters (s(“bd sd”)) and en/em dashes used as a minus.
 *
 * Syntax-aware: straight-quoted strings, template literals and comments are copied unchanged,
 * so “ ” ‘ ’ – — inside them (which are valid JavaScript) survive. A curly-quoted string becomes a
 * straight-quoted one and its content is kept as it is. A curly string never runs past the end
 * of its line.
 *
 * This is only a candidate fix: preparePattern (patternCheck.js) uses it only when the original
 * code does not parse, and keeps it only when the repaired code does. Regular-expression
 * literals are not recognised; that is acceptable because of that parse check.
 */

const OPEN_DOUBLE = '“”';
const OPEN_SINGLE = '‘’';

/**
 * @param {string} code
 * @returns {string}
 */
export function repairTypography(code) {
    if (!code) return '';
    const n = code.length;
    let out = '';
    let i = 0;
    while (i < n) {
        const c = code[i];
        const next = code[i + 1];

        // comments: copy to their end
        if (c === '/' && next === '/') {
            const end = code.indexOf('\n', i);
            const stop = end === -1 ? n : end;
            out += code.slice(i, stop);
            i = stop;
            continue;
        }
        if (c === '/' && next === '*') {
            const end = code.indexOf('*/', i + 2);
            const stop = end === -1 ? n : end + 2;
            out += code.slice(i, stop);
            i = stop;
            continue;
        }

        // straight strings and template literals: copy to the matching unescaped delimiter
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1;
            while (j < n && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
            const stop = Math.min(j + 1, n);
            out += code.slice(i, stop);
            i = stop;
            continue;
        }

        // a curly quote outside any string opens a string: make it straight, keep its content
        if (OPEN_DOUBLE.includes(c) || OPEN_SINGLE.includes(c)) {
            const straight = OPEN_DOUBLE.includes(c) ? '"' : "'";
            const closers = straight === '"' ? `${OPEN_DOUBLE}"` : `${OPEN_SINGLE}'`;
            let j = i + 1;
            while (j < n && code[j] !== '\n' && !closers.includes(code[j])) j++;
            const closed = j < n && code[j] !== '\n';
            out += straight + code.slice(i + 1, j) + (closed ? straight : '');
            i = closed ? j + 1 : j;
            continue;
        }

        if (c === '–' || c === '—') {
            out += '-';
            i++;
            continue;
        }

        out += c;
        i++;
    }
    return out;
}
~~~~

#### `src/lib/patternCheck.js`

~~~~js
// SPDX-License-Identifier: MIT

/**
 * Check that a pattern is syntactically valid JavaScript before it is loaded into the player,
 * so a broken reply cannot replace a pattern that works.
 *
 * Uses the acorn parser, kept in a separate file to keep the initial page small. It parses the code
 * without running it, so it works under the app's Content-Security-Policy (which forbids eval and
 * the Function constructor).
 *
 * Fails closed: if the parser cannot be loaded (for example a tab opened before a new deploy, whose
 * parser file is gone) or fails in any way other than a syntax error, the pattern is refused with
 * a message saying it could not be checked. Nothing unchecked replaces a pattern that works.
 * The parser is preloaded at startup (preloadParser in main.jsx), so it comes from the same build
 * as the page.
 */

import { repairTypography } from './codeRepair';

const PARSE_OPTIONS = {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowAwaitOutsideFunction: true, // `await initHydra()` at the top level
    allowReturnOutsideFunction: true,
    allowHashBang: true,
};

export const UNAVAILABLE_MESSAGE = 'The code could not be checked because part of the app did not load. Reload the page, then choose "Use this version" on the reply.';

let parserPromise;
const importParser = () => import('acorn').then(m => m.parse);
const loadParser = (load = importParser) => (parserPromise ??= load());

/** Start loading the parser now, so a later check does not depend on the network. */
export function preloadParser() {
    loadParser().catch(() => { parserPromise = undefined; });
}

/**
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} deps for tests
 * @returns {Promise<{ error: string | null, unavailable: boolean }>}
 */
async function checkSyntax(code, deps) {
    if (!code || !code.trim()) return { error: null, unavailable: false };
    let parse = deps.parse;
    if (!parse) {
        try {
            parse = deps.load ? await deps.load() : await loadParser();
        } catch {
            parserPromise = undefined; // try again next time
            return { error: UNAVAILABLE_MESSAGE, unavailable: true };
        }
    }
    try {
        parse(code, PARSE_OPTIONS);
        return { error: null, unavailable: false };
    } catch (error) {
        if (error instanceof SyntaxError) return { error: error.message, unavailable: false };
        return { error: `The code could not be checked (${error?.message || 'parser error'}).`, unavailable: true };
    }
}

/**
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} [deps] for tests
 * @returns {Promise<string | null>} why the pattern may not be loaded (a syntax error, or that it
 *   could not be checked), or null when it may be loaded
 */
export async function patternSyntaxError(code, deps = {}) {
    return (await checkSyntax(code, deps)).error;
}

/**
 * Decide what exactly goes into the player for `code`.
 *
 * 1. Code that parses is used exactly as it is (typographic characters inside its strings and
 *    comments included).
 * 2. Otherwise a syntax-aware typography repair is tried (curly quotes used as delimiters, dashes
 *    used as a minus; see codeRepair.js). It is used only if the repaired code parses.
 * 3. Otherwise the code is refused with the original's syntax error.
 * If the parser is unavailable, the code is refused with `unavailable: true` and no repair is tried.
 *
 * The returned `code` is the string that was validated; store, encode and play exactly that.
 *
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} [deps] for tests
 * @returns {Promise<{ ok: boolean, code: string, repaired: boolean, error: string | null, unavailable?: true }>}
 */
export async function preparePattern(code, deps = {}) {
    const { error, unavailable } = await checkSyntax(code, deps);
    if (!error) return { ok: true, code, repaired: false, error: null };
    if (unavailable) return { ok: false, code, repaired: false, error, unavailable: true };
    const repaired = repairTypography(code);
    if (repaired !== code && !(await checkSyntax(repaired, deps)).error) {
        return { ok: true, code: repaired, repaired: true, error: null };
    }
    return { ok: false, code, repaired: false, error };
}
~~~~

Call `preloadParser()` once at startup (upstream does it in `main.jsx`), so the parser comes from the same build as the page. Every path that puts code on the stage goes through `preparePattern`, and a result with `unavailable: true` is shown as "reload the page", not as a syntax error.

### 5.3 Revisions, per-chat stage, per-request control

`revisions.js` is pure. `chats.js` holds the chat state helpers and the startup migration (adapt the key names, see section 6). `useRequests.js` gives each chat its own request id and AbortController. `saveStatus.js` drives the warning shown when saving fails.

#### `src/lib/revisions.js`

~~~~js
// SPDX-License-Identifier: MIT
import { generateId } from './utils';
import { stripAttribution } from './extractCode';

/**
 * Pattern revisions: the patterns a chat has put on the stage.
 *
 * Each chat keeps its own list of revisions and its own selection, and the stage shows the
 * selected revision of the chat being viewed. A reply that finishes in another chat adds a
 * revision to that chat only.
 *
 * A revision stores the exact code that was validated and played (see preparePattern), so it does
 * not change when a chat message is edited later. Revisions are created when a pattern is
 * loaded, never back-filled for old messages, so storage grows only with what was played.
 *
 * Pure functions; use them inside a functional chat update.
 */

/**
 * @typedef {'reply' | 'message' | 'edited' | 'legacy' | 'starter'} RevisionOrigin
 *   reply:   loaded automatically from a completed reply
 *   message: loaded from a chat message with "Use this version"
 *   edited:  pasted by the user (code edited in the Strudel editor, which does not sync back)
 *   legacy:  the pattern an earlier version of the app had in the player
 *   starter: the welcome pattern of a first visit (not sent to the model as the pattern to change)
 * @typedef {{ id: string, code: string, origin: RevisionOrigin, messageId?: string, model?: string,
 *   repaired?: true, createdAt: string }} Revision
 * @typedef {import('./chats').Chat} Chat
 */

export const REVISION_ORIGINS = ['reply', 'message', 'edited', 'legacy', 'starter'];

/** Revisions kept per chat (the selected and the previous one are always kept as well). */
export const MAX_REVISIONS = 50;

/** @param {Chat | undefined} chat @returns {Revision | null} */
export function selectedRevision(chat) {
    if (!chat?.selectedRevisionId || !Array.isArray(chat.revisions)) return null;
    return chat.revisions.find(r => r.id === chat.selectedRevisionId) ?? null;
}

/** @param {Chat | undefined} chat @returns {Revision | null} */
export function previousRevision(chat) {
    if (!chat?.previousRevisionId || !Array.isArray(chat.revisions)) return null;
    return chat.revisions.find(r => r.id === chat.previousRevisionId) ?? null;
}

/** The code on the stage for this chat ('' when it has none). */
export function stageCode(chat) {
    return selectedRevision(chat)?.code ?? '';
}

/**
 * Select a revision. The one selected before becomes "previous", for "Restore previous".
 * @param {Chat} chat
 * @param {string} id
 */
export function selectRevision(chat, id) {
    if (chat.selectedRevisionId === id || !chat.revisions?.some(r => r.id === id)) return chat;
    return { ...chat, selectedRevisionId: id, previousRevisionId: chat.selectedRevisionId ?? null };
}

/** Go back to the revision selected before the current one (pressing it again goes forward). */
export function restorePrevious(chat) {
    const previous = previousRevision(chat);
    if (!previous) return chat;
    return { ...chat, selectedRevisionId: previous.id, previousRevisionId: chat.selectedRevisionId ?? null };
}

function trim(revisions, keep) {
    if (revisions.length <= MAX_REVISIONS) return revisions;
    const excess = revisions.length - MAX_REVISIONS;
    let dropped = 0;
    return revisions.filter(r => {
        if (dropped >= excess || keep.has(r.id)) return true;
        dropped++;
        return false;
    });
}

/**
 * Put `code` on this chat's stage. Reuses an existing revision with identical code (and selects it)
 * instead of storing a copy.
 *
 * @param {Chat} chat
 * @param {{ code: string, origin: RevisionOrigin, messageId?: string, model?: string, repaired?: boolean }} input
 * @param {{ makeId?: () => string, now?: Date }} [options]
 * @returns {{ chat: Chat, revision: Revision }}
 */
export function addRevision(chat, { code, origin, messageId, model, repaired }, { makeId = generateId, now = new Date() } = {}) {
    const revisions = Array.isArray(chat.revisions) ? chat.revisions : [];
    const existing = revisions.find(r => r.code === code);
    if (existing) {
        // Same code again, from another message: reuse the revision and point it at that message
        const moved = messageId && existing.messageId !== messageId
            ? { ...existing, messageId, origin, ...(model && { model }) }
            : existing;
        const next = moved === existing ? chat : { ...chat, revisions: revisions.map(r => (r.id === existing.id ? moved : r)) };
        return { chat: selectRevision(next, existing.id), revision: moved };
    }

    const revision = {
        id: makeId(),
        code,
        origin,
        ...(messageId && { messageId }),
        ...(model && { model }),
        ...(repaired && { repaired: true }),
        createdAt: now.toISOString(),
    };
    const previous = chat.selectedRevisionId ?? null;
    const keep = new Set([revision.id, previous].filter(Boolean));
    return {
        chat: { ...chat, revisions: trim([...revisions, revision], keep), selectedRevisionId: revision.id, previousRevisionId: previous },
        revision,
    };
}

/**
 * Migration of the single global pattern of earlier versions (`openrouter_current_code`): if it
 * differs from what this chat has on its stage, it becomes this chat's selected revision.
 * Idempotent, because the app keeps writing that key with the active chat's stage code: the two
 * differ only after an earlier version ran (including a rollback and a return to this version).
 *
 * @param {Chat} chat
 * @param {string | null | undefined} code
 * @param {{ makeId?: () => string, now?: Date }} [options]
 */
export function adoptLegacyCode(chat, code, options) {
    if (!code || !code.trim() || stageCode(chat) === code) return chat;
    return addRevision(chat, { code, origin: 'legacy' }, options).chat;
}

/**
 * The code to tell the model about as "the pattern in the player", or ''. The untouched starter
 * pattern of a first visit is left out, and so is the app's attribution line, so that a model
 * revising another model's pattern does not copy the old attribution.
 */
export function patternForRequest(chat) {
    const revision = selectedRevision(chat);
    if (!revision) return '';
    // The untouched starter of a first visit is not the user's pattern. Once the chat has messages,
    // a starter on stage (for example after "Restore previous") was put there on purpose.
    const untouchedStarter = revision.origin === 'starter' && !chat.messages?.some(m => m.role === 'user');
    return untouchedStarter ? '' : stripAttribution(revision.code);
}

/**
 * A message's code was edited: its revisions no longer show what it says, so they stop pointing
 * at it (the pattern on stage stays as it is; "Use this version" makes the edited code a revision).
 * @param {Chat} chat
 * @param {string} messageId
 */
export function detachMessage(chat, messageId) {
    if (!chat.revisions?.some(r => r.messageId === messageId)) return chat;
    return {
        ...chat,
        revisions: chat.revisions.map(r => {
            if (r.messageId !== messageId) return r;
            const copy = { ...r };
            delete copy.messageId;
            return copy;
        }),
    };
}
~~~~

#### `src/lib/chats.js`

~~~~js
// SPDX-License-Identifier: MIT
import { generateId } from './utils';
import { addRevision, adoptLegacyCode } from './revisions';
import { STARTER_PATTERN } from '../config';

export const CHATS_KEY = 'openrouter_chats';
export const CURRENT_CHAT_KEY = 'openrouter_current_chat_id';
/**
 * The pattern in the player. Earlier versions had one global pattern here; now each chat has its
 * own (see revisions.js), and this key mirrors the active chat's, so that an earlier version
 * still finds the pattern after a rollback.
 */
export const LEGACY_CODE_KEY = 'openrouter_current_code';

/**
 * @typedef {{ id?: string, role: 'user' | 'assistant', content: string, code?: string | null, model?: string,
 *   status?: string, stopped?: boolean, truncated?: boolean, finishReason?: string, error?: string, usage?: object,
 *   revisionId?: string }} ChatMessage
 * @typedef {{ id: string, name: string, messages: ChatMessage[], createdAt: string,
 *   revisions?: import('./revisions').Revision[], selectedRevisionId?: string | null, previousRevisionId?: string | null }} Chat
 *
 * Every field added after the first version is optional, and older fields keep their meaning, so
 * chats saved by any version load in any other version.
 */

export const DEFAULT_CHAT_NAME = 'New Chat';

/** @returns {Chat} */
export function createChat() {
    return {
        id: generateId(),
        name: DEFAULT_CHAT_NAME,
        messages: [],
        createdAt: new Date().toISOString(),
    };
}

/**
 * Read chats from storage once, at startup. Always returns at least one chat and
 * a current id that exists. Handles missing or corrupt data, and the string "null"
 * that older builds stored as the current id after the last chat was deleted.
 *
 * Migrations (idempotent, nothing is removed): messages without an id get one, and the global
 * pattern of earlier versions (LEGACY_CODE_KEY) becomes the current chat's selected revision when
 * it differs from it.
 * @param {Pick<Storage, 'getItem'>} [storage]
 * @returns {{ chats: Chat[], currentId: string }}
 */
export function loadInitialChats(storage = localStorage) {
    let chats = [];
    try {
        const saved = storage.getItem(CHATS_KEY);
        if (saved) chats = JSON.parse(saved);
    } catch {
        chats = [];
    }
    if (!Array.isArray(chats)) chats = [];
    chats = chats.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)).map(c => withMessageIds(c));

    let legacyCode = null;
    try {
        legacyCode = storage.getItem(LEGACY_CODE_KEY);
    } catch {
        legacyCode = null;
    }

    if (chats.length === 0) {
        let chat = adoptLegacyCode(createChat(), legacyCode);
        // A first visit (nothing stored at all) starts with a pattern to press play on
        const firstVisit = legacyCode === null && storageEmpty(storage);
        if (firstVisit && STARTER_PATTERN) chat = addRevision(chat, { code: STARTER_PATTERN, origin: 'starter' }).chat;
        return { chats: [chat], currentId: chat.id };
    }
    const stored = storage.getItem(CURRENT_CHAT_KEY);
    const currentId = chats.some(c => c.id === stored) ? stored : chats[0].id;
    chats = chats.map(c => (c.id === currentId ? adoptLegacyCode(c, legacyCode) : c));
    return { chats, currentId };
}

function storageEmpty(storage) {
    try {
        return storage.getItem(CHATS_KEY) === null && storage.getItem(CURRENT_CHAT_KEY) === null;
    } catch {
        return false;
    }
}

/**
 * Remove one chat. If it was the current chat the first remaining chat becomes
 * current; if none remain a fresh chat is created, so there is always a chat.
 * @param {Chat[]} chats
 * @param {string} currentId
 * @param {string} removeId
 * @returns {{ chats: Chat[], currentId: string }}
 */
export function removeChat(chats, currentId, removeId) {
    const remaining = chats.filter(c => c.id !== removeId);
    if (remaining.length === 0) return resetChats();
    const stillThere = remaining.some(c => c.id === currentId);
    return { chats: remaining, currentId: stillThere ? currentId : remaining[0].id };
}

/** All chats deleted: start over with one empty chat. */
export function resetChats() {
    const chat = createChat();
    return { chats: [chat], currentId: chat.id };
}

/**
 * The chat with an id on every message (messages saved by earlier versions have none).
 * Returns the same object when nothing was missing.
 * @param {Chat} chat
 * @param {() => string} [makeId]
 */
export function withMessageIds(chat, makeId = generateId) {
    if (chat.messages.every(m => typeof m?.id === 'string' && m.id)) return chat;
    return { ...chat, messages: chat.messages.map(m => (typeof m?.id === 'string' && m.id ? m : { ...m, id: makeId() })) };
}

/**
 * State changes for one chat. They take the chat as it is *now* (use them inside a functional
 * update), so a change made while a request was running (an edit, a rename) is never overwritten
 * by a copy taken when the request started.
 */

/** @param {Chat} chat @param {ChatMessage} message */
export function appendMessage(chat, message) {
    return { ...chat, messages: [...chat.messages, message] };
}

/** @param {Chat} chat @param {string} id @param {Partial<ChatMessage>} patch */
export function updateMessage(chat, id, patch) {
    if (!chat.messages.some(m => m.id === id)) return chat;
    return { ...chat, messages: chat.messages.map(m => (m.id === id ? { ...m, ...patch } : m)) };
}

/** True for a name the app gave the chat itself (not one the user chose). */
export function hasDefaultName(chat) {
    return chat.name === DEFAULT_CHAT_NAME || chat.name.startsWith('Chat ');
}

/**
 * Name a chat after its first message, unless the user has named it.
 * @param {Chat} chat
 * @param {string} text the first message
 */
export function nameAfterFirstMessage(chat, text) {
    if (!hasDefaultName(chat) || chat.messages.filter(m => m.role === 'user').length !== 1) return chat;
    return { ...chat, name: text.slice(0, 30) + (text.length > 30 ? '...' : '') };
}
~~~~

#### `src/hooks/useRequests.js`

~~~~js
// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { generateId } from '../lib/utils';

/**
 * Requests in flight, one per chat at most.
 *
 * Each request has its own id and AbortController, keyed by the chat that started it, so Stop
 * cancels the request of the chat being viewed and never another chat's. A chat with a running
 * request does not block the other chats. Leaving the page cancels everything.
 *
 * @returns {{
 *   begin: (chatId: string) => { requestId: string, signal: AbortSignal, onText: (text: string) => void, end: () => void },
 *   isBusy: (chatId: string) => boolean,
 *   isRunning: (chatId: string) => boolean,
 *   textFor: (chatId: string) => string | null,
 *   stop: (chatId: string) => void,
 *   busyChatIds: string[],
 * }}
 */
export function useRequests() {
    const controllers = useRef(new Map()); // chatId -> { requestId, controller }
    const [pending, setPending] = useState({}); // chatId -> { requestId, text }

    useEffect(() => {
        const map = controllers.current;
        return () => {
            for (const { controller } of map.values()) controller.abort();
            map.clear();
        };
    }, []);

    const begin = (chatId) => {
        const requestId = generateId();
        const controller = new AbortController();
        controllers.current.set(chatId, { requestId, controller });
        setPending(prev => ({ ...prev, [chatId]: { requestId, text: '' } }));

        const isCurrent = () => controllers.current.get(chatId)?.requestId === requestId;
        return {
            requestId,
            signal: controller.signal,
            onText: (text) => {
                if (!isCurrent()) return;
                setPending(prev => (prev[chatId]?.requestId === requestId ? { ...prev, [chatId]: { requestId, text } } : prev));
            },
            end: () => {
                if (isCurrent()) controllers.current.delete(chatId);
                setPending(prev => {
                    if (prev[chatId]?.requestId !== requestId) return prev;
                    const next = { ...prev };
                    delete next[chatId];
                    return next;
                });
            },
        };
    };

    return {
        begin,
        isBusy: (chatId) => Boolean(pending[chatId]),
        // For event handlers: true from the moment a request begins, before React re-renders,
        // so a quick second Enter cannot start a second request in the same chat
        isRunning: (chatId) => controllers.current.has(chatId),
        textFor: (chatId) => pending[chatId]?.text || null,
        stop: (chatId) => controllers.current.get(chatId)?.controller.abort(),
        busyChatIds: Object.keys(pending),
    };
}
~~~~

#### `src/lib/saveStatus.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * Whether saving to localStorage is failing (storage full or blocked): the chats, or the current
 * chat id and player mirror. A tiny external store for useSyncExternalStore.
 *
 * The snapshot is 0 while saving works. When a save fails after one that worked, it becomes a new
 * positive number (a failure "episode"), so a warning the user dismissed comes back if saving
 * starts failing again later.
 */
let episode = 0;
let failing = false;
const failingKeys = new Set();
const listeners = new Set();

/**
 * @param {boolean} ok whether the last save of `what` worked
 * @param {string} [what] which value was saved; saving is failing while any of them fails
 */
export function reportSave(ok, what = 'chats') {
    if (ok) failingKeys.delete(what); else failingKeys.add(what);
    const next = failingKeys.size > 0;
    if (next === failing) return;
    failing = next;
    if (failing) episode++;
    listeners.forEach(l => l());
}

export function subscribeSaveStatus(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** 0 while saving works, otherwise the number of the current failure episode. */
export function saveFailureEpisode() {
    return failing ? episode : 0;
}
~~~~

#### `src/hooks/useChats.js`

~~~~js
// SPDX-License-Identifier: MIT
import { useEffect, useState, useSyncExternalStore } from 'react';
import { reportSave, saveFailureEpisode, subscribeSaveStatus } from '../lib/saveStatus';
import { CHATS_KEY, CURRENT_CHAT_KEY, LEGACY_CODE_KEY, createChat, loadInitialChats, removeChat, resetChats, withMessageIds } from '../lib/chats';
import { stageCode } from '../lib/revisions';
import { MAX_CHAT_FILE_BYTES, ChatFileError, buildExport, describeImport, exportFileName, parseChatFile, withoutInvalidStage } from '../lib/chatFile';
import { patternSyntaxError } from '../lib/patternCheck';
import { downloadText } from '../lib/download';

/** Chat list state, persistence, and import/export. */
export function useChats() {
    const [initial] = useState(loadInitialChats);
    const [chats, setChats] = useState(initial.chats);
    const [currentChatId, setCurrentChatId] = useState(initial.currentId);

    // Whether saving the chats fails (storage full or blocked). Shown to the user with an export
    // button, because otherwise the chats would silently be gone after a reload.
    const failureEpisode = useSyncExternalStore(subscribeSaveStatus, saveFailureEpisode);
    const [dismissedEpisode, setDismissedEpisode] = useState(0);

    useEffect(() => {
        let ok = true;
        try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats)); } catch { ok = false; }
        reportSave(ok);
    }, [chats]);

    const currentChat = chats.find(c => c.id === currentChatId);
    const currentStageCode = stageCode(currentChat);

    // Save the current chat id, and keep the key earlier versions read the player's pattern from
    // (the mirror) in step with that chat. At startup a mirror that differs from the current chat's
    // pattern is adopted as an edit made by an older version, so the mirror must never be left
    // stale: if either write fails, the mirror is removed (removing works even when storage is
    // full) and is not written again until both writes work. Otherwise a reload would bring back an
    // older pattern, or put another chat's pattern into the chat that opens.
    useEffect(() => {
        let ok = true;
        try {
            localStorage.setItem(CURRENT_CHAT_KEY, currentChatId);
            localStorage.setItem(LEGACY_CODE_KEY, currentStageCode);
        } catch {
            ok = false;
            try { localStorage.removeItem(LEGACY_CODE_KEY); } catch { /* storage unavailable */ }
        }
        reportSave(ok, 'current chat');
    }, [currentChatId, currentStageCode]);

    const updateChat = (id, patch) => {
        setChats(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    };

    /**
     * Change one chat from its current state: `fn` receives the chat as it is when the update
     * runs, not as it was when a request started. Use this for every write that happens after an
     * `await`. Does nothing if the chat has been deleted meanwhile.
     */
    const updateChatWith = (id, fn) => {
        setChats(prev => prev.map(c => (c.id === id ? fn(c) : c)));
    };

    const createNewChat = () => {
        const chat = createChat();
        setChats(prev => [chat, ...prev]);
        setCurrentChatId(chat.id);
        return chat.id;
    };

    const deleteChat = (id) => {
        const next = removeChat(chats, currentChatId, id);
        setChats(next.chats);
        setCurrentChatId(next.currentId);
    };

    const deleteAllChats = () => {
        const next = resetChats();
        setChats(next.chats);
        setCurrentChatId(next.currentId);
    };

    const exportChat = (chat = currentChat) => {
        if (!chat) return;
        downloadText(exportFileName([chat]), JSON.stringify(buildExport([chat]), null, 2));
    };

    const exportAllChats = () => {
        if (chats.length === 0) return;
        downloadText(exportFileName(chats, { all: true }), JSON.stringify(buildExport(chats), null, 2));
    };

    /**
     * Import a backup file: the current format, or a single chat / array of chats written by
     * earlier versions. Calls `onImported` on success and tells the user what happened.
     */
    const importChatFile = async (file, onImported) => {
        if (!file) return;
        try {
            if (file.size > MAX_CHAT_FILE_BYTES) {
                throw new ChatFileError(`This file is too large to import (limit ${MAX_CHAT_FILE_BYTES / 1024 / 1024} MB).`);
            }
            const result = parseChatFile(await file.text());
            const checked = await withoutInvalidStage(result.chats, code => patternSyntaxError(code));
            result.chats = checked.chats.map(c => withMessageIds(c));
            result.warnings.push(...checked.warnings);
            setChats(prev => [...result.chats, ...prev]);
            setCurrentChatId(result.chats[0].id);
            onImported?.();
            if (result.chats.length > 1 || result.skippedChats || result.skippedMessages || result.warnings.length) {
                alert(describeImport(result));
            }
        } catch (error) {
            if (!(error instanceof ChatFileError)) console.error('Error importing chat:', error);
            alert(error instanceof ChatFileError ? error.message : 'Error importing chat file.');
        }
    };

    return {
        chats,
        currentChat,
        currentChatId,
        messages: currentChat ? currentChat.messages : [],
        stageCode: currentStageCode,
        showSaveWarning: failureEpisode !== 0 && failureEpisode !== dismissedEpisode,
        dismissSaveWarning: () => setDismissedEpisode(failureEpisode),
        selectChat: setCurrentChatId,
        updateChat,
        updateChatWith,
        createNewChat,
        renameChat: (id, name) => updateChat(id, { name }),
        deleteChat,
        deleteAllChats,
        exportChat,
        exportAllChats,
        importChatFile,
    };
}
~~~~

#### `src/lib/chatFile.js`

~~~~js
// SPDX-License-Identifier: MIT
import { generateId } from './utils';
import { STATUSES } from './generation';
import { MAX_REVISIONS, REVISION_ORIGINS } from './revisions';

/**
 * Chat backup files.
 *
 * Version 3 (current): as version 2, and chats may carry their pattern revisions
 * (`revisions`, `selectedRevisionId`, `previousRevisionId`) and messages their `id`, `status`,
 * `finishReason`, `error`, `usage`, `revisionId` and `promptVersion`. Earlier versions of the app import a version 3
 * file with a "newer version" note and keep the messages.
 * Version 2: `{ format, version: 2, exportedAt, chats: [...] }`, for one chat or many.
 * Before version 2 the app wrote a bare chat object (export of one chat) or a bare array of chats
 * (export of all chats). Both still import.
 *
 * Importing never trusts the file: each chat and message is rebuilt from the fields the app knows,
 * entries that cannot be shown are skipped (and counted), and every chat gets a fresh id so an
 * import can never overwrite or merge with an existing chat.
 */
export const CHAT_FILE_FORMAT = 'strudel-vibe-coder-chats';
export const CHAT_FILE_VERSION = 3;

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
const isId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v);
const shortText = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

function cleanUsage(u) {
    if (!isObject(u)) return undefined;
    const usage = {};
    for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens', 'cost']) {
        if (typeof u[key] === 'number' && Number.isFinite(u[key])) usage[key] = u[key];
    }
    return Object.keys(usage).length ? usage : undefined;
}

function cleanMessage(m) {
    if (!isObject(m) || !ROLES.has(m.role) || typeof m.content !== 'string') return null;
    const message = { role: m.role, content: m.content };
    if (isId(m.id)) message.id = m.id;
    if (typeof m.code === 'string' || m.code === null) message.code = m.code;
    if (typeof m.model === 'string') message.model = m.model;
    if (STATUSES.includes(m.status)) message.status = m.status;
    const finishReason = shortText(m.finishReason, 40);
    if (finishReason) message.finishReason = finishReason;
    const error = shortText(m.error, 1000);
    if (error) message.error = error;
    const usage = cleanUsage(m.usage);
    if (usage) message.usage = usage;
    if (isId(m.revisionId)) message.revisionId = m.revisionId;
    const promptVersion = shortText(m.promptVersion, 20);
    if (promptVersion && /^[0-9A-Za-z.+-]+$/.test(promptVersion)) message.promptVersion = promptVersion;
    if (m.stopped === true) message.stopped = true;
    // strudel.grok.me marks a cut-off reply with `cutOff`; both mean the same
    if (m.truncated === true || m.cutOff === true) message.truncated = true;
    return message;
}

function cleanRevision(r, now) {
    if (!isObject(r) || !isId(r.id) || typeof r.code !== 'string' || !REVISION_ORIGINS.includes(r.origin)) return null;
    const revision = { id: r.id, code: r.code, origin: r.origin };
    if (isId(r.messageId)) revision.messageId = r.messageId;
    const model = shortText(r.model, 200);
    if (model) revision.model = model;
    if (r.repaired === true) revision.repaired = true;
    revision.createdAt = typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt)) ? r.createdAt : now.toISOString();
    return revision;
}

/** The revision fields of a chat, cleaned: unknown or duplicate entries dropped, selection kept only if it exists. */
function cleanRevisions(c, now) {
    if (!Array.isArray(c.revisions)) return {};
    const seen = new Set();
    const revisions = [];
    for (const raw of c.revisions) {
        const r = cleanRevision(raw, now);
        if (r && !seen.has(r.id)) {
            seen.add(r.id);
            revisions.push(r);
        }
    }
    const kept = revisions.slice(-MAX_REVISIONS);
    const ids = new Set(kept.map(r => r.id));
    for (const key of ['selectedRevisionId', 'previousRevisionId']) {
        // keep a selected or previous revision even when it is older than the last MAX_REVISIONS
        const r = revisions.find(x => x.id === c[key]);
        if (r && !ids.has(r.id)) { kept.unshift(r); ids.add(r.id); }
    }
    if (kept.length === 0) return {};
    const result = { revisions: kept };
    if (ids.has(c.selectedRevisionId)) result.selectedRevisionId = c.selectedRevisionId;
    if (ids.has(c.previousRevisionId)) result.previousRevisionId = c.previousRevisionId;
    return result;
}

function cleanChat(c, now, makeId) {
    if (!isObject(c) || !Array.isArray(c.messages)) return null;
    const messages = [];
    const messageIds = new Set();
    let skipped = 0;
    for (const m of c.messages) {
        const clean = cleanMessage(m);
        if (!clean) {
            skipped++;
            continue;
        }
        if (clean.id && messageIds.has(clean.id)) delete clean.id; // a fresh one is assigned on import
        if (clean.id) messageIds.add(clean.id);
        messages.push(clean);
    }
    const name = typeof c.name === 'string' ? c.name.trim().slice(0, MAX_NAME_LENGTH) : '';
    const created = typeof c.createdAt === 'string' && !Number.isNaN(Date.parse(c.createdAt)) ? c.createdAt : now.toISOString();
    return {
        chat: { id: makeId(), name: name || `Imported ${now.toLocaleTimeString()}`, messages, createdAt: created, ...cleanRevisions(c, now) },
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

/**
 * An imported file is not trusted to contain code that runs: clear a chat's selected or previous
 * revision when its code does not parse, so the import can never put broken code into the player
 * (or behind "Restore previous"). The revisions themselves stay in the chat, and in later exports.
 * @param {Chat[]} chats cleaned chats from parseChatFile
 * @param {(code: string) => Promise<string | null>} syntaxError patternSyntaxError (patternCheck.js)
 * @returns {Promise<{ chats: Chat[], warnings: string[] }>}
 */
export async function withoutInvalidStage(chats, syntaxError) {
    const warnings = [];
    const checked = [];
    for (const chat of chats) {
        let next = chat;
        for (const key of ['selectedRevisionId', 'previousRevisionId']) {
            const revision = chat.revisions?.find(r => r.id === chat[key]);
            if (!revision || !(await syntaxError(revision.code))) continue;
            next = { ...next };
            delete next[key];
            warnings.push(key === 'selectedRevisionId'
                ? `The pattern in the chat "${chat.name}" has a syntax error, so it was not loaded. It is kept in the chat's data and in exports.`
                : `The previous pattern in the chat "${chat.name}" has a syntax error, so "Restore previous" is off for it. It is kept in the chat's data and in exports.`);
        }
        checked.push(next);
    }
    return { chats: checked, warnings };
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

### 5.4 Prompt composer

Copy all of `src/lib/prompt/` and `systemPrompt.js` unchanged. The text is factual and was checked against strudel.cc/learn (2026-11-05). Every corrected example, and every example the composer adds, was evaluated in the real strudel.cc REPL with no error.

**Grok path, platform decision:** the system prompt must be composed per request from the user's text, the pattern on stage and the preferences. Choose one of these:
- **(a)** Import the same module on the server and compose there, from fields the client sends.
- **(b)** Compose in the client and send it as a `system` field. The server then caps its length, and the quota must not depend on the prompt.

Either way, the server must stop using the old prompt.

#### `src/lib/prompt/index.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * The system prompt, composed per request from fixed parts:
 *
 *   output contract → core guidance → optional modules (fixed order) → preferences → the user's
 *   own music instructions
 *
 * Deterministic: the same inputs always give the same text, and the order never changes, so
 * providers that cache prompt prefixes can reuse the stable beginning. Which modules a request
 * gets is decided by simple rules (select.js), never by a model call.
 *
 * Bump PROMPT_VERSION whenever the text of any part changes; it is stored with each reply.
 */
import { CONTRACT } from './contract';
import { CORE } from './core';
import { MODULES, MODULE_NAMES } from './modules';
import { cleanPrefs, preferencesText } from './preferences';

export const PROMPT_VERSION = '2.0.2';

/** Longest custom music instructions accepted (characters). */
export const MAX_CUSTOM_INSTRUCTIONS = 2000;

/**
 * @param {{ modules?: string[], prefs?: { visuals: string, explanation: string }, customInstructions?: string }} [options]
 *   `modules` defaults to all of them.
 * @returns {string}
 */
export function composeSystemPrompt({ modules = MODULE_NAMES, prefs, customInstructions = '' } = {}) {
    const parts = [CONTRACT, CORE];
    for (const name of MODULE_NAMES) if (modules.includes(name)) parts.push(MODULES[name]);
    parts.push(preferencesText(cleanPrefs(prefs)));
    const custom = (customInstructions || '').trim().slice(0, MAX_CUSTOM_INSTRUCTIONS);
    if (custom) {
        parts.push(`# The User's Own Music Instructions\nFollow these where they do not conflict with the output contract and the Strudel facts above:\n${custom}`);
    }
    return parts.join('\n\n');
}

export { selectModules } from './select';
export { buildRequestContext, boundConversation } from './request';
export { DEFAULT_PREFS, VISUALS, EXPLANATIONS, cleanPrefs } from './preferences';
export { MODULE_NAMES } from './modules';
~~~~

#### `src/lib/prompt/contract.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * The output contract: what every reply must look like, whatever the request. Kept short: the
 * app checks the result itself (it extracts the last substantial ```js block and parses it).
 */
export const CONTRACT = `You are a Strudel live coding expert. Write Strudel code that runs in the strudel.cc REPL on the first attempt.

# Output Contract
- Put the complete pattern in one fenced code block marked \`\`\`javascript. The app plays the last code block of your reply, so never split the pattern over several blocks, and put any short side snippet before the full pattern, not after it.
- Always give the whole pattern, not a fragment or a diff, even for a small change.
- The pattern plays the value of the LAST expression, or every line that starts with \`$:\` (several \`$:\` lines play together, for example \`$: s("bd*4")\` and \`$: note("c2 g2").s("sawtooth")\`). Do NOT leave a dangling variable declaration as the last line.
- Straight quotes only: Strudel rejects smart quotes (“ ” ‘ ’) with "Unexpected character". In code always use straight quotes (", ') and a plain hyphen-minus (-). Accented letters, emoji and other Unicode are fine inside // comments and inside strings.
- Keep any explanation outside the code block short. Prioritize working code over explanation, and double-check the syntax before you answer.`;
~~~~

#### `src/lib/prompt/core.js`

~~~~js
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
- ❌ NO imperative state or step-by-step timing logic; build patterns with pattern functions. A \`let\` or \`const\` holding a pattern or a mini-notation string to reuse is fine
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
- For readability, chain methods as: create (s, note, n) → sound (.s, .bank) → effects (.lpf, .room, .delay) → time (.fast, .slow, .every). This is a convention: effects are applied in Strudel's own fixed order whatever the chain order. Example: note("c e g").s("sawtooth").lpf(800).fast(2)

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
- .lpf(freq) - lowpass filter cutoff in Hz (audible up to 20000); .hpf(freq) - highpass; .bpf(freq) - bandpass
- .lpq(resonance) - lowpass resonance (0-50); .hpq(resonance) - highpass resonance (0-50); .bpq(resonance) - bandpass resonance
- .compressor("threshold:ratio:knee:attack:release") - dynamics compressor, for example .compressor("-20:20:10:.002:.02"). (.compress(start, end) is NOT dynamics compression: it squeezes the events into part of each cycle)

## Delay and Reverb (Shared per Orbit)
Patterns on the same orbit (the default is 1) share one delay and one reverb, so their settings overwrite each other unpredictably. Give patterns that need different delay or reverb settings their own orbit: .orbit(2).
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
~~~~

#### `src/lib/prompt/modules.js`

~~~~js
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
## Default Sounds (Loaded by Default)
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
- Prefer plain scale degrees with .scale() for melodies, so the notes follow the scale when you change it (a degree with a sharp or flat, such as "2#", leaves the scale on purpose)`;

export const ARRANGEMENT = `# Arrangement
- arrange([4, a], [2, b]) - play pattern a for 4 cycles, then b for 2 cycles, and repeat: arrange([4, "<c a f e>(3,8)"], [2, "<g a>(5,8)"]).note()
- cat(a, b) - one pattern per cycle; "<a b>" in mini-notation alternates per cycle; "<a b>/2" changes every 2 cycles
- .mask("<1 1 1 0>") - silence a layer in some cycles (0 or ~ mutes), for example a hi-hat that drops out every fourth cycle
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
~~~~

#### `src/lib/prompt/preferences.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * Musical preferences: how much the model explains, and whether it adds Hydra visuals.
 * Chosen by the user in Settings; turned into a short block of the system prompt.
 */

export const VISUALS = ['auto', 'always', 'never'];
export const EXPLANATIONS = ['none', 'brief', 'teaching'];
export const DEFAULT_PREFS = Object.freeze({ visuals: 'auto', explanation: 'brief' });

/** Preferences read from storage or a file, with anything unknown replaced by the default. */
export function cleanPrefs(value) {
    const v = value && typeof value === 'object' ? value : {};
    return {
        visuals: VISUALS.includes(v.visuals) ? v.visuals : DEFAULT_PREFS.visuals,
        explanation: EXPLANATIONS.includes(v.explanation) ? v.explanation : DEFAULT_PREFS.explanation,
    };
}

const VISUALS_TEXT = {
    always: 'Include Hydra visuals with the music (start the code with `await initHydra()`), unless the user asks for no visuals.',
    auto: 'Add Hydra visuals only when the user asks for visuals or the current pattern already has them; then keep them.',
    never: 'Do not add Hydra visuals unless the user explicitly asks for them.',
};

const EXPLANATION_TEXT = {
    none: 'Comments: only where the code would otherwise be hard to read. Outside the code block, at most one sentence.',
    brief: 'Comments: one short comment above each part of the pattern, saying what it does and one value worth changing. Outside the code block, a few sentences at most.',
    teaching: 'Comments: explain what each section does for someone new to live coding, explain the key parameters, and suggest variations to try while it plays. Unless the user asks for no comments.',
};

/** @param {{ visuals: string, explanation: string }} prefs */
export function preferencesText(prefs) {
    const p = cleanPrefs(prefs);
    return `# Preferences\n- ${VISUALS_TEXT[p.visuals]}\n- ${EXPLANATION_TEXT[p.explanation]}`;
}
~~~~

#### `src/lib/prompt/select.js`

~~~~js
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
~~~~

#### `src/lib/prompt/request.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * What the request carries besides the system prompt: the pattern on this chat's stage (as
 * request context, attached to the newest user message) and a bounded conversation history.
 */

const CODE_BLOCK = /(^|\r?\n)(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?\r?\n\2[ \t]*(?=\r?\n|$)/g;

/**
 * Put the pattern on this chat's stage in front of the newest user message, in the request only
 * (the chat keeps what the user typed), with the rule to keep what was not asked to change.
 * Without a pattern the conversation is returned unchanged.
 * @param {{ role: string, content: string }[]} apiMessages
 * @param {string | null | undefined} code
 */
export function buildRequestContext(apiMessages, code) {
    if (!code || !code.trim()) return apiMessages;
    const last = apiMessages.length - 1;
    if (last < 0 || apiMessages[last].role !== 'user') return apiMessages;
    const context = [
        'This is the pattern currently in the player. Change this pattern, unless I ask for something new.',
        'Keep everything I do not ask you to change.',
        '```js',
        code,
        '```',
        '',
        'My request:',
    ].join('\n');
    return apiMessages.map((m, i) => (i === last ? { role: m.role, content: `${context}\n${m.content}` } : m));
}

/**
 * Keep long chats small: in assistant replies older than the last `keepRecent` ones, replace the
 * code blocks with a short placeholder. The text around them stays, and the pattern that matters
 * is attached to the newest message by buildRequestContext.
 * @param {{ role: string, content: string }[]} apiMessages
 * @param {{ keepRecent?: number }} [options]
 */
export function boundConversation(apiMessages, { keepRecent = 2 } = {}) {
    const assistantIndexes = apiMessages.map((m, i) => (m.role === 'assistant' ? i : -1)).filter(i => i >= 0);
    const old = new Set(assistantIndexes.slice(0, Math.max(0, assistantIndexes.length - keepRecent)));
    if (old.size === 0) return apiMessages;
    return apiMessages.map((m, i) => (old.has(i)
        ? { role: m.role, content: m.content.replace(CODE_BLOCK, (_, lead) => `${lead}[code of an earlier version omitted]`) }
        : m));
}
~~~~

#### `src/lib/systemPrompt.js`

~~~~js
// SPDX-License-Identifier: MIT
/**
 * The full system prompt: every module, Hydra visuals always on, teaching comments.
 *
 * The app composes a smaller prompt per request (src/lib/prompt/). This full text is the
 * reference used by the tests that check its Strudel facts, by the evaluation harness, and as the
 * default of generateStrudelCode. Keep the claims factual: a wrong function description makes
 * models write code that does not run.
 */
import { composeSystemPrompt } from './prompt';

export const SYSTEM_PROMPT = composeSystemPrompt({ prefs: { visuals: 'always', explanation: 'teaching' } });
~~~~

### 5.5 Wiring (reference implementation)

This is how upstream connects the pieces. Port the behaviour into your single route component, not the markup:
- `runRequest`: compose the prompt; `boundConversation`, then `buildRequestContext`; then generate; then `updateChatWith` and `loadIntoStage`.
- `sendText`: with the synchronous `isRunning` guard.
- The handlers for "Use this version", "Restore previous", "Use edited code" and "Fix an error".
- The per-chat notices and the "new pattern" flags.

#### `src/App.jsx`

~~~~jsx
// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import PlayerPanel from './components/PlayerPanel';
import MobileTabs from './components/MobileTabs';
import PasteDialog from './components/PasteDialog';
import CustomInstructions from './components/CustomInstructions';
import { generateStrudelCode } from './lib/openrouter';
import { codeFromMessage } from './lib/extractCode';
import { preparePattern } from './lib/patternCheck';
import { announcement as describeOutcome, apiConversation, canAutoLoad, messageStatus, notLoadedNotice, replyMessage } from './lib/generation';
import { PROMPT_VERSION, boundConversation, buildRequestContext, composeSystemPrompt, selectModules } from './lib/prompt';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useRequests } from './hooks/useRequests';
import { appendMessage, nameAfterFirstMessage, updateMessage } from './lib/chats';
import { generateId } from './lib/utils';
import { addRevision, detachMessage, patternForRequest, previousRevision, restorePrevious, selectedRevision } from './lib/revisions';

/** A reply whose code may be put on the stage with "Use latest reply": a completed reply with code. */
const isUsableReply = (m) => m.role === 'assistant' && messageStatus(m) === 'completed' && Boolean(codeFromMessage(m));

function App() {
    const settings = useSettings();
    const chat = useChats();
    const catalog = useModelCatalog();
    const requests = useRequests();

    const [input, setInput] = useState('');
    const [announcement, setAnnouncement] = useState(''); // read out by screen readers
    const [tab, setTab] = useState('chat'); // narrow screens show one panel at a time
    const inputRef = useRef(null);
    const [notices, setNotices] = useState({}); // chatId -> why the last pattern was not loaded
    const [news, setNews] = useState(() => new Set()); // chats whose stage changed since it was last seen
    const [showSettings, setShowSettings] = useState(false);
    const [showChats, setShowChats] = useState(false);
    const [pasteDialog, setPasteDialog] = useState(null); // 'code' | 'error' | null
    const [editingMessage, setEditingMessage] = useState({ index: null, id: null, content: '' });

    const currentChatId = chat.currentChatId;
    const currentChatIdRef = useRef(currentChatId);
    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
    // The chats as of the last render, for code that runs after an await (names, deleted chats)
    const chatsRef = useRef(chat.chats);
    useEffect(() => { chatsRef.current = chat.chats; }, [chat.chats]);
    const isLoading = requests.isBusy(currentChatId);

    const setNotice = (chatId, text) => setNotices(prev => ({ ...prev, [chatId]: text }));
    const markNews = (chatId) => setNews(prev => new Set(prev).add(chatId));
    const clearNews = (chatId) => setNews(prev => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
    });

    // Stop and Esc cancel the request of the chat being viewed, never another chat's
    const stopGenerating = () => requests.stop(currentChatId);
    useEffect(() => {
        if (!isLoading) return undefined;
        // a dialog that handled this Esc (closing itself) marks it as handled; then keep generating
        const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) requests.stop(currentChatId); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLoading, currentChatId, requests]);

    // Entering or leaving the Stage tab counts as having seen the current chat's pattern
    const showTab = (next) => {
        if (next === 'stage' || tab === 'stage') clearNews(currentChatId);
        setTab(next);
    };

    // Switching chats: the chat being left counts as seen; the stage now shows the new chat's pattern
    const selectChat = (id) => {
        clearNews(currentChatId);
        stopEditing();
        chat.selectChat(id);
    };

    // Deleting a chat stops its request, so it does not keep spending tokens or announce itself later
    const deleteChat = (id) => {
        requests.stop(id);
        clearNews(id);
        setNotice(id, '');
        stopEditing();
        chat.deleteChat(id);
    };
    const deleteAllChats = () => {
        requests.busyChatIds.forEach(id => requests.stop(id));
        stopEditing();
        setNotices({});
        setNews(new Set());
        chat.deleteAllChats();
    };

    // A chip puts its text in the message box (it does not send, which could spend the user's credits)
    const pickPrompt = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    /**
     * Put a pattern on a chat's stage unless it is not valid JavaScript, so a broken reply cannot
     * replace a pattern that works. The stage gets exactly the code that was validated (possibly
     * with curly quotes repaired, which the notice then says). Only `chatId`'s stage changes,
     * whichever chat is being viewed. Returns 'loaded', 'invalid' (a syntax error) or
     * 'unchecked' (the code checker could not run, so nothing was loaded).
     *
     * @param {string} chatId
     * @param {string} code
     * @param {{ origin: import('./lib/revisions').RevisionOrigin, messageId?: string, model?: string }} meta
     */
    const loadIntoStage = async (chatId, code, meta) => {
        const prepared = await preparePattern(code);
        if (!prepared.ok) {
            setNotice(chatId, prepared.unavailable
                ? `Not loaded into the player: ${prepared.error} The previous pattern is still loaded.`
                : `Not loaded into the player: the code has a syntax error (${prepared.error}). The previous pattern is still loaded.`);
            return prepared.unavailable ? 'unchecked' : 'invalid';
        }
        setNotice(chatId, prepared.repaired ? 'Loaded with typographic quotes and dashes in the code replaced by plain ones, so that it runs.' : '');
        chat.updateChatWith(chatId, (c) => {
            const { chat: next, revision } = addRevision(c, { code: prepared.code, repaired: prepared.repaired, ...meta });
            return meta.messageId ? updateMessage(next, meta.messageId, { revisionId: revision.id }) : next;
        });
        markNews(chatId);
        return 'loaded';
    };

    const stopEditing = () => setEditingMessage({ index: null, id: null, content: '' });

    const saveMessageEdit = () => {
        if (editingMessage.index === null) return;
        const { id, content } = editingMessage;
        chat.updateChatWith(currentChatId, (c) => {
            const before = c.messages.find(m => m.id === id);
            const next = updateMessage(c, id, { content });
            const after = next.messages.find(m => m.id === id);
            // its code changed: the revision made from it no longer matches it ("on stage" goes away)
            return before && after && codeFromMessage(before) !== codeFromMessage(after) ? detachMessage(next, id) : next;
        });
        stopEditing();
    };

    /**
     * Run one request for `chatId` with `messages` as the conversation (the user's newest message
     * last) and add the reply to that chat. Every write goes through updateChatWith, so it applies
     * to the chat as it is then: edits and renames made during generation are kept, and a chat
     * that is not being viewed only gets its own reply and its own stage.
     */
    const runRequest = async (chatId, messages, { firstMessageText } = {}) => {
        const req = requests.begin(chatId);
        if (chatId === currentChatIdRef.current) setAnnouncement('Generating a reply');
        const isViewed = () => chatId === currentChatIdRef.current;
        const stillThere = () => chatsRef.current.some(c => c.id === chatId);
        // The chat's name as it is now (renamed meanwhile, or named after this first message)
        const chatName = () => {
            const c = chatsRef.current.find(x => x.id === chatId);
            if (!c) return 'another chat';
            return firstMessageText ? nameAfterFirstMessage(c, firstMessageText).name : c.name;
        };

        try {
            // Only role and content go to the API, only of replies that completed, old patterns trimmed,
            // plus the pattern on this chat's stage as context for the newest message
            const stagePattern = patternForRequest(chat.chats.find(c => c.id === chatId));
            const apiMessages = buildRequestContext(boundConversation(apiConversation(messages)), stagePattern);
            // The system prompt for this request: the modules it needs and the user's preferences
            const userText = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
            const systemPrompt = composeSystemPrompt({
                modules: selectModules({ userText, selectedCode: stagePattern, prefs: settings.promptPrefs }),
                prefs: settings.promptPrefs,
                customInstructions: settings.customInstructions,
            });

            const result = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName, {
                signal: req.signal,
                onText: req.onText,
                systemPrompt,
            });

            // The chat was deleted while the reply was arriving: nothing to add or announce
            if (!stillThere()) return;

            // Stopped before anything arrived: keep the user's message, add no empty reply
            if (result.status === 'aborted' && !result.content) {
                if (isViewed()) setAnnouncement('Generation stopped');
                return;
            }

            const message = replyMessage(result, settings.modelName, { promptVersion: PROMPT_VERSION });
            chat.updateChatWith(chatId, (c) => {
                const next = appendMessage(c, message);
                return firstMessageText ? nameAfterFirstMessage(next, firstMessageText) : next;
            });

            // Load the pattern only when the reply completed and the code parses
            let load = 'none';
            if (result.code && canAutoLoad(result.status)) {
                load = await loadIntoStage(chatId, result.code, { origin: 'reply', messageId: message.id, model: message.model });
            } else {
                // Say why nothing was loaded (also for a refusal without code), or clear an older notice
                setNotice(chatId, notLoadedNotice(result.status));
            }
            const outcome = describeOutcome(result, load);
            setAnnouncement(isViewed() ? outcome : `A reply finished in the chat "${chatName()}". ${outcome}`);
        } catch (error) {
            // Only a programming error gets here: generateStrudelCode reports failures as a status
            setAnnouncement(`Error: ${error.message}`);
            chat.updateChatWith(chatId, (c) => appendMessage(c, { id: generateId(), role: 'assistant', content: `Error: ${error.message}`, status: 'error' }));
        } finally {
            req.end();
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const text = input;
        if (await sendText(text)) setInput('');
    };

    /** Ask for a key when there is none. Returns whether there is one. */
    const haveKey = () => {
        if (settings.effectiveApiKey) return true;
        alert("Please enter your OpenRouter API Key in settings.");
        setShowSettings(true);
        return false;
    };

    /** Send `text` as the user's next message in the chat being viewed. Returns whether it was sent. */
    const sendText = async (text) => {
        if (isLoading || requests.isRunning(currentChatId)) return false;
        if (!haveKey()) return false;
        const chatId = currentChatId;
        const userMsg = { id: generateId(), role: 'user', content: text };
        chat.updateChatWith(chatId, (c) => appendMessage(c, userMsg));
        runRequest(chatId, [...chat.messages, userMsg], { firstMessageText: text });
        return true;
    };

    // Ask again after a reply that did not complete (the failed reply stays, and is not sent back)
    const retry = async () => {
        if (isLoading || requests.isRunning(currentChatId) || !haveKey()) return;
        await runRequest(currentChatId, chat.messages);
    };

    /** "Use this version": put the code of a chat message on this chat's stage. */
    const loadMessageVersion = async (msg) => {
        const code = codeFromMessage(msg);
        if (!code) return;
        const load = await loadIntoStage(currentChatId, code, { origin: 'message', messageId: msg.id, model: msg.model });
        setAnnouncement({
            loaded: 'The pattern was loaded into the player.',
            invalid: 'The pattern has a syntax error and was not loaded.',
            unchecked: 'The pattern could not be checked and was not loaded. Reload the page.',
        }[load]);
    };

    /** "Use edited code": the user pasted code from the Strudel editor; it becomes this chat's pattern. */
    const applyEditedCode = async (text) => {
        const chatId = currentChatId;
        const prepared = await preparePattern(text.trim());
        if (!prepared.ok) return prepared.unavailable ? prepared.error : `This code has a syntax error (${prepared.error}), so it was not loaded.`;
        chat.updateChatWith(chatId, (c) => addRevision(c, { code: prepared.code, origin: 'edited', repaired: prepared.repaired }).chat);
        setNotice(chatId, prepared.repaired ? 'Loaded with typographic quotes and dashes in the code replaced by plain ones, so that it runs.' : '');
        setAnnouncement('Your edited code is now the pattern in the player.');
        return null;
    };

    /** "Fix an error": the user pasted an error the player showed; ask the model to fix the pattern on stage. */
    const fixError = async (text) => {
        if (isLoading || requests.isRunning(currentChatId)) return 'A reply is still being written in this chat. Try again when it has finished.';
        // Keep the dialog (and the pasted error) open until the request can really be sent
        if (!settings.effectiveApiKey) return 'Add your OpenRouter API key in Settings first. Your error text stays here.';
        const sent = await sendText(`The pattern in the player fails with this error:\n\n\`\`\`\n${text.trim()}\n\`\`\`\n\nPlease fix the pattern and change nothing else.`);
        return sent ? null : 'The error could not be sent. Try again.';
    };

    const restorePreviousVersion = () => {
        chat.updateChatWith(currentChatId, restorePrevious);
        setNotice(currentChatId, '');
        setAnnouncement('The previous pattern was restored.');
    };

    const currentChat = chat.currentChat;
    const lastMessage = chat.messages[chat.messages.length - 1];
    const canRetry = !isLoading && lastMessage?.role === 'assistant' && messageStatus(lastMessage) !== 'completed';

    return (
        <div className="flex flex-col h-screen bg-cyber-black text-white font-mono overflow-hidden">
            <Header
                showChats={showChats}
                showSettings={showSettings}
                onToggleChats={() => setShowChats(!showChats)}
                onToggleSettings={() => setShowSettings(!showSettings)}
            />

            <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

            {chat.showSaveWarning && (
                <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-2 bg-red-900/40 border-b border-red-700 text-sm text-red-100">
                    <p className="flex-1 min-w-0">Your chats could not be saved in this browser (its storage is full or blocked). They will be lost when you close or reload the page. Export them to keep them.</p>
                    <button onClick={chat.exportAllChats} className="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600">Export all chats</button>
                    <button onClick={chat.dismissSaveWarning} className="underline hover:text-white">Dismiss</button>
                </div>
            )}

            {/* Main Content - Split View */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                <MobileTabs tab={tab} onChange={showTab} stageHasNews={tab === 'chat' && news.has(currentChatId)} />

                {showChats && (
                    <ChatSidebar
                        chats={chat.chats}
                        currentChatId={currentChatId}
                        news={news}
                        busyChatIds={requests.busyChatIds}
                        onSelect={(id) => { selectChat(id); setShowChats(false); }}
                        onNew={() => { clearNews(currentChatId); stopEditing(); chat.createNewChat(); setShowChats(false); }}
                        onImportFile={(file) => { clearNews(currentChatId); stopEditing(); chat.importChatFile(file, () => setShowChats(false)); }}
                        onExportAll={chat.exportAllChats}
                        onDeleteAll={() => {
                            if (window.confirm("Are you sure you want to delete all chats?")) deleteAllChats();
                        }}
                        onClose={() => setShowChats(false)}
                        onRename={chat.renameChat}
                        onExport={chat.exportChat}
                        onDelete={deleteChat}
                    />
                )}

                {showSettings && (
                    <SettingsModal
                        apiKey={settings.apiKey}
                        onApiKeyChange={settings.setApiKey}
                        hasHashKey={Boolean(settings.hashApiKey)}
                        remember={settings.remember}
                        onRememberChange={settings.setRemember}
                        onForgetKey={settings.forgetKey}
                        model={settings.model}
                        onModelChange={settings.setModel}
                        savedModels={settings.savedModels}
                        onSavedModelsChange={settings.setSavedModels}
                        catalog={catalog}
                        promptPrefs={settings.promptPrefs}
                        onPromptPrefsChange={settings.setPromptPrefs}
                        musicExtras={<CustomInstructions value={settings.customInstructions} onChange={settings.setCustomInstructions} />}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {/* Chat Section */}
                <div className={`${tab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 md:flex-none w-full md:w-1/2 flex-col border-r border-cyber-gray bg-cyber-dark/50`}>
                    <MessageList
                        chatId={currentChatId}
                        messages={chat.messages}
                        isLoading={isLoading}
                        streamingText={requests.textFor(currentChatId)}
                        streamingModel={settings.modelName}
                        onPickPrompt={pickPrompt}
                        editing={editingMessage}
                        onEditContentChange={(content) => setEditingMessage({ ...editingMessage, content })}
                        onStartEdit={(index, content) => setEditingMessage({ index, id: chat.messages[index]?.id, content })}
                        onCancelEdit={stopEditing}
                        onSaveEdit={saveMessageEdit}
                        onLoadCode={loadMessageVersion}
                        selectedMessageId={selectedRevision(currentChat)?.messageId}
                        onRetry={canRetry ? retry : undefined}
                    />
                    <ChatInput
                        value={input}
                        onChange={setInput}
                        onSend={handleSend}
                        onStop={stopGenerating}
                        disabled={isLoading}
                        hasMessages={chat.messages.length > 0}
                        inputRef={inputRef}
                    />
                </div>

                <PlayerPanel
                    code={chat.stageCode}
                    chatId={chat.currentChatId}
                    visibleOnMobile={tab === 'stage'}
                    notice={notices[currentChatId] || ''}
                    onDismissNotice={() => setNotice(currentChatId, '')}
                    canRestorePrevious={Boolean(previousRevision(currentChat))}
                    onRestorePrevious={restorePreviousVersion}
                    hasMessagesWithCode={chat.messages.some(isUsableReply)}
                    onUseLatestReply={() => {
                        const latest = [...chat.messages].reverse().find(isUsableReply);
                        if (latest) loadMessageVersion(latest);
                    }}
                    onUseEditedCode={() => setPasteDialog('code')}
                    onFixError={() => setPasteDialog('error')}
                    canFixError={Boolean(patternForRequest(currentChat))}
                />

                {pasteDialog === 'code' && (
                    <PasteDialog
                        title="Use edited code"
                        explanation="The player (strudel.cc) does not send your edits back to this app. In the player, select all of the code (Ctrl+A or Cmd+A), copy it, and paste it here. It becomes this chat's pattern, and the next request changes it. Loading it restarts the player."
                        label="Code from the player"
                        submitLabel="Use this code"
                        onSubmit={applyEditedCode}
                        onClose={() => setPasteDialog(null)}
                    />
                )}
                {pasteDialog === 'error' && (
                    <PasteDialog
                        title="Fix an error"
                        explanation="Paste the error message the player shows. It is sent to the model together with the pattern in the player, with a request to fix only that."
                        label="Error message"
                        submitLabel="Ask for a fix"
                        onSubmit={fixError}
                        onClose={() => setPasteDialog(null)}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
~~~~

#### `src/components/PasteDialog.jsx`

~~~~jsx
// SPDX-License-Identifier: MIT
import React, { useId, useState } from 'react';
import { useDialog } from '../hooks/useDialog';

/**
 * A modal dialog with one large text box, used to bring text from the strudel.cc editor (which is
 * in a cross-origin iframe this app cannot read) into the app: edited code, or an error message.
 *
 * `onSubmit(text)` may return a message to show instead of closing (for example a syntax error).
 */
const PasteDialog = ({ title, explanation, label, submitLabel, onSubmit, onClose }) => {
    const { attach, onKeyDown } = useDialog({ onClose, trap: true });
    const titleId = useId();
    const fieldId = useId();
    const [text, setText] = useState('');
    const [problem, setProblem] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!text.trim() || busy) return;
        setBusy(true);
        const result = await onSubmit(text);
        setBusy(false);
        if (result) setProblem(result);
        else onClose();
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={attach}
                onKeyDown={onKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-lg max-h-full overflow-y-auto"
            >
                <h2 id={titleId} className="text-xl font-bold mb-2 text-cyber-neon">{title}</h2>
                <p className="text-sm text-gray-300 mb-3">{explanation}</p>
                <label htmlFor={fieldId} className="block text-sm text-gray-400 mb-1">{label}</label>
                <textarea
                    id={fieldId}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setProblem(''); }}
                    spellCheck={false}
                    className="w-full h-48 bg-cyber-black text-white p-2 rounded border border-cyber-gray focus:border-cyber-neon font-mono text-sm"
                />
                {problem && <p role="alert" className="mt-2 text-sm text-red-400">{problem}</p>}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-3 py-2 rounded bg-cyber-gray text-gray-200 hover:bg-cyber-gray/70">Cancel</button>
                    <button onClick={submit} disabled={!text.trim() || busy} className="px-3 py-2 rounded bg-cyber-neon text-black hover:bg-pink-400 disabled:opacity-50">
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasteDialog;
~~~~

#### `src/components/MusicSettings.jsx`

~~~~jsx
// SPDX-License-Identifier: MIT
import React, { useId } from 'react';

/** Settings that shape what the model writes: visuals and how much it explains. */
const MusicSettings = ({ prefs, onPrefsChange, children }) => {
    const visualsId = useId();
    const explanationId = useId();
    const select = 'w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan text-white';
    return (
        <fieldset className="mb-4 border border-cyber-gray rounded p-3">
            <legend className="px-1 text-sm text-gray-300">Music</legend>
            <label htmlFor={visualsId} className="block text-sm text-gray-400 mb-1">Hydra visuals</label>
            <select id={visualsId} value={prefs.visuals} onChange={(e) => onPrefsChange({ visuals: e.target.value })} className={select}>
                <option value="auto">When I ask for them, or the pattern has them</option>
                <option value="always">Always</option>
                <option value="never">Never, unless I ask</option>
            </select>
            <label htmlFor={explanationId} className="block text-sm text-gray-400 mt-3 mb-1">Comments and explanations</label>
            <select id={explanationId} value={prefs.explanation} onChange={(e) => onPrefsChange({ explanation: e.target.value })} className={select}>
                <option value="none">Minimal</option>
                <option value="brief">Brief: what each part does</option>
                <option value="teaching">Teaching: explain and suggest changes</option>
            </select>
            {children}
        </fieldset>
    );
};

export default MusicSettings;
~~~~

#### `src/components/CustomInstructions.jsx`

~~~~jsx
// SPDX-License-Identifier: MIT
import React, { useId, useRef, useState } from 'react';
import { MAX_CUSTOM_INSTRUCTIONS } from '../lib/prompt';
import { downloadText } from '../lib/download';

/**
 * Advanced, collapsed: the user's own music instructions, added at the end of the system prompt.
 * They add to the app's instructions; the syntax check and the provider's limits still apply.
 */
const CustomInstructions = ({ value, onChange }) => {
    const fieldId = useId();
    const fileInput = useRef(null);
    const [problem, setProblem] = useState('');
    const button = 'px-2 py-1 rounded text-xs bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black disabled:opacity-40';

    const importFile = async (file) => {
        if (!file) return;
        if (file.size > 64 * 1024) {
            setProblem('This file is too large for music instructions.');
            return;
        }
        const text = (await file.text()).slice(0, MAX_CUSTOM_INSTRUCTIONS);
        setProblem('');
        onChange(text);
    };

    return (
        <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gray-400">Advanced: your own music instructions</summary>
            <p className="mt-2 text-xs text-gray-400">
                Added after the app's instructions, for example "prefer minor keys and slow tempos". They cannot turn off the
                syntax check or the provider's limits. Up to {MAX_CUSTOM_INSTRUCTIONS.toLocaleString()} characters.
            </p>
            <label htmlFor={fieldId} className="sr-only">Your own music instructions</label>
            <textarea
                id={fieldId}
                value={value}
                maxLength={MAX_CUSTOM_INSTRUCTIONS}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 w-full h-24 bg-cyber-black text-white p-2 rounded border border-cyber-gray focus:border-cyber-cyan text-sm"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 mr-auto">{value.length} / {MAX_CUSTOM_INSTRUCTIONS}</span>
                <button onClick={() => onChange('')} disabled={!value} className={button}>Reset</button>
                <button onClick={() => downloadText('strudel-music-instructions.txt', value, 'text/plain')} disabled={!value} className={button}>Export</button>
                <button onClick={() => fileInput.current?.click()} className={button}>Import</button>
                <input
                    ref={fileInput}
                    type="file"
                    accept=".txt,text/plain"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="hidden"
                    onChange={(e) => { importFile(e.target.files[0]); e.target.value = ''; }}
                />
            </div>
            {problem && <p role="alert" className="mt-1 text-xs text-red-400">{problem}</p>}
        </details>
    );
};

export default CustomInstructions;
~~~~

Settings state, the model list (with `formatLimits` for context and output limits), and the dialog hook (the topmost dialog handles Escape and Tab even after its focused button is removed):

#### `src/hooks/useSettings.js`

~~~~js
// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { readStorage, useLocalStorage } from './useLocalStorage';
import { DEFAULT_MODEL_ID } from '../config';
import { migrateBookmarks } from '../lib/models';
import { loadApiKey, persistApiKey, persistRemember, readRemember } from '../lib/keyStorage';
import { urlKey } from '../lib/urlKey';
import { DEFAULT_PREFS, MAX_CUSTOM_INSTRUCTIONS, cleanPrefs } from '../lib/prompt';

export const PROMPT_PREFS_KEY = 'openrouter_prompt_prefs';
export const CUSTOM_INSTRUCTIONS_KEY = 'openrouter_custom_instructions';

/**
 * API key, active model and model bookmarks.
 *
 * The key comes from storage (while "remember" is on) and can be replaced for this visit by a
 * temporary key from the address (`#sk-or-v1-…`), which is held in memory only.
 */
export function useSettings() {
    const [remember, setRememberState] = useState(() => readRemember(localStorage));
    const [apiKey, setApiKey] = useState(() => loadApiKey(localStorage));
    const [hashApiKey, setHashApiKey] = useState(urlKey);
    const [model, setModel] = useLocalStorage('openrouter_model', DEFAULT_MODEL_ID);
    // Musical preferences for the prompt (visuals, explanation level); unknown values fall back to the defaults
    const [storedPrefs, setStoredPrefs] = useLocalStorage(PROMPT_PREFS_KEY, DEFAULT_PREFS, { json: true });
    const promptPrefs = cleanPrefs(storedPrefs);
    const [customInstructions, setCustomInstructions] = useLocalStorage(CUSTOM_INSTRUCTIONS_KEY, '');
    // Bookmarks are brought up to date once, at startup (see migrateBookmarks), then saved as usual.
    const [savedModels, setSavedModels] = useState(() =>
        migrateBookmarks(
            readStorage('openrouter_saved_models', null, { json: true }),
            readStorage('openrouter_model', DEFAULT_MODEL_ID),
        ));

    useEffect(() => {
        try {
            localStorage.setItem('openrouter_saved_models', JSON.stringify(savedModels));
        } catch {
            // storage unavailable
        }
    }, [savedModels]);

    useEffect(() => {
        persistApiKey(localStorage, apiKey, remember);
    }, [apiKey, remember]);

    const setRemember = (value) => {
        persistRemember(localStorage, value);
        setRememberState(value);
    };

    /** Remove the key everywhere: storage, memory, and any temporary key from the address. */
    const forgetKey = () => {
        setApiKey('');
        setHashApiKey('');
    };

    return {
        apiKey,
        setApiKey,
        hashApiKey,
        effectiveApiKey: hashApiKey || apiKey,
        remember,
        setRemember,
        forgetKey,
        model,
        setModel,
        savedModels,
        setSavedModels,
        promptPrefs,
        customInstructions: typeof customInstructions === 'string' ? customInstructions.slice(0, MAX_CUSTOM_INSTRUCTIONS) : '',
        setCustomInstructions: (text) => setCustomInstructions(String(text ?? '').slice(0, MAX_CUSTOM_INSTRUCTIONS)),
        setPromptPrefs: (patch) => setStoredPrefs(prev => cleanPrefs({ ...cleanPrefs(prev), ...patch })),
        modelName: savedModels.find(m => m.id === model)?.name || model,
    };
}
~~~~

#### `src/lib/models.js`

~~~~js
// SPDX-License-Identifier: MIT
import { LEGACY_DEFAULT_BOOKMARK_IDS, MODELS_API_URL, RECOMMENDED_MODELS } from '../config';

/**
 * @typedef {{ id: string, name: string }} Bookmark
 * @typedef {{
 *   id: string, name: string, provider: string, isFree: boolean, isAlias: boolean,
 *   contextLength: number | null, maxOutput: number | null, created: number
 * }} CatalogModel
 */

/**
 * Turn the response of OpenRouter's public model list into the models a chat can use.
 * Left out: models that do not produce text, and `:batch` variants (asynchronous batch pricing,
 * not for interactive chat). Anything can still be typed in by hand as a custom model id.
 * @param {{ data?: any[] }} json
 * @returns {CatalogModel[]}
 */
export function parseCatalog(json) {
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows
        .filter(m => typeof m?.id === 'string' && !m.id.endsWith(':batch'))
        .filter(m => {
            const out = m.architecture?.output_modalities;
            return !Array.isArray(out) || out.includes('text');
        })
        .map(m => ({
            id: m.id,
            name: typeof m.name === 'string' && m.name ? m.name : m.id,
            provider: m.id.replace(/^~/, '').split('/')[0],
            isFree: m.id.endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0'),
            isAlias: m.id.startsWith('~'),
            contextLength: typeof m.context_length === 'number' ? m.context_length : null,
            maxOutput: typeof m.top_provider?.max_completion_tokens === 'number' ? m.top_provider.max_completion_tokens : null,
            created: typeof m.created === 'number' ? m.created : 0,
        }));
}

const tokens = (n) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/**
 * The limits OpenRouter reports for a model, for the model list: "200k context · 32k max output".
 * Parts that are not reported are left out; '' when neither is.
 * @param {Pick<CatalogModel, 'contextLength' | 'maxOutput'>} model
 */
export function formatLimits({ contextLength, maxOutput }) {
    const parts = [];
    if (contextLength > 0) parts.push(`${tokens(contextLength)} context`);
    if (maxOutput > 0) parts.push(`${tokens(maxOutput)} max output`);
    return parts.join(' · ');
}

/**
 * Fetch the model list. Public endpoint: no API key is sent.
 * @param {AbortSignal} [signal]
 * @returns {Promise<CatalogModel[]>}
 */
export async function fetchCatalog(signal) {
    const response = await fetch(MODELS_API_URL, { signal });
    if (!response.ok) throw new Error(`OpenRouter returned ${response.status} ${response.statusText}`.trim());
    return parseCatalog(await response.json());
}

/**
 * Search and filter the catalogue. All words of `query` must occur in the id or name.
 * Newest first.
 * @param {CatalogModel[]} models
 * @param {{ query?: string, freeOnly?: boolean, provider?: string, aliasesOnly?: boolean }} [filters]
 */
export function filterModels(models, { query = '', freeOnly = false, provider = '', aliasesOnly = false } = {}) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return models
        .filter(m => !freeOnly || m.isFree)
        .filter(m => !aliasesOnly || m.isAlias)
        .filter(m => !provider || m.provider === provider)
        .filter(m => {
            const haystack = `${m.id} ${m.name}`.toLowerCase();
            return words.every(w => haystack.includes(w));
        })
        .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id));
}

/** Sorted, distinct provider names of a catalogue. */
export function providersOf(models) {
    return [...new Set(models.map(m => m.provider))].sort();
}

const sameIds = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/**
 * Bring a stored bookmark list up to date.
 *
 * - Nothing stored: the recommended models.
 * - The list earlier versions started everyone with, untouched: replaced by the recommended models.
 *   The model the user currently has selected stays bookmarked, so their visible choice does not vanish.
 * - Any other list was customised by the user: kept exactly as it is. Nothing is ever deleted
 *   automatically; entries that OpenRouter no longer lists are flagged in the UI instead.
 *
 * @param {unknown} stored value read from storage
 * @param {string} [currentModelId] the model selected right now
 * @returns {Bookmark[]}
 */
export function migrateBookmarks(stored, currentModelId) {
    if (!Array.isArray(stored)) return RECOMMENDED_MODELS.map(m => ({ ...m }));

    const entries = stored.filter(m => m && typeof m.id === 'string' && m.id);
    const untouched = sameIds(entries.map(m => m.id), LEGACY_DEFAULT_BOOKMARK_IDS);
    if (!untouched) return entries;

    const next = RECOMMENDED_MODELS.map(m => ({ ...m }));
    const current = entries.find(m => m.id === currentModelId);
    if (current && !next.some(m => m.id === current.id)) next.push(current);
    return next;
}

/**
 * Bookmarks the catalogue does not list (retired models, typos). The caller offers to remove them.
 * @param {Bookmark[]} bookmarks
 * @param {Set<string>} listedIds
 */
export function unlistedBookmarks(bookmarks, listedIds) {
    return bookmarks.filter(b => !listedIds.has(b.id));
}

/** Add a bookmark unless its id is there already. Returns the same array when nothing changes. */
export function addBookmark(bookmarks, model) {
    return bookmarks.some(b => b.id === model.id) ? bookmarks : [...bookmarks, { id: model.id, name: model.name || model.id }];
}
~~~~

#### `src/hooks/useDialog.js`

~~~~js
// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => el.getClientRects().length > 0;

/** Open dialogs, most recent last: only the top one handles keys whose focus was lost. */
const openDialogs = [];

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
    const trapRef = useRef(trap);
    useEffect(() => { closeRef.current = onClose; trapRef.current = trap; });

    useEffect(() => {
        const previous = document.activeElement;
        const node = nodeRef.current;
        const first = node && [...node.querySelectorAll(FOCUSABLE)].find(isVisible);
        (first || node)?.focus();
        return () => {
            if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
        };
    }, []);

    // When the focused control inside the dialog disappears (for example "Remove bookmark"), focus
    // falls back to the page and key presses no longer reach the dialog. Catch them on the document,
    // for the topmost open dialog only, and bring focus back into the dialog.
    useEffect(() => {
        const self = {};
        openDialogs.push(self);
        const onDocumentKey = (e) => {
            const node = nodeRef.current;
            if (openDialogs[openDialogs.length - 1] !== self || !node || node.contains(document.activeElement)) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeRef.current();
            } else if (e.key === 'Tab' && trapRef.current) {
                e.preventDefault();
                ([...node.querySelectorAll(FOCUSABLE)].find(isVisible) || node).focus();
            }
        };
        document.addEventListener('keydown', onDocumentKey);
        return () => {
            document.removeEventListener('keydown', onDocumentKey);
            openDialogs.splice(openDialogs.indexOf(self), 1);
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

Also port these small UI pieces, in your own design:
- the status badges and the **Retry** button on the last unfinished reply (`statusBadge`, `messageStatus` in generation.js)
- **Use this version** (with an "on stage" mark) on replies
- **Restore previous**, **Use edited code** and **Fix an error** in the player bar (Fix an error only when `patternForRequest(chat)` is not empty)
- the "No pattern of this chat is in the player yet" bar with **Use latest reply**, for a chat whose stage is empty while it has replies with code
- the one-line notice that edits made in the player stay there
- **Open in Strudel** (new tab)
- a dot on chats with a new pattern, and "writing a reply…" on busy chats
- Settings > Music, with the two selects and an Advanced collapsible for the custom instructions (Reset, Export .txt, Import)
- the save-failure banner with **Export all chats**
- the chat list stops auto-scrolling while the reader is scrolled up
- the player (iframe) is recreated on every chat switch, also when both chats have the same code: key it by chat id **and** code (upstream `StrudelFrame` uses ``key={`${playerId}:${shortHash(src)}`}`` with the chat id as `playerId`). Switching the phone's Chat/Stage tabs must keep it.
- the reply header (label, model, badges, Edit, Use this version) wraps at 320 px, and a long model name breaks

## 6. Data: migrate the `svc.*` keys without data loss

- **Do not rename any key.** Upstream's `openrouter_*` names map to yours:

  | Upstream | Downstream |
  |---|---|
  | `openrouter_chats` | `svc.chats` |
  | `openrouter_current_chat_id` | `svc.chat` |
  | `openrouter_current_code` | `svc.code` |

  For the new keys, use `svc.promptPrefs` (JSON `{ visuals, explanation }`) and `svc.customInstructions` (a string of at most 2,000 characters).
- **`svc.code` becomes the current chat's selected revision** (origin `legacy`) at startup, *only if it differs* from that chat's selected code. Keep writing `svc.code` with the viewed chat's stage code. That makes the migration idempotent and lets the previous version find a pattern after a rollback.
- **Your starter pattern is not a legacy pattern.** Before this update, `svc.code` may hold your starter pattern for a user who never generated anything. If `svc.code` is exactly your starter pattern and the current chat has no messages, store it as origin `starter`, not `legacy`. Otherwise the starter is attached to the user's first request as "the pattern to change". In `loadInitialChats`, the adjusted call looks like this:

  ```js
  const isStarter = legacyCode === STARTER_PATTERN && c.messages.length === 0;
  return isStarter && !stageCode(c) ? addRevision(c, { code: legacyCode, origin: 'starter' }).chat : adoptLegacyCode(c, legacyCode);
  ```
- **Never leave a stale `svc.code`.** Write `svc.chat` and `svc.code` together. If either write fails (storage full), remove `svc.code` (removing works even then) and show the save warning. Otherwise the next start adopts the stale mirror: an older pattern comes back, or another chat's pattern is put into the chat that opens. See the effect in `useChats.js`.
- **Messages:** give messages without an `id` one at load and at import.
  - Downstream marks cut-off replies with `cutOff: true`. The shared code reads it already: `messageStatus()` treats `truncated` **or** `cutOff` as `truncated`, and `chatFile.js` imports `cutOff: true` as `truncated: true`. Keep both checks (so upstream files import too). Keep writing `cutOff` (and `stopped`) next to `status`, so the previous version still marks them.
- **Errors:** downstream stored a failed reply as its partial text followed by `\n\nError: …`. `messageStatus()` already treats such a message as `error`, so it is not sent back to the model. From now on, store `status: 'error'` on new failures, as `replyMessage()` does.
- **Export:** format 3 adds `revisions`, `selectedRevisionId`, `previousRevisionId`, and the message fields `id`, `status`, `finishReason`, `error`, `usage`, `revisionId` and `promptVersion`. Import must clean every field, as `chatFile.js` does, and must not select a revision whose code doesn't parse (`withoutInvalidStage`). Your existing export files, and upstream's version 1, 2 and 3 files, must all import.
- **Repair rather than crash:** corrupt JSON, a missing current chat, or the string "null" as an id fall back to the first chat, as before.

## 7. Server-side items to verify (checks, not findings)

These can't be seen from the client. Confirm each one, or decide it:

1. **Quotas and rate limits** per user for the Grok path, and what the user sees when they hit one: a clear message with the limit and when it resets, not a generic error.
2. **Cancellation:** when the client aborts, the upstream xAI request is cancelled too, so billing and quota stop.
3. **Terminal signals:** the stream forwards `finish_reason` (`stop`, `length`, `content_filter`, `error`) and ends with `[DONE]`. A mid-stream failure is forwarded as an `error` event, not as a silently closed stream.
4. **Key isolation:** the xAI key never reaches the client, usage is attributed per user, and BYOK OpenRouter keys never pass through your server.
5. **Logging is redacted:** no API keys, and no prompts or chat text unless that is intended and the retention is stated.
6. **System prompt:** the Grok path uses the corrected, composed prompt (section 5.4), with a server-side length cap on anything the client sends.
7. **Limits:** what `max_tokens` and `temperature` defaults the server applies, and whether `length` cut-offs reach the client as such.

## 8. Acceptance tests (automate where you can)

The criteria below are complete on their own. If you can see the upstream repository, port these matching tests too (Vitest and Playwright, all with mocked providers):
- `openrouter.test.js` (end states)
- `generation.test.js`
- `strudelUrl.test.js` (round trip)
- `codeRepair.test.js`
- `patternCheck.test.js` (fails closed)
- `saveStatus.test.js`
- `revisions.test.js` (migration included)
- `chats.test.js`
- `chatFile.test.js` (format 3)
- `prompt/prompt.test.js`
- `systemPrompt.test.js` (Strudel facts with doc URLs)

The pass criteria are:

1. A stream that closes without `finish_reason` or `[DONE]` is `interrupted`. It is marked in the chat and the previous pattern stays loaded. `stop` without `[DONE]` is completed; `length` is truncated; `content_filter` or a refusal is refused; a mid-stream error is error (with HTTP 200). All of these hold for the Grok path too.
2. `decode(encode(x)) === x` for any Unicode input. Code with “ ” inside a string stays valid and plays unchanged. `s(“bd sd”)` is repaired, loads, and the notice says it was repaired.
3. With a delayed reply: start a request in chat A and switch to chat B. B's stage does not change, B's input is enabled, and B shows no Stop button and no streaming text. When the reply arrives, A has the new pattern. Stop in B cancels only B's request.
4. An edit to an earlier message and a rename made during generation survive the reply.
5. The request's last user message contains the pattern on stage; the stored chat text does not.
6. Use edited code: invalid code is refused, valid code becomes the stage pattern, and the next request contains it.
7. Settings > Music changes the composed system prompt (Hydra module present or absent; teaching text). Every reply stores `promptVersion`.
8. A profile from the previous version keeps its chats, its key, its model and its stage pattern after the update. The previous version's export files import.
9. The save-failure warning appears when storage throws, and Export works.
10. With the CSP enforced there are no `securitypolicyviolation` events in normal use, including the Grok path.
11. After model A wrote a pattern and model B revised it, the code's first line names model B, and the pattern sent with the request has no attribution line.
12. Going offline while a reply streams leaves it `interrupted`, with its text kept. A stream that closes with nothing is an error with a message, never an empty bubble.
13. Deleting a chat that is still writing a reply stops that request, and nothing is announced for it afterwards.
14. A downstream backup with `cutOff: true` imports as cut off. A first visit's starter pattern is not sent as "the pattern in the player".
15. In Settings, removing a bookmark and then pressing Escape closes the dialog. Tab stays inside the Chats panel.
16. With the parser file blocked, a completed reply with invalid code leaves the previous pattern on stage, and the notice says to reload the page.
17. With writes of `svc.code` failing, a pattern chosen with Use edited code is still on stage after a reload, and the save warning shows. With writes of `svc.chat` failing, switching to chat B and reloading opens chat A with A's own pattern. A `svc.code` written by the previous version is still adopted.
18. Importing a format-3 file whose selected revision is `s("bd"` does not load it, says so, and keeps the revision in the chat.
19. Two chats with the same pattern: switching between them replaces the iframe element; switching the phone tabs does not.
20. A provider error, a JSON error body, a mid-stream error chunk and a network error that contain the key (or any `sk-or-…` or `Bearer …` text) leave no key in the message, the stored chat, an export or the console.
21. At 320, 375 and 390 px, a reply's actions fit the conversation with no sideways scrolling (in your own layout).

## 9. Manual checklist (deployed app)

- [ ] **Real audio.** Press play on a reply's pattern and on the starter pattern, and listen on desktop and on a phone.
- [ ] **Grok path.**
  - [ ] A normal reply loads.
  - [ ] Stop during a reply leaves the partial text marked "stopped".
  - [ ] Force a server-side cut-off (`max_tokens`): the reply is marked "cut off" and is not loaded.
  - [ ] Kill the connection mid-stream (go offline): the reply is "interrupted" and is not loaded.
- [ ] **Background chat.** Start a reply in chat A, switch to chat B, and wait. The music in B keeps playing and A gets a dot. Note that switching chats itself stops the music, by design.
- [ ] **Unicode.**
  - [ ] Code containing `ä ö å € 🎵` and `"He said “hi”"` inside a string plays unchanged in strudel.cc.
  - [ ] A reply that uses curly quotes as delimiters is repaired and plays.
- [ ] **Player edits.** Edit in the player, then use Use edited code. Ask for a change; it builds on the edited code.
- [ ] **Fix an error.** Paste a real REPL error and get a fix.
- [ ] **Settings.**
  - [ ] Music settings: with visuals on "never", replies contain no `initHydra`.
  - [ ] Custom instructions take effect; export and import them.
- [ ] **Mobile.**
  - [ ] Chat/Stage tabs work, and music keeps playing while Chat is in front.
  - [ ] Scrolling up during a reply stays put.
- [ ] **Data.** Export all chats, clear the site data, import them: everything is back, including each chat's pattern.

## 10. Known limitations

- Edits made inside strudel.cc can't be read: the iframe is cross-origin and the app does not script it. The "Use edited code" paste is the way back.
- New code, or switching chats, remounts the player, which stops the music.
- The player depends on strudel.cc's `#<base64>` URL loading, which is an informal contract.
- Iframe URLs above about 2 MiB can't be opened; a copy/open fallback is shown.
- localStorage holds only a few MB. Revisions are capped at 50 per chat, and a save failure is shown.
- Module selection uses word rules, so it can miss a module or include one it doesn't need. The core is always included.
- Prompt improvements have not been measured on real models. Upstream's offline harness (`eval/`) can compare prompts on validity, constraints and preservation. Musical quality needs blind listening.

## 11. Rollback

Before you start, note the current Grok Build version of strudel.grok.me. If anything in sections 8 or 9 fails in production, restore that version in Grok Build, then fix and redeploy.

The data stays compatible both ways:
- The new fields are optional.
- `svc.code` keeps mirroring the viewed chat's pattern.
- `cutOff` and `stopped` are still written.
- The previous version ignores `svc.promptPrefs`, `svc.customInstructions` and the format-3 extras.
