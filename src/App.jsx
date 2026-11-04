// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import Header from './components/Header';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import PlayerPanel from './components/PlayerPanel';
import { generateStrudelCode } from './lib/openrouter';
import { codeFromMessage } from './lib/extractCode';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
    const settings = useSettings();
    const chat = useChats();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentCode, setCurrentCode] = useLocalStorage('openrouter_current_code', '');
    const [showSettings, setShowSettings] = useState(false);
    const [showChats, setShowChats] = useState(false);
    const [editingMessage, setEditingMessage] = useState({ index: null, content: '' });

    const stopEditing = () => setEditingMessage({ index: null, content: '' });

    const saveMessageEdit = () => {
        if (editingMessage.index === null) return;
        const updated = [...chat.messages];
        updated[editingMessage.index] = { ...updated[editingMessage.index], content: editingMessage.content };
        chat.updateChat(chat.currentChatId, { messages: updated });
        stopEditing();
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!settings.effectiveApiKey) {
            alert("Please enter your OpenRouter API Key in settings.");
            setShowSettings(true);
            return;
        }

        const chatId = chat.currentChatId;
        const userMsg = { role: 'user', content: input };
        // Optimistic update
        const updatedMessages = [...chat.messages, userMsg];
        chat.updateChat(chatId, { messages: updatedMessages });

        setInput('');
        setIsLoading(true);

        try {
            // Only role and content go to the API
            const apiMessages = updatedMessages.map(msg => ({ role: msg.role, content: msg.content }));

            const response = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName);
            const responseWithModel = { ...response, model: settings.modelName };

            // Name a new chat after its first message
            let name = chat.currentChat.name;
            if (chat.messages.length === 0 && (name === 'New Chat' || name.startsWith('Chat '))) {
                name = input.slice(0, 30) + (input.length > 30 ? '...' : '');
            }

            chat.updateChat(chatId, { messages: [...updatedMessages, responseWithModel], name });

            // Only update the player if code was extracted
            if (response.code) {
                setCurrentCode(response.code);
            }
        } catch (error) {
            chat.updateChat(chatId, { messages: [...updatedMessages, { role: 'assistant', content: `Error: ${error.message}` }] });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-cyber-black text-white font-mono overflow-hidden">
            <Header
                showChats={showChats}
                showSettings={showSettings}
                onToggleChats={() => setShowChats(!showChats)}
                onToggleSettings={() => setShowSettings(!showSettings)}
            />

            {/* Main Content - Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {showChats && (
                    <ChatSidebar
                        chats={chat.chats}
                        currentChatId={chat.currentChatId}
                        onSelect={(id) => { chat.selectChat(id); setShowChats(false); }}
                        onNew={() => { chat.createNewChat(); setShowChats(false); }}
                        onImportFile={(file) => chat.importChatFile(file, () => setShowChats(false))}
                        onExportAll={chat.exportAllChats}
                        onDeleteAll={() => {
                            if (window.confirm("Are you sure you want to delete all chats?")) chat.deleteAllChats();
                        }}
                        onClose={() => setShowChats(false)}
                        onRename={chat.renameChat}
                        onExport={chat.exportChat}
                        onDelete={chat.deleteChat}
                    />
                )}

                {showSettings && (
                    <SettingsModal
                        apiKey={settings.apiKey}
                        onApiKeyChange={settings.setApiKey}
                        hasHashKey={Boolean(settings.hashApiKey)}
                        model={settings.model}
                        onModelChange={settings.setModel}
                        savedModels={settings.savedModels}
                        onSavedModelsChange={settings.setSavedModels}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {/* Chat Section */}
                <div className="w-full md:w-1/2 flex flex-col border-r border-cyber-gray bg-cyber-dark/50">
                    <MessageList
                        messages={chat.messages}
                        isLoading={isLoading}
                        editing={editingMessage}
                        onEditContentChange={(content) => setEditingMessage({ ...editingMessage, content })}
                        onStartEdit={(index, content) => setEditingMessage({ index, content })}
                        onCancelEdit={stopEditing}
                        onSaveEdit={saveMessageEdit}
                        onLoadCode={(msg) => {
                            const code = codeFromMessage(msg);
                            if (code) setCurrentCode(code);
                        }}
                    />
                    <ChatInput
                        value={input}
                        onChange={setInput}
                        onSend={handleSend}
                        disabled={isLoading}
                        hasMessages={chat.messages.length > 0}
                    />
                </div>

                <PlayerPanel code={currentCode} />
            </div>
        </div>
    );
}

export default App;
