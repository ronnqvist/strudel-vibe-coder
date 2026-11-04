// SPDX-License-Identifier: MIT
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import MessageItem from './MessageItem';
import { STARTER_PROMPTS } from '../config';

/** Scrolling message column: empty state, messages, and the "generating" indicator. */
const MessageList = ({ messages, isLoading, streamingText, streamingModel, onPickPrompt, editing, onEditContentChange, onStartEdit, onCancelEdit, onSaveEdit, onLoadCode }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages, streamingText]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef} role="region" aria-label="Conversation" tabIndex={0}>
            {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-10">
                    <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                    <h2 className="text-xl font-bold text-cyber-neon">Describe a groove.</h2>
                    <p className="text-sm mt-1">Write what you want to hear. The model writes Strudel you can play on the stage.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Starter ideas">
                        {STARTER_PROMPTS.map(prompt => (
                            <button
                                key={prompt}
                                onClick={() => onPickPrompt(prompt)}
                                className="px-3 py-1.5 rounded-full border border-cyber-gray bg-cyber-black text-sm text-cyber-cyan hover:border-cyber-neon hover:text-cyber-neon transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {messages.map((msg, idx) => (
                <MessageItem
                    key={idx}
                    message={msg}
                    isEditing={editing.index === idx}
                    editContent={editing.content}
                    onEditContentChange={onEditContentChange}
                    onStartEdit={() => onStartEdit(idx, msg.content)}
                    onCancelEdit={onCancelEdit}
                    onSaveEdit={onSaveEdit}
                    onLoadCode={() => onLoadCode(msg)}
                />
            ))}
            {isLoading && streamingText && (
                <MessageItem message={{ role: 'assistant', content: streamingText, model: streamingModel }} readOnly />
            )}
            {isLoading && !streamingText && (
                <div className="flex justify-start">
                    <div className="bg-cyber-black p-3 rounded-lg border border-cyber-neon/30 animate-pulse text-cyber-neon">
                        Generating vibe...
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;
