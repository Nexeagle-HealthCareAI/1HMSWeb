import type { QuickHospitalData } from '@/features/auth/components/HospitalQuickSetup';
import { useAuthStore } from '@/store/authStore';

// Registration progress after the mobile OTP has been verified. The OTP step issues a real session token and user id that are persisted so the
// next steps (hospital details, name/email/password) can call the API; without this, a page reload (a new app version reloading the PWA, a
// browser refresh, a phone app switch) would find "a token and a user id", treat the half-registered person as signed in, and drop them on the
// dashboard with the hospital and name steps skipped. While a draft exists the app does NOT auto-restore a session, and registration reopens
// at the step the person was on. Tab-scoped (sessionStorage), never holds the password or OTP, removed when registration finishes or is left.
const KEY = 'nx_registration_draft_v1';

export interface RegistrationDraft {
  step: 3 | 4 | 5;
  userType: string;
  mobile: string;
  hospital: QuickHospitalData;
  fullName: string;
  email: string;
  accountDone: boolean;
  hospitalDone: boolean;
}

export const hasRegistrationDraft = (): boolean => {
  try {
    return !!sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
};

export const saveRegistrationDraft = (draft: RegistrationDraft): void => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch { /* storage unavailable: registration still works, it just cannot resume after a reload */ }
};

export const clearRegistrationDraft = (): void => {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignore */ }
};

/**
 * The draft to resume from, or null. A draft is only valid while the verified session it belongs to is still there; a stale one (token gone or
 * expired) is discarded so it can never block a normal sign-in.
 */
export const loadValidRegistrationDraft = (): RegistrationDraft | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RegistrationDraft;
    const store = useAuthStore.getState();
    const valid = (draft.step === 3 || draft.step === 4 || draft.step === 5) && !!store.token && !!store.userId && store.isTokenValid();
    if (!valid) {
      clearRegistrationDraft();
      return null;
    }
    return draft;
  } catch {
    clearRegistrationDraft();
    return null;
  }
};
