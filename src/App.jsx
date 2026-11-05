// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import PlayerPanel from './components/PlayerPanel';
import MobileTabs from './components/MobileTabs';
import PasteDialog from './components/PasteDialog';
import CustomInstructions from './components/CustomInstructions';
import { generateStrudelCode } from './lib/openrouter';
import { codeFromMessage } from './lib/extractCode';
import { preparePattern } from './lib/patternCheck';
import { announcement as describeOutcome, apiConversation, canAutoLoad, messageStatus, notLoadedNotice, replyMessage } from './lib/generation';
import { PROMPT_VERSION, boundConversation, buildRequestContext, composeSystemPrompt, selectModules } from './lib/prompt';
import { useChats } from './hooks/useChats';
import { useSettings } from './hooks/useSettings';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useRequests } from './hooks/useRequests';
import { appendMessage, nameAfterFirstMessage, updateMessage } from './lib/chats';
import { generateId } from './lib/utils';
import { addRevision, patternForRequest, previousRevision, restorePrevious, selectedRevision } from './lib/revisions';

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
    const [pasteDialog, setPasteDialog] = useState(null); // 'code' | 'error' | null
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
            // Only role and content go to the API, only of replies that completed, old patterns trimmed,
            // plus the pattern on this chat's stage as context for the newest message
            const stagePattern = patternForRequest(chat.chats.find(c => c.id === chatId));
            const apiMessages = buildRequestContext(boundConversation(apiConversation(messages)), stagePattern);
            // The system prompt for this request: the modules it needs and the user's preferences
            const userText = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
            const systemPrompt = composeSystemPrompt({
                modules: selectModules({ userText, selectedCode: stagePattern, prefs: settings.promptPrefs }),
                prefs: settings.promptPrefs,
                customInstructions: settings.customInstructions,
            });

            const result = await generateStrudelCode(settings.effectiveApiKey, settings.model, apiMessages, settings.modelName, {
                signal: req.signal,
                onText: req.onText,
                systemPrompt,
            });

            // Stopped before anything arrived: keep the user's message, add no empty reply
            if (result.status === 'aborted' && !result.content) {
                if (isViewed()) setAnnouncement('Generation stopped');
                return;
            }

            const message = replyMessage(result, settings.modelName, { promptVersion: PROMPT_VERSION });
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
        const text = input;
        if (await sendText(text)) setInput('');
    };

    /** Ask for a key when there is none. Returns whether there is one. */
    const haveKey = () => {
        if (settings.effectiveApiKey) return true;
        alert("Please enter your OpenRouter API Key in settings.");
        setShowSettings(true);
        return false;
    };

    /** Send `text` as the user's next message in the chat being viewed. Returns whether it was sent. */
    const sendText = async (text) => {
        if (isLoading || requests.isRunning(currentChatId)) return false;
        if (!haveKey()) return false;
        const chatId = currentChatId;
        const userMsg = { id: generateId(), role: 'user', content: text };
        chat.updateChatWith(chatId, (c) => appendMessage(c, userMsg));
        runRequest(chatId, [...chat.messages, userMsg], { firstMessageText: text });
        return true;
    };

    // Ask again after a reply that did not complete (the failed reply stays, and is not sent back)
    const retry = async () => {
        if (isLoading || requests.isRunning(currentChatId) || !haveKey()) return;
        await runRequest(currentChatId, chat.messages);
    };

    /** "Use this version": put the code of a chat message on this chat's stage. */
    const loadMessageVersion = async (msg) => {
        const code = codeFromMessage(msg);
        if (!code) return;
        const loaded = await loadIntoStage(currentChatId, code, { origin: 'message', messageId: msg.id, model: msg.model });
        setAnnouncement(loaded ? 'The pattern was loaded into the player.' : 'The pattern has a syntax error and was not loaded.');
    };

    /** "Use edited code": the user pasted code from the Strudel editor; it becomes this chat's pattern. */
    const applyEditedCode = async (text) => {
        const chatId = currentChatId;
        const prepared = await preparePattern(text.trim());
        if (!prepared.ok) return `This code has a syntax error (${prepared.error}), so it was not loaded.`;
        chat.updateChatWith(chatId, (c) => addRevision(c, { code: prepared.code, origin: 'edited', repaired: prepared.repaired }).chat);
        setNotice(chatId, prepared.repaired ? 'Loaded with typographic quotes and dashes in the code replaced by plain ones, so that it runs.' : '');
        setAnnouncement('Your edited code is now the pattern in the player.');
        return null;
    };

    /** "Fix an error": the user pasted an error the player showed; ask the model to fix the pattern on stage. */
    const fixError = async (text) => {
        if (isLoading || requests.isRunning(currentChatId)) return 'A reply is still being written in this chat. Try again when it has finished.';
        setPasteDialog(null);
        await sendText(`The pattern in the player fails with this error:\n\n\`\`\`\n${text.trim()}\n\`\`\`\n\nPlease fix the pattern and change nothing else.`);
        return null;
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

            {chat.showSaveWarning && (
                <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-2 bg-red-900/40 border-b border-red-700 text-sm text-red-100">
                    <p className="flex-1 min-w-0">Your chats could not be saved in this browser (its storage is full or blocked). They will be lost when you close or reload the page. Export them to keep them.</p>
                    <button onClick={chat.exportAllChats} className="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600">Export all chats</button>
                    <button onClick={chat.dismissSaveWarning} className="underline hover:text-white">Dismiss</button>
                </div>
            )}

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
                        promptPrefs={settings.promptPrefs}
                        onPromptPrefsChange={settings.setPromptPrefs}
                        musicExtras={<CustomInstructions value={settings.customInstructions} onChange={settings.setCustomInstructions} />}
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
                    onUseEditedCode={() => setPasteDialog('code')}
                    onFixError={() => setPasteDialog('error')}
                />

                {pasteDialog === 'code' && (
                    <PasteDialog
                        title="Use edited code"
                        explanation="The player (strudel.cc) does not send your edits back to this app. In the player, select all of the code (Ctrl+A or Cmd+A), copy it, and paste it here. It becomes this chat's pattern, and the next request changes it. Loading it restarts the player."
                        label="Code from the player"
                        submitLabel="Use this code"
                        onSubmit={applyEditedCode}
                        onClose={() => setPasteDialog(null)}
                    />
                )}
                {pasteDialog === 'error' && (
                    <PasteDialog
                        title="Fix an error"
                        explanation="Paste the error message the player shows. It is sent to the model together with the pattern in the player, with a request to fix only that."
                        label="Error message"
                        submitLabel="Ask for a fix"
                        onSubmit={fixError}
                        onClose={() => setPasteDialog(null)}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
