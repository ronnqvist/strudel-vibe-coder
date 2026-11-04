// SPDX-License-Identifier: MIT
import React from 'react';
import { Plus, Trash2, Download, Upload, X } from 'lucide-react';
import ChatList from './ChatList';

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
}) => (
    <div className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-cyber-black/95 backdrop-blur-md z-40 flex flex-col border-r border-cyber-neon/30">
        <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
            <h2 className="text-xl font-bold text-cyber-neon">Chats</h2>
            <div className="flex gap-2">
                <button onClick={onNew} className="p-2 hover:bg-cyber-gray rounded text-cyber-neon transition-colors" title="New Chat">
                    <Plus className="w-5 h-5" />
                </button>
                <label className="cursor-pointer p-2 hover:bg-cyber-gray rounded text-cyber-cyan transition-colors" title="Import Chat">
                    <Upload className="w-5 h-5" />
                    <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                            onImportFile(e.target.files[0]);
                            e.target.value = ''; // allow importing the same file again
                        }}
                        className="hidden"
                    />
                </label>
                <button onClick={onExportAll} className="p-2 hover:bg-cyber-gray rounded text-cyber-cyan transition-colors" title="Export All Chats">
                    <Download className="w-5 h-5" />
                </button>
                <button onClick={onDeleteAll} className="p-2 hover:bg-red-900/50 rounded text-red-500 transition-colors" title="Delete All Chats">
                    <Trash2 className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-cyber-gray rounded text-gray-400 transition-colors">
                    <X className="w-5 h-5" />
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

export default ChatSidebar;
