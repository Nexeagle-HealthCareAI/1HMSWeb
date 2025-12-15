import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface ThemeState {
  // Theme mode
  mode: ThemeMode;
  
  // Color scheme
  colorScheme: ColorScheme;
  
  // Custom colors
  colors: ThemeColors;
  
  // UI settings
  settings: {
    borderRadius: number;
    fontSize: 'small' | 'medium' | 'large';
    spacing: 'compact' | 'comfortable' | 'spacious';
    animations: boolean;
    reducedMotion: boolean;
    contrast: 'low' | 'normal' | 'high';
    brightness: 'dim' | 'normal' | 'bright';
    colorBlindness: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  };
  
  // System preferences
  systemPreferences: {
    prefersDark: boolean;
    prefersReducedMotion: boolean;
  };
}

export interface ThemeActions {
  // Mode actions
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  
  // Color scheme actions
  setColorScheme: (scheme: ColorScheme) => void;
  
  // Color actions
  setColors: (colors: Partial<ThemeColors>) => void;
  resetColors: () => void;
  
  // Settings actions
  updateSettings: (settings: Partial<ThemeState['settings']>) => void;
  setBorderRadius: (radius: number) => void;
  setFontSize: (size: ThemeState['settings']['fontSize']) => void;
  setSpacing: (spacing: ThemeState['settings']['spacing']) => void;
  toggleAnimations: () => void;
  toggleReducedMotion: () => void;
  
  // System preference actions
  updateSystemPreferences: (preferences: Partial<ThemeState['systemPreferences']>) => void;
  
  // Utility actions
  getEffectiveMode: () => 'light' | 'dark';
  getComputedColors: () => ThemeColors;
}

export type ThemeStore = ThemeState & ThemeActions;

// Eye-friendly color schemes
const colorSchemes: Record<ColorScheme, ThemeColors> = {
  blue: {
    primary: '#2563eb', // Softer blue
    secondary: '#1d4ed8',
    accent: '#3b82f6',
    background: '#f8fafc', // Softer background
    surface: '#f1f5f9',
    text: '#475569', // Softer text
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#059669', // Softer green
    info: '#2563eb',
  },
  green: {
    primary: '#059669', // Softer green
    secondary: '#047857',
    accent: '#10b981',
    background: '#f0fdf4', // Softer background
    surface: '#ecfdf5',
    text: '#374151', // Softer text
    textSecondary: '#6b7280',
    border: '#d1fae5',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#059669',
    info: '#2563eb',
  },
  purple: {
    primary: '#7c3aed', // Softer purple
    secondary: '#6d28d9',
    accent: '#8b5cf6',
    background: '#faf5ff', // Softer background
    surface: '#f3e8ff',
    text: '#4338ca', // Softer text
    textSecondary: '#6b7280',
    border: '#e9d5ff',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#059669',
    info: '#2563eb',
  },
  orange: {
    primary: '#ea580c', // Softer orange
    secondary: '#dc2626',
    accent: '#f97316',
    background: '#fff7ed', // Softer background
    surface: '#fed7aa',
    text: '#92400e', // Softer text
    textSecondary: '#6b7280',
    border: '#fed7aa',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#059669',
    info: '#2563eb',
  },
  red: {
    primary: '#dc2626', // Softer red
    secondary: '#b91c1c',
    accent: '#ef4444',
    background: '#fef2f2', // Softer background
    surface: '#fee2e2',
    text: '#991b1b', // Softer text
    textSecondary: '#6b7280',
    border: '#fecaca',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#059669',
    info: '#2563eb',
  },
  gray: {
    primary: '#6b7280', // Neutral gray
    secondary: '#4b5563',
    accent: '#9ca3af',
    background: '#f9fafb', // Softer background
    surface: '#f3f4f6',
    text: '#374151', // Softer text
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#059669',
    info: '#2563eb',
  },
};

// Eye-friendly dark mode color variants
const getDarkColors = (colors: ThemeColors): ThemeColors => ({
  ...colors,
  background: '#1e293b', // Warmer dark background
  surface: '#334155', // Softer surface
  text: '#f8fafc', // Softer white text
  textSecondary: '#cbd5e1', // Softer secondary text
  border: '#475569', // Softer borders
});

// Initial state
const initialState: ThemeState = {
  mode: 'light', // Default to light mode
  colorScheme: 'blue',
  colors: colorSchemes.blue,
  settings: {
    borderRadius: 8,
    fontSize: 'medium',
    spacing: 'comfortable',
    animations: true,
    reducedMotion: false,
    // Eye-friendly settings
    contrast: 'normal', // 'low', 'normal', 'high'
    brightness: 'normal', // 'dim', 'normal', 'bright'
    colorBlindness: 'none', // 'protanopia', 'deuteranopia', 'tritanopia'
  },
  systemPreferences: {
    prefersDark: false,
    prefersReducedMotion: false,
  },
};

// Create theme store
export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Mode actions
        setMode: (mode: ThemeMode) => {
          set({ mode });
        },

        toggleMode: () => {
          const { mode } = get();
          const newMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
          set({ mode: newMode });
        },

        // Color scheme actions
        setColorScheme: (scheme: ColorScheme) => {
          set({
            colorScheme: scheme,
            colors: colorSchemes[scheme],
          });
        },

        // Color actions
        setColors: (colors: Partial<ThemeColors>) => {
          set((state) => ({
            colors: { ...state.colors, ...colors },
          }));
        },

        resetColors: () => {
          const { colorScheme } = get();
          set({ colors: colorSchemes[colorScheme] });
        },

        // Settings actions
        updateSettings: (settings: Partial<ThemeState['settings']>) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }));
        },

        setBorderRadius: (radius: number) => {
          set((state) => ({
            settings: { ...state.settings, borderRadius: radius },
          }));
        },

        setFontSize: (size: ThemeState['settings']['fontSize']) => {
          set((state) => ({
            settings: { ...state.settings, fontSize: size },
          }));
        },

        setSpacing: (spacing: ThemeState['settings']['spacing']) => {
          set((state) => ({
            settings: { ...state.settings, spacing },
          }));
        },

        toggleAnimations: () => {
          set((state) => ({
            settings: { ...state.settings, animations: !state.settings.animations },
          }));
        },

        toggleReducedMotion: () => {
          set((state) => ({
            settings: { ...state.settings, reducedMotion: !state.settings.reducedMotion },
          }));
        },

        // System preference actions
        updateSystemPreferences: (preferences: Partial<ThemeState['systemPreferences']>) => {
          set((state) => ({
            systemPreferences: { ...state.systemPreferences, ...preferences },
          }));
        },

        // Utility actions
        getEffectiveMode: () => {
          const { mode, systemPreferences } = get();
          if (mode === 'auto') {
            return systemPreferences.prefersDark ? 'dark' : 'light';
          }
          return mode;
        },

        getComputedColors: () => {
          const { colors, getEffectiveMode } = get();
          const effectiveMode = getEffectiveMode();
          
          if (effectiveMode === 'dark') {
            return getDarkColors(colors);
          }
          return colors;
        },
      }),
      {
        name: 'theme-storage',
        partialize: (state) => ({
          mode: state.mode,
          colorScheme: state.colorScheme,
          colors: state.colors,
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'theme-store',
    }
  )
);
