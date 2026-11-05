// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { generateId } from '../lib/utils';

/**
 * Requests in flight, one per chat at most.
 *
 * Each request has its own id and AbortController, keyed by the chat that started it, so Stop
 * cancels the request of the chat being viewed and never another chat's. A chat with a running
 * request does not block the other chats. Leaving the page cancels everything.
 *
 * @returns {{
 *   begin: (chatId: string) => { requestId: string, signal: AbortSignal, onText: (text: string) => void, end: () => void },
 *   isBusy: (chatId: string) => boolean,
 *   textFor: (chatId: string) => string | null,
 *   stop: (chatId: string) => void,
 *   busyChatIds: string[],
 * }}
 */
export function useRequests() {
    const controllers = useRef(new Map()); // chatId -> { requestId, controller }
    const [pending, setPending] = useState({}); // chatId -> { requestId, text }

    useEffect(() => {
        const map = controllers.current;
        return () => {
            for (const { controller } of map.values()) controller.abort();
            map.clear();
        };
    }, []);

    const begin = (chatId) => {
        const requestId = generateId();
        const controller = new AbortController();
        controllers.current.set(chatId, { requestId, controller });
        setPending(prev => ({ ...prev, [chatId]: { requestId, text: '' } }));

        const isCurrent = () => controllers.current.get(chatId)?.requestId === requestId;
        return {
            requestId,
            signal: controller.signal,
            onText: (text) => {
                if (!isCurrent()) return;
                setPending(prev => (prev[chatId]?.requestId === requestId ? { ...prev, [chatId]: { requestId, text } } : prev));
            },
            end: () => {
                if (isCurrent()) controllers.current.delete(chatId);
                setPending(prev => {
                    if (prev[chatId]?.requestId !== requestId) return prev;
                    const next = { ...prev };
                    delete next[chatId];
                    return next;
                });
            },
        };
    };

    return {
        begin,
        isBusy: (chatId) => Boolean(pending[chatId]),
        textFor: (chatId) => pending[chatId]?.text || null,
        stop: (chatId) => controllers.current.get(chatId)?.controller.abort(),
        busyChatIds: Object.keys(pending),
    };
}
