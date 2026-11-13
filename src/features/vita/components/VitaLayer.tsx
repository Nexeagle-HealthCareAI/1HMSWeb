import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Vita sits above everything 1HMS shows, including side drawers and dialogs.
 *
 * 1HMS drawers (Radix Sheet, z-[100] with a dark backdrop) and dialogs are "modal": they cover the
 * page, block clicks and scrolling outside themselves, pull keyboard focus back into themselves,
 * and close when something outside them is clicked or focused. The dock is rendered in its own
 * layer on <body>, on top of all of that, and the events that start inside it are kept away from
 * the open drawer, so the user can read, type, scroll and follow a guide while the drawer stays
 * open behind it.
 */
export const VITA_Z = {
  fab: 2147483000,
  overlay: 2147483001,
  dock: 2147483002,
  card: 2147483003,
} as const;

const INSIDE = '[data-vita-ui]';

/** Events a modal drawer listens for on `document` to trap focus, block scroll or close itself. */
const SHIELDED = ['pointerdown', 'mousedown', 'touchstart', 'focusin', 'wheel', 'touchmove'] as const;

/** Fired on window instead of a raw Escape that started inside Vita (see below). */
export const VITA_ESCAPE = 'vita:escape';

function fromVita(node: EventTarget | null): boolean {
  return node instanceof Element && !!node.closest(INSIDE);
}

/**
 * Stops those events at <body>, after 1HMS's own React handlers have run (React listens on its
 * root and portal containers, below <body>) and before the drawer's listeners on `document`.
 */
export function shieldVitaFromModals(body: HTMLElement = document.body): () => void {
  const stopIfVita = (e: Event) => {
    if (fromVita(e.target)) e.stopPropagation();
  };
  // Focus leaving the drawer *for Vita*: the drawer would pull it straight back.
  const stopFocusOutToVita = (e: FocusEvent) => {
    if (fromVita(e.relatedTarget)) e.stopPropagation();
  };
  // Drawers close on Escape with a listener on `document` in the capture phase, i.e. before
  // anything else sees the key. An Escape pressed inside Vita is caught one step earlier, on
  // window, and handed to the dock as its own event (it closes the dock, not the drawer).
  const win = body.ownerDocument.defaultView ?? window;
  const escapeFromVita = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !fromVita(e.target)) return;
    e.stopPropagation();
    win.dispatchEvent(new CustomEvent(VITA_ESCAPE));
  };
  const opts = { passive: false } as AddEventListenerOptions;
  SHIELDED.forEach((type) => body.addEventListener(type, stopIfVita, opts));
  body.addEventListener('focusout', stopFocusOutToVita);
  win.addEventListener('keydown', escapeFromVita, true);
  return () => {
    SHIELDED.forEach((type) => body.removeEventListener(type, stopIfVita, opts));
    body.removeEventListener('focusout', stopFocusOutToVita);
    win.removeEventListener('keydown', escapeFromVita, true);
  };
}

export const VitaLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-vita-ui', 'layer');
    // An open modal sets `pointer-events: none` on <body>; Vita must stay clickable.
    el.style.pointerEvents = 'auto';
    document.body.appendChild(el);
    setHost(el);
    const unshield = shieldVitaFromModals();
    return () => {
      unshield();
      el.remove();
    };
  }, []);

  return host ? createPortal(children, host) : null;
};

export default VitaLayer;
