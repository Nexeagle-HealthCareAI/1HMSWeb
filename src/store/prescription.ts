import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HeaderFooterSettings } from '@/types/prescription';

interface PrescriptionStore {
  settings: HeaderFooterSettings;
  update: (data: Partial<HeaderFooterSettings>) => void;
  resetDefaults: () => void;
}

const defaultSettings: HeaderFooterSettings = {
  page: {
    orientation: 'portrait',
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
  },
  pdf: {
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
  },
  images: {
    header: undefined,
    footer: undefined,
    signature: undefined,
  },
  header: {
    height: 80,
    width: 100,
    showImage: true,
    showText: true,
    text: 'Dr. John Smith\nMBBS, MD\nCardiologist',
  },
  footer: {
    height: 60,
    width: 100,
    showImage: true,
    showText: true,
    showSignature: true,
    text: 'Thank you for choosing our services',
    signatureHeight: 40,
    signatureWidth: 80,
  },
  font: {
    family: 'Arial',
    size: 12,
  },
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    text: '#1e293b',
  },
};

export const usePrescriptionStore = create<PrescriptionStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      update: (data) =>
        set((state) => ({
          settings: { ...state.settings, ...data },
        })),
      resetDefaults: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'easyhms.prescription.settings',
      onRehydrateStorage: () => (state) => {
        // Ensure settings are properly initialized after rehydration
        if (state && (!state.settings || !state.settings.page || !state.settings.page.margin)) {
          state.settings = defaultSettings;
        }
      },
    }
  )
);
