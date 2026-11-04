// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_DEFAULT_BOOKMARK_IDS, MODELS_API_URL, RECOMMENDED_MODELS } from '../config';
import { addBookmark, fetchCatalog, filterModels, migrateBookmarks, parseCatalog, providersOf, unlistedBookmarks } from './models';

const row = (id, extra = {}) => ({
    id,
    name: extra.name ?? id,
    created: extra.created ?? 1,
    context_length: extra.context_length ?? 8000,
    pricing: extra.pricing ?? { prompt: '0.000001', completion: '0.000002' },
    architecture: extra.architecture ?? { output_modalities: ['text'] },
});

const sample = {
    data: [
        row('x-ai/grok-4.7', { name: 'SpaceXAI: Grok 4.7', created: 30 }),
        row('x-ai/grok-4.7:batch', { created: 30 }),
        row('~x-ai/grok-latest', { name: 'xAI: Grok Latest', created: 31 }),
        row('anthropic/claude-opus-5.5', { name: 'Anthropic: Claude Opus 5.5', created: 20 }),
        row('vendor/free-one:free', { name: 'Vendor: Free One', created: 10, pricing: { prompt: '0', completion: '0' } }),
        row('vendor/zero-priced', { created: 11, pricing: { prompt: '0', completion: '0' } }),
        row('vendor/image-maker', { architecture: { output_modalities: ['image'] } }),
        row('vendor/no-architecture-info', { architecture: undefined, created: 5 }),
        { id: 42 },
        null,
    ],
};

describe('parseCatalog', () => {
    const models = parseCatalog(sample);
    const byId = Object.fromEntries(models.map(m => [m.id, m]));

    it('keeps text models and drops :batch variants, image-only models and malformed rows', () => {
        expect(models.map(m => m.id).sort()).toEqual([
            'anthropic/claude-opus-5.5', 'vendor/free-one:free', 'vendor/no-architecture-info',
            'vendor/zero-priced', 'x-ai/grok-4.7', '~x-ai/grok-latest',
        ]);
    });

    it('derives provider, alias and free flags', () => {
        expect(byId['~x-ai/grok-latest']).toMatchObject({ provider: 'x-ai', isAlias: true, isFree: false });
        expect(byId['vendor/free-one:free'].isFree).toBe(true);
        expect(byId['vendor/zero-priced'].isFree).toBe(true); // zero price without the :free suffix
        expect(byId['anthropic/claude-opus-5.5']).toMatchObject({ provider: 'anthropic', isAlias: false, isFree: false });
    });

    it('tolerates missing or odd input', () => {
        expect(parseCatalog(undefined)).toEqual([]);
        expect(parseCatalog({ data: 'nope' })).toEqual([]);
    });
});

describe('filterModels', () => {
    const models = parseCatalog(sample);

    it('sorts newest first', () => {
        expect(filterModels(models).map(m => m.id)[0]).toBe('~x-ai/grok-latest');
    });

    it('requires every search word to occur in the id or name, in any order', () => {
        expect(filterModels(models, { query: 'opus anthropic' }).map(m => m.id)).toEqual(['anthropic/claude-opus-5.5']);
        expect(filterModels(models, { query: '  GROK   latest ' }).map(m => m.id)).toEqual(['~x-ai/grok-latest']);
        expect(filterModels(models, { query: 'zzz' })).toEqual([]);
    });

    it('filters by free, provider and aliases, and combines the filters', () => {
        expect(filterModels(models, { freeOnly: true }).map(m => m.id).sort()).toEqual(['vendor/free-one:free', 'vendor/zero-priced']);
        expect(filterModels(models, { provider: 'x-ai' }).map(m => m.id).sort()).toEqual(['x-ai/grok-4.7', '~x-ai/grok-latest']);
        expect(filterModels(models, { aliasesOnly: true }).map(m => m.id)).toEqual(['~x-ai/grok-latest']);
        expect(filterModels(models, { provider: 'x-ai', aliasesOnly: true, query: 'grok' }).map(m => m.id)).toEqual(['~x-ai/grok-latest']);
    });

    it('lists providers once, sorted', () => {
        expect(providersOf(models)).toEqual(['anthropic', 'vendor', 'x-ai']);
    });
});

describe('migrateBookmarks', () => {
    const legacy = [
        { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
        { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
        { id: 'openai/gpt-5.1', name: 'GPT 5.1' },
    ];

    it('uses the recommended models for a new user', () => {
        expect(migrateBookmarks(null)).toEqual(RECOMMENDED_MODELS);
        expect(migrateBookmarks('garbage')).toEqual(RECOMMENDED_MODELS);
    });

    it('does not hand out the shared constant, so edits cannot leak into it', () => {
        expect(migrateBookmarks(null)).not.toBe(RECOMMENDED_MODELS);
        expect(migrateBookmarks(null)[0]).not.toBe(RECOMMENDED_MODELS[0]);
    });

    it('replaces the untouched legacy default list, keeping the currently selected model bookmarked', () => {
        const result = migrateBookmarks(legacy, 'anthropic/claude-opus-4.5');
        expect(result).toEqual([...RECOMMENDED_MODELS, { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' }]);
        expect(migrateBookmarks([...legacy].reverse(), 'zzz')).toEqual(RECOMMENDED_MODELS);
    });

    it('keeps a customised list exactly as it is, including retired models', () => {
        const custom = [...legacy, { id: 'mine/own-model', name: 'Mine' }];
        expect(migrateBookmarks(custom, 'mine/own-model')).toEqual(custom);
        const reduced = legacy.slice(0, 2);
        expect(migrateBookmarks(reduced, 'x')).toEqual(reduced);
    });

    it('drops only entries that cannot be shown at all', () => {
        expect(migrateBookmarks([{ id: 'a/b', name: 'B' }, null, { name: 'no id' }, 7])).toEqual([{ id: 'a/b', name: 'B' }]);
    });

    it('matches the legacy ids the config declares', () => {
        expect(legacy.map(m => m.id)).toEqual(LEGACY_DEFAULT_BOOKMARK_IDS);
    });
});

describe('bookmark helpers', () => {
    it('unlistedBookmarks finds bookmarks missing from the catalogue', () => {
        const bookmarks = [{ id: 'a/1', name: 'A' }, { id: 'b/2', name: 'B' }];
        expect(unlistedBookmarks(bookmarks, new Set(['a/1']))).toEqual([{ id: 'b/2', name: 'B' }]);
    });

    it('addBookmark adds once and falls back to the id as name', () => {
        const base = [{ id: 'a/1', name: 'A' }];
        expect(addBookmark(base, { id: 'a/1', name: 'Other' })).toBe(base);
        expect(addBookmark(base, { id: 'b/2' })).toEqual([...base, { id: 'b/2', name: 'b/2' }]);
    });
});

describe('fetchCatalog', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('requests the public model list without credentials and parses it', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => sample }));
        vi.stubGlobal('fetch', fetchMock);
        const models = await fetchCatalog();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(MODELS_API_URL);
        expect(JSON.stringify(init ?? {})).not.toMatch(/authorization/i);
        expect(models.length).toBe(6);
    });

    it('throws a readable error for an HTTP failure', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, statusText: 'Service Unavailable' })));
        await expect(fetchCatalog()).rejects.toThrow('OpenRouter returned 503 Service Unavailable');
    });
});
