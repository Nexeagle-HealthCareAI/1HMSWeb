import { apiClient } from '@/services/axiosClient';

// Settings -> Emergency takeover (Vita, vision Phase 3). 1HMSAPI EmergencyTakeoverController:
// GET/PUT /hospitals/{hospitalId}/emergency-settings. Members read; only a hospital admin saves.

export const EMERGENCY_CAPABILITIES = [
  { id: 'casualty', label: 'Casualty' },
  { id: 'icu', label: 'ICU' },
  { id: 'trauma', label: 'Trauma' },
  { id: 'cardiac', label: 'Cardiac' },
  { id: 'maternity', label: 'Maternity' },
  { id: 'paediatric', label: 'Paediatric' },
  { id: 'ambulance', label: 'Ambulance' },
] as const;

export type VerificationStatus = 'NEW' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface EmergencySettings {
  settingId?: string | null;
  hospitalId?: string | null;
  name?: string | null;
  isEnabled: boolean;
  emergencyPhone?: string | null;
  alternatePhone?: string | null;
  alertWhatsApp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
  address?: string | null;
  city?: string | null;
  is24x7: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  capabilities: string[];
  dutyContactName?: string | null;
  dutyContactPhone?: string | null;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  verificationNote?: string | null;
  listed?: boolean;
}

export interface EmergencySettingsResponse {
  success: boolean;
  message?: string | null;
  settings?: EmergencySettings | null;
  currentTermsVersion: string;
  capabilityOptions: string[];
  sentForVerification?: boolean;
}

export interface SaveEmergencySettings {
  isEnabled: boolean;
  acceptTerms: boolean;
  emergencyPhone: string;
  alternatePhone?: string | null;
  alertWhatsApp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark?: string | null;
  address?: string | null;
  city?: string | null;
  is24x7: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  capabilities: string[];
  dutyContactName?: string | null;
  dutyContactPhone?: string | null;
}

const path = (hospitalId: string) => `/hospitals/${encodeURIComponent(hospitalId)}/emergency-settings`;

export const emergencySettingsApi = {
  get: (hospitalId: string): Promise<EmergencySettingsResponse> => apiClient.get(path(hospitalId)),
  save: (hospitalId: string, body: SaveEmergencySettings): Promise<EmergencySettingsResponse> => apiClient.put(path(hospitalId), body),
};

/** The server's message from a refused save (400/403), else a generic one. */
export function saveError(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || 'Could not save. Please try again.';
}
