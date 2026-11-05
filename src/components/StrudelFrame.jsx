// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { MAX_URL_LENGTH, normalizeTypography, shortHash, strudelUrl } from '../lib/strudelUrl';

/**
 * Shows the strudel.cc REPL in an iframe, preloaded with `code`.
 *
 * - No `allow` attribute: audio starts after a click inside the frame without one
 *   (verified in Chromium). Nothing else (microphone, MIDI, ...) is delegated.
 * - `referrerPolicy="no-referrer"`: strudel.cc does not need to know which page embeds it.
 * - `loading="eager"`: the player is the main panel and is visible immediately.
 * - The iframe is keyed by a short hash of the code, so new code remounts the REPL.
 * - Keyboard: the iframe is left out of the Tab order, because the strudel.cc editor keeps the
 *   Tab key once it has focus. Above it, an always-visible "Enter player" link opens the same
 *   pattern on strudel.cc in a new tab. A parent page cannot move focus into the cross-origin
 *   editor or press the embedded REPL's play overlay, so the link is the way in for keyboard
 *   and mouse users alike. The iframe stays on the page.
 */
const StrudelFrame = ({ code }) => {
    const src = strudelUrl(code);
    const [copied, setCopied] = useState(false);

    if (src.length > MAX_URL_LENGTH) {
        const copy = async () => {
            try {
                await navigator.clipboard.writeText(normalizeTypography(code));
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
            <div className="flex justify-end px-2 py-1 shrink-0">
                <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded text-sm bg-cyber-gray text-cyber-cyan hover:bg-cyber-neon hover:text-black"
                >
                    Enter player<span className="sr-only"> (opens in a new tab)</span>
                </a>
            </div>
            <iframe
                key={shortHash(src)}
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
