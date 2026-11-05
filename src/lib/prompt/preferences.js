// SPDX-License-Identifier: MIT
/**
 * Musical preferences: how much the model explains, and whether it adds Hydra visuals.
 * Chosen by the user in Settings; turned into a short block of the system prompt.
 */

export const VISUALS = ['auto', 'always', 'never'];
export const EXPLANATIONS = ['none', 'brief', 'teaching'];
export const DEFAULT_PREFS = Object.freeze({ visuals: 'auto', explanation: 'brief' });

/** Preferences read from storage or a file, with anything unknown replaced by the default. */
export function cleanPrefs(value) {
    const v = value && typeof value === 'object' ? value : {};
    return {
        visuals: VISUALS.includes(v.visuals) ? v.visuals : DEFAULT_PREFS.visuals,
        explanation: EXPLANATIONS.includes(v.explanation) ? v.explanation : DEFAULT_PREFS.explanation,
    };
}

const VISUALS_TEXT = {
    always: 'Include Hydra visuals with the music (start the code with `await initHydra()`), unless the user asks for no visuals.',
    auto: 'Add Hydra visuals only when the user asks for visuals or the current pattern already has them; then keep them.',
    never: 'Do not add Hydra visuals unless the user explicitly asks for them.',
};

const EXPLANATION_TEXT = {
    none: 'Comments: only where the code would otherwise be hard to read. Outside the code block, at most one sentence.',
    brief: 'Comments: one short comment above each part of the pattern, saying what it does and one value worth changing. Outside the code block, a few sentences at most.',
    teaching: 'Comments: explain what each section does for someone new to live coding, explain the key parameters, and suggest variations to try while it plays. Unless the user asks for no comments.',
};

/** @param {{ visuals: string, explanation: string }} prefs */
export function preferencesText(prefs) {
    const p = cleanPrefs(prefs);
    return `# Preferences\n- ${VISUALS_TEXT[p.visuals]}\n- ${EXPLANATION_TEXT[p.explanation]}`;
}
