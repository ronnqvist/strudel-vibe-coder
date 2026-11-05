// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { CHATS_KEY, CURRENT_CHAT_KEY, LEGACY_CODE_KEY, createChat, loadInitialChats, removeChat, resetChats, withMessageIds } from '../lib/chats';
import { stageCode } from '../lib/revisions';
import { MAX_CHAT_FILE_BYTES, ChatFileError, buildExport, describeImport, exportFileName, parseChatFile } from '../lib/chatFile';
import { downloadText } from '../lib/download';

/** Chat list state, persistence, and import/export. */
export function useChats() {
    const [initial] = useState(loadInitialChats);
    const [chats, setChats] = useState(initial.chats);
    const [currentChatId, setCurrentChatId] = useState(initial.currentId);

    useEffect(() => {
        try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats)); } catch { /* storage unavailable */ }
    }, [chats]);

    useEffect(() => {
        try { localStorage.setItem(CURRENT_CHAT_KEY, currentChatId); } catch { /* storage unavailable */ }
    }, [currentChatId]);

    const currentChat = chats.find(c => c.id === currentChatId);
    const currentStageCode = stageCode(currentChat);

    // Keep the key earlier versions read the player's pattern from in step with the active chat
    useEffect(() => {
        try { localStorage.setItem(LEGACY_CODE_KEY, currentStageCode); } catch { /* storage unavailable */ }
    }, [currentStageCode]);

    const updateChat = (id, patch) => {
        setChats(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    };

    /**
     * Change one chat from its current state: `fn` receives the chat as it is when the update
     * runs, not as it was when a request started. Use this for every write that happens after an
     * `await`. Does nothing if the chat has been deleted meanwhile.
     */
    const updateChatWith = (id, fn) => {
        setChats(prev => prev.map(c => (c.id === id ? fn(c) : c)));
    };

    const createNewChat = () => {
        const chat = createChat();
        setChats(prev => [chat, ...prev]);
        setCurrentChatId(chat.id);
        return chat.id;
    };

    const deleteChat = (id) => {
        const next = removeChat(chats, currentChatId, id);
        setChats(next.chats);
        setCurrentChatId(next.currentId);
    };

    const deleteAllChats = () => {
        const next = resetChats();
        setChats(next.chats);
        setCurrentChatId(next.currentId);
    };

    const exportChat = (chat = currentChat) => {
        if (!chat) return;
        downloadText(exportFileName([chat]), JSON.stringify(buildExport([chat]), null, 2));
    };

    const exportAllChats = () => {
        if (chats.length === 0) return;
        downloadText(exportFileName(chats, { all: true }), JSON.stringify(buildExport(chats), null, 2));
    };

    /**
     * Import a backup file: the current format, or a single chat / array of chats written by
     * earlier versions. Calls `onImported` on success and tells the user what happened.
     */
    const importChatFile = async (file, onImported) => {
        if (!file) return;
        try {
            if (file.size > MAX_CHAT_FILE_BYTES) {
                throw new ChatFileError(`This file is too large to import (limit ${MAX_CHAT_FILE_BYTES / 1024 / 1024} MB).`);
            }
            const result = parseChatFile(await file.text());
            result.chats = result.chats.map(c => withMessageIds(c));
            setChats(prev => [...result.chats, ...prev]);
            setCurrentChatId(result.chats[0].id);
            onImported?.();
            if (result.chats.length > 1 || result.skippedChats || result.skippedMessages || result.warnings.length) {
                alert(describeImport(result));
            }
        } catch (error) {
            if (!(error instanceof ChatFileError)) console.error('Error importing chat:', error);
            alert(error instanceof ChatFileError ? error.message : 'Error importing chat file.');
        }
    };

    return {
        chats,
        currentChat,
        currentChatId,
        messages: currentChat ? currentChat.messages : [],
        stageCode: currentStageCode,
        selectChat: setCurrentChatId,
        updateChat,
        updateChatWith,
        createNewChat,
        renameChat: (id, name) => updateChat(id, { name }),
        deleteChat,
        deleteAllChats,
        exportChat,
        exportAllChats,
        importChatFile,
    };
}
