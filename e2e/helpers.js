// SPDX-License-Identifier: MIT

/**
 * Server-sent-events body in the shape OpenRouter streams.
 * `finishReason: null` ends the body after the content, with no final chunk and no [DONE]
 * (a connection that closed early).
 */
export function sseBody(content, model = 'vendor/resolved-1', finishReason = 'stop') {
    const chunk = { model, choices: [{ delta: { content } }] };
    if (finishReason === null) return `data: ${JSON.stringify(chunk)}\n\n`;
    const end = { model, choices: [{ delta: {}, finish_reason: finishReason }] };
    return `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(end)}\n\ndata: [DONE]\n\n`;
}

/** What the player URL decodes to (the app puts base64(UTF-8 code) after the # of strudel.cc). */
export function decodeStrudelSrc(src) {
    return Buffer.from(decodeURIComponent(src.split('#')[1] ?? ''), 'base64').toString('utf8');
}

const MODELS_FIXTURE = {
    data: [
        { id: '~x-ai/grok-latest', name: 'xAI: Grok Latest', created: 3, context_length: 256000, pricing: { prompt: '0.000002', completion: '0.00001' }, architecture: { output_modalities: ['text'] } },
        { id: '~anthropic/claude-opus-latest', name: 'Anthropic: Claude Opus Latest', created: 2, context_length: 200000, top_provider: { max_completion_tokens: 32000 }, pricing: { prompt: '0.000005', completion: '0.000025' }, architecture: { output_modalities: ['text'] } },
        { id: '~openai/gpt-sol-latest', name: 'OpenAI: GPT Sol Latest', created: 2, context_length: 200000, pricing: { prompt: '0.000003', completion: '0.000015' }, architecture: { output_modalities: ['text'] } },
        { id: '~deepseek/deepseek-flash-latest', name: 'DeepSeek: DeepSeek Flash Latest', created: 1, context_length: 128000, pricing: { prompt: '0.0000001', completion: '0.0000003' }, architecture: { output_modalities: ['text'] } },
    ],
};

/**
 * Make a page hermetic: the app and nothing else.
 * - every request that is not to localhost is blocked
 * - strudel.cc answers with an empty page (the real REPL is not needed to test this app)
 * - OpenRouter's model list and chat endpoint are mocked; chat requests are recorded
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ reply?: string, model?: string, finishReason?: string | null }} [options] what the mocked model answers
 * @returns {{ chatRequests: { body: any, headers: Record<string, string> }[] }}
 */
export async function mockNetwork(page, { reply = '```js\ns("bd sd")\n```', model = 'vendor/resolved-1', finishReason = 'stop' } = {}) {
    const chatRequests = [];
    // On the context, so popups (such as "Open in Strudel") are mocked too, never the real hosts.
    // Routes registered later win, so the catch-all goes first. A test's own page.route() calls
    // still take precedence over these.
    const context = page.context();
    await context.route('**/*', (route) => {
        const { hostname } = new URL(route.request().url());
        return hostname === 'localhost' ? route.continue() : route.abort('blockedbyclient');
    });
    await context.route('https://strudel.cc/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>strudel stub</title><p>stub</p>' }));
    await context.route('https://openrouter.ai/api/v1/models', (route) =>
        route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(MODELS_FIXTURE) }));
    await context.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
        const request = route.request();
        chatRequests.push({ body: JSON.parse(request.postData() ?? '{}'), headers: request.headers() });
        return route.fulfill({ contentType: 'text/event-stream', headers: { 'access-control-allow-origin': '*' }, body: sseBody(reply, model, finishReason) });
    });
    return { chatRequests };
}

/**
 * Put values in localStorage before the app starts, once per browser context
 * (so a reload does not undo what the test did afterwards).
 */
export async function seedStorage(page, entries) {
    await page.addInitScript(([data]) => {
        if (window !== window.top) return; // the app only, never the strudel.cc frame
        if (localStorage.getItem('__seeded')) return;
        localStorage.setItem('__seeded', '1');
        for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
    }, [entries]);
}

/**
 * Make the mocked model answer after `ms` milliseconds (register after mockNetwork; later routes win).
 * @returns {{ requests: number }} counts the chat requests
 */
export async function delayedReply(page, reply, { ms = 1500, model = 'mock-model', finishReason = 'stop' } = {}) {
    const counter = { requests: 0 };
    await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
        counter.requests++;
        await new Promise((resolve) => setTimeout(resolve, ms));
        // the page may have aborted the request meanwhile
        await route.fulfill({ contentType: 'text/event-stream', headers: { 'access-control-allow-origin': '*' }, body: sseBody(reply, model, finishReason) }).catch(() => {});
    });
    return counter;
}
