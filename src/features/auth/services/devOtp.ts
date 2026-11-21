import { create } from 'zustand';

/**
 * The sign-in code of a TESTER number on the Dev server.
 *
 * For a mobile listed as a tester on a Development API (1HMSAPI docs/TESTER-ACCOUNTS.md) `POST auth/otp/send`
 * answers with `devCode` instead of sending anything on WhatsApp. It is kept here so the code-entry screen
 * (sign-up, login with OTP, forgot password) can show it. Production never returns a code, so this stays empty there.
 */
interface DevOtpState {
  mobile: string | null;
  code: string | null;
}

const last10 = (mobile: string): string => mobile.replace(/\D/g, '').slice(-10);

export const useDevOtp = create<DevOtpState>(() => ({ mobile: null, code: null }));

/** Called with every send-code answer: remembers a tester's code, forgets the last one otherwise. */
export function rememberDevOtp(mobile: string, devCode?: string | null): void {
  useDevOtp.setState(devCode ? { mobile: last10(mobile), code: devCode } : { mobile: null, code: null });
}

export function clearDevOtp(): void {
  useDevOtp.setState({ mobile: null, code: null });
}

/** The code to show for the number on screen, or null (no tester code, or it belongs to another number). */
export function devOtpFor(state: DevOtpState, mobile: string): string | null {
  return state.code && state.mobile && state.mobile === last10(mobile) ? state.code : null;
}
