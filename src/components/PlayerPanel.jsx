// SPDX-License-Identifier: MIT
import React from 'react';
import StrudelFrame from './StrudelFrame';

/**
 * Right-hand panel: the Strudel player (strudel.cc in an iframe).
 * On narrow screens it is shown only on the "Stage" tab. It is hidden with CSS, never unmounted,
 * so music keeps playing while the chat is in front.
 */
const PlayerPanel = ({ code, visibleOnMobile }) => (
    <div
        id="stage-panel"
        className={`${visibleOnMobile ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 md:flex-none w-full md:w-1/2 md:h-full bg-black flex-col`}
    >
        <StrudelFrame code={code} />
    </div>
);

export default PlayerPanel;
