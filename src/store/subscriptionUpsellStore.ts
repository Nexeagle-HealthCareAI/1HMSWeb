import { create } from 'zustand';

interface SubscriptionUpsellState {
  isOpen: boolean;
  /** What the user was trying to do, e.g. "Cancelling appointments" — shown in the modal so the
   * message is specific rather than a generic "action blocked." Optional; falls back to generic
   * copy when omitted. */
  featureLabel: string | null;
  open: (featureLabel?: string) => void;
  close: () => void;
}

/**
 * Global trigger for the "renew to unlock this" modal — a single store so any write-gated
 * component anywhere in the app can pop it without prop-drilling. Mounted once in MainLayout.tsx;
 * call sites reach it via useSubscriptionReadOnly()'s blockAction(), not this store directly.
 */
export const useSubscriptionUpsellStore = create<SubscriptionUpsellState>((set) => ({
  isOpen: false,
  featureLabel: null,
  open: (featureLabel) => set({ isOpen: true, featureLabel: featureLabel ?? null }),
  close: () => set({ isOpen: false, featureLabel: null }),
}));
