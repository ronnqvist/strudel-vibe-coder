// SPDX-License-Identifier: MIT
import React, { useRef, useState } from 'react';
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
 *   Tab key once it has focus. An "Enter player" button (visible when focused) moves focus into it.
 */
const StrudelFrame = ({ code }) => {
    const src = strudelUrl(code);
    const [copied, setCopied] = useState(false);
    const frameRef = useRef(null);

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
        <div className="w-full h-full bg-cyber-black border-t border-cyber-gray relative">
            <button
                onClick={() => frameRef.current?.focus()}
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:px-3 focus:py-2 focus:rounded focus:bg-cyber-neon focus:text-black focus:font-bold"
            >
                Enter player
            </button>
            <iframe
                ref={frameRef}
                key={shortHash(src)}
                tabIndex={-1}
                src={src}
                title="Strudel live-coding REPL (strudel.cc)"
                loading="eager"
                referrerPolicy="no-referrer"
                className="block w-full h-full border-0"
            />
        </div>
    );
};

export default StrudelFrame;
