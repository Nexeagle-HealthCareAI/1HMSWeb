import { apiClient } from '@/services/axiosClient';

export interface PrescriptionFieldPreference {
  preferenceId?: string;
  hospitalId?: string;
  doctorId: string;
  vitals: boolean;
  chiefComplaint: boolean;
  history: boolean;
  comorbidity: boolean;
  examination: boolean;
  diagnosis: boolean;
  investigations: boolean;
  procedures: boolean;
  medications: boolean;
  privateNotes: boolean;
  certificatesAndNotes: boolean;
  immunizations: boolean;
  followUpAndReferral: boolean;
  nonPharmacologicalAdvice: boolean;
  attachments: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  rowVersion?: string;
}

export interface PrescriptionFieldPreferenceResponse {
  preference: PrescriptionFieldPreference;
  success: boolean;
  message: string;
}

export interface UpdatePrescriptionFieldPreferenceRequest {
  vitals: boolean;
  chiefComplaint: boolean;
  history: boolean;
  comorbidity: boolean;
  examination: boolean;
  diagnosis: boolean;
  investigations: boolean;
  procedures: boolean;
  medications: boolean;
  privateNotes: boolean;
  certificatesAndNotes: boolean;
  immunizations: boolean;
  followUpAndReferral: boolean;
  nonPharmacologicalAdvice: boolean;
  attachments: boolean;
}

export interface UpdatePrescriptionFieldPreferenceResponse {
  success: boolean;
  message: string;
}

export const prescriptionFieldConfigApi = {
  /**
   * Get doctor's prescription field preferences
   */
  async getFieldPreferences(doctorId: string): Promise<PrescriptionFieldPreferenceResponse> {
    try {
      const response = await apiClient.get(
        `/e-prescription/configuration/preference-setting/doctorId=${doctorId}`
      );
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch preferences',
        preference: null
      };
    }
  },

  /**
   * Update doctor's prescription field preferences
   */
  async updateFieldPreferences(
    doctorId: string,
    preferences: UpdatePrescriptionFieldPreferenceRequest
  ): Promise<UpdatePrescriptionFieldPreferenceResponse> {
    try {      
      const response = await apiClient.put(
        `/e-prescription/configuration/update-preference-setting/doctorId=${doctorId}`,
        preferences
      );
     
      return response;
    } catch (error) {     
      throw error;
    }
  }
};
