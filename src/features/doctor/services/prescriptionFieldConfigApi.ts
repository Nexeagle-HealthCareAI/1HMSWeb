import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

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
  preference: PrescriptionFieldPreference | null;
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

export interface PrescriptionLayoutSettings {
  prescriptionSettingsId?: string;
  hospitalId?: string;
  doctorId?: string;
  headerHeight?: number | null;
  footerHeight?: number | null;
  contentLeftMargin?: number | null;
  contentRightMargin?: number | null;
  overFlowPage?: boolean | null;
  fontFamily?: string | null;
  fontSize?: number | null;
  fontWeight?: string | null;
  textColour?: string | null;
  uri?: string | null;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
}

export interface PrescriptionLayoutSettingsResponse {
  success: boolean;
  message: string;
  data: PrescriptionLayoutSettings | null;
}

export interface UploadPrescriptionTemplateRequest {
  file: File;
  doctorId: string;
  hospitalId?: string;
  loggedInUserId: string;
}

export interface UploadPrescriptionTemplateResponse {
  success: boolean;
  message: string;
  templateUrl?: string;
}

export interface UpdatePrescriptionLayoutSettingsRequest {
  hospitalId?: string;
  doctorId: string;
  headerHeight: number;
  footerHeight: number;
  contentLeftMargin: number;
  contentRightMargin: number;
  overFlowPage: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColour: string;
  loggedInUserId: string;
}

export interface UpdatePrescriptionLayoutSettingsResponse {
  success: boolean;
  message: string;
}

export const prescriptionFieldConfigApi = {
  /**
   * Get doctor's prescription field preferences
   */
  async getFieldPreferences(doctorId: string, hospitalId?: string): Promise<PrescriptionFieldPreferenceResponse> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.E_PRESCRIPTION.GET_FIELD_PREFERENCES(doctorId, hospitalId)
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
    hospitalId: string | undefined,
    preferences: UpdatePrescriptionFieldPreferenceRequest
  ): Promise<UpdatePrescriptionFieldPreferenceResponse> {
    try {      
      const response = await apiClient.put(
        API_ENDPOINTS.E_PRESCRIPTION.UPDATE_FIELD_PREFERENCES(doctorId, hospitalId),
        preferences
      );
     
      return response;
    } catch (error) {     
      throw error;
    }
  },

  /**
   * Upload PDF template for prescription designer
   */
  async uploadTemplate(payload: UploadPrescriptionTemplateRequest): Promise<UploadPrescriptionTemplateResponse> {
    try {
      const formData = new FormData();
      formData.append('File', payload.file);
      formData.append('DoctorId', payload.doctorId);
      if (payload.hospitalId) {
        formData.append('HospitalId', payload.hospitalId);
      }
      formData.append('LoggedInUserId', payload.loggedInUserId);

      const response = await apiClient.post<UploadPrescriptionTemplateResponse>(API_ENDPOINTS.PRESCRIPTION.UPLOAD_TEMPLATE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response;
    } catch (error) {
      throw error;
    }
  },

  async getPrescriptionSettings(doctorId: string, hospitalId?: string): Promise<PrescriptionLayoutSettingsResponse> {
    try {
      const response = await apiClient.get<PrescriptionLayoutSettingsResponse>(
        API_ENDPOINTS.PRESCRIPTION.GET_SETTINGS(doctorId, hospitalId)
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch prescription settings', error);
      return {
        success: false,
        message: 'Unable to fetch prescription settings',
        data: null,
      };
    }
  },

  async updatePrescriptionSettings(payload: UpdatePrescriptionLayoutSettingsRequest): Promise<UpdatePrescriptionLayoutSettingsResponse> {
    try {
      const response = await apiClient.put<UpdatePrescriptionLayoutSettingsResponse>(
        API_ENDPOINTS.PRESCRIPTION.UPDATE_SETTINGS,
        payload
      );
      return response;
    } catch (error) {
      console.error('Failed to update prescription settings', error);
      throw error;
    }
  }
};
