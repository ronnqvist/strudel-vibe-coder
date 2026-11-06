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

const KEY_PATTERNS = [
    /\bsk-or-[A-Za-z0-9_-]{8,}/g, // OpenRouter
    /\bsk-[A-Za-z0-9_-]{16,}/g, // OpenAI, DeepSeek and others
    /\b(xai-|gsk_)[A-Za-z0-9_-]{16,}/g, // xAI, Groq
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
];

/**
 * Remove API keys from text that came from the provider or the network, before it is shown,
 * stored in the chat, exported or logged: the exact key of this request, and anything that looks
 * like a provider key (OpenRouter, OpenAI, xAI, Groq and similar) or a bearer token.
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
 * Only a missing OpenRouter API key throws (before any request).
 *
 * @param {string} apiKey the OpenRouter key (not used with a custom `endpoint`)
 * @param {string} model the model id
 * @param {{ role: string, content: string }[]} conversation the whole conversation so far,
 *   including the user's newest message as its last entry (it is not appended again here)
 * @param {string} [modelName] display name used in the attribution line
 * @param {{ signal?: AbortSignal, onText?: (textSoFar: string) => void, systemPrompt?: string, endpoint?: { url: string, apiKey?: string } }} [options]
 *   `signal` stops the request; the text received so far is then returned with status `aborted`.
 *   `onText` is called with the full reply text every time it grows.
 *   `systemPrompt` is the composed prompt for this request (default: the full SYSTEM_PROMPT).
 *   `endpoint` sends the request to a custom OpenAI-compatible endpoint instead of OpenRouter: its
 *   chat-completions URL and its key (optional, for example for a local server). It gets only the
 *   Content-Type and, with a key, the Authorization header, never OpenRouter's app headers.
 * @returns {Promise<GenerationResult>}
 *   `resolvedModel` is the concrete model that answered (differs from `model` for `~...-latest` aliases);
 *   `modelLabel` is what to show for it: the concrete model for an alias, the display name otherwise.
 *   `stopped` and `truncated` mirror `status` for code (and stored chats) that predate `status`.
 */
export async function generateStrudelCode(apiKey, model, conversation, modelName, { signal, onText, systemPrompt = SYSTEM_PROMPT, endpoint } = {}) {
    const cleanApiKey = (endpoint ? endpoint.apiKey : apiKey)?.trim() || '';
    if (!endpoint && !cleanApiKey) {
        throw new Error("API Key is required");
    }
    const requestUrl = endpoint ? endpoint.url : OPENROUTER_API_URL;
    const headers = endpoint
        ? { "Content-Type": "application/json", ...(cleanApiKey && { Authorization: `Bearer ${cleanApiKey}` }) }
        : {
            "Authorization": `Bearer ${cleanApiKey}`,
            "HTTP-Referer": appReferer(), // Identifies the app to OpenRouter; never includes the URL hash
            "X-Title": "Strudel Vibe Coder", // Optional
            "Content-Type": "application/json"
        };

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
        const response = await fetch(requestUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
            }),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const statusLine = `${response.status} ${response.statusText}`.trim();
            error = failure(errorData.error, endpoint ? `The endpoint returned an error: ${statusLine}` : `OpenRouter API Error: ${statusLine}`);
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
