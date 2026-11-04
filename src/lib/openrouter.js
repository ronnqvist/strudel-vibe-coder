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
 * Ask the model for Strudel code and stream the reply.
 *
 * @param {string} apiKey
 * @param {string} model OpenRouter model id
 * @param {{ role: string, content: string }[]} conversation the whole conversation so far,
 *   including the user's newest message as its last entry (it is not appended again here)
 * @param {string} [modelName] display name used in the attribution line
 * @param {{ signal?: AbortSignal, onText?: (textSoFar: string) => void }} [options]
 *   `signal` stops the request; the text received so far is then returned with `stopped: true`.
 *   `onText` is called with the full reply text every time it grows.
 * @returns {Promise<{ role: 'assistant', content: string, code: string | null, stopped: boolean, resolvedModel: string | null, modelLabel: string }>}
 *   `resolvedModel` is the concrete model that answered (differs from `model` for `~...-latest` aliases);
 *   `modelLabel` is what to show for it: the concrete model for an alias, the display name otherwise.
 *   If the stream fails midway the thrown error carries the text received so far in `error.partial`.
 */
export async function generateStrudelCode(apiKey, model, conversation, modelName, { signal, onText } = {}) {
    const cleanApiKey = apiKey?.trim();
    if (!cleanApiKey) {
        throw new Error("API Key is required");
    }

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversation
    ];

    let content = "";
    let resolvedModel = null;
    let stopped = false;

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
            console.error("OpenRouter Error Response:", errorData);
            throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers?.get?.("content-type") || "";
        if (contentType.includes("application/json") || !response.body) {
            // The provider ignored `stream: true` and sent the whole reply at once.
            const data = await response.json();
            if (!data.choices || data.choices.length === 0) {
                throw new Error("No response from model");
            }
            content = data.choices[0].message.content;
            resolvedModel = data.model || null;
            onText?.(content);
        } else {
            for await (const payload of readSSE(response.body)) {
                if (payload === "[DONE]") break;
                let chunk;
                try {
                    chunk = JSON.parse(payload);
                } catch {
                    continue; // ignore a malformed event rather than lose the whole reply
                }
                if (chunk.error) {
                    throw new Error(chunk.error.message || "The model reported an error");
                }
                resolvedModel = chunk.model || resolvedModel;
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                    content += delta;
                    onText?.(content);
                }
            }
            if (!content) {
                throw new Error("No response from model");
            }
        }
    } catch (error) {
        if (error?.name === "AbortError" || signal?.aborted) {
            stopped = true;
        } else {
            console.error("OpenRouter API Error:", error);
            error.partial = content;
            throw error;
        }
    }

    // For a `~...-latest` alias, name the model that really answered
    const modelLabel = resolvedModel && resolvedModel !== model ? resolvedModel : (modelName || model);
    const code = withAttribution(extractCode(content), modelLabel) || null;
    return { role: "assistant", content, code, stopped, resolvedModel, modelLabel };
}
