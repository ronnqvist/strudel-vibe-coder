// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { readStorage, useLocalStorage } from './useLocalStorage';
import { DEFAULT_MODEL_ID } from '../config';
import { migrateBookmarks } from '../lib/models';
import { loadApiKey, loadEndpointKeys, persistApiKey, persistEndpointKeys, persistRemember, readRemember } from '../lib/keyStorage';
import { OPENROUTER_ENDPOINT, chatUrl, cleanEndpoints } from '../lib/endpoints';
import { generateId } from '../lib/utils';
import { urlKey } from '../lib/urlKey';
import { DEFAULT_PREFS, MAX_CUSTOM_INSTRUCTIONS, cleanPrefs } from '../lib/prompt';

export const PROMPT_PREFS_KEY = 'openrouter_prompt_prefs';
export const CUSTOM_INSTRUCTIONS_KEY = 'openrouter_custom_instructions';
export const ENDPOINTS_KEY = 'openrouter_endpoints';
export const ACTIVE_ENDPOINT_KEY = 'openrouter_active_endpoint';

/**
 * Where requests go (OpenRouter or a custom OpenAI-compatible endpoint), the keys, the active
 * model and the model bookmarks, and the musical preferences.
 *
 * The OpenRouter key comes from storage (while "remember" is on) and can be replaced for this
 * visit by a temporary key from the address (`#sk-or-v1-…`), which is held in memory only.
 * Custom endpoints' keys follow the same "remember" setting and are never part of an export.
 */
export function useSettings() {
    const [remember, setRememberState] = useState(() => readRemember(localStorage));
    const [apiKey, setApiKey] = useState(() => loadApiKey(localStorage));
    const [hashApiKey, setHashApiKey] = useState(urlKey);
    const [model, setModel] = useLocalStorage('openrouter_model', DEFAULT_MODEL_ID);
    // Musical preferences for the prompt (visuals, explanation level); unknown values fall back to the defaults
    const [storedPrefs, setStoredPrefs] = useLocalStorage(PROMPT_PREFS_KEY, DEFAULT_PREFS, { json: true });
    const promptPrefs = cleanPrefs(storedPrefs);
    const [customInstructions, setCustomInstructions] = useLocalStorage(CUSTOM_INSTRUCTIONS_KEY, '');
    // Bookmarks are brought up to date once, at startup (see migrateBookmarks), then saved as usual.
    const [savedModels, setSavedModels] = useState(() =>
        migrateBookmarks(
            readStorage('openrouter_saved_models', null, { json: true }),
            readStorage('openrouter_model', DEFAULT_MODEL_ID),
        ));

    useEffect(() => {
        try {
            localStorage.setItem('openrouter_saved_models', JSON.stringify(savedModels));
        } catch {
            // storage unavailable
        }
    }, [savedModels]);

    useEffect(() => {
        persistApiKey(localStorage, apiKey, remember);
    }, [apiKey, remember]);

    // Custom endpoints (without keys) and which provider is in use
    const [storedEndpoints, setStoredEndpoints] = useLocalStorage(ENDPOINTS_KEY, [], { json: true });
    const endpoints = cleanEndpoints(storedEndpoints);
    const [activeId, setActiveId] = useLocalStorage(ACTIVE_ENDPOINT_KEY, OPENROUTER_ENDPOINT);
    const [endpointKeys, setEndpointKeys] = useState(() => loadEndpointKeys(localStorage));
    useEffect(() => {
        persistEndpointKeys(localStorage, endpointKeys, remember);
    }, [endpointKeys, remember]);
    const active = endpoints.find(e => e.id === activeId) ?? null;

    /** Add an endpoint (already checked with checkBaseUrl) and switch to it. Returns its id. */
    const addEndpoint = ({ name = '', baseUrl, model = '' }) => {
        const id = generateId();
        setStoredEndpoints(prev => [...cleanEndpoints(prev), { id, name, baseUrl, model }]);
        setActiveId(id);
        return id;
    };
    const updateEndpoint = (id, patch) =>
        setStoredEndpoints(prev => cleanEndpoints(prev).map(e => (e.id === id ? { ...e, ...patch } : e)));
    const removeEndpoint = (id) => {
        setStoredEndpoints(prev => cleanEndpoints(prev).filter(e => e.id !== id));
        setEndpointKeys(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        if (activeId === id) setActiveId(OPENROUTER_ENDPOINT);
    };
    const setEndpointKey = (id, key) => setEndpointKeys(prev => ({ ...prev, [id]: key }));

    const setRemember = (value) => {
        persistRemember(localStorage, value);
        setRememberState(value);
    };

    /** Remove the key everywhere: storage, memory, and any temporary key from the address. */
    const forgetKey = () => {
        setApiKey('');
        setHashApiKey('');
    };

    const modelName = savedModels.find(m => m.id === model)?.name || model;
    /**
     * Where the next request goes. `ready` says whether it can be sent; `missing` says what to
     * set up in Settings first. A custom endpoint needs a model (a key is optional: a local server
     * may need none); OpenRouter needs a key.
     */
    const connection = active
        ? {
            kind: 'custom',
            id: active.id,
            name: active.name,
            model: active.model,
            modelName: active.model,
            endpoint: { url: chatUrl(active.baseUrl), apiKey: endpointKeys[active.id] || '' },
            ready: Boolean(active.model),
            missing: active.model ? '' : `Choose a model for ${active.name} in Settings first.`,
        }
        : {
            kind: 'openrouter',
            id: OPENROUTER_ENDPOINT,
            name: 'OpenRouter',
            model,
            modelName,
            endpoint: undefined,
            ready: Boolean(hashApiKey || apiKey),
            missing: hashApiKey || apiKey ? '' : 'Add your OpenRouter API key in Settings first.',
        };

    return {
        connection,
        endpoints,
        activeEndpointId: active ? active.id : OPENROUTER_ENDPOINT,
        setActiveEndpoint: (id) => setActiveId(id === OPENROUTER_ENDPOINT || endpoints.some(e => e.id === id) ? id : OPENROUTER_ENDPOINT),
        addEndpoint,
        updateEndpoint,
        removeEndpoint,
        endpointKeys,
        setEndpointKey,
        apiKey,
        setApiKey,
        hashApiKey,
        effectiveApiKey: hashApiKey || apiKey,
        remember,
        setRemember,
        forgetKey,
        model,
        setModel,
        savedModels,
        setSavedModels,
        promptPrefs,
        customInstructions: typeof customInstructions === 'string' ? customInstructions.slice(0, MAX_CUSTOM_INSTRUCTIONS) : '',
        setCustomInstructions: (text) => setCustomInstructions(String(text ?? '').slice(0, MAX_CUSTOM_INSTRUCTIONS)),
        setPromptPrefs: (patch) => setStoredPrefs(prev => cleanPrefs({ ...cleanPrefs(prev), ...patch })),
        modelName,
    };
}
