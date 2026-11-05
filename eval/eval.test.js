// SPDX-License-Identifier: MIT
// Smoke test: the whole harness runs offline on the mock provider, and its scores are right.
import { describe, expect, it } from 'vitest';
import { TASKS } from './tasks/index.js';
import { buildRequest, runEval } from './lib/runner.js';
import { liveFetch, sseFor } from './lib/providers.js';
import { markdownReport, summarize } from './lib/report.js';
import { LEGACY_PROMPT } from './prompts/legacy.js';
import { SYSTEM_PROMPT } from '../src/lib/systemPrompt.js';

describe('task sets', () => {
    it('have unique ids, known kinds, both splits, and mock replies', () => {
        const ids = TASKS.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const t of TASKS) {
            expect(['draft', 'constraint', 'revision', 'failure']).toContain(t.kind);
            expect(t.mock?.length, t.id).toBeGreaterThan(0);
            for (const c of t.checks ?? []) expect(() => new RegExp(c.re, c.flags), `${t.id}: ${c.label}`).not.toThrow();
            if (t.kind === 'revision') expect(t.current && t.preserve?.length, t.id).toBeTruthy();
        }
        expect(TASKS.filter(t => t.split === 'dev').length).toBeGreaterThanOrEqual(15);
        expect(TASKS.filter(t => t.split === 'heldout').length).toBeGreaterThanOrEqual(6);
        for (const kind of ['draft', 'constraint', 'revision', 'failure']) expect(TASKS.some(t => t.kind === kind)).toBe(true);
    });
});

describe('requests', () => {
    const revision = TASKS.find(t => t.id === 'revise-tempo');
    it('legacy uses the frozen prompt and no stage context; current composes the prompt and attaches the pattern', () => {
        const legacy = buildRequest(revision, 'legacy');
        expect(legacy.systemPrompt).toBe(LEGACY_PROMPT);
        expect(legacy.messages.at(-1).content).toBe(revision.prompt);
        const current = buildRequest(revision, 'current');
        expect(current.systemPrompt).not.toBe(LEGACY_PROMPT);
        expect(current.messages.at(-1).content).toContain(revision.current);
        expect(current.messages.at(-1).content.endsWith(`My request:\n${revision.prompt}`)).toBe(true);
    });
    it('the frozen legacy prompt still has the facts #8 fixed, and the current one does not', () => {
        expect(LEGACY_PROMPT).toMatch(/\.delay\(time\) - delay time/);
        expect(SYSTEM_PROMPT).not.toMatch(/\.delay\(time\)/);
    });
});

describe('mock run', () => {
    it('scores every task through the app\'s request path, offline', async () => {
        const records = await runEval({ tasks: TASKS, runs: 2 });
        expect(records).toHaveLength(TASKS.length * 2 * 2);
        const byId = (id, variant = 'current') => records.filter(r => r.task === id && r.variant === variant);

        // stream end states are classified, and nothing unfinished would load
        expect(byId('fail-interrupted').every(r => r.status === 'interrupted' && !r.autoLoaded && r.statusAsExpected)).toBe(true);
        expect(byId('fail-truncated').every(r => r.status === 'truncated' && !r.autoLoaded)).toBe(true);
        expect(byId('fail-refused').every(r => r.status === 'refused')).toBe(true);
        expect(byId('held-fail-error').every(r => r.status === 'error')).toBe(true);
        // curly quotes as delimiters are repaired and then load
        expect(byId('fail-curly-quotes').every(r => r.valid && r.repaired && r.autoLoaded)).toBe(true);
        // constraint and preservation scores
        const [good, bad] = byId('constraint-tempo-bank');
        expect(good.constraints).toBe(1);
        expect(bad.constraints).toBeCloseTo(2 / 3);
        expect(bad.failedChecks).toEqual(['no melodic part']);
        const [kept, changedMore] = byId('revise-tempo');
        expect(kept.preservation).toBe(1);
        expect(changedMore.preservation).toBe(1); // lpq changed, but the preserved parts are intact
        expect(byId('revise-add-layer')[1].preservation).toBe(0);
        // the system prompt differs, the replies (mock) do not
        expect(byId('draft-acid', 'legacy')[0].systemChars).toBe(LEGACY_PROMPT.length);
        expect(byId('draft-acid')[0].systemChars).toBeLessThan(LEGACY_PROMPT.length);
    });

    it('summarises per split and prompt, and says that mock mode does not judge the prompts or the music', async () => {
        const records = await runEval({ tasks: TASKS.slice(0, 3), runs: 1 });
        const summary = summarize(records);
        expect(Object.keys(summary)).toEqual(['dev']);
        expect(summary.dev.current.valid.mean).toBe(1);
        const md = markdownReport(records, { provider: 'mock', runs: 1, model: 'mock/model' });
        expect(md).toMatch(/Mock mode/);
        expect(md).toMatch(/No number here measures musical quality/);
    });
});

describe('providers', () => {
    it('the mock stream ends the way the task says', () => {
        expect(sseFor({ content: 'x', end: 'none' })).not.toMatch(/finish_reason|\[DONE\]/);
        expect(sseFor({ content: 'x', end: 'length' })).toMatch(/"finish_reason":"length"[\s\S]*\[DONE\]/);
    });
    it('live mode refuses to run unless explicitly enabled, with a key and a request limit', () => {
        expect(() => liveFetch({})).toThrow(/--live/);
        expect(() => liveFetch({ live: true })).toThrow(/OPENROUTER_API_KEY/);
        expect(() => liveFetch({ live: true, apiKey: 'k' })).toThrow(/--max-requests/);
        expect(typeof liveFetch({ live: true, apiKey: 'k', maxRequests: 2 })).toBe('function');
    });
});
