import { apiClient } from '@/services/axiosClient';

export interface SafetyCheckMedicine {
  name: string;
  genericName?: string;
}

export interface AllergyAlert {
  medicine: string;
  allergen: string;
  severity: string;
  reaction?: string | null;
  /** PATIENT_ALLERGY (structured record) | PROFILE (free-text allergies on the patient). */
  source: string;
}

export interface InteractionAlert {
  medicineA: string;
  medicineB: string;
  severity: string;
  effect?: string | null;
  management?: string | null;
}

export interface PrescriptionSafetyResult {
  success: boolean;
  /** false => the screen could not run; the UI must say "not checked", never imply "safe". */
  checked: boolean;
  message?: string | null;
  allergyAlerts: AllergyAlert[];
  interactionAlerts: InteractionAlert[];
}

export const prescriptionSafetyApi = {
  check: (hospitalId: string, patientId: string, medicines: SafetyCheckMedicine[]) =>
    apiClient.post<PrescriptionSafetyResult>(
      `/e-prescription/safety-check?hospitalId=${encodeURIComponent(hospitalId)}`,
      { patientId, medicines },
    ),
};
