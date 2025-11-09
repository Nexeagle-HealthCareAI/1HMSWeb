import { useAuthStore } from './authStore';
import { useAppStore } from './appStore';
import { useUserStore } from './userStore';
import { useThemeStore } from './themeStore';

// Auth store hooks
export const useAuth = () => useAuthStore();
export const useAuthState = () => useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  token: state.token,
}));
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  loginWithOTP: state.loginWithOTP,
  logout: state.logout,
  register: state.register,
  sendOTP: state.sendOTP,
  forgotPasswordSendOTP: state.forgotPasswordSendOTP,
  resetPassword: state.resetPassword,
  checkAuth: state.checkAuth,
  clearError: state.clearError,
  setLoading: state.setLoading,
  updateUser: state.updateUser,
}));

// Token management hooks (replacing SessionManager)
export const useToken = () => useAuthStore((state) => ({
  getToken: state.getToken,
  setToken: state.setToken,
  clearToken: state.clearToken,
  isTokenValid: state.isTokenValid,
}));
export const useUserId = () => useAuthStore((state) => ({
  getUserId: state.getUserId,
  setUserId: state.setUserId,
}));
export const useUserRole = () => useAuthStore((state) => ({
  getUserRole: state.getUserRole,
  setUserRole: state.setUserRole,
}));
export const useSession = () => useAuthStore((state) => ({
  clearSession: state.clearSession,
}));
export const useLoginStatus = () => useAuthStore((state) => ({
  isLoggedIn: state.isLoggedIn,
}));

// App hooks
export const useApp = () => useAppStore();
export const useAppState = () => useAppStore((state) => ({
  sidebarCollapsed: state.sidebarCollapsed,
  currentRoute: state.currentRoute,
  breadcrumbs: state.breadcrumbs,
  globalLoading: state.globalLoading,
  loadingStates: state.loadingStates,
  modals: state.modals,
  searchQuery: state.searchQuery,
  filters: state.filters,
  pagination: state.pagination,
  errors: state.errors,
  features: state.features,
}));
export const useAppActions = () => useAppStore((state) => ({
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  setCurrentRoute: state.setCurrentRoute,
  setBreadcrumbs: state.setBreadcrumbs,
  setGlobalLoading: state.setGlobalLoading,
  setLoadingState: state.setLoadingState,
  clearLoadingState: state.clearLoadingState,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  setSearchQuery: state.setSearchQuery,
  setFilter: state.setFilter,
  clearFilters: state.clearFilters,
  clearFilter: state.clearFilter,
  setPagination: state.setPagination,
  setCurrentPage: state.setCurrentPage,
  setPageSize: state.setPageSize,
  setTotalItems: state.setTotalItems,
  setError: state.setError,
  clearError: state.clearError,
  clearAllErrors: state.clearAllErrors,
  setFeature: state.setFeature,
  resetAppState: state.resetAppState,
}));

// User hooks
export const useUser = () => useUserStore();
export const useUserState = () => useUserStore((state) => ({
  profile: state.profile,
  isProfileLoaded: state.isProfileLoaded,
  preferences: state.preferences,
  lastActivity: state.lastActivity,
  sessionDuration: state.sessionDuration,
  roles: state.roles,
  permissions: state.permissions,
  settings: state.settings,
  statistics: state.statistics,
}));
export const useUserActions = () => useUserStore((state) => ({
  setProfile: state.setProfile,
  updateProfile: state.updateProfile,
  clearProfile: state.clearProfile,
  updatePreferences: state.updatePreferences,
  setTheme: state.setTheme,
  setLanguage: state.setLanguage,
  setTimezone: state.setTimezone,
  toggleNotification: state.toggleNotification,
  updateLastActivity: state.updateLastActivity,
  setSessionDuration: state.setSessionDuration,
  setRoles: state.setRoles,
  setPermissions: state.setPermissions,
  hasRole: state.hasRole,
  hasPermission: state.hasPermission,
  hasAnyRole: state.hasAnyRole,
  hasAllPermissions: state.hasAllPermissions,
  updateSettings: state.updateSettings,
  setAutoLogout: state.setAutoLogout,
  setAutoLogoutMinutes: state.setAutoLogoutMinutes,
  setRememberMe: state.setRememberMe,
  setTwoFactorEnabled: state.setTwoFactorEnabled,
  updateStatistics: state.updateStatistics,
  incrementLoginCount: state.incrementLoginCount,
  setLastLogin: state.setLastLogin,
  addSessionTime: state.addSessionTime,
  resetUserState: state.resetUserState,
}));

