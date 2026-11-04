// SPDX-License-Identifier: MIT

/**
 * Check that a pattern is syntactically valid JavaScript before it is loaded into the player,
 * so a broken reply cannot replace a pattern that works.
 *
 * Uses the acorn parser, loaded on first use to keep the initial page small. It parses the code
 * without running it, so it works under the app's Content-Security-Policy (which forbids eval and
 * the Function constructor).
 *
 * Fails open: only a real syntax error refuses a pattern. If the parser cannot be loaded or fails
 * in any other way, the pattern is loaded as before, so this check can never block playback.
 */

const PARSE_OPTIONS = {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowAwaitOutsideFunction: true, // `await initHydra()` at the top level
    allowReturnOutsideFunction: true,
    allowHashBang: true,
};

let parserPromise;
const loadParser = () => (parserPromise ??= import('acorn').then(m => m.parse));

/**
 * @param {string} code
 * @param {{ parse?: (code: string, options: object) => unknown }} [deps] for tests
 * @returns {Promise<string | null>} the syntax error message, or null when the pattern may be loaded
 */
export async function patternSyntaxError(code, deps = {}) {
    if (!code || !code.trim()) return null;
    let parse = deps.parse;
    try {
        parse ??= await loadParser();
    } catch {
        parserPromise = undefined; // try again next time
        return null;
    }
    try {
        parse(code, PARSE_OPTIONS);
        return null;
    } catch (error) {
        return error instanceof SyntaxError ? error.message : null;
    }
}
