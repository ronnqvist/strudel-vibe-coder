// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { Trash2, Download, X, Edit2, Check } from 'lucide-react';
import { formatDate } from '../lib/utils';

// Row actions are shown on hover or keyboard focus, and always on touch screens (no hover there).
const actionsClass = 'flex items-center pr-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity';

/** The list of chats, with inline rename. One implementation for both the normal and the rename view. */
const ChatList = ({ chats, currentChatId, onSelect, onRename, onExport, onDelete }) => {
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const finishRename = (id) => {
        onRename(id, editName);
        setEditingId(null);
    };

    return (
        <ul className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Your chats">
            {chats.map(chat => (
                <li key={chat.id}>
                    {chat.id === editingId ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg border border-cyber-neon bg-cyber-neon/10">
                            <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') finishRename(chat.id);
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation(); // cancel the rename, not the whole panel
                                        setEditingId(null);
                                    }
                                }}
                                aria-label="Chat name"
                                className="flex-1 bg-transparent border-none text-white font-bold"
                            />
                            <button onClick={() => finishRename(chat.id)} aria-label="Save name" className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" aria-hidden="true" /></button>
                            <button onClick={() => setEditingId(null)} aria-label="Cancel rename" className="text-red-500 hover:text-red-400"><X className="w-4 h-4" aria-hidden="true" /></button>
                        </div>
                    ) : (
                        <div
                            className={`group flex items-center justify-between rounded-lg border transition-all ${currentChatId === chat.id
                                ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                                : 'bg-cyber-dark border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                }`}
                        >
                            <button
                                onClick={() => onSelect(chat.id)}
                                aria-current={currentChatId === chat.id ? 'true' : undefined}
                                className="flex-1 min-w-0 text-left p-3 rounded-lg"
                            >
                                <span className="block font-bold truncate">{chat.name}</span>
                                <span className="text-xs text-gray-400 flex gap-2">
                                    <span>{chat.messages.length} msgs</span>
                                    <span aria-hidden="true">•</span>
                                    <span>{formatDate(chat.createdAt)}</span>
                                </span>
                            </button>
                            <div className={actionsClass}>
                                <button
                                    onClick={() => {
                                        setEditingId(chat.id);
                                        setEditName(chat.name);
                                    }}
                                    aria-label={`Rename chat ${chat.name}`}
                                    className="p-2 hover:text-cyber-neon text-gray-400 transition-colors"
                                    title="Rename Chat"
                                >
                                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => onExport(chat)}
                                    aria-label={`Export chat ${chat.name}`}
                                    className="p-2 hover:text-cyber-neon text-gray-400 transition-colors"
                                    title="Export Chat"
                                >
                                    <Download className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={() => onDelete(chat.id)}
                                    aria-label={`Delete chat ${chat.name}`}
                                    className="p-2 hover:text-red-500 text-gray-400 transition-colors"
                                    title="Delete Chat"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};

export default ChatList;
