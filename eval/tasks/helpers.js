// SPDX-License-Identifier: MIT
/** Helpers for writing tasks. A check is a regular expression run on the playable code. */

/** A canned model reply with one code block. */
export const reply = (code, text = 'Here is the pattern:', extra = {}) => ({ content: `${text}\n\n\`\`\`javascript\n${code}\n\`\`\``, end: 'stop', ...extra });

/** The code must match. */
export const has = (label, re, flags = '') => ({ label, re, flags });
/** The code must not match. */
export const lacks = (label, re, flags = '') => ({ label, re, flags, expect: false });

export const PARSES_AS_STRUDEL = has('uses a Strudel pattern function', String.raw`\b(s|sound|note|n|stack|chord)\(`);
