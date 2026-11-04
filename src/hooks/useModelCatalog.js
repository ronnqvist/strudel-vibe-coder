// SPDX-License-Identifier: MIT
import { useCallback, useRef, useState } from 'react';
import { fetchCatalog } from '../lib/models';

/**
 * OpenRouter's public model list, fetched on demand and kept for the rest of the visit.
 * `load()` does nothing while a request is running or once the list is there;
 * `load({ force: true })` retries after an error or refreshes the list.
 */
export function useModelCatalog() {
    const [state, setState] = useState({ status: 'idle', models: [], error: '' });
    const statusRef = useRef('idle');

    const load = useCallback(async ({ force = false } = {}) => {
        if (statusRef.current === 'loading' || (statusRef.current === 'ready' && !force)) return;
        statusRef.current = 'loading';
        setState(prev => ({ ...prev, status: 'loading', error: '' }));
        try {
            const models = await fetchCatalog();
            statusRef.current = 'ready';
            setState({ status: 'ready', models, error: '' });
        } catch (error) {
            statusRef.current = 'error';
            setState({ status: 'error', models: [], error: error.message || 'Could not load the model list' });
        }
    }, []);

    return { ...state, load };
}
