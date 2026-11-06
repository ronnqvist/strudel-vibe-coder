// SPDX-License-Identifier: MIT

/**
 * Check that a pattern is syntactically valid JavaScript before it is loaded into the player,
 * so a broken reply cannot replace a pattern that works.
 *
 * Uses the acorn parser, kept in a separate file to keep the initial page small. It parses the code
 * without running it, so it works under the app's Content-Security-Policy (which forbids eval and
 * the Function constructor).
 *
 * Fails closed: if the parser cannot be loaded (for example a tab opened before a new deploy, whose
 * parser file is gone) or fails in any way other than a syntax error, the pattern is refused with
 * a message saying it could not be checked. Nothing unchecked replaces a pattern that works.
 * The parser is preloaded at startup (preloadParser in main.jsx), so it comes from the same build
 * as the page.
 */

import { repairTypography } from './codeRepair';

const PARSE_OPTIONS = {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowAwaitOutsideFunction: true, // `await initHydra()` at the top level
    allowReturnOutsideFunction: true,
    allowHashBang: true,
};

export const UNAVAILABLE_MESSAGE = 'The code could not be checked because part of the app did not load. Reload the page, then choose "Use this version" on the reply.';

let parserPromise;
const importParser = () => import('acorn').then(m => m.parse);
const loadParser = (load = importParser) => (parserPromise ??= load());

/** Start loading the parser now, so a later check does not depend on the network. */
export function preloadParser() {
    loadParser().catch(() => { parserPromise = undefined; });
}

/**
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} deps for tests
 * @returns {Promise<{ error: string | null, unavailable: boolean }>}
 */
async function checkSyntax(code, deps) {
    if (!code || !code.trim()) return { error: null, unavailable: false };
    let parse = deps.parse;
    if (!parse) {
        try {
            parse = deps.load ? await deps.load() : await loadParser();
        } catch {
            parserPromise = undefined; // try again next time
            return { error: UNAVAILABLE_MESSAGE, unavailable: true };
        }
    }
    try {
        parse(code, PARSE_OPTIONS);
        return { error: null, unavailable: false };
    } catch (error) {
        if (error instanceof SyntaxError) return { error: error.message, unavailable: false };
        return { error: `The code could not be checked (${error?.message || 'parser error'}).`, unavailable: true };
    }
}

/**
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} [deps] for tests
 * @returns {Promise<string | null>} why the pattern may not be loaded (a syntax error, or that it
 *   could not be checked), or null when it may be loaded
 */
export async function patternSyntaxError(code, deps = {}) {
    return (await checkSyntax(code, deps)).error;
}

/**
 * Decide what exactly goes into the player for `code`.
 *
 * 1. Code that parses is used exactly as it is (typographic characters inside its strings and
 *    comments included).
 * 2. Otherwise a syntax-aware typography repair is tried (curly quotes used as delimiters, dashes
 *    used as a minus; see codeRepair.js). It is used only if the repaired code parses.
 * 3. Otherwise the code is refused with the original's syntax error.
 * If the parser is unavailable, the code is refused with `unavailable: true` and no repair is tried.
 *
 * The returned `code` is the string that was validated; store, encode and play exactly that.
 *
 * @param {string} code
 * @param {{ parse?: Function, load?: () => Promise<Function> }} [deps] for tests
 * @returns {Promise<{ ok: boolean, code: string, repaired: boolean, error: string | null, unavailable?: true }>}
 */
export async function preparePattern(code, deps = {}) {
    const { error, unavailable } = await checkSyntax(code, deps);
    if (!error) return { ok: true, code, repaired: false, error: null };
    if (unavailable) return { ok: false, code, repaired: false, error, unavailable: true };
    const repaired = repairTypography(code);
    if (repaired !== code && !(await checkSyntax(repaired, deps)).error) {
        return { ok: true, code: repaired, repaired: true, error: null };
    }
    return { ok: false, code, repaired: false, error };
}
