// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { loadApiKey, persistApiKey, persistRemember, readRemember } from '../lib/keyStorage';
import { urlKey } from '../lib/urlKey';

const DEFAULT_MODEL = 'anthropic/claude-opus-4.5';
const DEFAULT_SAVED_MODELS = [
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'openai/gpt-5.1', name: 'GPT 5.1' },
];

/**
 * API key, active model and model bookmarks.
 *
 * The key comes from storage (while "remember" is on) and can be replaced for this visit by a
 * temporary key from the address (`#sk-or-v1-…`), which is held in memory only.
 */
export function useSettings() {
    const [remember, setRememberState] = useState(() => readRemember(localStorage));
    const [apiKey, setApiKey] = useState(() => loadApiKey(localStorage));
    const [hashApiKey, setHashApiKey] = useState(urlKey);
    const [model, setModel] = useLocalStorage('openrouter_model', DEFAULT_MODEL);
    const [savedModels, setSavedModels] = useLocalStorage('openrouter_saved_models', DEFAULT_SAVED_MODELS, { json: true });

    useEffect(() => {
        persistApiKey(localStorage, apiKey, remember);
    }, [apiKey, remember]);

    const setRemember = (value) => {
        persistRemember(localStorage, value);
        setRememberState(value);
    };

    /** Remove the key everywhere: storage, memory, and any temporary key from the address. */
    const forgetKey = () => {
        setApiKey('');
        setHashApiKey('');
    };

    return {
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
        modelName: savedModels.find(m => m.id === model)?.name || model,
    };
}
