// SPDX-License-Identifier: MIT
import React from 'react';
import { Send } from 'lucide-react';

const ChatInput = ({ value, onChange, onSend, disabled, hasMessages }) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="p-4 bg-cyber-black border-t border-cyber-gray">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasMessages ? "Suggest changes or paste in any error messages" : "Describe the sound (e.g. 'acid techno bass')"}
                    className="flex-1 bg-cyber-dark border border-cyber-gray p-3 rounded-lg focus:border-cyber-neon focus:outline-none text-white placeholder-gray-600"
                    disabled={disabled}
                />
                <button
                    onClick={onSend}
                    disabled={disabled}
                    className="bg-cyber-neon text-black p-3 rounded-lg hover:bg-pink-400 disabled:opacity-50 transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatInput;
