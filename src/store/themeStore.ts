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

// Default color schemes
const colorSchemes: Record<ColorScheme, ThemeColors> = {
  blue: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#60a5fa',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  green: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    background: '#ffffff',
    surface: '#f0fdf4',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  purple: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
    background: '#ffffff',
    surface: '#faf5ff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  orange: {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c',
    background: '#ffffff',
    surface: '#fff7ed',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  red: {
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#f87171',
    background: '#ffffff',
    surface: '#fef2f2',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  gray: {
    primary: '#6b7280',
    secondary: '#4b5563',
    accent: '#9ca3af',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
};

// Dark mode color variants
const getDarkColors = (colors: ThemeColors): ThemeColors => ({
  ...colors,
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
});

// Initial state
const initialState: ThemeState = {
  mode: 'auto',
  colorScheme: 'blue',
  colors: colorSchemes.blue,
  settings: {
    borderRadius: 8,
    fontSize: 'medium',
    spacing: 'comfortable',
    animations: true,
    reducedMotion: false,
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
