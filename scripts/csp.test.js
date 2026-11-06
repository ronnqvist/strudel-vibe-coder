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
        // a bare scheme source such as "https:" only where custom endpoints need it (connect-src)
        const { 'connect-src': _connect, ...others } = CSP_DIRECTIVES;
        expect(buildCsp(others)).not.toMatch(/https?:(?=[ ;]|$)/);
    });

    it('allows scripts and styles from the app itself only', () => {
        expect(CSP_DIRECTIVES['script-src']).toEqual(["'self'"]);
        expect(CSP_DIRECTIVES['style-src']).toEqual(["'self'"]);
    });

    it('allows requests to any https endpoint and to a server on this computer, and framing of strudel.cc only', () => {
        // custom OpenAI-compatible endpoints can be any https host, or http://localhost (Ollama, LM Studio)
        expect(CSP_DIRECTIVES['connect-src']).toEqual(['https:', 'http://localhost:*', 'http://127.0.0.1:*']);
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
