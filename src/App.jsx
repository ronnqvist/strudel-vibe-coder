import React, { useState, useEffect, useRef } from 'react';
import StrudelPlayer from './components/StrudelPlayer';
import { generateStrudelCode, defaultModels } from './lib/openrouter';
import { Send, Settings, Play, StopCircle, Music, Terminal, Plus, Trash2, Import, MessageSquare, Download, Upload, X, Edit2, Check, Save } from 'lucide-react';
import { extractCode, generateId, formatDate } from './lib/utils';

function App() {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_api_key') || '');

    // Model Management State
    const [savedModels, setSavedModels] = useState(() => {
        const saved = localStorage.getItem('openrouter_saved_models');
        return saved ? JSON.parse(saved) : [
            { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
            { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro" },
            { id: "openai/gpt-5.1", name: "GPT 5.1" },
        ];
    });
    const [model, setModel] = useState(localStorage.getItem('openrouter_model') || "anthropic/claude-opus-4.5");

    // New Model Input State
    // newModelId is now synonymous with 'model' (active model)
    const [newModelName, setNewModelName] = useState('');
    const [editingChatId, setEditingChatId] = useState(null);
    const [editChatName, setEditChatName] = useState('');
    const [editingMessage, setEditingMessage] = useState({ index: null, content: '' });

    const [chats, setChats] = useState(() => {
        const saved = localStorage.getItem('openrouter_chats');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentChatId, setCurrentChatId] = useState(localStorage.getItem('openrouter_current_chat_id') || null);

    // Derived state for current chat messages
    const currentChat = chats.find(c => c.id === currentChatId);
    const chatHistory = currentChat ? currentChat.messages : [];

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentCode, setCurrentCode] = useState(localStorage.getItem('openrouter_current_code') || '');
    const [showSettings, setShowSettings] = useState(false);
    const [showChats, setShowChats] = useState(false);

    const chatContainerRef = useRef(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        localStorage.setItem('openrouter_api_key', apiKey);
    }, [apiKey]);

    useEffect(() => {
        localStorage.setItem('openrouter_model', model);
    }, [model]);

    useEffect(() => {
        localStorage.setItem('openrouter_saved_models', JSON.stringify(savedModels));
    }, [savedModels]);

    useEffect(() => {
        localStorage.setItem('openrouter_chats', JSON.stringify(chats));
    }, [chats]);

    useEffect(() => {
        localStorage.setItem('openrouter_current_chat_id', currentChatId);
    }, [currentChatId]);

    useEffect(() => {
        localStorage.setItem('openrouter_current_code', currentCode);
    }, [currentCode]);

    // Initialize a chat if none exists
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (chats.length === 0) {
            createNewChat();
        } else if (!currentChatId) {
            setCurrentChatId(chats[0].id);
        }
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const createNewChat = () => {
        const newChat = {
            id: generateId(),
            name: `New Chat`,
            messages: [],
            createdAt: new Date().toISOString()
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setShowChats(false);
    };

    const updateChatName = (id, newName) => {
        setChats(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
        setEditingChatId(null);
    };

    const deleteChat = (id, e) => {
        e.stopPropagation();
        const newChats = chats.filter(c => c.id !== id);
        setChats(newChats);
        if (currentChatId === id) {
            setCurrentChatId(newChats.length > 0 ? newChats[0].id : null);
        }
        if (newChats.length === 0) {
            // If we deleted the last chat, create a new one immediately or handle empty state
            // For simplicity, let's allow empty state but the effect above will likely create one
        }
    };

    const deleteAllChats = () => {
        if (window.confirm("Are you sure you want to delete all chats?")) {
            setChats([]);
            setCurrentChatId(null);
            // Effect will trigger creation of new chat
        }
    };

    const handleExportChat = (chatToExport) => {
        const chat = chatToExport || currentChat;
        if (!chat) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chat));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `strudel-chat-${chat.name}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleExportAllChats = () => {
        if (chats.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chats));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `strudel-chats-backup-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportChat = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (Array.isArray(importedData)) {
                    // Handle multiple chats import (Export All format)
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
                        setShowChats(false);
                        alert(`Successfully imported ${newChats.length} chats.`);
                    } else {
                        alert("No valid chats found in file.");
                    }
                } else if (importedData.messages && Array.isArray(importedData.messages)) {
                    // Handle single chat import
                    const newChat = {
                        ...importedData,
                        id: generateId(),
                        name: importedData.name || `Imported ${new Date().toLocaleTimeString()}`
                    };
                    setChats(prev => [newChat, ...prev]);
                    setCurrentChatId(newChat.id);
                    setShowChats(false);
                } else {
                    alert("Invalid chat file format.");
                }
            } catch (error) {
                console.error("Error importing chat:", error);
                alert("Error importing chat file.");
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const updateCurrentChatMessages = (newMessages) => {
        setChats(prev => prev.map(c =>
            c.id === currentChatId
                ? { ...c, messages: newMessages }
                : c
        ));
    };

    const saveMessageEdit = () => {
        if (editingMessage.index === null) return;

        const updatedMessages = [...chatHistory];
        updatedMessages[editingMessage.index] = {
            ...updatedMessages[editingMessage.index],
            content: editingMessage.content
        };

        updateCurrentChatMessages(updatedMessages);
        setEditingMessage({ index: null, content: '' });
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            alert("Please enter your OpenRouter API Key in settings.");
            setShowSettings(true);
            return;
        }

        if (!currentChatId) {
            createNewChat();
        }

        const userMsg = { role: 'user', content: input };
        // Optimistic update
        const updatedMessages = [...chatHistory, userMsg];
        updateCurrentChatMessages(updatedMessages);

        setInput('');
        setIsLoading(true);

        try {
            // Filter chat history to only send role and content to the API
            const apiChatHistory = updatedMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Attach model name to the response message
            const modelName = savedModels.find(m => m.id === model)?.name || model;
            const response = await generateStrudelCode(apiKey, model, apiChatHistory, input, modelName);

            const responseWithModel = { ...response, model: modelName };

            // Update chat name if it's the first message and name is default
            let newName = currentChat.name;
            if (chatHistory.length === 0 && (currentChat.name === 'New Chat' || currentChat.name.startsWith('Chat '))) {
                newName = input.slice(0, 30) + (input.length > 30 ? '...' : '');
            }

            setChats(prev => prev.map(c =>
                c.id === currentChatId
                    ? { ...c, messages: [...updatedMessages, responseWithModel], name: newName }
                    : c
            ));

            // Only update the player if code was extracted
            if (response.code) {
                setCurrentCode(response.code);
            }
        } catch (error) {
            updateCurrentChatMessages([...updatedMessages, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-cyber-black text-white font-mono overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-cyber-dark border-b border-cyber-gray z-10">
                <div className="flex items-center gap-2">
                    <Music className="text-cyber-neon w-6 h-6" />
                    <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyber-neon to-cyber-cyan">
                        STRUDEL VIBE CODER
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowChats(!showChats)}
                        className={`p-2 rounded-full transition-colors ${showChats ? 'bg-cyber-neon text-black' : 'hover:bg-cyber-gray text-cyber-cyan'}`}
                        title="Chats"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-cyber-neon text-black' : 'hover:bg-cyber-gray text-cyber-cyan'}`}
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content - Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Chats Overlay */}
                {showChats && (
                    <div className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-cyber-black/95 backdrop-blur-md z-40 flex flex-col border-r border-cyber-neon/30">
                        <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
                            <h2 className="text-xl font-bold text-cyber-neon">Chats</h2>
                            <div className="flex gap-2">
                                <button onClick={createNewChat} className="p-2 hover:bg-cyber-gray rounded text-cyber-neon transition-colors" title="New Chat">
                                    <Plus className="w-5 h-5" />
                                </button>
                                <label className="cursor-pointer p-2 hover:bg-cyber-gray rounded text-cyber-cyan transition-colors" title="Import Chat">
                                    <Upload className="w-5 h-5" />
                                    <input type="file" accept=".json" onChange={handleImportChat} className="hidden" />
                                </label>
                                <button onClick={handleExportAllChats} className="p-2 hover:bg-cyber-gray rounded text-cyber-cyan transition-colors" title="Export All Chats">
                                    <Download className="w-5 h-5" />
                                </button>
                                <button onClick={deleteAllChats} className="p-2 hover:bg-red-900/50 rounded text-red-500 transition-colors" title="Delete All Chats">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowChats(false)} className="p-2 hover:bg-cyber-gray rounded text-gray-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        setCurrentChatId(chat.id);
                                        setShowChats(false);
                                    }}
                                    className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${currentChatId === chat.id
                                        ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                                        : 'bg-cyber-dark border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate">{chat.name}</div>
                                        <div className="text-xs opacity-60 flex gap-2">
                                            <span>{chat.messages.length} msgs</span>
                                            <span>•</span>
                                            <span>{formatDate(chat.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingChatId(chat.id);
                                                setEditChatName(chat.name);
                                            }}
                                            className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                            title="Rename Chat"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleExportChat(chat);
                                            }}
                                            className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                            title="Export Chat"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => deleteChat(chat.id, e)}
                                            className="p-2 hover:text-red-500 text-gray-500 transition-colors"
                                            title="Delete Chat"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {/* Edit Chat Name Modal/Input Overlay could be better, but inline is fine too. 
                                Actually, let's do inline replacement for the chat item if editing.
                            */}
                        </div>
                    </div>
                )}

                {/* Re-render chat list to handle inline editing properly */}
                {showChats && editingChatId && (
                    <div className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-cyber-black/95 backdrop-blur-md z-40 flex flex-col border-r border-cyber-neon/30">
                        <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
                            <h2 className="text-xl font-bold text-cyber-neon">Chats</h2>
                            <button onClick={() => { setShowChats(false); setEditingChatId(null); }} className="p-2 hover:bg-cyber-gray rounded text-gray-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {chats.map(chat => (
                                chat.id === editingChatId ? (
                                    <div key={chat.id} className="flex items-center gap-2 p-3 rounded-lg border border-cyber-neon bg-cyber-neon/10">
                                        <input
                                            autoFocus
                                            value={editChatName}
                                            onChange={(e) => setEditChatName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') updateChatName(chat.id, editChatName);
                                                if (e.key === 'Escape') setEditingChatId(null);
                                            }}
                                            className="flex-1 bg-transparent border-none focus:outline-none text-white font-bold"
                                        />
                                        <button onClick={() => updateChatName(chat.id, editChatName)} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingChatId(null)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div
                                        key={chat.id}
                                        onClick={() => {
                                            setCurrentChatId(chat.id);
                                            setShowChats(false);
                                        }}
                                        className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${currentChatId === chat.id
                                            ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                                            : 'bg-cyber-dark border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold truncate">{chat.name}</div>
                                            <div className="text-xs opacity-60 flex gap-2">
                                                <span>{chat.messages.length} msgs</span>
                                                <span>•</span>
                                                <span>{formatDate(chat.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingChatId(chat.id);
                                                    setEditChatName(chat.name);
                                                }}
                                                className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                                title="Rename Chat"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportChat(chat);
                                                }}
                                                className="p-2 hover:text-cyber-neon text-gray-500 transition-colors"
                                                title="Export Chat"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => deleteChat(chat.id, e)}
                                                className="p-2 hover:text-red-500 text-gray-500 transition-colors"
                                                title="Delete Chat"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-md shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                            <h2 className="text-xl font-bold mb-4 text-cyber-neon">Configuration</h2>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm text-gray-400">OpenRouter API Key</label>
                                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-cyber-neon hover:underline">
                                        Get Key
                                    </a>
                                </div>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan focus:outline-none text-white"
                                    placeholder="sk-or-..."
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-2">Model Bookmarks</label>

                                {/* Model List */}
                                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                                    {savedModels.map(m => (
                                        <div
                                            key={m.id}
                                            className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${model === m.id
                                                ? 'bg-cyber-neon/10 border-cyber-neon text-cyber-neon'
                                                : 'bg-cyber-black border-cyber-gray text-gray-300 hover:border-cyber-cyan'
                                                }`}
                                            onClick={() => {
                                                setModel(m.id);
                                                setNewModelName(m.name);
                                            }}
                                        >
                                            <span className="text-sm truncate flex-1">{m.name || m.id}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSavedModels(prev => prev.filter(sm => sm.id !== m.id));
                                                    if (model === m.id && savedModels.length > 1) {
                                                        setModel(savedModels.find(sm => sm.id !== m.id)?.id || '');
                                                    }
                                                }}
                                                className="p-1 hover:text-red-500 text-gray-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add New Model */}
                                <div className="bg-cyber-black p-3 rounded border border-cyber-gray">
                                    <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider flex justify-between items-center">
                                        <span>Model</span>
                                        <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-cyber-neon hover:underline normal-case">
                                            Find Models
                                        </a>
                                    </div>
                                    <input
                                        type="text"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full bg-cyber-dark border border-cyber-gray p-2 rounded text-xs text-white mb-2 focus:border-cyber-neon focus:outline-none"
                                        placeholder="Model ID (e.g. openai/gpt-4o)"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newModelName}
                                            onChange={(e) => setNewModelName(e.target.value)}
                                            className="flex-1 bg-cyber-dark border border-cyber-gray p-2 rounded text-xs text-white focus:border-cyber-neon focus:outline-none"
                                            placeholder="Display Name"
                                        />
                                        <button
                                            onClick={() => {
                                                if (model && newModelName) {
                                                    setSavedModels(prev => {
                                                        // Update if exists, otherwise add
                                                        const existing = prev.find(m => m.id === model);
                                                        if (existing) {
                                                            return prev.map(m => m.id === model ? { ...m, name: newModelName } : m);
                                                        }
                                                        return [...prev, { id: model, name: newModelName }];
                                                    });
                                                    setNewModelName('');
                                                }
                                            }}
                                            disabled={!model || !newModelName}
                                            className="bg-cyber-gray hover:bg-cyber-neon hover:text-black text-cyber-cyan p-2 rounded transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full bg-cyber-neon text-black font-bold py-2 rounded hover:bg-pink-400 transition-colors"
                            >
                                Save & Close
                            </button>

                            <div className="mt-4 text-center border-t border-cyber-gray pt-4 flex flex-col gap-2">
                                <a
                                    href="https://github.com/ronnqvist/strudel-vibe-coder"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-cyber-neon transition-colors"
                                >
                                    View Source Code (GitHub)
                                </a>
                                <a
                                    href="/LICENSE"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-cyber-neon transition-colors"
                                >
                                    License (AGPL v3)
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {/* Chat Section */}
                <div className="w-full md:w-1/2 flex flex-col border-r border-cyber-gray bg-cyber-dark/50">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                        {chatHistory.length === 0 && (
                            <div className="text-center text-gray-500 mt-10">
                                <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Initialize vibe session...</p>
                                <p className="text-sm">Type a music description to start.</p>
                            </div>
                        )}
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${editingMessage.index === idx ? 'w-full' : (msg.role === 'user' ? 'justify-end' : 'justify-start')}`}>
                                <div className={`${editingMessage.index === idx ? 'w-full' : 'max-w-[80%]'} p-3 rounded-lg ${msg.role === 'user'
                                    ? 'bg-cyber-gray text-white border border-cyber-gray'
                                    : 'bg-cyber-black text-cyber-cyan border border-cyber-cyan/30'
                                    }`}>
                                    {editingMessage.index === idx ? (
                                        <div className="w-full">
                                            <textarea
                                                value={editingMessage.content}
                                                onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                                className="w-full bg-cyber-black/50 text-white p-2 rounded border border-cyber-neon/50 focus:outline-none font-mono text-sm h-32"
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => setEditingMessage({ index: null, content: '' })} className="p-1 text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                                                <button onClick={saveMessageEdit} className="p-1 text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.role === 'assistant' ? (
                                                <div className="font-mono text-xs opacity-80">
                                                    <div className="flex items-center justify-between mb-2 border-b border-cyber-gray/50 pb-2">
                                                        <div className="flex items-center gap-2 text-cyber-neon">
                                                            <Terminal className="w-3 h-3" />
                                                            <span className="font-bold">Generated Code</span>
                                                            {msg.model && <span className="text-[10px] text-gray-500 ml-2 border border-gray-700 px-1 rounded">{msg.model}</span>}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => setEditingMessage({ index: idx, content: msg.content })}
                                                                className="p-1 hover:text-cyber-neon text-gray-500 transition-colors"
                                                                title="Edit Message"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const code = extractCode(msg.content);
                                                                    if (code) setCurrentCode(code);
                                                                }}
                                                                className="flex items-center gap-1 bg-cyber-gray hover:bg-cyber-neon/20 text-cyber-cyan text-xs px-2 py-1 rounded transition-colors border border-cyber-cyan/30"
                                                                title="Run in Player"
                                                            >
                                                                <Import className="w-3 h-3" />
                                                                Import
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <pre className="whitespace-pre-wrap break-words text-sm">{msg.content}</pre>
                                                </div>
                                            ) : (
                                                <div className="relative group">
                                                    <div className="pr-6">{msg.content}</div>
                                                    <button
                                                        onClick={() => setEditingMessage({ index: idx, content: msg.content })}
                                                        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 hover:text-cyber-neon text-gray-500 transition-all"
                                                        title="Edit Message"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-cyber-black p-3 rounded-lg border border-cyber-neon/30 animate-pulse text-cyber-neon">
                                    Generating vibe...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-cyber-black border-t border-cyber-gray">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={chatHistory.length > 0 ? "Suggest changes or paste in any error messages" : "Describe the sound (e.g. 'acid techno bass')"}
                                className="flex-1 bg-cyber-dark border border-cyber-gray p-3 rounded-lg focus:border-cyber-neon focus:outline-none text-white placeholder-gray-600"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading}
                                className="bg-cyber-neon text-black p-3 rounded-lg hover:bg-pink-400 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Strudel Embed Section */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full bg-black flex flex-col">
                    <StrudelPlayer code={currentCode} />
                </div>

            </div>
        </div >
    );
}

export default App;
