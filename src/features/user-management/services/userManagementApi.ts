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

export interface InviteUserRequest {
  hospitalId: string;
  roleId: string;
  name: string;
  mobile: string;
  email: string;
  invitedByUserId: string;
}

export interface InviteUserResponse {
  success: boolean;
  invitationId: string;
  registrationUrl: string;
  message: string;
}

export interface InvitedUser {
  invitationId: string;
  name: string;
  email: string;
  mobile: string;
  roleName: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
}

export interface OnboardedUser {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  roleName: string;
  status: 'active' | 'inactive';
  onboardedAt: string;
  lastLogin: string;
}

// User Management API service
export const userManagementApi = {
  // Get all roles from the system
  getAllRoles: (): Promise<RolesResponse> => {
    return apiClient.get(API_ENDPOINTS.USER.PERMISSIONS);
  },

  // Invite a new user
  inviteUser: (data: InviteUserRequest): Promise<InviteUserResponse> => {
    return apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.INVITE_USER, data);
  },

  // Get invited users (mock data for now)
  getInvitedUsers: (): Promise<InvitedUser[]> => {
    // TODO: Replace with actual API call when endpoint is ready
    // return apiClient.get(API_ENDPOINTS.USER_MANAGEMENT.GET_INVITED_USERS);
    
    // Mock data for development
    return Promise.resolve([
      {
        invitationId: '1',
        name: 'Dr. John Doe',
        email: 'john.doe@hospital.com',
        mobile: '+1-555-0101',
        roleName: 'Doctor',
        status: 'pending',
        invitedBy: 'Admin User',
        invitedAt: '2024-01-15T10:00:00Z',
        expiresAt: '2024-01-22T10:00:00Z'
      },
      {
        invitationId: '2',
        name: 'Nurse Jane Smith',
        email: 'jane.smith@hospital.com',
        mobile: '+1-555-0102',
        roleName: 'Nurse',
        status: 'accepted',
        invitedBy: 'Admin User',
        invitedAt: '2024-01-14T09:00:00Z',
        expiresAt: '2024-01-21T09:00:00Z'
      }
    ]);
  },

  // Get onboarded users (mock data for now)
  getOnboardedUsers: (): Promise<OnboardedUser[]> => {
    // TODO: Replace with actual API call when endpoint is ready
    // return apiClient.get(API_ENDPOINTS.USER_MANAGEMENT.GET_ONBOARDED_USERS);
    
    // Mock data for development
    return Promise.resolve([
      {
        userId: '1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@hospital.com',
        mobile: '+1-555-0103',
        roleName: 'Doctor',
        status: 'active',
        onboardedAt: '2024-01-10T08:00:00Z',
        lastLogin: '2024-01-15T09:30:00Z'
      },
      {
        userId: '2',
        name: 'Nurse Maria Garcia',
        email: 'maria.garcia@hospital.com',
        mobile: '+1-555-0104',
        roleName: 'Nurse',
        status: 'active',
        onboardedAt: '2024-01-08T10:00:00Z',
        lastLogin: '2024-01-15T08:15:00Z'
      }
    ]);
  }
};
