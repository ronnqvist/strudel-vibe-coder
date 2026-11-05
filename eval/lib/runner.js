// SPDX-License-Identifier: MIT
/**
 * Runs tasks through the app's own request path (generateStrudelCode, the stream states, code
 * extraction and preparePattern) with either prompt, and scores each run.
 */
import { generateStrudelCode } from '../../src/lib/openrouter.js';
import { DEFAULT_PREFS, boundConversation, buildRequestContext, composeSystemPrompt, selectModules } from '../../src/lib/prompt/index.js';
import { APP_URL } from '../../src/config.js';
import { LEGACY_PROMPT } from '../prompts/legacy.js';
import { mockFetch } from './providers.js';
import { scoreRun } from './score.js';

export const VARIANTS = ['legacy', 'current'];

/**
 * The conversation a task stands for. A revision starts from a chat in which the model already
 * gave `current`; the current app also attaches it as the pattern on stage.
 */
export function buildRequest(task, variant, prefs = DEFAULT_PREFS) {
    const history = task.current
        ? [{ role: 'user', content: task.history ?? 'Write a pattern.' }, { role: 'assistant', content: `\`\`\`javascript\n${task.current}\n\`\`\`` }]
        : [];
    const conversation = [...history, { role: 'user', content: task.prompt }];
    if (variant === 'legacy') return { systemPrompt: LEGACY_PROMPT, messages: conversation };
    const modules = selectModules({ userText: task.prompt, selectedCode: task.current ?? '', prefs });
    return {
        systemPrompt: composeSystemPrompt({ modules, prefs }),
        messages: buildRequestContext(boundConversation(conversation), task.current ?? ''),
    };
}

/**
 * @param {{ tasks: object[], variants?: string[], runs?: number, fetchFor?: (task, run) => Function,
 *   apiKey?: string, model?: string, prefs?: object }} options
 *   `fetchFor` defaults to the mock provider.
 * @returns {Promise<object[]>} one record per task, variant and run
 */
export async function runEval({ tasks, variants = VARIANTS, runs = 3, fetchFor = mockFetch, apiKey = 'mock-key', model = 'mock/model', prefs = DEFAULT_PREFS }) {
    globalThis.window ??= { location: new URL(APP_URL) }; // generateStrudelCode names the app in its Referer
    const originalFetch = globalThis.fetch;
    const records = [];
    try {
        for (const task of tasks) {
            for (const variant of variants) {
                for (let run = 0; run < runs; run++) {
                    const { systemPrompt, messages } = buildRequest(task, variant, prefs);
                    globalThis.fetch = fetchFor(task, run);
                    const started = performance.now();
                    const result = await generateStrudelCode(apiKey, model, messages, model, { systemPrompt });
                    const latencyMs = Math.round(performance.now() - started);
                    const score = await scoreRun(task, result, { latencyMs, systemChars: systemPrompt.length });
                    records.push({ task: task.id, kind: task.kind, split: task.split, variant, run, ...score, code: result.code ?? null });
                }
            }
        }
    } finally {
        globalThis.fetch = originalFetch;
    }
    return records;
}
