// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';

const SettingsModal = ({ apiKey, onApiKeyChange, hasHashKey, model, onModelChange, savedModels, onSavedModelsChange, onClose }) => {
    const [newModelName, setNewModelName] = useState('');

    const removeBookmark = (id) => {
        const remaining = savedModels.filter(sm => sm.id !== id);
        onSavedModelsChange(remaining);
        if (model === id && savedModels.length > 1) {
            onModelChange(remaining[0]?.id || '');
        }
    };

    const saveBookmark = () => {
        if (model && newModelName) {
            // Update if exists, otherwise add
            const existing = savedModels.find(m => m.id === model);
            onSavedModelsChange(
                existing
                    ? savedModels.map(m => (m.id === model ? { ...m, name: newModelName } : m))
                    : [...savedModels, { id: model, name: newModelName }]
            );
            setNewModelName('');
        }
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-md shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                <h2 className="text-xl font-bold mb-4 text-cyber-neon">Configuration</h2>

                {hasHashKey && (
                    <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded mb-4 text-sm text-blue-200 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        You are using a temporary API key provided via the URL.
                    </div>
                )}

                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm text-gray-400">OpenRouter API Key</label>
                        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-cyber-neon hover:underline">
                            Get Key
                        </a>
                    </div>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => onApiKeyChange(e.target.value)}
                        className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan focus:outline-none text-white"
                        placeholder="sk-or-..."
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Model Bookmarks</label>

                    {/* Model List */}
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                        {savedModels.map(m => (
                            <div
                                key={m.id}
                                className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${model === m.id
                                    ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon'
                                    : 'bg-cyber-black border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                    }`}
                                onClick={() => {
                                    onModelChange(m.id);
                                    setNewModelName(m.name);
                                }}
                            >
                                <span className="text-sm truncate flex-1">{m.name || m.id}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeBookmark(m.id);
                                    }}
                                    className="p-1 hover:text-red-500 text-gray-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Model */}
                    <div className="bg-cyber-black p-3 rounded border border-cyber-gray">
                        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider flex justify-between items-center">
                            <span>Model</span>
                            <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-cyber-neon hover:underline normal-case">
                                Find Models
                            </a>
                        </div>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => onModelChange(e.target.value)}
                            className="w-full bg-cyber-dark border border-cyber-gray p-2 rounded text-xs text-white mb-2 focus:border-cyber-neon focus:outline-none"
                            placeholder="Model ID (e.g. openai/gpt-4o)"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newModelName}
                                onChange={(e) => setNewModelName(e.target.value)}
                                className="flex-1 bg-cyber-dark border border-cyber-gray p-2 rounded text-xs text-white focus:border-cyber-neon focus:outline-none"
                                placeholder="Display Name"
                            />
                            <button
                                onClick={saveBookmark}
                                disabled={!model || !newModelName}
                                className="bg-cyber-gray hover:bg-cyber-neon hover:text-black text-cyber-cyan p-2 rounded transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

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
                        className="text-xs text-gray-500 hover:text-cyber-neon transition-colors"
                    >
                        Source code (GitHub)
                    </a>
                    <a
                        href="https://github.com/ronnqvist/strudel-vibe-coder/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-cyber-neon transition-colors"
                    >
                        MIT License
                    </a>
                    <a
                        href="https://github.com/ronnqvist/strudel-vibe-coder/blob/main/THIRD_PARTY_NOTICES.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-cyber-neon transition-colors"
                    >
                        Third-party notices
                    </a>
                    <p className="text-xs text-gray-500">
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
