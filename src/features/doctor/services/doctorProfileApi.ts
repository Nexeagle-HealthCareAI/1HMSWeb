import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

// New request interfaces based on the provided API structure
export interface CreateDoctorProfileRequest {
  userId: string;
  licenseNumber: string;
  qualification: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartment: string;
  department: string;
  specializations: string[];
  hospitalId: string;
}

export interface UpdateDoctorProfileRequest {
  userId: string;
  licenseNumber: string;
  qualification: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartment: string;
  department: string;
  specializations: string[];
}

// New response interface based on the provided API structure
export interface DoctorDepartment {
  doctorDepartmentId: string;
  departmentId: string;
  departmentName: string;
  departmentDescription: string;
  assignedAt: string;
}

export interface DoctorSpecialization {
  doctorSpecializationId: string;
  specializationId: string;
  specializationName: string;
  specializationDescription: string;
  assignedAt: string;
}

export interface DoctorProfileResponse {
  doctorId: string;
  userId: string;
  licenseNumber: string;
  qualifications: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartmentID: string;
  primaryDepartmentName: string;
  profileCompletionPercentage: number;
  createdAt: string;
  doctorDepartments: DoctorDepartment[];
  doctorSpecializations: DoctorSpecialization[];
}

// Legacy interface for backward compatibility
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

export const doctorProfileApi = {
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
  createDoctorProfile: async (doctorData: CreateDoctorProfileRequest): Promise<DoctorProfileResponse> => {
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
  updateDoctorProfile: async (doctorId: string, doctorData: UpdateDoctorProfileRequest): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.put(`${API_ENDPOINTS.DOCTORS.PROFILE}/profile`, doctorData);
      console.log('Doctor Profile PUT Response:', response);
      return response as DoctorProfileResponse;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  },
};
