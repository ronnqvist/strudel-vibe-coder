import React from 'react';
import '@strudel/embed';

const StrudelPlayer = ({ code }) => {
    return (
        <div className="w-full h-full bg-cyber-black border-t border-cyber-gray relative">
            {/* @ts-ignore - Custom element */}
            <strudel-repl
                key={code} // Force remount when code changes
                code={code}
                style={{ width: '100%', height: '100%', display: 'block' }}
            ></strudel-repl>
        </div>
    );
};

export default StrudelPlayer;
