import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  permissions: string[];
  profilePicture?: string;
  department?: string;
  specialization?: string;
  experience?: number;
  education?: string;
  bio?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface UserState {
  // User data
  profile: UserProfile | null;
  isProfileLoaded: boolean;
  
  // User preferences
  preferences: UserProfile['preferences'];
  
  // User activity
  lastActivity: Date | null;
  sessionDuration: number;
  
  // User permissions and roles
  roles: string[];
  permissions: string[];
  
  // User settings
  settings: {
    autoLogout: boolean;
    autoLogoutMinutes: number;
    rememberMe: boolean;
    twoFactorEnabled: boolean;
  };
  
  // User statistics
  statistics: {
    loginCount: number;
    lastLogin: Date | null;
    totalSessionTime: number;
  };
}

export interface UserActions {
  // Profile actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  
  // Preferences actions
  updatePreferences: (preferences: Partial<UserProfile['preferences']>) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: string) => void;
  setTimezone: (timezone: string) => void;
  toggleNotification: (type: 'email' | 'sms' | 'push') => void;
  
  // Activity actions
  updateLastActivity: () => void;
  setSessionDuration: (duration: number) => void;
  
  // Role and permission actions
  setRoles: (roles: string[]) => void;
  setPermissions: (permissions: string[]) => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  
  // Settings actions
  updateSettings: (settings: Partial<UserState['settings']>) => void;
  setAutoLogout: (enabled: boolean) => void;
  setAutoLogoutMinutes: (minutes: number) => void;
  setRememberMe: (enabled: boolean) => void;
  setTwoFactorEnabled: (enabled: boolean) => void;
  
  // Statistics actions
  updateStatistics: (stats: Partial<UserState['statistics']>) => void;
  incrementLoginCount: () => void;
  setLastLogin: (date: Date) => void;
  addSessionTime: (minutes: number) => void;
  
  // Reset actions
  resetUserState: () => void;
}

export type UserStore = UserState & UserActions;

// Initial state
const initialState: UserState = {
  profile: null,
  isProfileLoaded: false,
  preferences: {
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    theme: 'auto',
  },
  lastActivity: null,
  sessionDuration: 0,
  roles: [],
  permissions: [],
  settings: {
    autoLogout: true,
    autoLogoutMinutes: 30,
    rememberMe: false,
    twoFactorEnabled: false,
  },
  statistics: {
    loginCount: 0,
    lastLogin: null,
    totalSessionTime: 0,
  },
};

// Create user store
export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Profile actions
        setProfile: (profile: UserProfile) => {
          set({
            profile,
            isProfileLoaded: true,
            roles: [profile.role],
            permissions: profile.permissions,
          });
        },

        updateProfile: (updates: Partial<UserProfile>) => {
          const currentProfile = get().profile;
          if (currentProfile) {
            set({
              profile: { ...currentProfile, ...updates },
            });
          }
        },

        clearProfile: () => {
          set({
            profile: null,
            isProfileLoaded: false,
            roles: [],
            permissions: [],
          });
        },

        // Preferences actions
        updatePreferences: (preferences: Partial<UserProfile['preferences']>) => {
          set((state) => ({
            preferences: { ...state.preferences, ...preferences },
          }));
        },

        setTheme: (theme: 'light' | 'dark' | 'auto') => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              theme,
            },
          }));
        },

        setLanguage: (language: string) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              language,
            },
          }));
        },

        setTimezone: (timezone: string) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              timezone,
            },
          }));
        },

        toggleNotification: (type: 'email' | 'sms' | 'push') => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              notifications: {
                ...state.preferences.notifications,
                [type]: !state.preferences.notifications[type],
              },
            },
          }));
        },

        // Activity actions
        updateLastActivity: () => {
          set({ lastActivity: new Date() });
        },

        setSessionDuration: (duration: number) => {
          set({ sessionDuration: duration });
        },

        // Role and permission actions
        setRoles: (roles: string[]) => {
          set({ roles });
        },

        setPermissions: (permissions: string[]) => {
          set({ permissions });
        },

        hasRole: (role: string) => {
          const { roles } = get();
          return roles.includes(role);
        },

        hasPermission: (permission: string) => {
          const { permissions } = get();
          return permissions.includes(permission);
        },

        hasAnyRole: (roles: string[]) => {
          const { roles: userRoles } = get();
          return roles.some((role) => userRoles.includes(role));
        },

        hasAllPermissions: (permissions: string[]) => {
          const { permissions: userPermissions } = get();
          return permissions.every((permission) => userPermissions.includes(permission));
        },

        // Settings actions
        updateSettings: (settings: Partial<UserState['settings']>) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }));
        },

        setAutoLogout: (enabled: boolean) => {
          set((state) => ({
            settings: { ...state.settings, autoLogout: enabled },
          }));
        },

        setAutoLogoutMinutes: (minutes: number) => {
          set((state) => ({
            settings: { ...state.settings, autoLogoutMinutes: minutes },
          }));
        },

        setRememberMe: (enabled: boolean) => {
          set((state) => ({
            settings: { ...state.settings, rememberMe: enabled },
          }));
        },

        setTwoFactorEnabled: (enabled: boolean) => {
          set((state) => ({
            settings: { ...state.settings, twoFactorEnabled: enabled },
          }));
        },

        // Statistics actions
        updateStatistics: (stats: Partial<UserState['statistics']>) => {
          set((state) => ({
            statistics: { ...state.statistics, ...stats },
          }));
        },

        incrementLoginCount: () => {
          set((state) => ({
            statistics: {
              ...state.statistics,
              loginCount: state.statistics.loginCount + 1,
            },
          }));
        },

        setLastLogin: (date: Date) => {
          set((state) => ({
            statistics: {
              ...state.statistics,
              lastLogin: date,
            },
          }));
        },

        addSessionTime: (minutes: number) => {
          set((state) => ({
            statistics: {
              ...state.statistics,
              totalSessionTime: state.statistics.totalSessionTime + minutes,
            },
          }));
        },

        // Reset actions
        resetUserState: () => {
          set(initialState);
        },
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          preferences: state.preferences,
          settings: state.settings,
          statistics: state.statistics,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);
