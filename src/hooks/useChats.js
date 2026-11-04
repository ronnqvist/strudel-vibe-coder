// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { CHATS_KEY, CURRENT_CHAT_KEY, createChat, loadInitialChats, removeChat, resetChats } from '../lib/chats';
import { generateId } from '../lib/utils';

function download(href, filename) {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.setAttribute('download', filename);
    document.body.appendChild(a); // required for firefox
    a.click();
    a.remove();
}

const jsonHref = (data) => 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));

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

    const updateChat = (id, patch) => {
        setChats(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    };

    const createNewChat = () => {
        const chat = createChat();
        setChats(prev => [chat, ...prev]);
        setCurrentChatId(chat.id);
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
        download(jsonHref(chat), `strudel-chat-${chat.name}.json`);
    };

    const exportAllChats = () => {
        if (chats.length === 0) return;
        download(jsonHref(chats), `strudel-chats-backup-${new Date().toISOString().slice(0, 10)}.json`);
    };

    /** Accepts a single chat object or an array of chats ("Export All"). Calls `onImported` on success. */
    const importChatFile = (file, onImported) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (Array.isArray(importedData)) {
                    const newChats = importedData.filter(chat =>
                        chat.messages && Array.isArray(chat.messages)
                    ).map(chat => ({
                        ...chat,
                        id: generateId(), // Always generate new IDs to avoid collisions
                        name: chat.name || `Imported ${new Date().toLocaleTimeString()}`
                    }));

                    if (newChats.length > 0) {
                        setChats(prev => [...newChats, ...prev]);
                        setCurrentChatId(newChats[0].id);
                        onImported?.();
                        alert(`Successfully imported ${newChats.length} chats.`);
                    } else {
                        alert('No valid chats found in file.');
                    }
                } else if (importedData.messages && Array.isArray(importedData.messages)) {
                    const newChat = {
                        ...importedData,
                        id: generateId(),
                        name: importedData.name || `Imported ${new Date().toLocaleTimeString()}`
                    };
                    setChats(prev => [newChat, ...prev]);
                    setCurrentChatId(newChat.id);
                    onImported?.();
                } else {
                    alert('Invalid chat file format.');
                }
            } catch (error) {
                console.error('Error importing chat:', error);
                alert('Error importing chat file.');
            }
        };
        reader.readAsText(file);
    };

    return {
        chats,
        currentChat,
        currentChatId,
        messages: currentChat ? currentChat.messages : [],
        selectChat: setCurrentChatId,
        updateChat,
        createNewChat,
        renameChat: (id, name) => updateChat(id, { name }),
        deleteChat,
        deleteAllChats,
        exportChat,
        exportAllChats,
        importChatFile,
    };
}
