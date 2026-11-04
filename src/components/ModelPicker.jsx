// SPDX-License-Identifier: MIT
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { DEFAULT_MODEL_ID, RECOMMENDED_MODELS } from '../config';
import { addBookmark, filterModels, providersOf, unlistedBookmarks } from '../lib/models';

const MAX_RESULTS = 40;

const fieldClass = 'w-full bg-cyber-dark border border-cyber-gray p-2 rounded text-xs text-white focus:border-cyber-neon';

/**
 * Model selection: bookmarks, suggested models, a searchable list of everything OpenRouter offers,
 * and free-form entry for any other model id.
 */
const ModelPicker = ({ model, onModelChange, bookmarks, onBookmarksChange, catalog }) => {
    const [customName, setCustomName] = useState('');
    const [query, setQuery] = useState('');
    const [freeOnly, setFreeOnly] = useState(false);
    const [aliasesOnly, setAliasesOnly] = useState(false);
    const [provider, setProvider] = useState('');

    const { load } = catalog;
    useEffect(() => { load(); }, [load]);

    const ready = catalog.status === 'ready';
    const listedIds = useMemo(() => new Set(catalog.models.map(m => m.id)), [catalog.models]);
    const unlisted = ready ? unlistedBookmarks(bookmarks, listedIds) : [];
    const providers = useMemo(() => providersOf(catalog.models), [catalog.models]);
    const matches = useMemo(
        () => filterModels(catalog.models, { query, freeOnly, aliasesOnly, provider }),
        [catalog.models, query, freeOnly, aliasesOnly, provider],
    );
    const selectedUnlisted = ready && model && !listedIds.has(model);
    const defaultName = RECOMMENDED_MODELS.find(m => m.id === DEFAULT_MODEL_ID)?.name ?? DEFAULT_MODEL_ID;

    const choose = (m) => {
        onModelChange(m.id);
        setCustomName(m.name || '');
    };
    const bookmark = (m) => onBookmarksChange(addBookmark(bookmarks, m));

    const removeBookmark = (id) => {
        const remaining = bookmarks.filter(b => b.id !== id);
        onBookmarksChange(remaining);
        if (model === id && bookmarks.length > 1) onModelChange(remaining[0]?.id || '');
    };

    const saveCustom = () => {
        if (model && customName) {
            const existing = bookmarks.find(b => b.id === model);
            onBookmarksChange(
                existing
                    ? bookmarks.map(b => (b.id === model ? { ...b, name: customName } : b))
                    : [...bookmarks, { id: model, name: customName }]
            );
            setCustomName('');
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Model</label>

            {selectedUnlisted && (
                <div role="alert" className="mb-3 p-2 rounded border border-yellow-600/60 bg-yellow-900/20 text-xs text-yellow-200">
                    <span className="font-mono break-all">{model}</span> is not in OpenRouter&apos;s current model list.
                    It may have been retired.{' '}
                    <button onClick={() => onModelChange(DEFAULT_MODEL_ID)} className="underline hover:text-white">
                        Use {defaultName}
                    </button>
                </div>
            )}

            <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Suggested (always the newest version)</div>
                <div className="flex flex-wrap gap-2">
                    {RECOMMENDED_MODELS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => { choose(m); bookmark(m); }}
                            aria-pressed={model === m.id}
                            className={`px-2 py-1 rounded border text-xs transition-colors ${model === m.id
                                ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon'
                                : 'bg-cyber-black border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                }`}
                        >
                            {m.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Bookmarks</div>
            <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
                {bookmarks.map(m => (
                    <div
                        key={m.id}
                        className={`flex items-center justify-between rounded border transition-colors ${model === m.id
                            ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon'
                            : 'bg-cyber-black border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                            }`}
                    >
                        <button onClick={() => choose(m)} aria-pressed={model === m.id} className="min-w-0 flex-1 text-left p-2 rounded">
                            <span className="block text-sm truncate">{m.name || m.id}</span>
                            <span className="block text-[10px] text-gray-400 font-mono truncate">{m.id}</span>
                        </button>
                        {ready && !listedIds.has(m.id) && (
                            <span className="mx-2 text-[10px] text-yellow-300 border border-yellow-700 px-1 rounded" title="OpenRouter does not list this model any more">
                                not listed
                            </span>
                        )}
                        <button
                            onClick={() => removeBookmark(m.id)}
                            aria-label={`Remove bookmark ${m.name || m.id}`}
                            className="p-2 hover:text-red-500 text-gray-400"
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
            {unlisted.length > 0 && (
                <button
                    onClick={() => onBookmarksChange(bookmarks.filter(b => listedIds.has(b.id)))}
                    className="mb-3 text-xs text-yellow-300 underline hover:text-yellow-100"
                >
                    Remove {unlisted.length} unavailable bookmark{unlisted.length === 1 ? '' : 's'}
                </button>
            )}

            <details className="mb-3 bg-cyber-black rounded border border-cyber-gray">
                <summary className="cursor-pointer p-2 text-xs text-cyber-cyan">Browse all OpenRouter models</summary>
                <div className="p-2 border-t border-cyber-gray">
                    {catalog.status === 'loading' && <p className="text-xs text-gray-400">Loading the model list…</p>}
                    {catalog.status === 'error' && (
                        <p role="alert" className="text-xs text-red-300">
                            Could not load the model list ({catalog.error}).{' '}
                            <button onClick={() => load({ force: true })} className="underline">Try again</button>
                            {' '}You can still type any model id below.
                        </p>
                    )}
                    {ready && (
                        <>
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search models"
                                placeholder="Search, e.g. claude opus"
                                className={`${fieldClass} mb-2`}
                            />
                            <div className="flex flex-wrap items-center gap-3 mb-2 text-xs text-gray-400">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="accent-cyber-neon" />
                                    Free only
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={aliasesOnly} onChange={(e) => setAliasesOnly(e.target.checked)} className="accent-cyber-neon" />
                                    Latest-version aliases
                                </label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    aria-label="Provider"
                                    className="bg-cyber-dark border border-cyber-gray rounded p-1 text-xs text-white"
                                >
                                    <option value="">All providers</option>
                                    {providers.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <ul className="space-y-1 max-h-48 overflow-y-auto">
                                {matches.slice(0, MAX_RESULTS).map(m => (
                                    <li
                                        key={m.id}
                                        className={`flex items-center gap-2 p-1 rounded border text-xs ${model === m.id ? 'border-cyber-neon text-cyber-neon' : 'border-transparent text-gray-300'}`}
                                    >
                                        <button onClick={() => choose(m)} className="flex-1 min-w-0 text-left hover:text-cyber-neon">
                                            <span className="block truncate">{m.name}</span>
                                            <span className="block text-[10px] text-gray-400 font-mono truncate">
                                                {m.id}{m.isFree ? ' · free' : ''}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => bookmark(m)}
                                            aria-label={`Bookmark ${m.name}`}
                                            title="Add to bookmarks"
                                            className="p-1 text-gray-400 hover:text-cyber-neon"
                                        >
                                            <Star className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-1 text-[10px] text-gray-400">
                                {matches.length === 0
                                    ? 'No model matches.'
                                    : `Showing ${Math.min(matches.length, MAX_RESULTS)} of ${matches.length}, newest first.`}
                            </p>
                        </>
                    )}
                </div>
            </details>

            <div className="bg-cyber-black p-3 rounded border border-cyber-gray">
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                    <span>Model id</span>
                    <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-cyber-neon hover:underline normal-case">
                        Find Models
                    </a>
                </div>
                <input
                    type="text"
                    value={model}
                    onChange={(e) => onModelChange(e.target.value)}
                    aria-label="Model id"
                    className={`${fieldClass} mb-2`}
                    placeholder="Model ID (e.g. openai/gpt-4o)"
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        aria-label="Display name"
                        className={`${fieldClass} flex-1 w-auto`}
                        placeholder="Display Name"
                    />
                    <button
                        onClick={saveCustom}
                        disabled={!model || !customName}
                        aria-label="Save as bookmark"
                        className="bg-cyber-gray hover:bg-cyber-neon hover:text-black text-cyber-cyan p-2 rounded transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModelPicker;
