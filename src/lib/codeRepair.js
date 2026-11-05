// SPDX-License-Identifier: MIT
/**
 * Repair the typographic punctuation models sometimes put in code: curly quotes used as string
 * delimiters (s(“bd sd”)) and en/em dashes used as a minus.
 *
 * Syntax-aware: straight-quoted strings, template literals and comments are copied unchanged,
 * so “ ” ‘ ’ – — inside them (which are valid JavaScript) survive. A curly-quoted string becomes a
 * straight-quoted one and its content is kept as it is. A curly string never runs past the end
 * of its line.
 *
 * This is only a candidate fix: preparePattern (patternCheck.js) uses it only when the original
 * code does not parse, and keeps it only when the repaired code does. Regular-expression
 * literals are not recognised; that is acceptable because of that parse check.
 */

const OPEN_DOUBLE = '“”';
const OPEN_SINGLE = '‘’';

/**
 * @param {string} code
 * @returns {string}
 */
export function repairTypography(code) {
    if (!code) return '';
    const n = code.length;
    let out = '';
    let i = 0;
    while (i < n) {
        const c = code[i];
        const next = code[i + 1];

        // comments: copy to their end
        if (c === '/' && next === '/') {
            const end = code.indexOf('\n', i);
            const stop = end === -1 ? n : end;
            out += code.slice(i, stop);
            i = stop;
            continue;
        }
        if (c === '/' && next === '*') {
            const end = code.indexOf('*/', i + 2);
            const stop = end === -1 ? n : end + 2;
            out += code.slice(i, stop);
            i = stop;
            continue;
        }

        // straight strings and template literals: copy to the matching unescaped delimiter
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1;
            while (j < n && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
            const stop = Math.min(j + 1, n);
            out += code.slice(i, stop);
            i = stop;
            continue;
        }

        // a curly quote outside any string opens a string: make it straight, keep its content
        if (OPEN_DOUBLE.includes(c) || OPEN_SINGLE.includes(c)) {
            const straight = OPEN_DOUBLE.includes(c) ? '"' : "'";
            const closers = straight === '"' ? `${OPEN_DOUBLE}"` : `${OPEN_SINGLE}'`;
            let j = i + 1;
            while (j < n && code[j] !== '\n' && !closers.includes(code[j])) j++;
            const closed = j < n && code[j] !== '\n';
            out += straight + code.slice(i + 1, j) + (closed ? straight : '');
            i = closed ? j + 1 : j;
            continue;
        }

        if (c === '–' || c === '—') {
            out += '-';
            i++;
            continue;
        }

        out += c;
        i++;
    }
    return out;
}
