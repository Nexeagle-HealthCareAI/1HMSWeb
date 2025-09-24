import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// API request/response interfaces for prescription settings
export interface PrescriptionSettingsRequest {
  pageLayout: {
    orientation: string;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  useLetterhead: boolean;
  letterheadSettings: {
    headerHeight: number;
    footerHeight: number;
  };
  useHeaderSettings: boolean;
  headerSettings: {
    height: number;
    width: number;
    showImage: boolean;
    showOnAllPages: boolean;
  };
  useFooterSettings: boolean;
  footerSettings: {
    height: number;
    width: number;
    showImage: boolean;
    showOnAllPages: boolean;
  };
  useDoctorSetting: boolean;
  doctorSetting: {
    showSignature: boolean;
    signatureHeight: number;
    signatureWidth: number;
    doctorName: string;
  };
}

export interface PrescriptionSettingsResponse {
  success: boolean;
  prescriptionSettingsId: string;
  doctorId: string;
  settings: PrescriptionSettingsRequest;
  message: string;
}

// Prescription Settings API service
export const prescriptionSettingsApi = {
  // Get prescription settings
  getPrescriptionSettings: async (doctorId: string): Promise<PrescriptionSettingsResponse> => {
    try {
      const url = API_ENDPOINTS.DOCTORS.GET_PRESCRIPTION_SETTINGS(doctorId);
      console.log('Get Prescription Settings API Call:');
      console.log('- Doctor ID:', doctorId);
      console.log('- URL:', url);
      
      const response = await apiClient.get(url);
      console.log('Prescription Settings GET Response:', response);
      return response as PrescriptionSettingsResponse;
    } catch (error) {
      console.error('Error fetching prescription settings:', error);
      throw error;
    }
  },

  // Update prescription settings
  updatePrescriptionSettings: async (
    doctorId: string, 
    settings: PrescriptionSettingsRequest
  ): Promise<PrescriptionSettingsResponse> => {
    try {
      const url = API_ENDPOINTS.DOCTORS.UPDATE_PRESCRIPTION_SETTINGS();
      const payload = {
        doctorId: doctorId,
        settings: settings
      };
      
      console.log('Prescription Settings API Call:');
      console.log('- Doctor ID:', doctorId);
      console.log('- URL:', url);
      console.log('- Request payload:', payload);
      
      const response = await apiClient.put(url, payload);
      console.log('Prescription Settings PUT Response:', response);
      return response as PrescriptionSettingsResponse;
    } catch (error) {
      console.error('Error updating prescription settings:', error);
      throw error;
    }
  },

  // Reset prescription settings to defaults
  resetPrescriptionSettings: async (doctorId: string): Promise<PrescriptionSettingsResponse> => {
    try {
      const url = API_ENDPOINTS.DOCTORS.RESET_PRESCRIPTION_SETTINGS(doctorId);
      console.log('Reset Prescription Settings API Call:');
      console.log('- Doctor ID:', doctorId);
      console.log('- URL:', url);
      
      const response = await apiClient.post(url, {});
      console.log('Prescription Settings RESET Response:', response);
      return response as PrescriptionSettingsResponse;
    } catch (error) {
      console.error('Error resetting prescription settings:', error);
      throw error;
    }
  },
};
