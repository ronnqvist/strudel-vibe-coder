import React, { useState, useEffect, useRef } from 'react';
import StrudelPlayer from './components/StrudelPlayer';
import { generateStrudelCode, defaultModels } from './lib/openrouter';
import { Send, Settings, Play, StopCircle, Music, Terminal } from 'lucide-react';

function App() {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_api_key') || '');
    const [model, setModel] = useState(localStorage.getItem('openrouter_model') || defaultModels[0].id);
    const [customModel, setCustomModel] = useState(localStorage.getItem('openrouter_custom_model') || '');
    const [chatHistory, setChatHistory] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentCode, setCurrentCode] = useState('note("c3 eb3 g3 bb3").s("sawtooth").lpf(1000).lpq(2)');
    const [showSettings, setShowSettings] = useState(false);

    const chatContainerRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('openrouter_api_key', apiKey);
    }, [apiKey]);

    useEffect(() => {
        localStorage.setItem('openrouter_model', model);
    }, [model]);

    useEffect(() => {
        localStorage.setItem('openrouter_custom_model', customModel);
    }, [customModel]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            alert("Please enter your OpenRouter API Key in settings.");
            setShowSettings(true);
            return;
        }

        const userMsg = { role: 'user', content: input };
        setChatHistory(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const selectedModel = customModel.trim() || model;
            const response = await generateStrudelCode(apiKey, selectedModel, chatHistory, input);

            setChatHistory(prev => [...prev, response]);
            setCurrentCode(response.content);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
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
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-cyber-gray rounded-full transition-colors"
                >
                    <Settings className="w-5 h-5 text-cyber-cyan" />
                </button>
            </header>

            {/* Main Content - Split View */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Settings Overlay */}
                {showSettings && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-md shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                            <h2 className="text-xl font-bold mb-4 text-cyber-neon">Configuration</h2>

                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">OpenRouter API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan focus:outline-none text-white"
                                    placeholder="sk-or-..."
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">Model</label>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan focus:outline-none text-white mb-2"
                                >
                                    {defaultModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={customModel}
                                    onChange={(e) => setCustomModel(e.target.value)}
                                    className="w-full bg-cyber-black border border-cyber-gray p-2 rounded focus:border-cyber-cyan focus:outline-none text-white"
                                    placeholder="Or enter custom model ID..."
                                />
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
                                                    onClick={() => setCurrentCode(msg.content)}
                                                    className="flex items-center gap-1 bg-cyber-gray hover:bg-cyber-neon/20 text-cyber-cyan text-xs px-2 py-1 rounded transition-colors border border-cyber-cyan/30"
                                                    title="Run in Player"
                                                >
                                                    <Play className="w-3 h-3" />
                                                    Run
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
                <div className="w-full md:w-1/2 h-[50vh] md:h-full bg-black">
                    <StrudelPlayer code={currentCode} />
                </div>

            </div>
        </div>
    );
}

export default App;
