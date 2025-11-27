import React from 'react';
import '@strudel/embed';

const sanitizeCode = (code) => {
    if (!code) return '';
    return code
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
        .replace(/[\u2013\u2014]/g, '-') // En-dash and Em-dash
        .replace(/[^\x00-\xFF]/g, '');   // Remove any other non-Latin1 characters
};

const StrudelPlayer = ({ code }) => {
    const safeCode = sanitizeCode(code);
    return (
        <div className="w-full h-full bg-cyber-black border-t border-cyber-gray relative">
            {/* @ts-ignore - Custom element */}
            <strudel-repl
                key={safeCode} // Force remount when code changes
                code={safeCode}
                style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
            ></strudel-repl>
        </div>
    );
};

export default StrudelPlayer;
