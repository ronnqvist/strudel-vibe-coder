// SPDX-License-Identifier: MIT
import React from 'react';
import StrudelFrame from './StrudelFrame';

/**
 * Right-hand panel: the Strudel player (strudel.cc in an iframe).
 * Shows the pattern selected in the chat being viewed (each chat has its own).
 * On narrow screens it is shown only on the "Stage" tab. It is hidden with CSS, never unmounted,
 * so music keeps playing while the chat is in front.
 */
const PlayerPanel = ({ code, visibleOnMobile, notice, onDismissNotice, canRestorePrevious, onRestorePrevious, hasMessagesWithCode, onUseLatestReply }) => (
    <div
        id="stage-panel"
        className={`${visibleOnMobile ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 md:flex-none w-full md:w-1/2 md:h-full bg-black flex-col`}
    >
        {notice && (
            <div role="alert" className="flex items-start gap-3 px-4 py-3 bg-yellow-900/30 border-b border-yellow-700/60 text-sm text-yellow-100">
                <p className="flex-1 min-w-0 break-words">{notice}</p>
                <button onClick={onDismissNotice} className="shrink-0 underline hover:text-white">Dismiss</button>
            </div>
        )}
        {canRestorePrevious && (
            <div className="flex justify-start gap-2 px-2 pt-1 shrink-0 bg-cyber-black">
                <button onClick={onRestorePrevious} className="px-3 py-1 rounded text-sm bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                    Restore previous
                </button>
            </div>
        )}
        {!code && hasMessagesWithCode && (
            <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 bg-cyber-black border-b border-cyber-gray shrink-0">
                <p className="flex-1">No pattern of this chat is in the player yet.</p>
                <button onClick={onUseLatestReply} className="px-3 py-1 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                    Use latest reply
                </button>
            </div>
        )}
        <div className="flex-1 min-h-0">
            <StrudelFrame code={code} />
        </div>
    </div>
);

export default PlayerPanel;
