// SPDX-License-Identifier: MIT
/**
 * Whether saving to localStorage is failing (storage full or blocked): the chats, or the current
 * chat id and player mirror. A tiny external store for useSyncExternalStore.
 *
 * The snapshot is 0 while saving works. When a save fails after one that worked, it becomes a new
 * positive number (a failure "episode"), so a warning the user dismissed comes back if saving
 * starts failing again later.
 */
let episode = 0;
let failing = false;
const failingKeys = new Set();
const listeners = new Set();

/**
 * @param {boolean} ok whether the last save of `what` worked
 * @param {string} [what] which value was saved; saving is failing while any of them fails
 */
export function reportSave(ok, what = 'chats') {
    if (ok) failingKeys.delete(what); else failingKeys.add(what);
    const next = failingKeys.size > 0;
    if (next === failing) return;
    failing = next;
    if (failing) episode++;
    listeners.forEach(l => l());
}

export function subscribeSaveStatus(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** 0 while saving works, otherwise the number of the current failure episode. */
export function saveFailureEpisode() {
    return failing ? episode : 0;
}
