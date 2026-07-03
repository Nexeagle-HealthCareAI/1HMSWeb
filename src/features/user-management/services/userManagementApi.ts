import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types
export interface Role {
  roleId: string;
  roleName: string;
}

export interface RolesResponse {
  allRoles: Role[];
}

export interface QuickAddUserRequest {
  fullName: string;
  mobileNumber: string;
  email?: string;
  password: string;
  role: string;
  hospitalId: string;
  employeeId?: string;
  // Doctor-only (required when role is Doctor/AdminDoctor)
  licenseNumber?: string;
  qualification?: string[];
  experienceYears?: number;
  medicalCouncil?: string;
  department?: string;
  specializations?: string[];
  consultFee?: number;
}

export interface QuickAddUserResponse {
  success?: boolean;
  message?: string;
  userId?: string;
}

export interface AdminUpdateUserRequest {
  userId: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  roles: string[];
  hospitalId: string;
  employeeId?: string;
  licenseNumber?: string;
  qualification?: string[];
  experienceYears?: number;
  medicalCouncil?: string;
  department?: string;
  specializations?: string[];
  consultFee?: number;
}

export interface AdminUpdateUserResponse {
  success: boolean;
  message: string;
  userId?: string;
}

export interface ShareCredentialsRequest {
  hospitalId: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  password: string;
  roleName?: string;
  viaWhatsApp: boolean;
  viaEmail: boolean;
}

export interface ShareCredentialsResponse {
  success: boolean;
  whatsAppSent?: boolean | null;
  emailSent?: boolean | null;
  message: string;
}

export interface ResetCredentialsRequest {
  hospitalId: string;
  userId: string;
}

export interface ResetCredentialsResponse {
  success: boolean;
  message: string;
  tempPassword?: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  roleName?: string;
}

export interface AllUsersResponse {
  hospitalId: string;
  users: {
    userId: string;
    fullName: string;
    mobileNumber: string;
    email: string;
    employeeID: string;
    isPrimary: boolean;
    usersStatusId: number;
    roles: {
      roleId: string;
      roleName: string;
    }[];
    permissionKeys: string[];
    lastLoginTime?: string;
  }[];
}

export interface DeactivateUserRequest {
  hospitalId: string;
  userId: string;
  performedByUserId: string;
}

export interface DeactivateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  hospitalId: string;
}

// User Management API service
export const userManagementApi = {
  // Get all roles from the system
  getAllRoles: (): Promise<RolesResponse> => {
    return apiClient.get(API_ENDPOINTS.USER.PERMISSIONS);
  },

  // Quick-add a team member directly (no invitation link / OTP).
  quickAddUser: (data: QuickAddUserRequest): Promise<QuickAddUserResponse> => {
    return apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.QUICK_ADD_USER, data);
  },

  // Update a team member's details
  updateUser: (data: AdminUpdateUserRequest): Promise<AdminUpdateUserResponse> => {
    return apiClient.put('admin/users/update', data);
  },

  // Send a newly added member their login details via email and/or WhatsApp.
  shareCredentials: (data: ShareCredentialsRequest): Promise<ShareCredentialsResponse> => {
    return apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.SHARE_CREDENTIALS, data);
  },

  // Reset an existing member's password to a fresh temporary one (returned once) for re-sharing.
  resetCredentials: (data: ResetCredentialsRequest): Promise<ResetCredentialsResponse> => {
    return apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.RESET_CREDENTIALS, data);
  },

  // Get all users associated with a hospital
  getAllUsers: (hospitalId: string): Promise<AllUsersResponse> => {
    return apiClient.get(`${API_ENDPOINTS.USER_MANAGEMENT.GET_ALL_USERS}?hospitalId=${hospitalId}`);
  },

  // Deactivate a user
  deactivateUser: (data: DeactivateUserRequest): Promise<DeactivateUserResponse> => {
    return apiClient.patch(API_ENDPOINTS.USER_MANAGEMENT.DEACTIVATE_USER, data);
  },
};
