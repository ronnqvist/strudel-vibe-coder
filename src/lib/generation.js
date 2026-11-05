// SPDX-License-Identifier: MIT
/**
 * What the app does with a finished request, by its status (see GenerationStatus in openrouter.js).
 * Pure functions, so the rules are tested without React.
 */

/** @typedef {import('./openrouter').GenerationStatus} GenerationStatus */

export const STATUSES = ['completed', 'interrupted', 'truncated', 'aborted', 'refused', 'error'];

/** Only a reply the provider said was finished may replace the pattern in the player by itself. */
export function canAutoLoad(status) {
    return status === 'completed';
}

/**
 * Short badge text and a longer explanation for a reply that did not complete. `null` for completed.
 * @param {GenerationStatus | undefined} status
 */
export function statusBadge(status) {
    switch (status) {
        case 'interrupted': return { label: 'interrupted', title: 'The connection closed before the reply was finished; the code may be incomplete' };
        case 'truncated': return { label: 'cut off', title: 'The model stopped at its length limit; the code may be incomplete' };
        case 'aborted': return { label: 'stopped', title: 'You stopped this reply' };
        case 'refused': return { label: 'refused', title: 'The model or provider declined this request' };
        case 'error': return { label: 'error', title: 'The request failed' };
        default: return null;
    }
}

/** Why a reply's code was not loaded into the player, for the notice above the player. `''` when it may load. */
export function notLoadedNotice(status) {
    switch (status) {
        case 'interrupted': return 'Not loaded into the player: the reply was interrupted before it finished, so its code may be incomplete. The previous pattern is still loaded.';
        case 'truncated': return 'Not loaded into the player: the reply was cut off at the model\'s length limit, so its code is incomplete. The previous pattern is still loaded.';
        case 'refused': return 'Not loaded into the player: the model declined this request. The previous pattern is still loaded.';
        default: return '';
    }
}

/**
 * The screen-reader announcement once a request has ended.
 * @param {{ status: GenerationStatus, code?: string | null, error?: { message: string } | null }} result
 * @param {'loaded' | 'invalid' | 'not-loaded' | 'none'} [load] what happened to the code
 */
export function announcement(result, load = 'none') {
    switch (result.status) {
        case 'aborted': return 'Generation stopped';
        case 'interrupted': return 'The reply was interrupted. The pattern was not loaded.';
        case 'truncated': return 'Reply was cut off at the length limit. The pattern was not loaded.';
        case 'refused': return 'The model declined the request. The pattern was not loaded.';
        case 'error': return `Error: ${result.error?.message || 'the request failed'}`;
        default:
            if (!result.code) return 'Reply received';
            if (load === 'loaded') return 'Reply received. The pattern was loaded into the player.';
            if (load === 'invalid') return 'Reply received. The pattern has a syntax error and was not loaded.';
            return 'Reply received';
    }
}

/**
 * The status of a stored message, including messages saved before `status` existed
 * (`stopped` / `truncated` flags, and error replies stored as plain "Error: ..." text).
 * @param {{ role: string, status?: string, stopped?: boolean, truncated?: boolean, content?: string, model?: string }} message
 * @returns {GenerationStatus | undefined} undefined for user messages
 */
export function messageStatus(message) {
    if (message?.role !== 'assistant') return undefined;
    if (STATUSES.includes(message.status)) return message.status;
    if (message.truncated) return 'truncated';
    if (message.stopped) return 'aborted';
    if (!message.model && typeof message.content === 'string' && message.content.startsWith('Error: ')) return 'error';
    return 'completed';
}

/**
 * The messages to send to the model: role and content only, without replies that failed or did
 * not finish (they would teach the model a broken pattern or an error text).
 * @param {object[]} messages
 */
export function apiConversation(messages) {
    return messages
        .filter(m => m.role === 'user' || messageStatus(m) === 'completed')
        .map(m => ({ role: m.role, content: m.content }));
}
