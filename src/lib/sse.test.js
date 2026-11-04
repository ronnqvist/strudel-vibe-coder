// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { readSSE } from './sse';

/** A ReadableStream that delivers the given byte chunks one by one. */
function streamOf(chunks) {
    const enc = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const c of chunks) controller.enqueue(typeof c === 'string' ? enc.encode(c) : c);
            controller.close();
        },
    });
}

async function collect(chunks) {
    const out = [];
    for await (const data of readSSE(streamOf(chunks))) out.push(data);
    return out;
}

describe('readSSE', () => {
    it('yields the data of each event', async () => {
        expect(await collect(['data: one\n\ndata: two\n\n'])).toEqual(['one', 'two']);
    });

    it('joins events that are split across chunks at any position', async () => {
        const text = 'data: {"a":1}\n\ndata: {"b":2}\n\ndata: [DONE]\n\n';
        for (let cut = 1; cut < text.length; cut++) {
            expect(await collect([text.slice(0, cut), text.slice(cut)])).toEqual(['{"a":1}', '{"b":2}', '[DONE]']);
        }
    });

    it('supports CRLF line endings, even when the CRLF pair is cut in half', async () => {
        const text = 'data: one\r\n\r\ndata: two\r\n\r\n';
        for (let cut = 1; cut < text.length; cut++) {
            expect(await collect([text.slice(0, cut), text.slice(cut)])).toEqual(['one', 'two']);
        }
    });

    it('ignores comment lines and other fields', async () => {
        expect(await collect([': OPENROUTER PROCESSING\n\nevent: message\nid: 7\ndata: x\n\n: ping\n\n'])).toEqual(['x']);
    });

    it('joins multi-line data fields with newlines and strips one leading space', async () => {
        expect(await collect(['data: a\ndata:  b\n\n'])).toEqual(['a\n b']);
    });

    it('handles a multi-byte character split across chunks', async () => {
        const bytes = new TextEncoder().encode('data: ä€🎵\n\n');
        for (let cut = 1; cut < bytes.length; cut++) {
            expect(await collect([bytes.slice(0, cut), bytes.slice(cut)])).toEqual(['ä€🎵']);
        }
    });

    it('yields a final event that has no terminating blank line', async () => {
        expect(await collect(['data: last'])).toEqual(['last']);
    });

    it('yields nothing for an empty stream or only comments', async () => {
        expect(await collect([])).toEqual([]);
        expect(await collect([': keep-alive\n\n'])).toEqual([]);
    });
});
