import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface User {
  id?: string;
  email?: string;
  mobile?: string;
  name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  profilePicture?: string;
  doctorId?: string;
}

// A hospital the user belongs to (for the multi-hospital switcher).
export interface HospitalSummary {
  hospitalId: string;
  name: string;
  city?: string | null;
  isPrimary?: boolean;
  employeeId?: string | null;
  chainId?: string | null;
  chainName?: string | null;
  isChainOwner?: boolean;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  tokenExpiry: number | null;
  userId: string | null;
  userRole: string | null;
  userRoles: string[];
  permissions: string[];
  hospitalId: string | null;
  hospitals: HospitalSummary[];
  employeeId: string | null;
  doctorId: string | null;
  hospitalAccessRestricted: boolean;
  hospitalAccessMessage: string | null;
  doctorProfileRestricted: boolean;
  doctorProfileMessage: string | null;
}

export interface AuthActions {
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string) => void;
  getToken: () => string | null;
  clearToken: () => void;
  isTokenValid: () => boolean;
  isTokenExpiringSoon: () => boolean;
  refreshToken: () => Promise<void>;
  setUserId: (userId: string) => void;
  getUserId: () => string | null;
  setUserRole: (role: string | null) => void;
  getUserRole: () => string | null;
  setUserRoles: (roles: string[]) => void;
  getUserRoles: () => string[];
  setPermissions: (permissions: string[]) => void;
  getPermissions: () => string[];
  setHospitalId: (hospitalId: string) => void;
  getHospitalId: () => string | null;
  setHospitals: (hospitals: HospitalSummary[]) => void;
  getHospitals: () => HospitalSummary[];
  switchHospital: (hospitalId: string) => void;
  setEmployeeId: (employeeId: string) => void;
  getEmployeeId: () => string | null;
  setDoctorId: (doctorId: string) => void;
  getDoctorId: () => string | null;
  setAuthenticatedUser: (userId: string, token: string) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
  logout: () => void;
  setHospitalAccessRestriction: (restricted: boolean, message?: string | null) => void;
  getHospitalAccessRestriction: () => boolean;
  getHospitalAccessMessage: () => string | null;
  setDoctorProfileRestriction: (restricted: boolean, message?: string | null) => void;
  getDoctorProfileRestriction: () => boolean;
  getDoctorProfileMessage: () => string | null;
}

export type AuthStore = AuthState & AuthActions;

