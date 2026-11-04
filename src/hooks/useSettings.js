// SPDX-License-Identifier: MIT
import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_MODEL = 'anthropic/claude-opus-4.5';
const DEFAULT_SAVED_MODELS = [
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro' },
    { id: 'openai/gpt-5.1', name: 'GPT 5.1' },
];

/** API key (stored, or temporary from the URL hash), active model and model bookmarks. */
export function useSettings() {
    const [apiKey, setApiKey] = useLocalStorage('openrouter_api_key', '');
    const [hashApiKey] = useState(() => {
        const hash = window.location.hash;
        return hash && hash.startsWith('#sk-or-v1-') ? hash.slice(1) : '';
    });
    const [model, setModel] = useLocalStorage('openrouter_model', DEFAULT_MODEL);
    const [savedModels, setSavedModels] = useLocalStorage('openrouter_saved_models', DEFAULT_SAVED_MODELS, { json: true });

    return {
        apiKey,
        setApiKey,
        hashApiKey,
        effectiveApiKey: hashApiKey || apiKey,
        model,
        setModel,
        savedModels,
        setSavedModels,
        modelName: savedModels.find(m => m.id === model)?.name || model,
    };
}
