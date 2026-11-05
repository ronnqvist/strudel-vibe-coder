// SPDX-License-Identifier: MIT
/**
 * Compare the legacy prompt with the current composed prompt.
 *
 *   npm run eval:mock                                    # canned replies, no network, free
 *   node --import ./eval/register.mjs eval/run.mjs --provider mock --runs 3 --split dev
 *
 * Live mode (paid; only with the owner's approval of model and spend):
 *   OPENROUTER_API_KEY=... node --import ./eval/register.mjs eval/run.mjs \
 *     --provider openrouter --live --model <id> --max-requests 60 --runs 3 --split dev
 *
 * Writes eval/out/<timestamp>/results.json and report.md (eval/out is not committed).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { TASKS } from './tasks/index.js';
import { runEval, VARIANTS } from './lib/runner.js';
import { liveFetch, mockFetch } from './lib/providers.js';
import { markdownReport } from './lib/report.js';

const { values } = parseArgs({
    options: {
        provider: { type: 'string', default: 'mock' },
        runs: { type: 'string', default: '3' },
        split: { type: 'string', default: 'all' },
        prompt: { type: 'string', default: 'both' },
        model: { type: 'string', default: 'mock/model' },
        live: { type: 'boolean', default: false },
        'max-requests': { type: 'string' },
        out: { type: 'string', default: 'eval/out' },
    },
});

const runs = Number.parseInt(values.runs, 10);
if (!(runs >= 1)) throw new Error('--runs must be 1 or more');
const tasks = TASKS.filter(t => values.split === 'all' || t.split === values.split);
const variants = values.prompt === 'both' ? VARIANTS : VARIANTS.filter(v => v === values.prompt);
if (tasks.length === 0 || variants.length === 0) throw new Error('No tasks or prompts selected (--split dev|heldout|all, --prompt legacy|current|both)');

let fetchFor = mockFetch;
let apiKey = 'mock-key';
if (values.provider === 'openrouter') {
    const counted = liveFetch({ live: values.live, apiKey: process.env.OPENROUTER_API_KEY, maxRequests: Number.parseInt(values['max-requests'] ?? '', 10) });
    fetchFor = () => counted;
    apiKey = process.env.OPENROUTER_API_KEY;
    const planned = tasks.length * variants.length * runs;
    console.log(`Live run: ${planned} requests planned, limit ${values['max-requests']}.`);
} else if (values.provider !== 'mock') {
    throw new Error('--provider must be mock or openrouter');
}

const records = await runEval({ tasks, variants, runs, fetchFor, apiKey, model: values.model });
const meta = { provider: values.provider, runs, model: values.model, split: values.split, at: new Date().toISOString() };
const dir = join(values.out, meta.at.replace(/[:.]/g, '-'));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'results.json'), JSON.stringify({ meta, records }, null, 2));
writeFileSync(join(dir, 'report.md'), markdownReport(records, meta));
console.log(markdownReport(records, meta));
console.log(`\nWritten to ${dir}`);
