import React, { useEffect, ReactNode } from 'react';
import { useAuthStore } from './authStore';
import { useAppStore } from './appStore';
import { useUserStore } from './userStore';
import { useNotificationStore } from './notificationStore';
import { useThemeStore } from './themeStore';

interface StoreProviderProps {
  children: ReactNode;
}

/**
 * Store Provider Component
 * 
 * This component initializes and manages all Zustand stores.
 * It handles:
 * - Authentication state initialization
 * - Theme system preferences detection
 * - User activity tracking
 * - Store synchronization
 */
export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  // Get store actions
  const { isTokenValid } = useAuthStore();
  const { updateSystemPreferences } = useThemeStore();
  const { updateLastActivity } = useUserStore();

  // Initialize stores on mount
  useEffect(() => {
    // Check authentication status - simplified check
    const tokenValid = isTokenValid();
    if (!tokenValid) {
      // Token is invalid or expired, clear any stored auth data
      useAuthStore.getState().clearSession();
    }

    // Detect system preferences
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
      updateSystemPreferences({ prefersDark: e.matches });
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      updateSystemPreferences({ prefersReducedMotion: e.matches });
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

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      updateLastActivity();
    };

    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Update activity periodically (every 5 minutes)
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [updateLastActivity]);

  // Apply theme to document
  useEffect(() => {
    const { getEffectiveMode, getComputedColors } = useThemeStore.getState();
    const effectiveMode = getEffectiveMode();
    const colors = getComputedColors();

    // Apply theme classes to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(effectiveMode);

    // Apply CSS custom properties for colors
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });

    // Apply reduced motion if enabled
    const { settings } = useThemeStore.getState();
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, []);

  return <>{children}</>;
};

/**
 * Hook to access all stores at once
 * Useful for components that need multiple stores
 */
export const useStores = () => {
  const auth = useAuthStore();
  const app = useAppStore();
  const user = useUserStore();
  const notifications = useNotificationStore();
  const theme = useThemeStore();

  return {
    auth,
    app,
    user,
    notifications,
    theme,
  };
};

/**
 * Hook to access only the stores you need
 * More efficient than useStores when you only need specific stores
 */
export const useStoreSelector = function<T>(
  selector: (stores: ReturnType<typeof useStores>) => T
): T {
  const stores = useStores();
  return selector(stores);
};
