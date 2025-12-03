import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Interfaces for user profile API
export interface UserProfileUpdateRequest {
  userId: string;
  mobileNumber: string;
  isActive: boolean;
  fullName: string;
  gender: string;
  language?: string;
  profilePictureURL: string;
  employeeID: string;
  dateOfBirth: string;
  bloodGroup: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

export interface UserProfileUpdateResponse {
  success: boolean;
  message: string;
  userId: string;
  updatedAt: string;
  updatedFields: string[];
  errors: string[];
}

export interface UserAuth {
  userAuthId: string;
  loginMethod: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lastLoginIP: string;
  lastLoginTime: string;
  passwordSetAt: string;
  createdAt: string;
}

export interface UserProfileDetails {
  userProfileId: string;
  fullName: string;
  gender: string;
  language: string;
  profilePictureURL: string;
  employeeID: string;
  dateOfBirth: string;
  bloodGroup: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  profileCompletionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetailsResponse {
  userId: string;
  mobileNumber: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  userAuth: UserAuth;
  userProfile: UserProfileDetails;
}

// User Profile API service
export const userProfileApi = {
  // Get user details by userId
  getUserDetails: async (userId: string): Promise<UserDetailsResponse> => {
    return apiClient.get(API_ENDPOINTS.USER.GET_DETAILS(userId));
  },

  // Update user details
  updateUserDetails: async (data: UserProfileUpdateRequest): Promise<UserProfileUpdateResponse> => {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_DETAILS, data);
  },
};
