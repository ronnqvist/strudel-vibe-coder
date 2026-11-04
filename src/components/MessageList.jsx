// SPDX-License-Identifier: MIT
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import MessageItem from './MessageItem';

/** Scrolling message column: empty state, messages, and the "generating" indicator. */
const MessageList = ({ messages, isLoading, editing, onEditContentChange, onStartEdit, onCancelEdit, onSaveEdit, onLoadCode }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef}>
            {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-10">
                    <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Initialize vibe session...</p>
                    <p className="text-sm">Type a music description to start.</p>
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
            {isLoading && (
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
