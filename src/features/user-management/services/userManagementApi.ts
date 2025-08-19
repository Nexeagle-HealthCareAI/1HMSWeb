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

export interface ManageInvitationRequest {
  invitationId: string;
  scope: 'resend' | 'revoke';
  performedByUserId: string;
}

export interface ManageInvitationResponse {
  success: boolean;
  invitationId: string;
  newRegistrationUrl: string;
  status: string;
  expiresAt: string;
  message: string;
}

export interface InvitedUser {
  invitationId: string;
  hospitalId: string;
  roleId: string;
  roleName: string;
  recipientName: string;
  recipientMobile: string;
  recipientEmail: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
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

  // Get invited users with scope filtering
  getInvitedUsers: (hospitalId: string, scope: 'Pending' | 'Accepted' | 'Revoked' | 'ALL' = 'ALL'): Promise<{ success: boolean; message: string; invitations: InvitedUser[] }> => {
    // Convert scope to API expected values
    let apiScope: string;
    switch (scope) {
      case 'Revoked':
        apiScope = 'revoke';
        break;
      case 'ALL':
        apiScope = 'all';
        break;
      default:
        apiScope = scope.toLowerCase();
    }
    const url = `${API_ENDPOINTS.USER_MANAGEMENT.GET_INVITED_USERS}?hospitalId=${hospitalId}&scope=${apiScope}`;
    return apiClient.get(url);
  },

  // Manage invitation (resend or revoke)
  manageInvitation: (data: ManageInvitationRequest): Promise<ManageInvitationResponse> => {
    const url = `${API_ENDPOINTS.USER_MANAGEMENT.MANAGE_INVITATION}?invitationId=${data.invitationId}&scope=${data.scope}&performedByUserId=${data.performedByUserId}`;
    return apiClient.post(url);
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
