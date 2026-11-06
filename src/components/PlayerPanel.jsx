// SPDX-License-Identifier: MIT
import React from 'react';
import StrudelFrame from './StrudelFrame';

/**
 * Right-hand panel: the Strudel player (strudel.cc in an iframe).
 * Shows the pattern selected in the chat being viewed (each chat has its own).
 * On narrow screens it is shown only on the "Stage" tab. It is hidden with CSS, never unmounted,
 * so music keeps playing while the chat is in front.
 */
const toolButton = 'px-3 py-1 rounded text-sm bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black';

const PlayerPanel = ({ code, visibleOnMobile, notice, onDismissNotice, canRestorePrevious, onRestorePrevious, hasMessagesWithCode, onUseLatestReply, onUseEditedCode, onFixError, canFixError }) => (
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
        {!code && hasMessagesWithCode && (
            <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 bg-cyber-black border-b border-cyber-gray shrink-0">
                <p className="flex-1">No pattern of this chat is in the player yet.</p>
                <button onClick={onUseLatestReply} className="px-3 py-1 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                    Use latest reply
                </button>
            </div>
        )}
        <p className="px-3 pt-1 text-xs text-gray-400 bg-cyber-black shrink-0">
            Changes you make in the player stay in the player. To continue from them here, use “Use edited code”.
        </p>
        <div className="flex-1 min-h-0">
            <StrudelFrame
                code={code}
                actions={(
                    <>
                        {canRestorePrevious && <button onClick={onRestorePrevious} className={toolButton}>Restore previous</button>}
                        <button onClick={onUseEditedCode} className={toolButton} title="Edits made in the player are not sent back to this app. Paste them here to keep them.">Use edited code</button>
                        {canFixError && <button onClick={onFixError} className={toolButton} title="Paste an error shown by the player and ask the model to fix the pattern">Fix an error</button>}
                    </>
                )}
            />
        </div>
    </div>
);

export default PlayerPanel;
