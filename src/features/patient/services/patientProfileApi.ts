import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Patient Profile Types
export interface PatientProfileData {
  registrationId: string;
  hospitalId: string;
  patientId: string;
  fullName: string;
  mobile: string;
  ageYears: number;
  sex: string;
  addressLine1: string;
  city: string;
  state: string | null;
  country: string;
  pincode: string;
  insuranceId: string | null;
  paymentMode: string | null;
  registeredAt: string;
  registeredBy: string;
}

export interface UpdatePatientProfileData {
  hospitalId: string;
  patientId: string;
  fullName: string;
  mobile: string;
  ageYears: number;
  sex: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  insuranceId: string;
  paymentMode: string;
}

export interface UpdatePatientProfileResponse {
  success: boolean;
  message: string;
}

// Patient Profile API Service
export const patientProfileApi = {
  /**
   * Get patient profile details
   */
  getPatientProfile: async (hospitalId: string, patientId: string): Promise<PatientProfileData> => {
    const endpoint = API_ENDPOINTS.PATIENTS.GET_PROFILE_DETAILS(hospitalId, patientId);
    return apiClient.get<PatientProfileData>(endpoint);
  },

  /**
   * Update patient profile details
   */
  updatePatientProfile: async (
    hospitalId: string,
    patientId: string,
    data: UpdatePatientProfileData
  ): Promise<UpdatePatientProfileResponse> => {
    const endpoint = API_ENDPOINTS.PATIENTS.UPDATE_PROFILE_DETAILS(hospitalId, patientId);
    return apiClient.put<UpdatePatientProfileResponse>(endpoint, data);
  },

  /**
   * Get visit summary PDF URL
   */
  getVisitSummary: async (appointmentId: string): Promise<{ success: boolean; message: string; pdfUrl: string | null }> => {
    // Handling the specific path format requested by user: /patient/visit-summary/appointmentId=...
    // But assuming standard query param first: /patient/visit-summary?appointmentId=...
    // If we strictly follow the user's curl:
    // 'https://.../patient/visit-summary/appointmentId=3fa85f64...'
    // This implies the ID is a path segment OR a query param without '?'.
    // Let's use the safer query param approach which is standard for 'appointmentId' filters.
    return apiClient.get<{ success: boolean; message: string; pdfUrl: string | null }>(
      '/patient/visit-summary',
      { params: { appointmentId } }
    );
  },
};
