// SPDX-License-Identifier: MIT
import React from 'react';
import { Settings, Music, MessageSquare } from 'lucide-react';

const Header = ({ showChats, showSettings, onToggleChats, onToggleSettings }) => (
    <header className="flex items-center justify-between px-6 py-4 bg-cyber-dark border-b border-cyber-gray z-10">
        <div className="flex items-center gap-2">
            <Music className="text-cyber-neon w-6 h-6" aria-hidden="true" />
            <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon to-cyber-cyan">
                STRUDEL VIBE CODER
            </h1>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={onToggleChats}
                aria-label="Chats"
                aria-pressed={showChats}
                className={`p-2 rounded-full transition-colors ${showChats ? 'bg-cyber-neon text-black' : 'hover:bg-cyber-gray text-cyber-cyan'}`}
                title="Chats"
            >
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
                onClick={onToggleSettings}
                aria-label="Settings"
                aria-pressed={showSettings}
                className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-cyber-neon text-black' : 'hover:bg-cyber-gray text-cyber-cyan'}`}
                title="Settings"
            >
                <Settings className="w-5 h-5" aria-hidden="true" />
            </button>
        </div>
    </header>
);

export default Header;
