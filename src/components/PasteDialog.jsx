// SPDX-License-Identifier: MIT
import React, { useId, useState } from 'react';
import { useDialog } from '../hooks/useDialog';

/**
 * A modal dialog with one large text box, used to bring text from the strudel.cc editor (which is
 * in a cross-origin iframe this app cannot read) into the app: edited code, or an error message.
 *
 * `onSubmit(text)` may return a message to show instead of closing (for example a syntax error).
 */
const PasteDialog = ({ title, explanation, label, submitLabel, onSubmit, onClose }) => {
    const { attach, onKeyDown } = useDialog({ onClose, trap: true });
    const titleId = useId();
    const fieldId = useId();
    const [text, setText] = useState('');
    const [problem, setProblem] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!text.trim() || busy) return;
        setBusy(true);
        const result = await onSubmit(text);
        setBusy(false);
        if (result) setProblem(result);
        else onClose();
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={attach}
                onKeyDown={onKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="bg-cyber-dark border border-cyber-neon p-6 rounded-lg w-full max-w-lg max-h-full overflow-y-auto"
            >
                <h2 id={titleId} className="text-xl font-bold mb-2 text-cyber-neon">{title}</h2>
                <p className="text-sm text-gray-300 mb-3">{explanation}</p>
                <label htmlFor={fieldId} className="block text-sm text-gray-400 mb-1">{label}</label>
                <textarea
                    id={fieldId}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setProblem(''); }}
                    spellCheck={false}
                    className="w-full h-48 bg-cyber-black text-white p-2 rounded border border-cyber-gray focus:border-cyber-neon font-mono text-sm"
                />
                {problem && <p role="alert" className="mt-2 text-sm text-red-400">{problem}</p>}
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-3 py-2 rounded bg-cyber-gray text-gray-200 hover:bg-cyber-gray/70">Cancel</button>
                    <button onClick={submit} disabled={!text.trim() || busy} className="px-3 py-2 rounded bg-cyber-neon text-black hover:bg-pink-400 disabled:opacity-50">
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasteDialog;
