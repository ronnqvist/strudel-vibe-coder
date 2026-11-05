// SPDX-License-Identifier: MIT
/**
 * The system prompt, composed per request from fixed parts:
 *
 *   output contract → core guidance → optional modules (fixed order) → preferences → the user's
 *   own music instructions
 *
 * Deterministic: the same inputs always give the same text, and the order never changes, so
 * providers that cache prompt prefixes can reuse the stable beginning. Which modules a request
 * gets is decided by simple rules (select.js), never by a model call.
 *
 * Bump PROMPT_VERSION whenever the text of any part changes; it is stored with each reply.
 */
import { CONTRACT } from './contract';
import { CORE } from './core';
import { MODULES, MODULE_NAMES } from './modules';
import { cleanPrefs, preferencesText } from './preferences';

export const PROMPT_VERSION = '2.0.0';

/** Longest custom music instructions accepted (characters). */
export const MAX_CUSTOM_INSTRUCTIONS = 2000;

/**
 * @param {{ modules?: string[], prefs?: { visuals: string, explanation: string }, customInstructions?: string }} [options]
 *   `modules` defaults to all of them.
 * @returns {string}
 */
export function composeSystemPrompt({ modules = MODULE_NAMES, prefs, customInstructions = '' } = {}) {
    const parts = [CONTRACT, CORE];
    for (const name of MODULE_NAMES) if (modules.includes(name)) parts.push(MODULES[name]);
    parts.push(preferencesText(cleanPrefs(prefs)));
    const custom = (customInstructions || '').trim().slice(0, MAX_CUSTOM_INSTRUCTIONS);
    if (custom) {
        parts.push(`# The User's Own Music Instructions\nFollow these where they do not conflict with the output contract and the Strudel facts above:\n${custom}`);
    }
    return parts.join('\n\n');
}

export { selectModules } from './select';
export { buildRequestContext, boundConversation } from './request';
export { DEFAULT_PREFS, VISUALS, EXPLANATIONS, cleanPrefs } from './preferences';
export { MODULE_NAMES } from './modules';
