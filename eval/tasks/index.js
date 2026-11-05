// SPDX-License-Identifier: MIT
import { DEV_TASKS } from './dev.js';
import { HELDOUT_TASKS } from './heldout.js';

export const TASKS = [
    ...DEV_TASKS.map(t => ({ ...t, split: 'dev' })),
    ...HELDOUT_TASKS.map(t => ({ ...t, split: 'heldout' })),
];
