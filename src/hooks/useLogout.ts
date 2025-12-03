import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { useUserStore } from '@/store/userStore';
import { useThemeStore } from '@/store/themeStore';
import { RoleService } from '@/features/auth/services/roleService';

interface LogoutOptions {
  redirectTo?: string;
  replace?: boolean;
}

/**
 * Centralized logout handler that clears persisted state, query cache, and navigation
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authLogout = useAuthStore((state) => state.logout);
  const resetAppState = useAppStore((state) => state.resetAppState);
  const resetUserState = useUserStore((state) => state.resetUserState);
  const resetTheme = useThemeStore((state) => state.resetColors);

  return useCallback(
    async (options?: LogoutOptions) => {
      const redirectTo = options?.redirectTo ?? '/login';
      const replace = options?.replace ?? true;

      try {
        // Cancel any in-flight queries and clear cache to prevent stale data
        await queryClient.cancelQueries();
        queryClient.clear();
      } catch (error) {
        console.warn('Failed to clear query cache during logout', error);
      }

      // Reset all zustand stores
      authLogout();
      resetAppState();
      resetUserState();
      resetTheme();
      RoleService.clearRoleAndPermissions();

      // Remove persisted credentials and session artifacts
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('user-storage');
      localStorage.removeItem('accountLockout');

      Object.keys(localStorage).forEach((key) => {
        if (key.includes('rate_limit') || key.includes('otp_')) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();

      navigate(redirectTo, { replace });
    },
    [authLogout, navigate, queryClient, resetAppState, resetTheme, resetUserState]
  );
};
