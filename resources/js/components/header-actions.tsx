import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_ACTIONS_ID = 'header-actions';

/**
 * Puts a page's main action (such as New project) at the right of the
 * header bar, where every page keeps it.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setTarget(document.getElementById(HEADER_ACTIONS_ID));
    }, []);

    return target ? createPortal(children, target) : null;
}
