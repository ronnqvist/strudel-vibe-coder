// SPDX-License-Identifier: MIT
/**
 * Custom OpenAI-compatible endpoints (OpenAI, Groq, Mistral, DeepSeek, Together, xAI, or a local
 * server such as Ollama or LM Studio): a base URL such as `https://api.groq.com/openai/v1`, to
 * which `/chat/completions` and `/models` are added.
 *
 * Only https URLs are accepted, plus plain http on this computer (localhost and 127.0.0.1), which
 * is what the Content-Security-Policy allows (scripts/csp.js). Keys are never part of an endpoint:
 * they are kept like the OpenRouter key (see useSettings).
 */

/** The id of the built-in provider. */
export const OPENROUTER_ENDPOINT = 'openrouter';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * @param {string} input
 * @returns {{ ok: true, url: string } | { ok: false, error: string }}
 */
export function checkBaseUrl(input) {
    const text = String(input ?? '').trim();
    if (!text) return { ok: false, error: 'Enter the base URL, for example https://api.groq.com/openai/v1.' };
    let url;
    try {
        url = new URL(text);
    } catch {
        return { ok: false, error: 'That is not a full URL. Start it with https:// (or http://localhost for a server on this computer).' };
    }
    if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) {
        return { ok: false, error: 'Only https URLs work, except http://localhost and http://127.0.0.1 for a server on this computer.' };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Only https URLs work.' };
    if (url.username || url.password) return { ok: false, error: 'Leave the user name and password out of the URL; put the key in the key field.' };
    if (url.search || url.hash || text.includes('#') || text.includes('?')) {
        return { ok: false, error: 'Leave the query (?…) and fragment (#…) out of the base URL.' };
    }
    return { ok: true, url: `${url.origin}${url.pathname}`.replace(/\/+$/, '') };
}

export const chatUrl = (base) => `${base}/chat/completions`;
export const modelsUrl = (base) => `${base}/models`;

/** Model ids from an OpenAI-style `GET /models` answer (`{ data: [{ id }] }`), sorted, without duplicates. */
export function parseModelIds(json) {
    const ids = Array.isArray(json?.data) ? json.data.map(m => m?.id).filter(id => typeof id === 'string' && id.trim()) : [];
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/**
 * @typedef {{ id: string, name: string, baseUrl: string, model: string }} Endpoint
 * @param {unknown} stored what was kept in localStorage
 * @returns {Endpoint[]} the valid endpoints, without anything else (keys included)
 */
export function cleanEndpoints(stored) {
    if (!Array.isArray(stored)) return [];
    const seen = new Set([OPENROUTER_ENDPOINT]);
    const out = [];
    for (const e of stored) {
        if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id || seen.has(e.id)) continue;
        const checked = checkBaseUrl(e.baseUrl);
        if (!checked.ok) continue;
        seen.add(e.id);
        const name = typeof e.name === 'string' && e.name.trim() ? e.name.trim().slice(0, 60) : new URL(checked.url).host;
        out.push({ id: e.id, name, baseUrl: checked.url, model: typeof e.model === 'string' ? e.model.trim().slice(0, 200) : '' });
    }
    return out;
}
