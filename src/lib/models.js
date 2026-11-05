// SPDX-License-Identifier: MIT
import { LEGACY_DEFAULT_BOOKMARK_IDS, MODELS_API_URL, RECOMMENDED_MODELS } from '../config';

/**
 * @typedef {{ id: string, name: string }} Bookmark
 * @typedef {{
 *   id: string, name: string, provider: string, isFree: boolean, isAlias: boolean,
 *   contextLength: number | null, maxOutput: number | null, created: number
 * }} CatalogModel
 */

/**
 * Turn the response of OpenRouter's public model list into the models a chat can use.
 * Left out: models that do not produce text, and `:batch` variants (asynchronous batch pricing,
 * not for interactive chat). Anything can still be typed in by hand as a custom model id.
 * @param {{ data?: any[] }} json
 * @returns {CatalogModel[]}
 */
export function parseCatalog(json) {
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows
        .filter(m => typeof m?.id === 'string' && !m.id.endsWith(':batch'))
        .filter(m => {
            const out = m.architecture?.output_modalities;
            return !Array.isArray(out) || out.includes('text');
        })
        .map(m => ({
            id: m.id,
            name: typeof m.name === 'string' && m.name ? m.name : m.id,
            provider: m.id.replace(/^~/, '').split('/')[0],
            isFree: m.id.endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0'),
            isAlias: m.id.startsWith('~'),
            contextLength: typeof m.context_length === 'number' ? m.context_length : null,
            maxOutput: typeof m.top_provider?.max_completion_tokens === 'number' ? m.top_provider.max_completion_tokens : null,
            created: typeof m.created === 'number' ? m.created : 0,
        }));
}

const tokens = (n) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

/**
 * The limits OpenRouter reports for a model, for the model list: "200k context · 32k max output".
 * Parts that are not reported are left out; '' when neither is.
 * @param {Pick<CatalogModel, 'contextLength' | 'maxOutput'>} model
 */
export function formatLimits({ contextLength, maxOutput }) {
    const parts = [];
    if (contextLength > 0) parts.push(`${tokens(contextLength)} context`);
    if (maxOutput > 0) parts.push(`${tokens(maxOutput)} max output`);
    return parts.join(' · ');
}

/**
 * Fetch the model list. Public endpoint: no API key is sent.
 * @param {AbortSignal} [signal]
 * @returns {Promise<CatalogModel[]>}
 */
export async function fetchCatalog(signal) {
    const response = await fetch(MODELS_API_URL, { signal });
    if (!response.ok) throw new Error(`OpenRouter returned ${response.status} ${response.statusText}`.trim());
    return parseCatalog(await response.json());
}

/**
 * Search and filter the catalogue. All words of `query` must occur in the id or name.
 * Newest first.
 * @param {CatalogModel[]} models
 * @param {{ query?: string, freeOnly?: boolean, provider?: string, aliasesOnly?: boolean }} [filters]
 */
export function filterModels(models, { query = '', freeOnly = false, provider = '', aliasesOnly = false } = {}) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return models
        .filter(m => !freeOnly || m.isFree)
        .filter(m => !aliasesOnly || m.isAlias)
        .filter(m => !provider || m.provider === provider)
        .filter(m => {
            const haystack = `${m.id} ${m.name}`.toLowerCase();
            return words.every(w => haystack.includes(w));
        })
        .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id));
}

/** Sorted, distinct provider names of a catalogue. */
export function providersOf(models) {
    return [...new Set(models.map(m => m.provider))].sort();
}

const sameIds = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/**
 * Bring a stored bookmark list up to date.
 *
 * - Nothing stored: the recommended models.
 * - The list earlier versions started everyone with, untouched: replaced by the recommended models.
 *   The model the user currently has selected stays bookmarked, so their visible choice does not vanish.
 * - Any other list was customised by the user: kept exactly as it is. Nothing is ever deleted
 *   automatically; entries that OpenRouter no longer lists are flagged in the UI instead.
 *
 * @param {unknown} stored value read from storage
 * @param {string} [currentModelId] the model selected right now
 * @returns {Bookmark[]}
 */
export function migrateBookmarks(stored, currentModelId) {
    if (!Array.isArray(stored)) return RECOMMENDED_MODELS.map(m => ({ ...m }));

    const entries = stored.filter(m => m && typeof m.id === 'string' && m.id);
    const untouched = sameIds(entries.map(m => m.id), LEGACY_DEFAULT_BOOKMARK_IDS);
    if (!untouched) return entries;

    const next = RECOMMENDED_MODELS.map(m => ({ ...m }));
    const current = entries.find(m => m.id === currentModelId);
    if (current && !next.some(m => m.id === current.id)) next.push(current);
    return next;
}

/**
 * Bookmarks the catalogue does not list (retired models, typos). The caller offers to remove them.
 * @param {Bookmark[]} bookmarks
 * @param {Set<string>} listedIds
 */
export function unlistedBookmarks(bookmarks, listedIds) {
    return bookmarks.filter(b => !listedIds.has(b.id));
}

/** Add a bookmark unless its id is there already. Returns the same array when nothing changes. */
export function addBookmark(bookmarks, model) {
    return bookmarks.some(b => b.id === model.id) ? bookmarks : [...bookmarks, { id: model.id, name: model.name || model.id }];
}
