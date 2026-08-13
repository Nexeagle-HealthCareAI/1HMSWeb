import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// NexEagle General Clinic — the shared demo hospital info@nexeagle.com logs into. Hardcoded
// here (not fetched) since this is a fixed, dev-only marketing fixture, not per-tenant data.
const DEMO_HOSPITAL_ID = '06f4c5d4-5609-427e-b5af-717008f38ad7';

function getOrCreateDemoSessionId(): string {
  const KEY = 'demo_login_session_id';
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) return existing;
    const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(KEY, created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

// Fire-and-forget, best-effort -- reuses the Lead Generation pipeline (POST public/leads)
// already built for Doctor Dekho/WhatsApp. Two independent calls happen over one demo visit:
// a silent one the moment the demo account logs in, and an enriched one (name/mobile) only if
// the visitor fills in the welcome banner's optional callback form -- see recordDemoLoginLead's
// callers in SecureLogin.tsx / DemoWelcomeBanner.tsx.
export function recordDemoLoginLead(details?: { patientName?: string; mobile?: string }): void {
  try {
    const body = {
      hospitalId: DEMO_HOSPITAL_ID,
      source: '1HMSDemo',
      leadType: 'DemoLogin',
      patientName: details?.patientName,
      mobile: details?.mobile,
      sessionId: getOrCreateDemoSessionId(),
    };
    apiClient.post(API_ENDPOINTS.LEADS.RECORD, body).catch(() => {
      // Best-effort — never let a lead-logging failure surface to the person demoing the app.
    });
  } catch {
    // Best-effort — never fail because building the payload threw.
  }
}
