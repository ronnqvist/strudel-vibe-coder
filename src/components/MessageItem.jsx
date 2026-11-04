// SPDX-License-Identifier: MIT
import React from 'react';
import { Terminal, Import, X, Edit2, Save } from 'lucide-react';

const MessageItem = ({
    message,
    isEditing,
    editContent,
    onEditContentChange,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onLoadCode,
    readOnly = false,
}) => (
    <div className={`flex ${isEditing ? 'w-full' : (message.role === 'user' ? 'justify-end' : 'justify-start')}`}>
        <div className={`${isEditing ? 'w-full' : 'max-w-[80%]'} p-3 rounded-lg ${message.role === 'user'
            ? 'bg-cyber-gray text-white border border-cyber-gray'
            : 'bg-cyber-black text-cyber-cyan border border-cyber-cyan/30'
            }`}>
            {isEditing ? (
                <div className="w-full">
                    <textarea
                        aria-label="Edit message text"
                        value={editContent}
                        onChange={(e) => onEditContentChange(e.target.value)}
                        className="w-full bg-cyber-black/50 text-white p-2 rounded border border-cyber-neon/50 font-mono text-sm h-32"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={onCancelEdit} aria-label="Cancel edit" className="p-1 text-red-400 hover:text-red-300"><X className="w-4 h-4" aria-hidden="true" /></button>
                        <button onClick={onSaveEdit} aria-label="Save edit" className="p-1 text-green-400 hover:text-green-300"><Save className="w-4 h-4" aria-hidden="true" /></button>
                    </div>
                </div>
            ) : (
                <>
                    {message.role === 'assistant' ? (
                        <div className="font-mono text-xs">
                            <div className="flex items-center justify-between mb-2 border-b border-cyber-gray/50 pb-2">
                                <div className="flex items-center gap-2 text-cyber-neon">
                                    <Terminal className="w-3 h-3" aria-hidden="true" />
                                    <span className="font-bold">Generated Code</span>
                                    {message.model && <span className="text-[10px] text-gray-400 ml-2 border border-gray-700 px-1 rounded">{message.model}</span>}
                                    {message.stopped && <span className="text-[10px] text-red-400 border border-red-900 px-1 rounded">stopped</span>}
                                </div>
                                {!readOnly && <div className="flex gap-1">
                                    <button
                                        onClick={onStartEdit}
                                        aria-label="Edit message"
                                        className="p-1 hover:text-cyber-neon text-gray-400 transition-colors"
                                        title="Edit Message"
                                    >
                                        <Edit2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={onLoadCode}
                                        aria-label="Import code into the player"
                                        className="flex items-center gap-1 bg-cyber-gray hover:bg-cyber-neon/20 text-cyber-cyan text-xs px-2 py-1 rounded transition-colors border border-cyber-cyan/30"
                                        title="Run in Player"
                                    >
                                        <Import className="w-3 h-3" aria-hidden="true" />
                                        Import
                                    </button>
                                </div>}
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-sm">{message.content}</pre>
                        </div>
                    ) : (
                        <div className="relative group">
                            <div className="pr-6">{message.content}</div>
                            <button
                                onClick={onStartEdit}
                                aria-label="Edit message"
                                className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 hover:text-cyber-neon text-gray-400 transition-all"
                                title="Edit Message"
                            >
                                <Edit2 className="w-3 h-3" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
);

export default MessageItem;
