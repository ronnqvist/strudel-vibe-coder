// SPDX-License-Identifier: MIT
import React, { useId } from 'react';
import { Info } from 'lucide-react';
import ModelPicker from './ModelPicker';
import MusicSettings from './MusicSettings';
import { useDialog } from '../hooks/useDialog';

const SettingsModal = ({ apiKey, onApiKeyChange, hasHashKey, remember, onRememberChange, onForgetKey, model, onModelChange, savedModels, onSavedModelsChange, catalog, promptPrefs, onPromptPrefsChange, musicExtras, onClose }) => {
    const { attach, onKeyDown } = useDialog({ onClose, trap: true });
    const titleId = useId();
    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={attach}
                onKeyDown={onKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-lg max-h-full overflow-y-auto shadow-[0_0_20px_rgba(255,0,255,0.3)]"
            >
                <h2 id={titleId} className="text-xl font-bold mb-4 text-cyber-neon">Configuration</h2>

                {hasHashKey && (
                    <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded mb-4 text-sm text-blue-200 flex items-center gap-2">
                        <Info className="w-4 h-4" aria-hidden="true" />
                        You are using a temporary API key provided via the URL. It is kept in memory only and has been removed from the address bar.
                    </div>
                )}

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="api-key" className="block text-sm text-gray-400">OpenRouter API Key</label>
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-cyber-neon hover:underline">
                            Get Key
                        </a>
                    </div>
                    <input
                        id="api-key"
                        type="password"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => onApiKeyChange(e.target.value)}
                        className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan text-white"
                        placeholder="sk-or-..."
                    />
                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => onRememberChange(e.target.checked)}
                            className="accent-cyber-neon"
                        />
                        Remember key on this device
                    </label>
                    <p className="mt-1 text-xs text-gray-400">
                        {remember
                            ? 'The key is stored in this browser (localStorage) and sent only to openrouter.ai.'
                            : 'The key is kept in memory for this tab only and is gone after a reload.'}
                    </p>
                    <button
                        onClick={onForgetKey}
                        disabled={!apiKey && !hasHashKey}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 underline disabled:opacity-40 disabled:no-underline"
                    >
                        Forget key
                    </button>
                </div>

                <ModelPicker
                    model={model}
                    onModelChange={onModelChange}
                    bookmarks={savedModels}
                    onBookmarksChange={onSavedModelsChange}
                    catalog={catalog}
                />

                <MusicSettings prefs={promptPrefs} onPrefsChange={onPromptPrefsChange}>{musicExtras}</MusicSettings>

                <button
                    onClick={onClose}
                    className="w-full bg-cyber-neon text-black font-bold py-2 rounded hover:bg-pink-400 transition-colors"
                >
                    Save & Close
                </button>

                <div className="mt-4 text-center border-t border-cyber-gray pt-4 flex flex-col gap-2">
                    <a
                        href="https://github.com/ronnqvist/strudel-vibe-coder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-cyber-neon transition-colors"
                    >
                        Source code (GitHub)
                    </a>
                    <a
                        href="https://github.com/ronnqvist/strudel-vibe-coder/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-cyber-neon transition-colors"
                    >
                        MIT License
                    </a>
                    <a
                        href="https://github.com/ronnqvist/strudel-vibe-coder/blob/main/THIRD_PARTY_NOTICES.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-cyber-neon transition-colors"
                    >
                        Third-party notices
                    </a>
                    <p className="text-xs text-gray-400">
                        Music engine:{' '}
                        <a href="https://strudel.cc/" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyber-neon">Strudel (strudel.cc)</a>,
                        {' '}AGPL-3.0, by the Strudel/TidalCycles community
                        {' '}(<a href="https://codeberg.org/uzu/strudel" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyber-neon">source</a>)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
