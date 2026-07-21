import { useCallback, useEffect, useState } from 'react';

// Cross-vendor Fullscreen API access — Safari (desktop + iPadOS 16.4+) still exposes it only
// under the `webkit`-prefixed names, everything else uses the standard ones.
type FullscreenableElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenableDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
};

const getFullscreenElement = (): Element | null => {
    const doc = document as FullscreenableDocument;
    return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

/**
 * True OS-level fullscreen for an ink pad — hides the browser's own chrome (address/search bar,
 * tabs) so the letterhead genuinely fills the physical screen, not just the page viewport.
 * iPadOS Safari 16.4+ supports the standard Fullscreen API for arbitrary elements (iPhone Safari
 * still doesn't); every other target browser (Chrome/Edge/Firefox on tablet or desktop) supports
 * it outright. Falls back to a no-op — the pad's own `fixed inset-0` CSS already covers the page
 * viewport regardless, so requesting fullscreen is a strict upgrade, never a requirement.
 *
 * Must be called from a direct user gesture (a click handler) — browsers reject
 * `requestFullscreen()` calls that don't originate from one.
 */
export function useFullscreen(elementRef: React.RefObject<HTMLElement>) {
    const [isFullscreen, setIsFullscreen] = useState(() => getFullscreenElement() != null);
    const [isSupported] = useState(() => {
        const el = document.documentElement as FullscreenableElement;
        return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
    });

    useEffect(() => {
        const onChange = () => setIsFullscreen(getFullscreenElement() != null);
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
    }, []);

    const enter = useCallback(async () => {
        const el = elementRef.current as FullscreenableElement | null;
        if (!el) return;
        try {
            if (el.requestFullscreen) await el.requestFullscreen();
            else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        } catch {
            // Rejected (not a direct user gesture, or genuinely unsupported) — the pad still
            // covers the full page viewport via CSS, so writing isn't blocked either way.
        }
    }, [elementRef]);

    const exit = useCallback(async () => {
        const doc = document as FullscreenableDocument;
        try {
            if (getFullscreenElement() == null) return;
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        } catch { /* already out, or unsupported — nothing to do */ }
    }, []);

    const toggle = useCallback(() => {
        if (getFullscreenElement() != null) void exit();
        else void enter();
    }, [enter, exit]);

    return { isFullscreen, isSupported, enter, exit, toggle };
}
