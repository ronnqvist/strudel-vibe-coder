// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import PlayerPanel from './components/PlayerPanel';
import MobileTabs from './components/MobileTabs';
import { generateStrudelCode } from './lib/openrouter';
import { codeFromMessage } from './lib/extractCode';
import { patternSyntaxError } from './lib/patternCheck';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
    const settings = useSettings();
    const chat = useChats();
    const catalog = useModelCatalog();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streaming, setStreaming] = useState(null); // { chatId, text } while a reply is arriving
    const [announcement, setAnnouncement] = useState(''); // read out by screen readers
    const [tab, setTab] = useState('chat'); // narrow screens show one panel at a time
    const inputRef = useRef(null);
    const abortRef = useRef(null);
    const [currentCode, setCurrentCode] = useLocalStorage('openrouter_current_code', '');
    const [seenCode, setSeenCode] = useState(currentCode); // the pattern last shown on the Stage tab
    const [playerNotice, setPlayerNotice] = useState(''); // why the last pattern was not loaded
    const [showSettings, setShowSettings] = useState(false);
    const [showChats, setShowChats] = useState(false);
    const [editingMessage, setEditingMessage] = useState({ index: null, content: '' });

    const stopGenerating = () => abortRef.current?.abort();

    // Esc stops a running generation; leaving the page cancels the request
    useEffect(() => {
        if (!isLoading) return undefined;
        // a dialog that handled this Esc (closing itself) marks it as handled; then keep generating
        const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) abortRef.current?.abort(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLoading]);
    useEffect(() => () => abortRef.current?.abort(), []);

    // Entering or leaving the Stage tab counts as having seen the current pattern
    const showTab = (next) => {
        if (next === 'stage' || tab === 'stage') setSeenCode(currentCode);
        setTab(next);
    };

    // A chip puts its text in the message box (it does not send, which could spend the user's credits)
    const pickPrompt = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    /**
     * Load a pattern into the player unless it is not valid JavaScript, so a broken reply cannot
     * replace a pattern that works. Returns whether it was loaded.
     */
    const loadIntoPlayer = async (code) => {
        const error = await patternSyntaxError(code);
        if (error) {
            setPlayerNotice(`Not loaded into the player: the code has a syntax error (${error}). The previous pattern is still loaded.`);
            return false;
        }
        setPlayerNotice('');
        setCurrentCode(code);
        return true;
    };

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
        setAnnouncement('Generating a reply');
        const controller = new AbortController();
        abortRef.current = controller;

        const reply = (result) => ({
            role: 'assistant',
            content: result.content,
            code: result.code,
            model: result.modelLabel ?? settings.modelName,
            ...(result.stopped && { stopped: true }),
        });

        try {
            // Only role and content go to the API
            const apiMessages = updatedMessages.map(msg => ({ role: msg.role, content: msg.content }));

            const result = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName, {
                signal: controller.signal,
                onText: (text) => setStreaming({ chatId, text }),
            });

            // Stopped before anything arrived: keep the user's message, add no empty reply
            if (result.stopped && !result.content) {
                setAnnouncement('Generation stopped');
                return;
            }

            // Name a new chat after its first message
            let name = chat.currentChat.name;
            if (chat.messages.length === 0 && (name === 'New Chat' || name.startsWith('Chat '))) {
                name = input.slice(0, 30) + (input.length > 30 ? '...' : '');
            }

            chat.updateChat(chatId, { messages: [...updatedMessages, reply(result)], name });

            // Load the pattern into the player only when the reply is complete and the code parses
            const loaded = result.code && !result.stopped ? await loadIntoPlayer(result.code) : false;
            setAnnouncement(result.stopped
                ? 'Generation stopped'
                : !result.code ? 'Reply received'
                    : loaded ? 'Reply received. The pattern was loaded into the player.'
                        : 'Reply received. The pattern has a syntax error and was not loaded.');
        } catch (error) {
            setAnnouncement(`Error: ${error.message}`);
            const kept = error.partial ? [reply({ content: error.partial, code: null, stopped: true, modelLabel: settings.modelName })] : [];
            chat.updateChat(chatId, { messages: [...updatedMessages, ...kept, { role: 'assistant', content: `Error: ${error.message}` }] });
        } finally {
            abortRef.current = null;
            setStreaming(null);
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

            <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

            {/* Main Content - Split View */}
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                <MobileTabs tab={tab} onChange={showTab} stageHasNews={tab === 'chat' && currentCode !== seenCode} />

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
                        remember={settings.remember}
                        onRememberChange={settings.setRemember}
                        onForgetKey={settings.forgetKey}
                        model={settings.model}
                        onModelChange={settings.setModel}
                        savedModels={settings.savedModels}
                        onSavedModelsChange={settings.setSavedModels}
                        catalog={catalog}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {/* Chat Section */}
                <div className={`${tab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 md:flex-none w-full md:w-1/2 flex-col border-r border-cyber-gray bg-cyber-dark/50`}>
                    <MessageList
                        messages={chat.messages}
                        isLoading={isLoading}
                        streamingText={streaming?.chatId === chat.currentChatId ? streaming.text : null}
                        streamingModel={settings.modelName}
                        onPickPrompt={pickPrompt}
                        editing={editingMessage}
                        onEditContentChange={(content) => setEditingMessage({ ...editingMessage, content })}
                        onStartEdit={(index, content) => setEditingMessage({ index, content })}
                        onCancelEdit={stopEditing}
                        onSaveEdit={saveMessageEdit}
                        onLoadCode={async (msg) => {
                            const code = codeFromMessage(msg);
                            if (code && !(await loadIntoPlayer(code))) setAnnouncement('The pattern has a syntax error and was not loaded.');
                        }}
                    />
                    <ChatInput
                        value={input}
                        onChange={setInput}
                        onSend={handleSend}
                        onStop={stopGenerating}
                        disabled={isLoading}
                        hasMessages={chat.messages.length > 0}
                        inputRef={inputRef}
                    />
                </div>

                <PlayerPanel code={currentCode} visibleOnMobile={tab === 'stage'} notice={playerNotice} onDismissNotice={() => setPlayerNotice('')} />
            </main>
        </div>
    );
}

export default App;
