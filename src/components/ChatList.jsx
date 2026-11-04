// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { Trash2, Download, X, Edit2, Check } from 'lucide-react';
import { formatDate } from '../lib/utils';

/** The list of chats, with inline rename. One implementation for both the normal and the rename view. */
const ChatList = ({ chats, currentChatId, onSelect, onRename, onExport, onDelete }) => {
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const finishRename = (id) => {
        onRename(id, editName);
        setEditingId(null);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chats.map(chat => (
                chat.id === editingId ? (
                    <div key={chat.id} className="flex items-center gap-2 p-3 rounded-lg border border-cyber-neon bg-cyber-neon/10">
                        <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') finishRename(chat.id);
                                if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 bg-transparent border-none focus:outline-none text-white font-bold"
                        />
                        <button onClick={() => finishRename(chat.id)} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <div
                        key={chat.id}
                        onClick={() => onSelect(chat.id)}
                        className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${currentChatId === chat.id
                            ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                            : 'bg-cyber-dark border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                            }`}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{chat.name}</div>
                            <div className="text-xs opacity-60 flex gap-2">
                                <span>{chat.messages.length} msgs</span>
                                <span>•</span>
                                <span>{formatDate(chat.createdAt)}</span>
                            </div>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(chat.id);
                                    setEditName(chat.name);
                                }}
                                className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                title="Rename Chat"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExport(chat);
                                }}
                                className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                title="Export Chat"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(chat.id);
                                }}
                                className="p-2 hover:text-red-500 text-gray-500 transition-colors"
                                title="Delete Chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};

export default ChatList;
