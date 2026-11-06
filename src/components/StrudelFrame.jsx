// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { MAX_URL_LENGTH, shortHash, strudelUrl } from '../lib/strudelUrl';

/**
 * Shows the strudel.cc REPL in an iframe, preloaded with `code`.
 *
 * - No `allow` attribute: audio starts after a click inside the frame without one
 *   (verified in Chromium). Nothing else (microphone, MIDI, ...) is delegated.
 * - `referrerPolicy="no-referrer"`: strudel.cc does not need to know which page embeds it.
 * - `loading="eager"`: the player is the main panel and is visible immediately.
 * - The iframe is keyed by a short hash of the code, so new code remounts the REPL.
 * - Edits made inside the iframe stay there: the app cannot read a cross-origin frame, and does
 *   not try to. The player panel offers "Use edited code" to paste them back.
 * - Keyboard: the iframe is left out of the Tab order, because the strudel.cc editor keeps the
 *   Tab key once it has focus. Above it, an always-visible "Open in Strudel" link opens the same
 *   pattern on strudel.cc in a new tab. A parent page cannot move focus into the cross-origin
 *   editor or press the embedded REPL's play overlay, so the link is the way in for keyboard
 *   and mouse users alike. The iframe stays on the page.
 * - A new player is started (the iframe is recreated, which stops the music) when the code
 *   changes, and when `playerId` changes: the app passes the chat id, so switching to another chat
 *   always starts its own player, even when both chats have the same pattern.
 */
const StrudelFrame = ({ code, playerId = '', actions = null }) => {
    const src = strudelUrl(code);
    const [copied, setCopied] = useState(false);

    if (src.length > MAX_URL_LENGTH) {
        const copy = async () => {
            try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
            } catch {
                setCopied(false);
            }
        };
        return (
            <div role="alert" className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-gray-300 bg-cyber-black">
                <p className="text-cyber-neon font-bold">This pattern is too large to open in the player.</p>
                <p className="text-sm">
                    Browsers cannot load a URL of {src.length.toLocaleString()} characters
                    (the limit here is {MAX_URL_LENGTH.toLocaleString()}). Copy the code and paste it into strudel.cc instead.
                </p>
                <div className="flex gap-2">
                    <button onClick={copy} className="px-3 py-2 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                        {copied ? 'Copied' : 'Copy code'}
                    </button>
                    <a href="https://strudel.cc/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black">
                        Open strudel.cc
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-0 flex flex-col bg-cyber-black border-t border-cyber-gray">
            <div className="flex flex-wrap items-center justify-end gap-2 px-2 py-1 shrink-0">
                {actions}
                <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded text-sm bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black"
                >
                    Open in Strudel<span className="sr-only"> (opens in a new tab)</span>
                </a>
            </div>
            <iframe
                key={`${playerId}:${shortHash(src)}`}
                tabIndex={-1}
                src={src}
                title="Strudel live-coding REPL (strudel.cc)"
                loading="eager"
                referrerPolicy="no-referrer"
                className="block w-full flex-1 min-h-0 border-0"
            />
        </div>
    );
};

export default StrudelFrame;
