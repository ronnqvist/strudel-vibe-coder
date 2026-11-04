// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { CSP_DIRECTIVES, buildCsp } from './csp';

describe('Content-Security-Policy', () => {
    const csp = buildCsp();

    it('serialises directives separated by semicolons', () => {
        expect(buildCsp({ 'default-src': ["'self'"], 'frame-src': ['https://a.test', 'https://b.test'] }))
            .toBe("default-src 'self'; frame-src https://a.test https://b.test");
    });

    it('never allows inline or eval code, and has no wildcard source', () => {
        expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|unsafe-hashes/);
        expect(csp).not.toMatch(/(^|[ ;])\*($|[ ;])/);
        expect(csp).not.toMatch(/https?:(?=[ ;]|$)/); // a bare scheme source such as "https:"
    });

    it('allows scripts and styles from the app itself only', () => {
        expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'"]);
        expect(CSP_DIRECTIVES['style-src']).toEqual(["'self'"]);
    });

    it('allows network access to OpenRouter only, and framing of strudel.cc only', () => {
        expect(CSP_DIRECTIVES['connect-src']).toEqual(['https://openrouter.ai']);
        expect(CSP_DIRECTIVES['frame-src']).toEqual(['https://strudel.cc']);
    });

    it('blocks plugins, base-tag hijacking and form posts', () => {
        expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
        expect(CSP_DIRECTIVES['base-uri']).toEqual(["'self'"]);
        expect(CSP_DIRECTIVES['form-action']).toEqual(["'none'"]);
    });

    it('does not use directives a <meta> policy cannot honour', () => {
        expect(Object.keys(CSP_DIRECTIVES)).not.toContain('frame-ancestors');
        expect(Object.keys(CSP_DIRECTIVES)).not.toContain('sandbox');
        expect(Object.keys(CSP_DIRECTIVES)).not.toContain('report-uri');
    });
});
