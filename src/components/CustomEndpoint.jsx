// SPDX-License-Identifier: MIT
import React, { useId, useState } from 'react';
import { checkBaseUrl, modelsUrl, parseModelIds } from '../lib/endpoints';

const fieldClass = 'w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan text-white text-sm';
const labelClass = 'block text-sm text-gray-400 mb-1';

/**
 * Settings of one custom OpenAI-compatible endpoint: name, base URL, key and model.
 *
 * A new endpoint (`endpoint` is null) is created as soon as its base URL is valid, and edited in
 * place from then on, so typing is never interrupted. The key is optional (a local server may need
 * none) and kept like the OpenRouter key; the model can be typed or picked from the endpoint's
 * own model list.
 */
const CustomEndpoint = ({ endpoint, apiKey, onCreate, onUpdate, onKeyChange, onRemove, remember, onRememberChange }) => {
    const ids = useId();
    const [name, setName] = useState(endpoint?.name ?? '');
    const [urlText, setUrlText] = useState(endpoint?.baseUrl ?? '');
    const [model, setModel] = useState(endpoint?.model ?? '');
    const [draftKey, setDraftKey] = useState('');
    const [models, setModels] = useState({ status: 'idle', ids: [], error: '' });

    const checked = checkBaseUrl(urlText);
    const key = endpoint ? apiKey : draftKey;
    const host = checked.ok ? new URL(checked.url).host : '';
    const isLocal = checked.ok && checked.url.startsWith('http://');

    /** Save a change: to the endpoint if it exists, or create it once the base URL is valid. */
    const save = (patch, nextUrlText = urlText) => {
        if (endpoint) {
            onUpdate(endpoint.id, patch);
            return;
        }
        const check = checkBaseUrl(nextUrlText);
        if (!check.ok) return;
        const id = onCreate({ name, model, ...patch, baseUrl: check.url });
        if (draftKey) onKeyChange(id, draftKey);
    };

    const changeUrl = (text) => {
        setUrlText(text);
        const check = checkBaseUrl(text);
        if (check.ok) save({ baseUrl: check.url }, text);
    };
    const changeKey = (value) => {
        if (endpoint) onKeyChange(endpoint.id, value);
        else setDraftKey(value);
    };
    const changeModel = (value) => {
        setModel(value);
        save({ model: value.trim() });
    };

    const loadModels = async () => {
        if (!checked.ok) return;
        setModels({ status: 'loading', ids: [], error: '' });
        try {
            const response = await fetch(modelsUrl(checked.url), { headers: key ? { Authorization: `Bearer ${key.trim()}` } : {} });
            if (!response.ok) throw new Error(`the endpoint answered ${response.status}`);
            const found = parseModelIds(await response.json());
            setModels({ status: 'ready', ids: found, error: found.length ? '' : 'The endpoint listed no models. Type the model id instead.' });
        } catch (error) {
            const reason = error instanceof TypeError
                ? 'the endpoint could not be reached, or it does not allow requests from this site (CORS)'
                : error.message;
            setModels({ status: 'error', ids: [], error: `Could not load the model list: ${reason}. You can type the model id instead.` });
        }
    };

    return (
        <div className="mb-4 border border-cyber-gray rounded p-3">
            <label htmlFor={`${ids}-name`} className={labelClass}>Name</label>
            <input
                id={`${ids}-name`}
                value={name}
                onChange={(e) => { setName(e.target.value); save({ name: e.target.value }); }}
                className={fieldClass}
                placeholder="For example Groq, or Ollama on this computer"
            />

            <label htmlFor={`${ids}-url`} className={`${labelClass} mt-3`}>Base URL</label>
            <input
                id={`${ids}-url`}
                value={urlText}
                onChange={(e) => changeUrl(e.target.value)}
                className={fieldClass}
                placeholder="https://api.groq.com/openai/v1"
                inputMode="url"
                autoComplete="off"
                aria-invalid={urlText !== '' && !checked.ok}
                aria-describedby={`${ids}-url-help`}
            />
            <p id={`${ids}-url-help`} className={`mt-1 text-xs ${urlText && !checked.ok ? 'text-red-400' : 'text-gray-400'}`}>
                {urlText && !checked.ok
                    ? checked.error
                    : 'Any OpenAI-compatible API: the part before /chat/completions.'}
            </p>

            <label htmlFor={`${ids}-key`} className={`${labelClass} mt-3`}>Endpoint API key</label>
            <input
                id={`${ids}-key`}
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => changeKey(e.target.value)}
                className={fieldClass}
                placeholder="Leave empty if the server needs none"
            />
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => onRememberChange(e.target.checked)} className="accent-cyber-neon" />
                Remember keys on this device
            </label>
            <p className="mt-1 text-xs text-gray-400">
                {remember ? 'The key is stored in this browser (localStorage)' : 'The key is kept in memory for this tab only'}
                {host ? ` and sent only to ${host}.` : '.'}
            </p>
            {endpoint && key && (
                <button onClick={() => onKeyChange(endpoint.id, '')} className="mt-1 text-xs text-red-400 hover:text-red-300 underline">
                    Forget key
                </button>
            )}

            <label htmlFor={`${ids}-model`} className={`${labelClass} mt-3`}>Model id</label>
            <div className="flex gap-2">
                <input
                    id={`${ids}-model`}
                    value={model}
                    onChange={(e) => changeModel(e.target.value)}
                    className={fieldClass}
                    placeholder="For example llama-3.3-70b-versatile"
                    autoComplete="off"
                />
                <button
                    onClick={loadModels}
                    disabled={!checked.ok || models.status === 'loading'}
                    className="shrink-0 px-3 rounded bg-cyber-gray text-cyber-cyan text-sm hover:bg-cyber-neon/20 disabled:opacity-40"
                >
                    {models.status === 'loading' ? 'Loading…' : 'Load models'}
                </button>
            </div>
            {models.ids.length > 0 && (
                <>
                    <label htmlFor={`${ids}-list`} className="sr-only">Models from the endpoint</label>
                    <select
                        id={`${ids}-list`}
                        value={models.ids.includes(model) ? model : ''}
                        onChange={(e) => e.target.value && changeModel(e.target.value)}
                        className={`${fieldClass} mt-2`}
                    >
                        <option value="">Choose one of {models.ids.length} models…</option>
                        {models.ids.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                </>
            )}
            {models.error && <p role="alert" className="mt-1 text-xs text-yellow-300">{models.error}</p>}

            {isLocal && (
                <p className="mt-3 text-xs text-gray-400">
                    A server on this computer must allow requests from this site (CORS), for example
                    {' '}<code className="text-gray-300">OLLAMA_ORIGINS={window.location.origin}</code> for Ollama, or
                    {' '}&ldquo;Enable CORS&rdquo; in LM Studio. Your browser may also ask whether this site may reach your local network.
                </p>
            )}

            {endpoint && (
                <button onClick={() => onRemove(endpoint.id)} className="mt-3 text-xs text-red-400 hover:text-red-300 underline">
                    Remove this endpoint
                </button>
            )}
        </div>
    );
};

export default CustomEndpoint;
