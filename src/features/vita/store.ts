import { create } from 'zustand';

/**
 * Whether the Vita drawer is open. Shared so the top-nav "Ask Vita" button and the drawer
 * itself (and Ctrl+K) drive the same state. Remembered across reloads in localStorage.
 */
const LS_OPEN = 'vita.open';

const readOpen = (): boolean => {
  try {
    return localStorage.getItem(LS_OPEN) === '1';
  } catch {
    return false;
  }
};

const writeOpen = (open: boolean) => {
  try {
    localStorage.setItem(LS_OPEN, open ? '1' : '0');
  } catch {
    /* private mode: ignore */
  }
};

interface VitaUiState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useVitaUi = create<VitaUiState>((set, get) => ({
  open: readOpen(),
  setOpen: (open) => {
    writeOpen(open);
    set({ open });
  },
  toggle: () => get().setOpen(!get().open),
}));
