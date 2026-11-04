// SPDX-License-Identifier: MIT
import React, { useRef } from 'react';
import { Plus, Trash2, Download, Upload, X } from 'lucide-react';
import ChatList from './ChatList';
import { useDialog } from '../hooks/useDialog';

const iconButton = 'p-2 hover:bg-cyber-gray rounded transition-colors';

const ChatSidebar = ({
    chats,
    currentChatId,
    onSelect,
    onNew,
    onImportFile,
    onExportAll,
    onDeleteAll,
    onClose,
    onRename,
    onExport,
    onDelete,
}) => {
    const { attach, onKeyDown } = useDialog({ onClose });
    const fileInput = useRef(null);

    return (
        <div
            ref={attach}
            onKeyDown={onKeyDown}
            role="dialog"
            aria-label="Chats"
            tabIndex={-1}
            className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-cyber-black/95 backdrop-blur-md z-40 flex flex-col border-r border-cyber-neon/30"
        >
            <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
                <h2 className="text-xl font-bold text-cyber-neon">Chats</h2>
                <div className="flex gap-2">
                    <button onClick={onNew} aria-label="New chat" className={`${iconButton} text-cyber-neon`} title="New Chat">
                        <Plus className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button onClick={() => fileInput.current?.click()} aria-label="Import chats from a file" className={`${iconButton} text-cyber-cyan`} title="Import Chat">
                        <Upload className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".json,application/json"
                        tabIndex={-1}
                        aria-hidden="true"
                        onChange={(e) => {
                            onImportFile(e.target.files[0]);
                            e.target.value = ''; // allow importing the same file again
                        }}
                        className="hidden"
                    />
                    <button onClick={onExportAll} aria-label="Export all chats" className={`${iconButton} text-cyber-cyan`} title="Export All Chats">
                        <Download className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button onClick={onDeleteAll} aria-label="Delete all chats" className="p-2 hover:bg-red-900/50 rounded text-red-500 transition-colors" title="Delete All Chats">
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button onClick={onClose} aria-label="Close chats" className={`${iconButton} text-gray-400`} title="Close">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <ChatList
                chats={chats}
                currentChatId={currentChatId}
                onSelect={onSelect}
                onRename={onRename}
                onExport={onExport}
                onDelete={onDelete}
            />
        </div>
    );
};

export default ChatSidebar;
