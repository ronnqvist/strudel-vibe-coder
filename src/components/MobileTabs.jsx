// SPDX-License-Identifier: MIT
import React from 'react';

const tabClass = (active) => `flex-1 py-2 text-sm font-bold tracking-wider transition-colors ${active
    ? 'text-cyber-neon border-b-2 border-cyber-neon'
    : 'text-gray-400 border-b-2 border-transparent hover:text-cyber-cyan'}`;

/** "Chat | Stage" switch for narrow screens; both panels exist on wide screens, so it is hidden there. */
const MobileTabs = ({ tab, onChange, stageHasNews }) => (
    <div role="group" aria-label="Show" className="md:hidden flex bg-cyber-dark border-b border-cyber-gray">
        <button onClick={() => onChange('chat')} aria-pressed={tab === 'chat'} className={tabClass(tab === 'chat')}>
            Chat
        </button>
        <button onClick={() => onChange('stage')} aria-pressed={tab === 'stage'} className={tabClass(tab === 'stage')}>
            Stage
            {stageHasNews && (
                <>
                    <span aria-hidden="true" className="inline-block w-2 h-2 ml-2 rounded-full bg-cyber-neon align-middle" />
                    <span className="sr-only"> (new pattern)</span>
                </>
            )}
        </button>
    </div>
);

export default MobileTabs;
