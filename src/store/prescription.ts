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
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
    },
  },
  pdf: {
    margin: {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
    },
  },
  images: {
    header: undefined,
    footer: undefined,
    signature: undefined,
  },
  useLetterhead: true,
  letterhead: {
    headerHeight: 30,
    footerHeight: 20,
  },
  header: {
    height: 20,
    width: 100,
    showImage: true,
    showText: true,
    text: 'Doctor Name\nDegree\nSpecialization',
  },
  footer: {
    height: 15,
    width: 100,
    showImage: true,
    showText: true,
    showSignature: true,
    text: '',
    signatureHeight: 10,
    signatureWidth: 20,
    doctorName: 'Doctor Name',
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
