// SPDX-License-Identifier: MIT
import React from 'react';
import { Terminal, Play, X, Edit2, Save, RotateCcw } from 'lucide-react';
import { messageStatus, statusBadge } from '../lib/generation';

const MessageItem = ({
    message,
    isEditing,
    editContent,
    onEditContentChange,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onLoadCode,
    onStage = false,
    hasCode = true,
    onRetry,
    readOnly = false,
}) => {
    const badge = readOnly ? null : statusBadge(messageStatus(message));
    return (
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
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2 border-b border-cyber-gray/50 pb-2">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-cyber-neon">
                                    <Terminal className="w-3 h-3" aria-hidden="true" />
                                    <span className="font-bold">Generated Code</span>
                                    {message.model && <span className="text-[10px] text-gray-400 border border-gray-700 px-1 rounded break-all">{message.model}</span>}
                                    {badge && <span className="text-[10px] text-yellow-300 border border-yellow-800 px-1 rounded" title={badge.title}>{badge.label}</span>}
                                    {onStage && <span className="text-[10px] text-green-300 border border-green-800 px-1 rounded" title="This version is the pattern in the player">on stage</span>}
                                </div>
                                {!readOnly && <div className="flex gap-1 shrink-0 ml-auto">
                                    <button
                                        onClick={onStartEdit}
                                        aria-label="Edit message"
                                        className="p-1 hover:text-cyber-neon text-gray-400 transition-colors"
                                        title="Edit Message"
                                    >
                                        <Edit2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                    {hasCode && <button
                                        onClick={onLoadCode}
                                        aria-label="Use this version in the player"
                                        className="flex items-center gap-1 whitespace-nowrap bg-cyber-gray hover:bg-cyber-neon/20 text-cyber-cyan text-xs px-2 py-1 rounded transition-colors border border-cyber-cyan/30"
                                        title="Put this version of the pattern in the player"
                                    >
                                        <Play className="w-3 h-3" aria-hidden="true" />
                                        Use this version
                                    </button>}
                                </div>}
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-sm">{message.content}</pre>
                            {message.error && <p className="mt-2 text-red-400 text-xs">Error: {message.error}</p>}
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="mt-2 flex items-center gap-1 bg-cyber-gray hover:bg-cyber-neon/20 text-cyber-cyan text-xs px-2 py-1 rounded border border-cyber-cyan/30"
                                >
                                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                    Retry
                                </button>
                            )}
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
};

export default MessageItem;
