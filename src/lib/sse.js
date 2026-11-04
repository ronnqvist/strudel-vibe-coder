// SPDX-License-Identifier: MIT

/**
 * Parse a Server-Sent Events stream and yield the `data` payload of each event.
 *
 * Handles events split across network chunks (including a multi-byte character or a
 * CRLF pair cut in half), `\n`, `\r\n` and `\r` line endings, multi-line `data:` fields,
 * and comment lines (`: OPENROUTER PROCESSING` keep-alives). Other fields are ignored.
 * The `[DONE]` sentinel is yielded like any other payload; the caller decides what it means.
 *
 * @param {ReadableStream<Uint8Array>} body
 * @returns {AsyncGenerator<string>}
 */
export async function* readSSE(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const events = function* (text) {
        for (const raw of text.split('\n\n')) {
            const data = [];
            for (const line of raw.split('\n')) {
                if (line === '' || line.startsWith(':')) continue;
                const colon = line.indexOf(':');
                const field = colon === -1 ? line : line.slice(0, colon);
                if (field !== 'data') continue;
                const value = colon === -1 ? '' : line.slice(colon + 1);
                data.push(value.startsWith(' ') ? value.slice(1) : value);
            }
            if (data.length > 0) yield data.join('\n');
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // A trailing "\r" may be the first half of "\r\n": wait for the next chunk.
            const pending = buffer.endsWith('\r') ? '\r' : '';
            const complete = pending ? buffer.slice(0, -1) : buffer;
            const normalised = complete.replace(/\r\n?/g, '\n');

            const lastBoundary = normalised.lastIndexOf('\n\n');
            if (lastBoundary === -1) {
                buffer = normalised + pending;
                continue;
            }
            yield* events(normalised.slice(0, lastBoundary));
            buffer = normalised.slice(lastBoundary + 2) + pending;
        }
        buffer += decoder.decode();
        const rest = buffer.replace(/\r\n?/g, '\n');
        if (rest.trim() !== '') yield* events(rest);
    } finally {
        reader.releaseLock();
    }
}
