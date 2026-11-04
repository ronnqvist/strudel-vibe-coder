// SPDX-License-Identifier: MIT
/**
 * Content-Security-Policy for the production build, derived from what the app actually loads:
 *
 * - its own script and stylesheet (no inline script, no inline style, no eval)
 * - icons are inline SVG elements and there are no web fonts or images from elsewhere
 * - connect-src: the OpenRouter API, called straight from the browser
 * - frame-src: the Strudel player, https://strudel.cc, shown in an iframe
 *
 * What runs inside the strudel.cc iframe (its scripts, samples from strudel.b-cdn.net, Hydra from
 * unpkg.com) is governed by strudel.cc's own policy, not by this one: frame-src only decides
 * which address the iframe may open.
 *
 * Limits of a policy delivered through <meta>: it cannot set `frame-ancestors` (so it does not
 * stop other sites from embedding this app), `sandbox`, or a reporting endpoint. Those need real
 * HTTP response headers, which GitHub Pages does not let us set.
 */
export const CSP_DIRECTIVES = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'connect-src': ['https://openrouter.ai'],
    'frame-src': ['https://strudel.cc'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'none'"],
};

/** @param {Record<string, string[]>} [directives] */
export function buildCsp(directives = CSP_DIRECTIVES) {
    return Object.entries(directives)
        .map(([name, sources]) => `${name} ${sources.join(' ')}`)
        .join('; ');
}
