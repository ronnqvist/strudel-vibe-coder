// SPDX-License-Identifier: MIT
/**
 * Scores one reply. Every score is mechanical: it says whether the code parses, would be loaded,
 * meets the task's stated constraints and keeps what a revision had to keep. None of it says
 * whether the music is good: that needs people listening (see listening.mjs).
 */
import { preparePattern } from '../../src/lib/patternCheck.js';
import { canAutoLoad } from '../../src/lib/generation.js';

const toRegExp = ({ re, flags = '' }) => new RegExp(re, flags);

/**
 * @param {object} task
 * @param {{ status: string, content: string, code: string | null, usage: object | null }} result
 * @param {{ latencyMs: number, systemChars: number }} meta
 */
export async function scoreRun(task, result, meta) {
    const code = result.code ?? '';
    const prepared = code ? await preparePattern(code) : { ok: false, repaired: false, code: '' };
    const playable = prepared.ok ? prepared.code : '';
    const checks = task.checks ?? [];
    const passed = checks.filter(c => toRegExp(c).test(playable) === (c.expect !== false));
    const preserve = task.preserve ?? [];
    const kept = preserve.filter(snippet => playable.includes(snippet));
    const expectedStatus = task.expectStatus ?? 'completed';
    return {
        status: result.status,
        statusAsExpected: result.status === expectedStatus,
        valid: prepared.ok,
        repaired: Boolean(prepared.repaired),
        autoLoaded: canAutoLoad(result.status) && prepared.ok,
        constraints: checks.length ? passed.length / checks.length : null,
        failedChecks: checks.filter(c => !passed.includes(c)).map(c => c.label),
        preservation: preserve.length ? kept.length / preserve.length : null,
        latencyMs: meta.latencyMs,
        outputChars: (result.content ?? '').length,
        systemChars: meta.systemChars,
        promptTokens: result.usage?.prompt_tokens ?? null,
        completionTokens: result.usage?.completion_tokens ?? null,
        cost: result.usage?.cost ?? null,
    };
}
