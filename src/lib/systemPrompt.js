// SPDX-License-Identifier: MIT
/**
 * The full system prompt: every module, Hydra visuals always on, teaching comments.
 *
 * The app composes a smaller prompt per request (src/lib/prompt/). This full text is the
 * reference used by the tests that check its Strudel facts, by the evaluation harness, and as the
 * default of generateStrudelCode. Keep the claims factual: a wrong function description makes
 * models write code that does not run.
 */
import { composeSystemPrompt } from './prompt';

export const SYSTEM_PROMPT = composeSystemPrompt({ prefs: { visuals: 'always', explanation: 'teaching' } });