// Notification hooks
export const useNotifications = () => useNotificationStore();
export const useNotificationState = () => useNotificationStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  settings: state.settings,
  isOpen: state.isOpen,
  position: state.position,
}));
export const useNotificationActions = () => useNotificationStore((state) => ({
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  clearNotifications: state.clearNotifications,
  clearReadNotifications: state.clearReadNotifications,
  success: state.success,
  error: state.error,
  warning: state.warning,
  info: state.info,
  updateSettings: state.updateSettings,
  toggleEnabled: state.toggleEnabled,
  toggleSound: state.toggleSound,
  toggleDesktop: state.toggleDesktop,
  toggleEmail: state.toggleEmail,
  toggleSms: state.toggleSms,
  toggleAutoDismiss: state.toggleAutoDismiss,
  setAutoDismissDelay: state.setAutoDismissDelay,
  toggleOpen: state.toggleOpen,
  setOpen: state.setOpen,
  setPosition: state.setPosition,
  getUnreadNotifications: state.getUnreadNotifications,
  getNotificationsByType: state.getNotificationsByType,
  getNotificationsByDate: state.getNotificationsByDate,
}));

// Theme hooks
export const useTheme = () => useThemeStore();
export const useThemeState = () => useThemeStore((state) => ({
  mode: state.mode,
  colorScheme: state.colorScheme,
  colors: state.colors,
  settings: state.settings,
  systemPreferences: state.systemPreferences,
}));
export const useThemeActions = () => useThemeStore((state) => ({
  setMode: state.setMode,
  toggleMode: state.toggleMode,
  setColorScheme: state.setColorScheme,
  setColors: state.setColors,
  resetColors: state.resetColors,
  updateSettings: state.updateSettings,
  setBorderRadius: state.setBorderRadius,
  setFontSize: state.setFontSize,
  setSpacing: state.setSpacing,
  toggleAnimations: state.toggleAnimations,
  toggleReducedMotion: state.toggleReducedMotion,
  updateSystemPreferences: state.updateSystemPreferences,
  getEffectiveMode: state.getEffectiveMode,
  getComputedColors: state.getComputedColors,
}));

// Specialized hooks for common use cases
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
export const useGlobalLoading = () => useAppStore((state) => state.globalLoading);
export const useCurrentRoute = () => useAppStore((state) => state.currentRoute);
export const useBreadcrumbs = () => useAppStore((state) => state.breadcrumbs);

export const useUserProfile = () => useUserStore((state) => state.profile);
export const useUserPreferences = () => useUserStore((state) => state.preferences);
export const useUserRoles = () => useUserStore((state) => state.roles);
export const useUserPermissions = () => useUserStore((state) => state.permissions);

export const useUnreadNotifications = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationSettings = () => useNotificationStore((state) => state.settings);

export const useThemeMode = () => useThemeStore((state) => state.mode);
export const useColorScheme = () => useThemeStore((state) => state.colorScheme);
export const useThemeColors = () => useThemeStore((state) => state.colors);
export const useThemeSettings = () => useThemeStore((state) => state.settings);

// Permission and role checking hooks
export const useHasRole = (role: string) => useUserStore((state) => state.hasRole(role));
export const useHasPermission = (permission: string) => useUserStore((state) => state.hasPermission(permission));
export const useHasAnyRole = (roles: string[]) => useUserStore((state) => state.hasAnyRole(roles));
export const useHasAllPermissions = (permissions: string[]) => useUserStore((state) => state.hasAllPermissions(permissions));

// Loading state hooks
export const useIsLoading = (key: string) => useAppStore((state) => state.loadingStates[key] || false);
export const useIsModalOpen = (modalId: string) => useAppStore((state) => state.modals[modalId] || false);

// Pagination hooks
export const usePagination = () => useAppStore((state) => state.pagination);
export const useCurrentPage = () => useAppStore((state) => state.pagination.currentPage);
export const usePageSize = () => useAppStore((state) => state.pagination.pageSize);
export const useTotalItems = () => useAppStore((state) => state.pagination.totalItems);

// Search and filter hooks
export const useSearchQuery = () => useAppStore((state) => state.searchQuery);
export const useFilters = () => useAppStore((state) => state.filters);
export const useFilter = (key: string) => useAppStore((state) => state.filters[key]);

// Error hooks
export const useErrors = () => useAppStore((state) => state.errors);
export const useError = (key: string) => useAppStore((state) => state.errors[key]);

// Feature flag hooks
export const useFeatures = () => useAppStore((state) => state.features);
export const useFeature = (feature: string) => useAppStore((state) => state.features[feature]);

// Theme utility hooks
export const useEffectiveThemeMode = () => useThemeStore((state) => state.getEffectiveMode());
export const useComputedThemeColors = () => useThemeStore((state) => state.getComputedColors());
