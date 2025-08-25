import React, { useEffect, ReactNode } from 'react';
import { useThemeStore } from '@/store/themeStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { getEffectiveMode, getComputedColors, updateSystemPreferences } = useThemeStore();

  useEffect(() => {
    // Detect system preferences on mount
    const detectSystemPreferences = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      updateSystemPreferences({
        prefersDark,
        prefersReducedMotion,
      });
    };

    // Initial detection
    detectSystemPreferences();

    // Listen for system preference changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      updateSystemPreferences({
        prefersDark: e.matches,
      });
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      updateSystemPreferences({
        prefersReducedMotion: e.matches,
      });
    };

    // Add event listeners
    darkModeQuery.addEventListener('change', handleDarkModeChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Cleanup event listeners
    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, [updateSystemPreferences]);

  useEffect(() => {
    const applyTheme = () => {
      const effectiveMode = getEffectiveMode();
      const colors = getComputedColors();
      const { settings } = useThemeStore.getState();

      // Apply theme classes to document
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(effectiveMode);

      // Set color scheme for FOUC prevention
      document.documentElement.style.colorScheme = effectiveMode;

      // Apply CSS custom properties for colors
      Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      });

      // Apply eye-friendly settings
      document.documentElement.setAttribute('data-contrast', settings.contrast || 'normal');
      document.documentElement.setAttribute('data-brightness', settings.brightness || 'normal');
      document.documentElement.setAttribute('data-colorblindness', settings.colorBlindness || 'none');

      // Apply reduced motion if enabled
      if (settings.reducedMotion) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    // Apply theme immediately
    applyTheme();

    // Subscribe to theme changes
    const unsubscribe = useThemeStore.subscribe(applyTheme);

    return unsubscribe;
  }, [getEffectiveMode, getComputedColors]);

  return <>{children}</>;
};
