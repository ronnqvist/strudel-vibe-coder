// SPDX-License-Identifier: MIT
/**
 * Where replies come from.
 *
 * - mock: canned replies stored with each task, streamed as OpenRouter-style server-sent events,
 *   so the app's real request and stream code runs without the network. Deterministic.
 * - live: the real OpenRouter API. Refuses to run unless explicitly enabled, with a key in the
 *   environment and a request limit. Costs money: only with the owner's approval.
 */

const encoder = new TextEncoder();

/** SSE body for a canned reply. `end`: stop | length | content_filter | error | none (connection closed). */
export function sseFor({ content = '', end = 'stop', usage = null, model = 'mock/model' }) {
    const events = [];
    if (content) events.push({ model, choices: [{ delta: { content } }] });
    if (end === 'error') {
        events.push({ error: { code: 502, message: 'Mock provider error' }, choices: [{ delta: { content: '' }, finish_reason: 'error' }] });
    } else if (end !== 'none') {
        events.push({ model, choices: [{ delta: {}, finish_reason: end }], ...(usage && { usage }) });
    }
    let body = events.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
    if (end !== 'none' && end !== 'error') body += 'data: [DONE]\n\n';
    return body;
}

/** A fetch that answers with the task's canned reply for this run (replies repeat in turn). */
export function mockFetch(task, runIndex) {
    const replies = task.mock ?? [];
    if (replies.length === 0) throw new Error(`Task ${task.id} has no mock replies`);
    const reply = replies[runIndex % replies.length];
    return async () => ({
        ok: true,
        headers: { get: () => 'text/event-stream' },
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(sseFor(reply)));
                controller.close();
            },
        }),
    });
}

/**
 * A guarded fetch for real calls. Counts requests and stops at `maxRequests`.
 * @param {{ live?: boolean, apiKey?: string, maxRequests?: number }} options
 */
export function liveFetch({ live, apiKey, maxRequests }) {
    if (!live) throw new Error('Live mode needs --live. It makes paid API calls; run it only with the owner\'s approval.');
    if (!apiKey) throw new Error('Live mode needs OPENROUTER_API_KEY in the environment.');
    if (!Number.isInteger(maxRequests) || maxRequests < 1) throw new Error('Live mode needs --max-requests <n>.');
    let used = 0;
    const counted = async (...args) => {
        if (used >= maxRequests) throw new Error(`Request limit reached (${maxRequests}).`);
        used++;
        return fetch(...args);
    };
    counted.used = () => used;
    return counted;
}
