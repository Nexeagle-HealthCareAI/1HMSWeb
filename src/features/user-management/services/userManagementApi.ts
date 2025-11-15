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
  invitationId: string;
  lastLogin: string;
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
    isActive: boolean;
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

export interface UpdateInvitedUserRequest {
  invitationId: string;
  userId: string;
}

export interface UpdateInvitedUserResponse {
  success: boolean;
  message: string;
  invitationId: string;
  hospitalId: string;
  userId: string;
  createdHospitalUserLink: boolean;
  invitationStatus: string;
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

  // Get onboarded users
  getOnboardedUsers: (): Promise<OnboardedUser[]> => {
    // TODO: Replace with actual API call when endpoint is ready
    return apiClient.get(API_ENDPOINTS.USER_MANAGEMENT.GET_ONBOARDED_USERS);
  },

  // Get all users associated with a hospital
  getAllUsers: (hospitalId: string): Promise<AllUsersResponse> => {
    return apiClient.get(`${API_ENDPOINTS.USER_MANAGEMENT.GET_ALL_USERS}?hospitalId=${hospitalId}`);
  },

  // Deactivate a user
  deactivateUser: (data: DeactivateUserRequest): Promise<DeactivateUserResponse> => {
    return apiClient.patch(API_ENDPOINTS.USER_MANAGEMENT.DEACTIVATE_USER, data);
  },

  // Update invited user after OTP verification
  updateInvitedUser: (data: UpdateInvitedUserRequest): Promise<UpdateInvitedUserResponse> => {
    return apiClient.post(API_ENDPOINTS.USER_MANAGEMENT.UPDATE_INVITED_USER, data);
  }
};
