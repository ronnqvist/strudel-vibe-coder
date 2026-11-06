// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { OPENROUTER_ENDPOINT, chatUrl, checkBaseUrl, cleanEndpoints, modelsUrl, parseModelIds } from './endpoints';

describe('checkBaseUrl', () => {
    it('accepts https anywhere, and http only on this computer', () => {
        expect(checkBaseUrl('https://api.groq.com/openai/v1')).toEqual({ ok: true, url: 'https://api.groq.com/openai/v1' });
        expect(checkBaseUrl('  https://api.mistral.ai/v1/  ')).toEqual({ ok: true, url: 'https://api.mistral.ai/v1' });
        expect(checkBaseUrl('http://localhost:11434/v1')).toEqual({ ok: true, url: 'http://localhost:11434/v1' });
        expect(checkBaseUrl('http://127.0.0.1:1234/v1')).toEqual({ ok: true, url: 'http://127.0.0.1:1234/v1' });
    });
    it('refuses everything else, with a reason', () => {
        for (const bad of ['', 'api.openai.com/v1', 'http://example.com/v1', 'http://192.168.1.5:11434/v1', 'ftp://x/v1',
            'https://user:pass@api.example.com/v1', 'https://api.example.com/v1?key=1', 'https://api.example.com/v1#x', 'javascript:alert(1)']) {
            const r = checkBaseUrl(bad);
            expect(r.ok, bad).toBe(false);
            expect(r.error, bad).toMatch(/\w/);
        }
    });
});

describe('URLs and model lists', () => {
    it('builds the chat and models URLs from the base', () => {
        expect(chatUrl('https://api.example.com/v1')).toBe('https://api.example.com/v1/chat/completions');
        expect(modelsUrl('http://localhost:11434/v1')).toBe('http://localhost:11434/v1/models');
    });
    it('reads model ids from an OpenAI-style list, sorted and without duplicates', () => {
        expect(parseModelIds({ data: [{ id: 'b' }, { id: 'a' }, { id: 'b' }, { id: '' }, { name: 'x' }, null] })).toEqual(['a', 'b']);
        expect(parseModelIds({ models: [] })).toEqual([]);
        expect(parseModelIds(null)).toEqual([]);
    });
});

describe('cleanEndpoints', () => {
    it('keeps valid endpoints and drops anything else; never keeps a key', () => {
        const stored = [
            { id: 'e1', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b', apiKey: 'secret' },
            { id: 'e2', name: 'Bad', baseUrl: 'http://example.com/v1', model: 'm' },
            { id: OPENROUTER_ENDPOINT, name: 'Fake', baseUrl: 'https://x.example/v1' },
            { id: 'e1', name: 'Duplicate', baseUrl: 'https://a.example/v1' },
            'nonsense',
        ];
        expect(cleanEndpoints(stored)).toEqual([{ id: 'e1', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b' }]);
        expect(cleanEndpoints('nope')).toEqual([]);
    });
    it('names an endpoint after its host when it has no name', () => {
        expect(cleanEndpoints([{ id: 'e1', baseUrl: 'http://localhost:11434/v1' }])[0]).toEqual({ id: 'e1', name: 'localhost:11434', baseUrl: 'http://localhost:11434/v1', model: '' });
    });
});
