// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';

/** Read a value from localStorage; any failure (blocked storage, corrupt JSON) yields `fallback`. */
export function readStorage(key, fallback, { json = false } = {}) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === '') return fallback;
        return json ? JSON.parse(raw) : raw;
    } catch {
        return fallback;
    }
}

/**
 * useState that is initialised from localStorage and written back on every change.
 * Strings are stored as they are; pass `{ json: true }` for objects and arrays.
 * The storage format is identical to what earlier versions of the app wrote.
 */
export function useLocalStorage(key, initialValue, { json = false } = {}) {
    const [value, setValue] = useState(() => readStorage(key, initialValue, { json }));

    useEffect(() => {
        try {
            localStorage.setItem(key, json ? JSON.stringify(value) : value);
        } catch {
            // Storage unavailable or full: the app keeps working for this session.
        }
    }, [key, value, json]);

    return [value, setValue];
}
