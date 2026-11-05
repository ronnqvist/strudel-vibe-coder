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
import { preparePattern } from './lib/patternCheck';
import { announcement as describeOutcome, apiConversation, canAutoLoad, notLoadedNotice } from './lib/generation';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useLocalStorage } from './hooks/useLocalStorage';
import { appendMessage, nameAfterFirstMessage, updateMessage } from './lib/chats';
import { generateId } from './lib/utils';

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
    const [editingMessage, setEditingMessage] = useState({ index: null, id: null, content: '' });

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
     * replace a pattern that works. The player gets exactly the code that was validated
     * (possibly with curly quotes repaired, which the notice then says). Returns whether it was loaded.
     */
    const loadIntoPlayer = async (code) => {
        const prepared = await preparePattern(code);
        if (!prepared.ok) {
            setPlayerNotice(`Not loaded into the player: the code has a syntax error (${prepared.error}). The previous pattern is still loaded.`);
            return false;
        }
        setPlayerNotice(prepared.repaired ? 'Loaded with typographic quotes and dashes in the code replaced by plain ones, so that it runs.' : '');
        setCurrentCode(prepared.code);
        return true;
    };

    const stopEditing = () => setEditingMessage({ index: null, id: null, content: '' });

    const saveMessageEdit = () => {
        if (editingMessage.index === null) return;
        const { id, content } = editingMessage;
        chat.updateChatWith(chat.currentChatId, (c) => updateMessage(c, id, { content }));
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
        const text = input;
        const userMsg = { id: generateId(), role: 'user', content: text };
        // Optimistic update. Every later write goes through updateChatWith, so it applies to the
        // chat as it is then: edits and renames made during generation are kept.
        const updatedMessages = [...chat.messages, userMsg];
        chat.updateChatWith(chatId, (c) => appendMessage(c, userMsg));

        setInput('');
        setIsLoading(true);
        setAnnouncement('Generating a reply');
        const controller = new AbortController();
        abortRef.current = controller;

        const reply = (result) => ({
            id: generateId(),
            role: 'assistant',
            content: result.content || (result.status === 'error' ? `Error: ${result.error?.message}` : ''),
            code: result.code,
            model: result.modelLabel ?? settings.modelName,
            status: result.status,
            ...(result.finishReason && { finishReason: result.finishReason }),
            ...(result.error && result.content && { error: result.error.message }),
            ...(result.usage && { usage: result.usage }),
            // read by earlier versions of the app
            ...(result.stopped && { stopped: true }),
            ...(result.truncated && { truncated: true }),
        });

        try {
            // Only role and content go to the API, and only of replies that completed
            const apiMessages = apiConversation(updatedMessages);

            const result = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName, {
                signal: controller.signal,
                onText: (text) => setStreaming({ chatId, text }),
            });

            // Stopped before anything arrived: keep the user's message, add no empty reply
            if (result.status === 'aborted' && !result.content) {
                setAnnouncement('Generation stopped');
                return;
            }

            const message = reply(result);
            if (result.status === 'error' && !result.content) delete message.model; // a plain error line, as before
            // Append the reply and name a new chat after its first message (unless the user renamed it meanwhile)
            chat.updateChatWith(chatId, (c) => nameAfterFirstMessage(appendMessage(c, message), text));

            // Load the pattern into the player only when the reply completed and the code parses
            let load = 'none';
            if (result.code && canAutoLoad(result.status)) {
                load = (await loadIntoPlayer(result.code)) ? 'loaded' : 'invalid';
            } else if (result.code && notLoadedNotice(result.status)) {
                setPlayerNotice(notLoadedNotice(result.status));
            }
            setAnnouncement(describeOutcome(result, load));
        } catch (error) {
            // Only a programming error gets here: generateStrudelCode reports failures as a status
            setAnnouncement(`Error: ${error.message}`);
            chat.updateChatWith(chatId, (c) => appendMessage(c, { id: generateId(), role: 'assistant', content: `Error: ${error.message}`, status: 'error' }));
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
                        onStartEdit={(index, content) => setEditingMessage({ index, id: chat.messages[index]?.id, content })}
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
