import React, { useState, useEffect, useRef } from 'react';
import StrudelPlayer from './components/StrudelPlayer';
import { generateStrudelCode, defaultModels } from './lib/openrouter';
import { Send, Settings, Play, StopCircle, Music, Terminal, Plus, Trash2, Import, MessageSquare, Download, Upload, X } from 'lucide-react';
import { extractCode, generateId, formatDate } from './lib/utils';

function App() {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_api_key') || '');

    // Model Management State
    const [savedModels, setSavedModels] = useState(() => {
        const saved = localStorage.getItem('openrouter_saved_models');
        return saved ? JSON.parse(saved) : [
            { id: "moonshotai/kimi-k2:free", name: "Kimi K2 (Free)" },
        ];
    });
    const [model, setModel] = useState(localStorage.getItem('openrouter_model') || "moonshotai/kimi-k2:free");

    // New Model Input State
    const [newModelId, setNewModelId] = useState('');
    const [newModelName, setNewModelName] = useState('');

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
    const [currentCode, setCurrentCode] = useState('note("c3 eb3 g3 bb3").s("sawtooth").lpf(1000).lpq(2)');
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
            name: `Chat ${new Date().toLocaleTimeString()}`,
            messages: [],
            createdAt: new Date().toISOString()
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setShowChats(false);
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

            const response = await generateStrudelCode(apiKey, model, apiChatHistory, input);

            updateCurrentChatMessages([...updatedMessages, response]);

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
                            <button
                                onClick={createNewChat}
                                className="w-full py-3 border-2 border-dashed border-cyber-gray hover:border-cyber-neon text-gray-400 hover:text-cyber-neon rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
                            >
                                <Plus className="w-5 h-5" />
                                <span>New Chat</span>
                            </button>

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
                                            onClick={() => setModel(m.id)}
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
                                        <span>Add New Model</span>
                                        <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-cyber-neon hover:underline normal-case">
                                            Find Models
                                        </a>
                                    </div>
                                    <input
                                        type="text"
                                        value={newModelId}
                                        onChange={(e) => setNewModelId(e.target.value)}
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
                                                if (newModelId && newModelName) {
                                                    setSavedModels(prev => [...prev, { id: newModelId, name: newModelName }]);
                                                    setNewModelId('');
                                                    setNewModelName('');
                                                }
                                            }}
                                            disabled={!newModelId || !newModelName}
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
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                    ? 'bg-cyber-gray text-white border border-cyber-gray'
                                    : 'bg-cyber-black text-cyber-cyan border border-cyber-cyan/30'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="font-mono text-xs opacity-80">
                                            {/* Truncate code for display if too long, or just show a "Code Generated" badge? 
                          Let's show the code but maybe styled simply. */}
                                            <div className="flex items-center justify-between mb-2 border-b border-cyber-gray/50 pb-2">
                                                <div className="flex items-center gap-2 text-cyber-neon">
                                                    <Terminal className="w-3 h-3" />
                                                    <span className="font-bold">Generated Code</span>
                                                </div>
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
                                            <pre className="whitespace-pre-wrap break-words text-sm">{msg.content}</pre>
                                        </div>
                                    ) : (
                                        msg.content
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
                                placeholder="Describe the sound (e.g. 'acid techno bass')"
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
