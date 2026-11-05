// SPDX-License-Identifier: MIT
/**
 * What the request carries besides the system prompt: the pattern on this chat's stage (as
 * request context, attached to the newest user message) and a bounded conversation history.
 */

const CODE_BLOCK = /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g;

/**
 * Put the pattern on this chat's stage in front of the newest user message, in the request only
 * (the chat keeps what the user typed), with the rule to keep what was not asked to change.
 * Without a pattern the conversation is returned unchanged.
 * @param {{ role: string, content: string }[]} apiMessages
 * @param {string | null | undefined} code
 */
export function buildRequestContext(apiMessages, code) {
    if (!code || !code.trim()) return apiMessages;
    const last = apiMessages.length - 1;
    if (last < 0 || apiMessages[last].role !== 'user') return apiMessages;
    const context = [
        'This is the pattern currently in the player. Change this pattern, unless I ask for something new.',
        'Keep everything I do not ask you to change.',
        '```js',
        code,
        '```',
        '',
        'My request:',
    ].join('\n');
    return apiMessages.map((m, i) => (i === last ? { role: m.role, content: `${context}\n${m.content}` } : m));
}

/**
 * Keep long chats small: in assistant replies older than the last `keepRecent` ones, replace the
 * code blocks with a short placeholder. The text around them stays, and the pattern that matters
 * is attached to the newest message by buildRequestContext.
 * @param {{ role: string, content: string }[]} apiMessages
 * @param {{ keepRecent?: number }} [options]
 */
export function boundConversation(apiMessages, { keepRecent = 2 } = {}) {
    const assistantIndexes = apiMessages.map((m, i) => (m.role === 'assistant' ? i : -1)).filter(i => i >= 0);
    const old = new Set(assistantIndexes.slice(0, Math.max(0, assistantIndexes.length - keepRecent)));
    if (old.size === 0) return apiMessages;
    return apiMessages.map((m, i) => (old.has(i)
        ? { role: m.role, content: m.content.replace(CODE_BLOCK, (_, lead) => `${lead}[code of an earlier version omitted]`) }
        : m));
}
