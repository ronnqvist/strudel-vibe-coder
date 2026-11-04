// SPDX-License-Identifier: MIT
import React from 'react';
import StrudelFrame from './StrudelFrame';

/** Right-hand panel: the Strudel player (strudel.cc in an iframe). */
const PlayerPanel = ({ code }) => (
    <div className="w-full md:w-1/2 h-1/2 md:h-full bg-black flex flex-col">
        <StrudelFrame code={code} />
    </div>
);

export default PlayerPanel;
