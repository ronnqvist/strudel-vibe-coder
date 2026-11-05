// SPDX-License-Identifier: MIT
import React, { useId, useRef, useState } from 'react';
import { MAX_CUSTOM_INSTRUCTIONS } from '../lib/prompt';
import { downloadText } from '../lib/download';

/**
 * Advanced, collapsed: the user's own music instructions, added at the end of the system prompt.
 * They add to the app's instructions; the syntax check and the provider's limits still apply.
 */
const CustomInstructions = ({ value, onChange }) => {
    const fieldId = useId();
    const fileInput = useRef(null);
    const [problem, setProblem] = useState('');
    const button = 'px-2 py-1 rounded text-xs bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black disabled:opacity-40';

    const importFile = async (file) => {
        if (!file) return;
        if (file.size > 64 * 1024) {
            setProblem('This file is too large for music instructions.');
            return;
        }
        const text = (await file.text()).slice(0, MAX_CUSTOM_INSTRUCTIONS);
        setProblem('');
        onChange(text);
    };

    return (
        <details className="mt-3">
            <summary className="cursor-pointer text-sm text-gray-400">Advanced: your own music instructions</summary>
            <p className="mt-2 text-xs text-gray-400">
                Added after the app's instructions, for example "prefer minor keys and slow tempos". They cannot turn off the
                syntax check or the provider's limits. Up to {MAX_CUSTOM_INSTRUCTIONS.toLocaleString()} characters.
            </p>
            <label htmlFor={fieldId} className="sr-only">Your own music instructions</label>
            <textarea
                id={fieldId}
                value={value}
                maxLength={MAX_CUSTOM_INSTRUCTIONS}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 w-full h-24 bg-cyber-black text-white p-2 rounded border border-cyber-gray focus:border-cyber-cyan text-sm"
            />
            <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 mr-auto">{value.length} / {MAX_CUSTOM_INSTRUCTIONS}</span>
                <button onClick={() => onChange('')} disabled={!value} className={button}>Reset</button>
                <button onClick={() => downloadText('strudel-music-instructions.txt', value, 'text/plain')} disabled={!value} className={button}>Export</button>
                <button onClick={() => fileInput.current?.click()} className={button}>Import</button>
                <input
                    ref={fileInput}
                    type="file"
                    accept=".txt,text/plain"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="hidden"
                    onChange={(e) => { importFile(e.target.files[0]); e.target.value = ''; }}
                />
            </div>
            {problem && <p role="alert" className="mt-1 text-xs text-red-400">{problem}</p>}
        </details>
    );
};

export default CustomInstructions;
