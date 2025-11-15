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
    doctorDepartments: any;
  
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
  
}

export const doctorApi = {
  // Update doctor professional info (new API spec)
  updateDoctorProfessional: async (doctorId: string, payload: {
  userId: string;
  hospitalDepartmentMappingId: string;
  licenseNumber: string;
  qualification: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartment: string;
  department: string;
  specializations: string[];
}) => {
    try {
      const response = await apiClient.put(
        'https://easyhmsapisevices-gcb4btbthmaedaex.centralindia-01.azurewebsites.net/doctors/profile',
        payload,
        {
          headers: {
            'accept': 'text/plain',
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Doctor Professional PUT Response:', response);
      return response;
    } catch (error) {
      console.error('Error updating doctor professional:', error);
      throw error;
    }
  },
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
};
