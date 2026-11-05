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
import { announcement as describeOutcome, apiConversation, canAutoLoad, messageStatus, notLoadedNotice, replyMessage, withCurrentPattern } from './lib/generation';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useRequests } from './hooks/useRequests';
import { appendMessage, nameAfterFirstMessage, updateMessage } from './lib/chats';
import { generateId } from './lib/utils';
import { addRevision, previousRevision, restorePrevious, selectedRevision } from './lib/revisions';

function App() {
    const settings = useSettings();
    const chat = useChats();
    const catalog = useModelCatalog();
    const requests = useRequests();

    const [input, setInput] = useState('');
    const [announcement, setAnnouncement] = useState(''); // read out by screen readers
    const [tab, setTab] = useState('chat'); // narrow screens show one panel at a time
    const inputRef = useRef(null);
    const [notices, setNotices] = useState({}); // chatId -> why the last pattern was not loaded
    const [news, setNews] = useState(() => new Set()); // chats whose stage changed since it was last seen
    const [showSettings, setShowSettings] = useState(false);
    const [showChats, setShowChats] = useState(false);
    const [editingMessage, setEditingMessage] = useState({ index: null, id: null, content: '' });

    const currentChatId = chat.currentChatId;
    const currentChatIdRef = useRef(currentChatId);
    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
    const isLoading = requests.isBusy(currentChatId);

    const setNotice = (chatId, text) => setNotices(prev => ({ ...prev, [chatId]: text }));
    const markNews = (chatId) => setNews(prev => new Set(prev).add(chatId));
    const clearNews = (chatId) => setNews(prev => {
        if (!prev.has(chatId)) return prev;
        const next = new Set(prev);
        next.delete(chatId);
        return next;
    });

    // Stop and Esc cancel the request of the chat being viewed, never another chat's
    const stopGenerating = () => requests.stop(currentChatId);
    useEffect(() => {
        if (!isLoading) return undefined;
        // a dialog that handled this Esc (closing itself) marks it as handled; then keep generating
        const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) requests.stop(currentChatId); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isLoading, currentChatId, requests]);

    // Entering or leaving the Stage tab counts as having seen the current chat's pattern
    const showTab = (next) => {
        if (next === 'stage' || tab === 'stage') clearNews(currentChatId);
        setTab(next);
    };

    // Switching chats: the chat being left counts as seen; the stage now shows the new chat's pattern
    const selectChat = (id) => {
        clearNews(currentChatId);
        chat.selectChat(id);
    };

    // A chip puts its text in the message box (it does not send, which could spend the user's credits)
    const pickPrompt = (text) => {
        setInput(text);
        inputRef.current?.focus();
    };

    /**
     * Put a pattern on a chat's stage unless it is not valid JavaScript, so a broken reply cannot
     * replace a pattern that works. The stage gets exactly the code that was validated (possibly
     * with curly quotes repaired, which the notice then says). Only `chatId`'s stage changes,
     * whichever chat is being viewed. Returns whether it was loaded.
     *
     * @param {string} chatId
     * @param {string} code
     * @param {{ origin: import('./lib/revisions').RevisionOrigin, messageId?: string, model?: string }} meta
     */
    const loadIntoStage = async (chatId, code, meta) => {
        const prepared = await preparePattern(code);
        if (!prepared.ok) {
            setNotice(chatId, `Not loaded into the player: the code has a syntax error (${prepared.error}). The previous pattern is still loaded.`);
            return false;
        }
        setNotice(chatId, prepared.repaired ? 'Loaded with typographic quotes and dashes in the code replaced by plain ones, so that it runs.' : '');
        chat.updateChatWith(chatId, (c) => {
            const { chat: next, revision } = addRevision(c, { code: prepared.code, repaired: prepared.repaired, ...meta });
            return meta.messageId ? updateMessage(next, meta.messageId, { revisionId: revision.id }) : next;
        });
        markNews(chatId);
        return true;
    };

    const stopEditing = () => setEditingMessage({ index: null, id: null, content: '' });

    const saveMessageEdit = () => {
        if (editingMessage.index === null) return;
        const { id, content } = editingMessage;
        chat.updateChatWith(currentChatId, (c) => updateMessage(c, id, { content }));
        stopEditing();
    };

    /**
     * Run one request for `chatId` with `messages` as the conversation (the user's newest message
     * last) and add the reply to that chat. Every write goes through updateChatWith, so it applies
     * to the chat as it is then: edits and renames made during generation are kept, and a chat
     * that is not being viewed only gets its own reply and its own stage.
     */
    const runRequest = async (chatId, messages, { firstMessageText } = {}) => {
        const req = requests.begin(chatId);
        if (chatId === currentChatIdRef.current) setAnnouncement('Generating a reply');
        const isViewed = () => chatId === currentChatIdRef.current;
        const chatName = () => chat.chats.find(c => c.id === chatId)?.name ?? 'another chat';

        try {
            const selected = selectedRevision(chat.chats.find(c => c.id === chatId));
            // Only role and content go to the API, only of replies that completed, plus the pattern on this chat's stage
            const apiMessages = withCurrentPattern(apiConversation(messages), selected?.code);

            const result = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName, {
                signal: req.signal,
                onText: req.onText,
            });

            // Stopped before anything arrived: keep the user's message, add no empty reply
            if (result.status === 'aborted' && !result.content) {
                if (isViewed()) setAnnouncement('Generation stopped');
                return;
            }

            const message = replyMessage(result, settings.modelName);
            chat.updateChatWith(chatId, (c) => {
                const next = appendMessage(c, message);
                return firstMessageText ? nameAfterFirstMessage(next, firstMessageText) : next;
            });

            // Load the pattern only when the reply completed and the code parses
            let load = 'none';
            if (result.code && canAutoLoad(result.status)) {
                load = (await loadIntoStage(chatId, result.code, { origin: 'reply', messageId: message.id, model: message.model })) ? 'loaded' : 'invalid';
            } else if (result.code && notLoadedNotice(result.status)) {
                setNotice(chatId, notLoadedNotice(result.status));
            }
            const outcome = describeOutcome(result, load);
            setAnnouncement(isViewed() ? outcome : `A reply finished in the chat "${chatName()}". ${outcome}`);
        } catch (error) {
            // Only a programming error gets here: generateStrudelCode reports failures as a status
            setAnnouncement(`Error: ${error.message}`);
            chat.updateChatWith(chatId, (c) => appendMessage(c, { id: generateId(), role: 'assistant', content: `Error: ${error.message}`, status: 'error' }));
        } finally {
            req.end();
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        if (!settings.effectiveApiKey) {
            alert("Please enter your OpenRouter API Key in settings.");
            setShowSettings(true);
            return;
        }
        const chatId = currentChatId;
        const text = input;
        const userMsg = { id: generateId(), role: 'user', content: text };
        chat.updateChatWith(chatId, (c) => appendMessage(c, userMsg));
        setInput('');
        await runRequest(chatId, [...chat.messages, userMsg], { firstMessageText: text });
    };

    // Ask again after a reply that did not complete (the failed reply stays, and is not sent back)
    const retry = async () => {
        if (isLoading || !settings.effectiveApiKey) return;
        await runRequest(currentChatId, chat.messages);
    };

    /** "Use this version": put the code of a chat message on this chat's stage. */
    const loadMessageVersion = async (msg) => {
        const code = codeFromMessage(msg);
        if (!code) return;
        const loaded = await loadIntoStage(currentChatId, code, { origin: 'message', messageId: msg.id, model: msg.model });
        setAnnouncement(loaded ? 'The pattern was loaded into the player.' : 'The pattern has a syntax error and was not loaded.');
    };

    const restorePreviousVersion = () => {
        chat.updateChatWith(currentChatId, restorePrevious);
        setNotice(currentChatId, '');
        setAnnouncement('The previous pattern was restored.');
    };

    const currentChat = chat.currentChat;
    const lastMessage = chat.messages[chat.messages.length - 1];
    const canRetry = !isLoading && lastMessage?.role === 'assistant' && messageStatus(lastMessage) !== 'completed';

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
                <MobileTabs tab={tab} onChange={showTab} stageHasNews={tab === 'chat' && news.has(currentChatId)} />

                {showChats && (
                    <ChatSidebar
                        chats={chat.chats}
                        currentChatId={currentChatId}
                        news={news}
                        busyChatIds={requests.busyChatIds}
                        onSelect={(id) => { selectChat(id); setShowChats(false); }}
                        onNew={() => { clearNews(currentChatId); chat.createNewChat(); setShowChats(false); }}
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
                        streamingText={requests.textFor(currentChatId)}
                        streamingModel={settings.modelName}
                        onPickPrompt={pickPrompt}
                        editing={editingMessage}
                        onEditContentChange={(content) => setEditingMessage({ ...editingMessage, content })}
                        onStartEdit={(index, content) => setEditingMessage({ index, id: chat.messages[index]?.id, content })}
                        onCancelEdit={stopEditing}
                        onSaveEdit={saveMessageEdit}
                        onLoadCode={loadMessageVersion}
                        selectedMessageId={selectedRevision(currentChat)?.messageId}
                        onRetry={canRetry ? retry : undefined}
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

                <PlayerPanel
                    code={chat.stageCode}
                    visibleOnMobile={tab === 'stage'}
                    notice={notices[currentChatId] || ''}
                    onDismissNotice={() => setNotice(currentChatId, '')}
                    canRestorePrevious={Boolean(previousRevision(currentChat))}
                    onRestorePrevious={restorePreviousVersion}
                    hasMessagesWithCode={chat.messages.some(m => m.role === 'assistant' && codeFromMessage(m))}
                    onUseLatestReply={() => {
                        const latest = [...chat.messages].reverse().find(m => m.role === 'assistant' && messageStatus(m) === 'completed' && codeFromMessage(m));
                        if (latest) loadMessageVersion(latest);
                    }}
                />
            </main>
        </div>
    );
}

export default App;
