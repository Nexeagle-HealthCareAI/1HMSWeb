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
    // Note: We don't automatically clear authentication state on refresh
    // Authentication state is preserved across browser refreshes
    // Users will only be logged out when they explicitly logout or when token expires during active session
    
    // Extend token expiry on app load if user is authenticated
    const { isAuthenticated, getToken, refreshToken, setAuthenticatedUser } = useAuthStore.getState();
    const token = getToken();
    
    if (token) {
      // If we have a token, ensure user is authenticated
      if (!isAuthenticated) {
        // Restore authentication state if token exists but isAuthenticated is false
        const userId = useAuthStore.getState().getUserId();
        if (userId) {
          setAuthenticatedUser(userId, token);
        }
      }
      // Extend the token expiry by 24 hours when the app loads
      refreshToken();
    }

    // Detect system preferences (only reduced motion, ignore dark mode)
    const detectSystemPreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      updateSystemPreferences({
        prefersDark: false, // Always force light mode
        prefersReducedMotion,
      });
    };

    // Initial detection
    detectSystemPreferences();

    // Listen for system preference changes (only reduced motion)
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      updateSystemPreferences({ prefersReducedMotion: e.matches });
    };

    // Add event listeners
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Cleanup event listeners
    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, [updateSystemPreferences]);

  // Removed hospital mapping fetch here to prevent duplicate calls.

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

    // Check and refresh token during active sessions
    const tokenRefreshInterval = setInterval(() => {
      const { isTokenExpiringSoon, refreshToken } = useAuthStore.getState();
      if (isTokenExpiringSoon()) {
        console.log('Token expiring soon, refreshing...');
        refreshToken();
      }
    }, 60 * 1000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
      clearInterval(tokenRefreshInterval);
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
