// SPDX-License-Identifier: MIT
/**
 * Blind listening sheet from a results.json: for each task, one playable pattern per prompt,
 * shown as "A" and "B" in a random order per task, as strudel.cc links. The key (which letter
 * is which prompt) goes to a separate file, to be opened only after rating.
 *
 *   node --import ./eval/register.mjs eval/listening.mjs eval/out/<run>/results.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { strudelUrl } from '../src/lib/strudelUrl.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: listening.mjs <results.json>');
const { records } = JSON.parse(readFileSync(file, 'utf8'));

const firstPlayable = (task, variant) => records.find(r => r.task === task && r.variant === variant && r.autoLoaded && r.code);
const tasks = [...new Set(records.map(r => r.task))];
const rows = [];
const key = {};
for (const task of tasks) {
    const legacy = firstPlayable(task, 'legacy');
    const current = firstPlayable(task, 'current');
    if (!legacy || !current) continue;
    const swap = Math.random() < 0.5;
    const [a, b] = swap ? [current, legacy] : [legacy, current];
    key[task] = { A: a.variant, B: b.variant };
    rows.push({ task, a: strudelUrl(a.code), b: strudelUrl(b.code) });
}
const escape = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = `<!doctype html><meta charset="utf-8"><title>Blind listening</title>
<h1>Blind listening</h1>
<p>Open each link, press play, and rate A and B from 1 (poor) to 5 (great) for how well they fit the request and how good they sound. Do not open the key file until you are done.</p>
<table border="1" cellpadding="6"><tr><th>Task</th><th>A</th><th>B</th><th>Rating A</th><th>Rating B</th></tr>
${rows.map(r => `<tr><td>${escape(r.task)}</td><td><a href="${escape(r.a)}" target="_blank" rel="noreferrer">A</a></td><td><a href="${escape(r.b)}" target="_blank" rel="noreferrer">B</a></td><td></td><td></td></tr>`).join('\n')}
</table>`;
const dir = dirname(file);
writeFileSync(join(dir, 'listening.html'), html);
writeFileSync(join(dir, 'listening-key.json'), JSON.stringify(key, null, 2));
console.log(`${rows.length} pairs written to ${join(dir, 'listening.html')} (key: listening-key.json)`);
