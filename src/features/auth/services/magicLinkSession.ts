import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { fetchAndStoreUserPermissions } from '@/features/auth/services/authApi';

// One-tap sign-in from a WhatsApp/email notification link (see MagicLinkService in easyHMSAPI).
// The link carries a single-use, expiring token in the URL FRAGMENT -- never a password -- which
// is exchanged here for a normal session, then the same session bootstrap a password login does.

const DEFAULT_LANDING_PATH = '/appointment-dashboard';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

interface MagicLinkExchangeResponse {
  success: boolean;
  message?: string;
  accessToken?: string | null;
  userId?: string | null;
  hospitalId?: string | null;
  targetPath?: string | null;
}

// (Not a discriminated union: this project builds with strictNullChecks off, where TS can't narrow
// on a boolean literal.) `ok` => targetPath is set; otherwise message is set.
export interface MagicLinkSignInResult {
  ok: boolean;
  targetPath?: string;
  message?: string;
}

const GENERIC_FAILURE = 'This sign-in link is invalid or has expired. Please log in with your mobile number.';

/** Reads the token from `#t=<token>`; null when absent or not shaped like one we issue. */
export const readMagicLinkToken = (hash: string): string | null => {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('t');
  return token && TOKEN_PATTERN.test(token) ? token : null;
};

// Only ever navigate to an in-app route, whatever the server returned.
const safeLandingPath = (path?: string | null): string =>
  path && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : DEFAULT_LANDING_PATH;

export const signInWithMagicLink = async (
  token: string,
  queryClient: QueryClient,
): Promise<MagicLinkSignInResult> => {
  let exchange: MagicLinkExchangeResponse;
  try {
    exchange = await apiClient.post<MagicLinkExchangeResponse>(API_ENDPOINTS.AUTH.MAGIC_LINK_EXCHANGE, { token });
  } catch {
    return { ok: false, message: 'We could not reach the server. Please check your connection and tap the link again.' };
  }

  if (!exchange?.success || !exchange.accessToken || !exchange.userId) {
    return { ok: false, message: exchange?.message || GENERIC_FAILURE };
  }

  const authStore = useAuthStore.getState();
  // A different person may be signed in on this browser; the link is the newer, explicit intent.
  authStore.clearSession();
  queryClient.removeQueries({ queryKey: ['hospitalUserByUserId'] });
  queryClient.removeQueries({ queryKey: ['hospital'] });

  // Permissions first: every authenticated screen needs a role, so a missing one is a hard stop
  // (same rule as the password login). fetchAndStoreUserPermissions also stores the token.
  const perms = await fetchAndStoreUserPermissions(exchange.userId, exchange.accessToken);
  if (!perms?.success || !useAuthStore.getState().userRole) {
    useAuthStore.getState().clearSession();
    return { ok: false, message: "We couldn't load your account details. Please log in with your mobile number." };
  }

  // Land in the hospital the notification was about, even for staff who belong to several.
  try {
    const hospitals = await hospitalApi.getMyHospitals();
    const store = useAuthStore.getState();
    if (hospitals.length) {
      store.setHospitals(hospitals);
      const target =
        hospitals.find(h => h.hospitalId?.toLowerCase() === exchange.hospitalId?.toLowerCase())
        ?? hospitals.find(h => h.isPrimary)
        ?? hospitals[0];
      store.setHospitalId(target.hospitalId);
      if (target.employeeId) store.setEmployeeId(target.employeeId);
      store.setHospitalAccessRestriction(false, null);
    } else {
      store.setHospitalAccessRestriction(true, 'Hospital mapping not found. Complete hospital information to unlock full access.');
    }
  } catch {
    useAuthStore.getState().clearSession();
    return { ok: false, message: "We couldn't load your hospital. Please log in with your mobile number." };
  }

  // Doctor profile (sets doctorId etc. for the doctor dashboards) -- non-blocking, like the login.
  try {
    const { doctorApi } = await import('@/features/doctor/services/doctorApi');
    await doctorApi.getDoctorProfile(exchange.userId);
  } catch { /* users without a doctor profile are normal */ }

  // Only now flip isAuthenticated, so nothing observes a half-built session.
  useAuthStore.getState().setUser({ id: exchange.userId });

  return { ok: true, targetPath: safeLandingPath(exchange.targetPath) };
};
