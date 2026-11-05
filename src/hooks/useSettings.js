// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { readStorage, useLocalStorage } from './useLocalStorage';
import { DEFAULT_MODEL_ID } from '../config';
import { migrateBookmarks } from '../lib/models';
import { loadApiKey, persistApiKey, persistRemember, readRemember } from '../lib/keyStorage';
import { urlKey } from '../lib/urlKey';
import { DEFAULT_PREFS, MAX_CUSTOM_INSTRUCTIONS, cleanPrefs } from '../lib/prompt';

export const PROMPT_PREFS_KEY = 'openrouter_prompt_prefs';
export const CUSTOM_INSTRUCTIONS_KEY = 'openrouter_custom_instructions';

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
        promptPrefs,
        customInstructions: typeof customInstructions === 'string' ? customInstructions.slice(0, MAX_CUSTOM_INSTRUCTIONS) : '',
        setCustomInstructions: (text) => setCustomInstructions(String(text ?? '').slice(0, MAX_CUSTOM_INSTRUCTIONS)),
        setPromptPrefs: (patch) => setStoredPrefs(prev => cleanPrefs({ ...cleanPrefs(prev), ...patch })),
        modelName: savedModels.find(m => m.id === model)?.name || model,
    };
}
