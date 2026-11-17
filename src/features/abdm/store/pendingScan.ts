import { create } from 'zustand';
import type { AbdmProfileShareItem } from '../services/abdmApi';

// A counter scan staff chose to book for on the ABHA board. It is carried to Book an appointment,
// where the patient form picks it up and fills itself. Kept in memory only (it holds a patient's
// details) and it expires, so a scan left behind can never fill a later, unrelated booking.
export const PENDING_SCAN_MAX_AGE_MS = 10 * 60 * 1000;

interface PendingAbhaScanState {
  scan: AbdmProfileShareItem | null;
  setAt: number;
  setScan: (scan: AbdmProfileShareItem | null, now?: number) => void;
  /** The waiting scan if it is still fresh, without using it up. */
  peek: (now?: number) => AbdmProfileShareItem | null;
  /** Returns the waiting scan and clears it, so it is used exactly once. */
  take: (now?: number) => AbdmProfileShareItem | null;
}

export const usePendingAbhaScan = create<PendingAbhaScanState>((set, get) => ({
  scan: null,
  setAt: 0,
  setScan: (scan, now = Date.now()) => set({ scan, setAt: scan ? now : 0 }),
  peek: (now = Date.now()) => {
    const { scan, setAt } = get();
    return scan && now - setAt <= PENDING_SCAN_MAX_AGE_MS ? scan : null;
  },
  take: (now = Date.now()) => {
    const scan = get().peek(now);
    if (get().scan) set({ scan: null, setAt: 0 });
    return scan;
  },
}));
