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
  bloodGroup?: string | null;
  allergies?: string | null;
  email?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
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
  bloodGroup?: string;
  allergies?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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
    // Using exact path format requested by user:
    // .../patient/visit-summary/appointmentId=...
    return apiClient.get<{ success: boolean; message: string; pdfUrl: string | null }>(
      `/patient/visit-summary/appointmentId=${appointmentId}`
    );
  },
};
