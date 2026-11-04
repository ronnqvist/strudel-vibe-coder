// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => el.getClientRects().length > 0;

/**
 * Behaviour shared by the app's dialogs and overlay panels.
 *
 * - on open, focus moves into the dialog (first control, or the dialog itself)
 * - on close, focus returns to what had it before (the button that opened it)
 * - Escape closes it; the event is marked handled so that nothing else (such as "Esc stops
 *   generating") also reacts to the same key press
 * - with `trap`, Tab and Shift+Tab cycle inside the dialog (use for modal dialogs)
 *
 * @param {{ onClose: () => void, trap?: boolean }} options
 * @returns {{ attach: (node: HTMLElement | null) => void, onKeyDown: (e: React.KeyboardEvent) => void }}
 *   use as `const { attach, onKeyDown } = useDialog(...)` and `<div ref={attach} onKeyDown={onKeyDown}>`
 */
export function useDialog({ onClose, trap = false }) {
    const nodeRef = useRef(null);
    const attach = useCallback((node) => { nodeRef.current = node; }, []);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; });

    useEffect(() => {
        const previous = document.activeElement;
        const node = nodeRef.current;
        const first = node && [...node.querySelectorAll(FOCUSABLE)].find(isVisible);
        (first || node)?.focus();
        return () => {
            if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
        };
    }, []);

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeRef.current();
            return;
        }
        if (!trap || e.key !== 'Tab' || !nodeRef.current) return;
        const items = [...nodeRef.current.querySelectorAll(FOCUSABLE)].filter(isVisible);
        if (items.length === 0) {
            e.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!nodeRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && (active === first || active === nodeRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return { attach, onKeyDown };
}
