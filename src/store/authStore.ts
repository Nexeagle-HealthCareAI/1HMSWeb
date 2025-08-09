import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface User {
  id?: string;
  email?: string;
  mobile?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  profilePicture?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  tokenExpiry: number | null;
  userId: string | null;
  userRole: string | null;
  permissions: string[];
  hospitalId: string | null;
  employeeId: string | null;
}

export interface AuthActions {
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  getToken: () => string | null;
  clearToken: () => void;
  isTokenValid: () => boolean;
  setUserId: (userId: string) => void;
  getUserId: () => string | null;
  setUserRole: (role: string) => void;
  getUserRole: () => string | null;
  setPermissions: (permissions: string[]) => void;
  getPermissions: () => string[];
  setHospitalId: (hospitalId: string) => void;
  getHospitalId: () => string | null;
  setEmployeeId: (employeeId: string) => void;
  getEmployeeId: () => string | null;
  setAuthenticatedUser: (userId: string, token: string) => void;
  clearSession: () => void;
  logout: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  token: null,
  tokenExpiry: null,
  userId: null,
  userRole: null,
  permissions: [],
  hospitalId: null,
  employeeId: null,
};

// Create auth store
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Set user data
        setUser: (user: User | null) => {
          set({
            user,
            isAuthenticated: !!user,
            userId: user?.id || null,
            userRole: user?.role || null,
          });
        },

        // Token management
        setToken: (token: string) => {
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          set({ token, tokenExpiry });
        },

        // Set authenticated user
        setAuthenticatedUser: (userId: string, token: string) => {
          const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          const user: User = {
            id: userId,
          };
          set({
            user,
            isAuthenticated: true,
            token,
            tokenExpiry,
            userId,
          });
        },

        getToken: () => {
          return get().token;
        },

        clearToken: () => {
          set({ token: null, tokenExpiry: null });
        },

        isTokenValid: () => {
          const { token, tokenExpiry } = get();
          return !!(token && tokenExpiry && Date.now() < tokenExpiry);
        },

        setUserId: (userId: string) => {
          set({ userId });
        },

        getUserId: () => {
          return get().userId;
        },

        setUserRole: (role: string) => {
          set({ userRole: role });
        },

        getUserRole: () => {
          return get().userRole;
        },

        setPermissions: (permissions: string[]) => {
          set({ permissions });
        },

        getPermissions: () => {
          return get().permissions;
        },

        setHospitalId: (hospitalId: string) => {
          set({ hospitalId });
        },

        getHospitalId: () => {
          return get().hospitalId;
        },

        setEmployeeId: (employeeId: string) => {
          set({ employeeId });
        },

        getEmployeeId: () => {
          return get().employeeId;
        },

        clearSession: () => {
          set(initialState);
        },

        logout: () => {
          set(initialState);
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          tokenExpiry: state.tokenExpiry,
          userId: state.userId,
          userRole: state.userRole,
          hospitalId: state.hospitalId,
          employeeId: state.employeeId,
        }),
      }
    )
  )
);
