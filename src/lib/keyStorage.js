// SPDX-License-Identifier: MIT

export const API_KEY_STORAGE_KEY = 'openrouter_api_key';
export const REMEMBER_KEY_STORAGE_KEY = 'openrouter_remember_key';
/** Keys of custom endpoints, `{ [endpointId]: key }`, kept under the same "remember" setting. */
export const ENDPOINT_KEYS_STORAGE_KEY = 'openrouter_endpoint_keys';

/**
 * Whether the API key may be kept in localStorage. On unless the user turned it off, which
 * keeps every key stored by earlier versions working.
 * @param {Pick<Storage, 'getItem'>} storage
 */
export function readRemember(storage) {
    try {
        return storage.getItem(REMEMBER_KEY_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

/** The key to start with: the stored one if remembering is on, otherwise none. */
export function loadApiKey(storage) {
    if (!readRemember(storage)) return '';
    try {
        return storage.getItem(API_KEY_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

/**
 * Keep storage in line with the settings: the key is written while remembering is on and
 * removed (not blanked) while it is off.
 * @param {Pick<Storage, 'setItem' | 'removeItem'>} storage
 */
export function persistApiKey(storage, apiKey, remember) {
    try {
        if (remember) storage.setItem(API_KEY_STORAGE_KEY, apiKey);
        else storage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
        // storage unavailable: the key stays in memory for this session
    }
}

/** Store the user's choice. */
export function persistRemember(storage, remember) {
    try {
        storage.setItem(REMEMBER_KEY_STORAGE_KEY, String(remember));
    } catch {
        // storage unavailable
    }
}

const onlyStringKeys = (keys) => Object.fromEntries(
    Object.entries(keys && typeof keys === 'object' && !Array.isArray(keys) ? keys : {})
        .filter(([id, key]) => typeof key === 'string' && key && id),
);

/** The custom endpoints' keys to start with: the stored ones if remembering is on, otherwise none. */
export function loadEndpointKeys(storage) {
    if (!readRemember(storage)) return {};
    try {
        return onlyStringKeys(JSON.parse(storage.getItem(ENDPOINT_KEYS_STORAGE_KEY) || '{}'));
    } catch {
        return {};
    }
}

/** Like persistApiKey, for the custom endpoints' keys. */
export function persistEndpointKeys(storage, keys, remember) {
    try {
        if (remember) storage.setItem(ENDPOINT_KEYS_STORAGE_KEY, JSON.stringify(onlyStringKeys(keys)));
        else storage.removeItem(ENDPOINT_KEYS_STORAGE_KEY);
    } catch {
        // storage unavailable: the keys stay in memory for this session
    }
}
