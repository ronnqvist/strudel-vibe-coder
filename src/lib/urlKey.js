// SPDX-License-Identifier: MIT

const KEY_HASH_PREFIX = '#sk-or-v1-';

/**
 * A key can be handed to the app in the address: `https://…/#sk-or-v1-…`.
 * Read it and remove it from the address bar straight away (history.replaceState also
 * rewrites the current history entry), so it is not left in the URL, in screenshots,
 * in the back/forward history of this tab, or in the referrer of links followed later.
 * The key is returned for use in memory only; it is never written to storage.
 * Hashes that are not a key are left alone.
 *
 * @param {{ location: Location, history: History } | undefined} win
 * @returns {string} the key, or '' when the address holds none
 */
export function takeKeyFromHash(win) {
    if (!win) return '';
    const { location, history } = win;
    const hash = location.hash || '';
    if (!hash.startsWith(KEY_HASH_PREFIX)) return '';

    let key = hash.slice(1);
    try {
        key = decodeURIComponent(key);
    } catch {
        // not valid percent-encoding: use it as it is
    }
    try {
        history.replaceState(history.state, '', location.pathname + location.search);
    } catch {
        // some embedding contexts forbid replaceState; the key is still used in memory
    }
    return key.trim();
}

/**
 * The key found in the address when the page loaded. Computed once, at module load, on purpose:
 * React may run state initialisers twice in development, and the second run would no longer
 * find the key in the address.
 */
export const urlKey = takeKeyFromHash(typeof window === 'undefined' ? undefined : window);

/** The page URL without hash and query: what is sent to OpenRouter as the app's identity. */
export function appReferer(loc = window.location) {
    return `${loc.origin}${loc.pathname}`;
}
