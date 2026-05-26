import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types
export interface HospitalRegistrationRequest {
  userId: string;
  name: string;
  type: string;
  registrationNumber: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
}

export interface HospitalRegistrationResponse {
  success: boolean;
  message: string;
  hospitalId: string;
  hospitalUserId: string;
}

export interface HospitalUpdateRequest {
  name: string;
  type: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  registrationNumber: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
}

export interface HospitalUpdateResponse {
  success: boolean;
  message: string;
  hospitalId: string;
}

export interface HospitalProfileStatus {
  isBasicInfoComplete: boolean;
  isContactInfoComplete: boolean;
  isLocationInfoComplete: boolean;
  profileCompletionPercent: number;
  lastUpdatedAt: string;
}

export interface HospitalData {
  hospitalId: string;
  name: string;
  type: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  registrationNumber: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
  isActive: boolean;
  createdAt: string;
  lastUpdatedAt: string;
  profileStatus: HospitalProfileStatus;
}

// API Functions
export const hospitalApi = {
  /**
   * Get hospital-user record by userId
   */
  getHospitalUserByUserId: async (
    userId: string
  ): Promise<{ hospitalUserId: string; hospitalId: string; userId: string; employeeID: string; isPrimary: string; createdAt: string }> => {
    return apiClient.get(API_ENDPOINTS.HOSPITALS.GET_BY_USER_ID(userId));
  },
  /**
   * Register a new hospital
   */
  registerHospital: async (data: HospitalRegistrationRequest): Promise<HospitalRegistrationResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.HOSPITALS.REGISTER, data);
    return response;
  },

  /**
   * Get hospital by ID
   */
  getHospitalById: async (hospitalId: string): Promise<HospitalData> => {
    const response = await apiClient.get(API_ENDPOINTS.HOSPITALS.GET_BY_ID(hospitalId));
    return response;
  },

  /**
   * Update an existing hospital
   */
  updateHospital: async (
    hospitalId: string,
    data: HospitalUpdateRequest
  ): Promise<HospitalUpdateResponse> => {
    const response = await apiClient.put(API_ENDPOINTS.HOSPITALS.GET_BY_ID(hospitalId), data);
    return response;
  },
};