// Reads the real `exp` claim (seconds since epoch) out of a JWT's payload, so the client's
// notion of session validity matches what the server will actually accept — the backend token
// lives 1h (see JwtAuthService.cs), not the 24h this store used to assume unconditionally.
const decodeJwtExpiryMs = (token: string): number | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};
// Fallback only used if a token can't be decoded — matches the backend's real token lifetime.
const FALLBACK_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,
  tokenExpiry: null,
  userId: null,
  userRole: null,
  userRoles: [],
  permissions: [],
  hospitalId: null,
  hospitals: [],
  employeeId: null,
  doctorId: null,
  hospitalAccessRestricted: false,
  hospitalAccessMessage: null,
  doctorProfileRestricted: false,
  doctorProfileMessage: null,
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
            userRole: user?.role || (user?.roles?.[0]) || null,
            userRoles: user?.roles || (user?.role ? [user.role] : []),
            hospitalAccessRestricted: false,
            hospitalAccessMessage: null,
            doctorProfileRestricted: false,
            doctorProfileMessage: null,
          });
        },

        // Token management
        setToken: (token: string) => {
          const tokenExpiry = decodeJwtExpiryMs(token) ?? (Date.now() + FALLBACK_TOKEN_LIFETIME_MS);
          set({ token, tokenExpiry });
        },

        // Set authenticated user
        setAuthenticatedUser: (userId: string, token: string) => {
          const tokenExpiry = decodeJwtExpiryMs(token) ?? (Date.now() + FALLBACK_TOKEN_LIFETIME_MS);
          const user: User = {
            id: userId,
          };
          set({
            user,
            isAuthenticated: true,
            token,
            tokenExpiry,
            userId,
            hospitalAccessRestricted: false,
            hospitalAccessMessage: null,
            doctorProfileRestricted: false,
            doctorProfileMessage: null,
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

        // Check if token is about to expire (within 5 minutes)
        isTokenExpiringSoon: () => {
          const { token, tokenExpiry } = get();
          if (!token || !tokenExpiry) return false;
          const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
          return Date.now() > (tokenExpiry - fiveMinutes);
        },

        // No refresh-token endpoint exists on the backend today — this intentionally does NOT
        // fake-extend tokenExpiry. Faking it previously made the client believe a session was
        // still good for up to 24h after the real JWT (1h lifetime) had already died server-side,
        // so every subsequent API call would 401 despite the UI showing "logged in". The 401
        // response interceptor (axiosClient.ts) already logs out + redirects to /login when the
        // real token is rejected, which is the correct behavior until a real refresh endpoint exists.
        refreshToken: async () => {},

        setUserId: (userId: string) => {
          set({ userId });
        },

        getUserId: () => {
          return get().userId;
        },

        setUserRole: (role: string | null) => {
          set({ 
            userRole: role, 
            userRoles: role ? role.split(',').map(r => r.trim()).filter(Boolean) : [] 
          });
        },

        getUserRole: () => {
          return get().userRole;
        },

        setUserRoles: (roles: string[]) => {
          set({ userRoles: roles, userRole: roles.length > 0 ? roles[0] : null });
        },

        getUserRoles: () => {
          return get().userRoles || [];
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

        setHospitals: (hospitals: HospitalSummary[]) => {
          set({ hospitals: hospitals ?? [] });
        },

        getHospitals: () => {
          return get().hospitals ?? [];
        },

        // Switch the active hospital (multi-hospital chains). Updates the employeeId to match and
        // leaves hospitalId as the single source of truth used everywhere for data scoping.
        switchHospital: (hospitalId: string) => {
          const match = (get().hospitals ?? []).find(h => h.hospitalId === hospitalId);
          set({ hospitalId, employeeId: match?.employeeId ?? get().employeeId });
        },

        setEmployeeId: (employeeId: string) => {
          set({ employeeId });
        },

        getEmployeeId: () => {
          return get().employeeId;
        },

        setDoctorId: (doctorId: string) => {
          set({ doctorId });
        },

        getDoctorId: () => {
          return get().doctorId;
        },

        setHospitalAccessRestriction: (restricted: boolean, message?: string | null) => {
          set({
            hospitalAccessRestricted: restricted,
            hospitalAccessMessage: restricted ? (message ?? null) : null,
          });
        },

        getHospitalAccessRestriction: () => {
          return get().hospitalAccessRestricted;
        },

        getHospitalAccessMessage: () => {
          return get().hospitalAccessMessage;
        },

        setDoctorProfileRestriction: (restricted: boolean, message?: string | null) => {
          set({
            doctorProfileRestricted: restricted,
            doctorProfileMessage: restricted ? (message ?? null) : null,
          });
        },

        getDoctorProfileRestriction: () => {
          return get().doctorProfileRestricted;
        },

        getDoctorProfileMessage: () => {
          return get().doctorProfileMessage;
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        clearSession: () => {
          set(initialState);
        },

        logout: () => {
          // Wipe all device-side PHI: encrypted Query cache, encryption key, conflict log and any
          // queued writes (their bodies contain PHI). Dynamic import avoids a module cycle.
          void import('@/offline').then(m => m.wipeAll()).catch(() => { /* best-effort */ });
          // Clear localStorage
          localStorage.removeItem('auth-storage');
          // Reset to initial state
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
          userRoles: state.userRoles,
          hospitalId: state.hospitalId,
          hospitals: state.hospitals,
          employeeId: state.employeeId,
          doctorId: state.doctorId,
          isAuthenticated: state.isAuthenticated,
          hospitalAccessRestricted: state.hospitalAccessRestricted,
          hospitalAccessMessage: state.hospitalAccessMessage,
          doctorProfileRestricted: state.doctorProfileRestricted,
          doctorProfileMessage: state.doctorProfileMessage,
        }),
      }
    )
  )
);
