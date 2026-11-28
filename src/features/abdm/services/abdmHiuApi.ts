import { apiClient } from '@/services/axiosClient';

// ABDM M3: records this hospital asks other facilities for, with the patient's consent.

export type AbdmHiuConsentStatus = 'REQUESTED' | 'GRANTED' | 'DENIED' | 'REVOKED' | 'EXPIRED' | 'FAILED';

export interface AbdmHiuConsent {
  consentRowId: string;
  consentId: string;
  consentRequestId?: string | null;
  status: AbdmHiuConsentStatus;
  patientId?: string | null;
  patientAbhaAddress?: string | null;
  fromFacility?: string | null;
  failureReason?: string | null;
  purposeCode?: string | null;
  purposeText?: string | null;
  hiTypes: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbdmReceivedRecordSummary {
  receivedRecordId: string;
  consentId: string;
  careContextReference?: string | null;
  hiType?: string | null;
  title?: string | null;
  receivedAt: string;
  eraseAt?: string | null;
  fromFacility?: string | null;
}

export interface AbdmReceivedRecord {
  receivedRecordId: string;
  title?: string | null;
  hiType?: string | null;
  receivedAt: string;
  eraseAt?: string | null;
  bundle: unknown;
}

export interface AbdmHiuConsentAsk {
  hospitalId: string;
  patientId: string;
  abhaAddress?: string;
  purposeCode: string;
  hiTypes: string[];
  from: string;
  to: string;
  eraseAt: string;
}

export const ABDM_PURPOSES: { code: string; label: string }[] = [
  { code: 'CAREMGT', label: 'Care management' },
  { code: 'BTG', label: 'Break the glass (emergency)' },
  { code: 'PATRQT', label: 'Requested by the patient' },
  { code: 'PUBHLTH', label: 'Public health' },
  { code: 'HPAYMT', label: 'Healthcare payment' },
  { code: 'DSRCH', label: 'Disease-specific research' },
];

export const ABDM_RECORD_TYPES: { code: string; label: string }[] = [
  { code: 'Prescription', label: 'Prescriptions' },
  { code: 'DiagnosticReport', label: 'Lab and diagnostic reports' },
  { code: 'DischargeSummary', label: 'Discharge summaries' },
  { code: 'OPConsultation', label: 'OPD consultation notes' },
  { code: 'ImmunizationRecord', label: 'Immunisation records' },
  { code: 'WellnessRecord', label: 'Vitals and wellness records' },
  { code: 'HealthDocumentRecord', label: 'Other health documents' },
  { code: 'Invoice', label: 'Bills and invoices' },
];

export const abdmHiuStatusText: Record<AbdmHiuConsentStatus, string> = {
  REQUESTED: 'Waiting for the patient',
  GRANTED: 'Approved',
  DENIED: 'Declined by the patient',
  REVOKED: 'Withdrawn by the patient',
  EXPIRED: 'Expired',
  FAILED: 'Not sent',
};

const q = encodeURIComponent;

export const abdmHiuApi = {
  requestConsent: (ask: AbdmHiuConsentAsk) =>
    apiClient.post<{ success: boolean; consent: AbdmHiuConsent }>('/abdm/hiu/consents', ask),

  getConsents: (hospitalId: string, patientId?: string) =>
    apiClient.get<{ success: boolean; consents: AbdmHiuConsent[] }>(
      `/abdm/hiu/consents?hospitalId=${q(hospitalId)}${patientId ? `&patientId=${q(patientId)}` : ''}`),

  /** For a request that has waited: asks ABDM where it stands. The answer arrives a moment later, so reload after. */
  checkConsent: (hospitalId: string, consentRowId: string) =>
    apiClient.post<{ success: boolean; consentAsked: boolean; transferStatus?: string | null; message?: string | null }>(
      `/abdm/hiu/consents/${q(consentRowId)}/check?hospitalId=${q(hospitalId)}`, {}),

  getRecords: (hospitalId: string, patientId: string) =>
    apiClient.get<{ success: boolean; records: AbdmReceivedRecordSummary[] }>(
      `/abdm/hiu/records?hospitalId=${q(hospitalId)}&patientId=${q(patientId)}`),

  getRecord: (hospitalId: string, receivedRecordId: string) =>
    apiClient.get<AbdmReceivedRecord & { success: boolean }>(
      `/abdm/hiu/records/${q(receivedRecordId)}?hospitalId=${q(hospitalId)}`),
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** What the request form starts with: the last two years, kept for 30 days. */
export const defaultAskDates = (today: Date = new Date()) => {
  const from = new Date(today); from.setFullYear(from.getFullYear() - 2);
  const keep = new Date(today); keep.setDate(keep.getDate() + 30);
  return { from: isoDate(from), to: isoDate(today), eraseAt: isoDate(keep) };
};
