import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface DoctorProfessionalData {
  licenseNumber: string;
  qualifications: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  departmentId: string;
  specializations: string[];
}

export interface DoctorProfileResponse {
  doctor: {
    doctorId: string;
    userId: string;
    hospitalId: string;
    licenseNumber: string;
    qualifications: string[];
    experienceYears: number;
    medicalCouncil: string;
    registrationYear: number;
    bio: string;
    departmentId: string;
    specializations: string[];
    createdAt: string;
    updatedAt: string;
  };
}

export const doctorApi = {
  // Get doctor profile
  getDoctorProfile: async (doctorId: string): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.DOCTORS.PROFILE}/${doctorId}`);
      console.log('Doctor Profile GET Response:', response);
      return response as DoctorProfileResponse;
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      throw error;
    }
  },

  // Create doctor profile
  createDoctorProfile: async (doctorData: DoctorProfessionalData): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.DOCTORS.PROFILE, doctorData);
      console.log('Doctor Profile POST Response:', response);
      return response as DoctorProfileResponse;
    } catch (error) {
      console.error('Error creating doctor profile:', error);
      throw error;
    }
  },

  // Update doctor profile
  updateDoctorProfile: async (doctorId: string, doctorData: Partial<DoctorProfessionalData>): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.put(`${API_ENDPOINTS.DOCTORS.PROFILE}/${doctorId}`, doctorData);
      console.log('Doctor Profile PUT Response:', response);
      return response as DoctorProfileResponse;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  },
};
