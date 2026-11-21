import { apiClient, ApiResponse } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';
import { clearDevOtp, rememberDevOtp } from './devOtp';

// Types
export interface LoginRequest {
  isLoginWithOtp: boolean;
  emailOrPhone: string;
  password: string;
  otp: string;
}

export interface RegisterRequest {
  mobileNumber: string;
  roles: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  userId: string | null;
  accessToken: string | null;
}

export interface SendOTPRequest {
  mobileNumber: string;
}

export interface SendOTPResponse {
  success: boolean;
  isWhatsappSent: boolean;
  isEmailSent: boolean;
  message: string;
  userId: string;
  /** Dev server + tester number only: the code itself, shown on the page (nothing is sent). */
  devCode?: string | null;
}

export interface VerifyOTPRequest {
  mobileNumber: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  userId: string;
  accessToken: string;
}

export interface ForgotPasswordRequest {
  mobileNumber: string;
}

export interface ResetPasswordRequest {
  mobileNumber: string;
  otp: string;
  newPassword: string;
}

export interface SetPasswordRequest {
  userId: string;
  // The admin's own name (saved on their profile).
  fullName?: string;
  email: string;
  password: string;
}

export interface SetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordWithUserIdRequest {
  userId: string;
  email: string;
  password: string;
}

export interface ResetPasswordWithUserIdResponse {
  success: boolean;
  message: string;
}

// Change password from an authenticated session (My Profile) — the backend resolves the
// target user from the caller's own JWT, so no userId is sent here.
export interface ChangePasswordRequest {
  currentPassword: string;
  password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface UserPermissionsRequest {
  userId: string;
}

export interface UserPermissionsResponse {
  roleId: string;
  roleName: string; // e.g., AdminDoctor
  description?: string;
  permissionKeys: string[];
}

// Auth API service
export const authApi = {
  // Login
  login: (data: LoginRequest): Promise<AuthResponse> => {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
  },

  // Register
  register: (data: RegisterRequest): Promise<AuthResponse> => {
    return apiClient.post(API_ENDPOINTS.AUTH.SIGN_UP, data);
  },

  // Send OTP
  sendOTP: async (data: SendOTPRequest): Promise<SendOTPResponse> => {
    const response = await apiClient.post<SendOTPResponse>(API_ENDPOINTS.AUTH.SEND_OTP, data);
    // A tester number on the Dev server gets its code back here; the code-entry screen shows it (devOtp.ts).
    rememberDevOtp(data.mobileNumber, response?.devCode);
    return response;
  },

  // Verify OTP
  verifyOTP: async (data: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
    const response = await apiClient.post<VerifyOTPResponse>(API_ENDPOINTS.AUTH.OTP_CHECKER, data);
    if (response?.success) clearDevOtp();
    return response;
  },
    // Set password (for registration)
  setPassword: (data: SetPasswordRequest): Promise<SetPasswordResponse> => {
    return apiClient.patch(API_ENDPOINTS.AUTH.SET_PASSWORD, data);
  },

  // Reset password with userId (for forgot password)
  resetPasswordWithUserId: (data: ResetPasswordWithUserIdRequest): Promise<ResetPasswordWithUserIdResponse> => {
    return apiClient.patch(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  // Change password from My Profile (requires the current password)
  changePassword: (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    return apiClient.patch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  // Get user permissions
  getUserPermissions: (data: UserPermissionsRequest): Promise<UserPermissionsResponse> => {
    return apiClient.get(`${API_ENDPOINTS.USER.PERMISSIONS}?userId=${data.userId}`);
  },
};

// Utility function to fetch and store user permissions
export const fetchAndStoreUserPermissions = async (userId: string, token: string) => {
  try {
    // Set token for the API call
    const authStore = useAuthStore.getState();
    authStore.setToken(token);
    
    // Fetch permissions
    const perms = await authApi.getUserPermissions({ userId });
    if (perms && perms.roleName) {
      // Use the original role name from API
      authStore.setUserRole(perms.roleName);
      authStore.setPermissions(perms.permissionKeys || []);
      
      return { success: true, message: 'ok', role: perms.roleName, permissions: perms.permissionKeys || [] } as any;
    } else {     
      return { success: false, message: 'empty', role: '', permissions: [] } as any;
    }
  } catch (error) {    
    return { success: false, message: 'Failed to fetch permissions', role: '', permissions: [] } as any;
  }
};
