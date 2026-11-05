// SPDX-License-Identifier: MIT
/** Turns run records into per-variant summaries (mean and spread) and a Markdown report. */

const METRICS = [
    ['statusAsExpected', 'Ended as expected', 'pct'],
    ['valid', 'Code parses', 'pct'],
    ['autoLoaded', 'Would load into the player', 'pct'],
    ['repaired', 'Needed typography repair', 'pct'],
    ['constraints', 'Constraints met', 'pct'],
    ['preservation', 'Kept what a revision must keep', 'pct'],
    ['latencyMs', 'Latency (ms)', 'num'],
    ['outputChars', 'Reply size (characters)', 'num'],
    ['systemChars', 'System prompt size (characters)', 'num'],
    ['promptTokens', 'Prompt tokens (when reported)', 'num'],
    ['completionTokens', 'Completion tokens (when reported)', 'num'],
    ['cost', 'Cost per run in USD (when reported)', 'usd'],
];

const value = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v);

function stats(values) {
    const xs = values.map(value).filter(v => typeof v === 'number' && Number.isFinite(v));
    if (xs.length === 0) return null;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    return { mean, sd, n: xs.length };
}

/** @param {object[]} records @returns {Record<string, Record<string, Record<string, object|null>>>} split -> variant -> metric -> stats */
export function summarize(records) {
    const out = {};
    for (const r of records) {
        const split = (out[r.split] ??= {});
        (split[r.variant] ??= []).push(r);
    }
    for (const split of Object.values(out)) {
        for (const [variant, rows] of Object.entries(split)) {
            split[variant] = Object.fromEntries(METRICS.map(([key]) => [key, stats(rows.map(r => r[key]))]));
        }
    }
    return out;
}

const fmt = (s, kind) => {
    if (!s) return 'n/a';
    if (kind === 'pct') return `${(s.mean * 100).toFixed(0)}% ± ${(s.sd * 100).toFixed(0)}`;
    if (kind === 'usd') return `${s.mean.toFixed(5)} ± ${s.sd.toFixed(5)}`;
    return `${s.mean.toFixed(0)} ± ${s.sd.toFixed(0)}`;
};

/** @param {object[]} records @param {{ provider: string, runs: number, model: string }} meta */
export function markdownReport(records, meta) {
    const summary = summarize(records);
    const lines = [
        '# Prompt evaluation',
        '',
        `Provider: **${meta.provider}**, model: \`${meta.model}\`, runs per task: ${meta.runs}, records: ${records.length}.`,
        '',
    ];
    if (meta.provider === 'mock') {
        lines.push('> **Mock mode:** both prompts get the same canned replies, so these numbers test the harness and the app\'s pipeline (stream states, extraction, validation, scoring), not the prompts. Only the system prompt size differs.', '');
    }
    lines.push('> No number here measures musical quality. Judge that by blind listening (`eval/listening.mjs`).', '');
    for (const [split, variants] of Object.entries(summary)) {
        const names = Object.keys(variants);
        lines.push(`## ${split}`, '', `| Metric | ${names.join(' | ')} |`, `|---|${names.map(() => '---').join('|')}|`);
        for (const [key, label, kind] of METRICS) lines.push(`| ${label} | ${names.map(n => fmt(variants[n][key], kind)).join(' | ')} |`);
        lines.push('');
    }
    const failures = records.filter(r => r.failedChecks?.length);
    if (failures.length) {
        lines.push('## Failed constraint checks', '', '| Task | Variant | Run | Failed |', '|---|---|---|---|');
        for (const r of failures) lines.push(`| ${r.task} | ${r.variant} | ${r.run} | ${r.failedChecks.join('; ')} |`);
        lines.push('');
    }
    return lines.join('\n');
}
