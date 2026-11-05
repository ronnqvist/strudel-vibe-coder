// SPDX-License-Identifier: MIT
/**
 * Build strudel.cc URLs that open the REPL with a given piece of code.
 *
 * strudel.cc loads code from the URL fragment: `https://strudel.cc/#<base64>`.
 * Behaviour verified empirically against strudel.cc (Chromium, 2026-11-04):
 * - The base64 payload is decoded as UTF-8. Non-ASCII text, including emoji,
 *   round-trips unchanged; base64 of Latin-1 bytes does not (ä/ö/å turn into U+FFFD).
 * - A URI-encoded payload (`+`, `/`, `=` escaped) is accepted.
 * - The encoding is lossless for any JavaScript string that is valid UTF-16.
 * - Chromium refuses to navigate an iframe whose URL exceeds 2 MiB
 *   (the frame ends up at `about:blank#blocked`); 1.9 million characters still loaded.
 */

export const STRUDEL_ORIGIN = 'https://strudel.cc';

/** Longest iframe URL we hand to the browser. Chromium's hard limit is 2,097,152 characters. */
export const MAX_URL_LENGTH = 2_000_000;

function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Encode code for the strudel.cc URL fragment: UTF-8 -> base64 -> URI component.
 * @param {string} code
 * @returns {string}
 */
export function encodeStrudelHash(code) {
    return encodeURIComponent(bytesToBase64(new TextEncoder().encode(code ?? '')));
}

/**
 * Inverse of {@link encodeStrudelHash}. Accepts the fragment with or without a leading `#`.
 * @param {string} hash
 * @returns {string}
 */
export function decodeStrudelHash(hash) {
    const payload = decodeURIComponent((hash ?? '').replace(/^#/, ''));
    return new TextDecoder().decode(base64ToBytes(payload));
}

/**
 * Full strudel.cc URL for exactly the given code (lossless: decoding the fragment gives `code` back).
 * Any repair of the code happens before validation (preparePattern in patternCheck.js), never here.
 * @param {string} code
 * @returns {string}
 */
export function strudelUrl(code) {
    return `${STRUDEL_ORIGIN}/#${encodeStrudelHash(code)}`;
}

/**
 * Short, stable FNV-1a (32-bit) hash of a string, as 8 hex digits.
 * Used as a React key so the iframe remounts when the code changes.
 * @param {string} text
 * @returns {string}
 */
export function shortHash(text) {
    let h = 0x811c9dc5;
    const s = text ?? '';
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}
