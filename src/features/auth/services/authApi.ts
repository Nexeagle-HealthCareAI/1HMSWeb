import { apiClient, ApiResponse } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

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

export interface OnboardingRegisterRequest {
  fullName: string;
  userRole: string;
  mobileNumber: string;
  email?: string;
  password: string;
  onboardingToken: string;
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
  isSmsSent: boolean;
  isEmailSent: boolean;
  message: string;
  userId: string;
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

export interface UserPermissionsRequest {
  userId: string;
}

export interface UserPermissionsResponse {
  roleId: string;
  roleName: string; // e.g., AdminDoctor
  description?: string;
  permissionKeys: string[];
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  success: boolean;
  message: string;
  name: string | null;
  roleName: string | null;
  email: string | null;
  mobile: string;
  invitationId?: string;
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

  // Onboarding Register
  onboardingRegister: (data: OnboardingRegisterRequest): Promise<AuthResponse> => {
    return apiClient.post(API_ENDPOINTS.AUTH.ONBOARDING_REGISTER, data);
  }, 

  // Send OTP
  sendOTP: (data: SendOTPRequest): Promise<SendOTPResponse> => {
    return apiClient.post(API_ENDPOINTS.AUTH.SEND_OTP, data);
  },

  // Verify OTP
  verifyOTP: (data: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
    return apiClient.post(API_ENDPOINTS.AUTH.OTP_CHECKER, data);
  },
    // Set password (for registration)
  setPassword: (data: SetPasswordRequest): Promise<SetPasswordResponse> => {
    return apiClient.patch(API_ENDPOINTS.AUTH.SET_PASSWORD, data);
  },

  // Reset password with userId (for forgot password)
  resetPasswordWithUserId: (data: ResetPasswordWithUserIdRequest): Promise<ResetPasswordWithUserIdResponse> => {
    return apiClient.patch(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  // Get user permissions
  getUserPermissions: (data: UserPermissionsRequest): Promise<UserPermissionsResponse> => {
    return apiClient.get(`${API_ENDPOINTS.USER.PERMISSIONS}?userId=${data.userId}`);
  },

  // Validate onboarding token
  validateToken: (data: ValidateTokenRequest): Promise<ValidateTokenResponse> => {
    return apiClient.get(`${API_ENDPOINTS.USER_MANAGEMENT.VALIDATE_TOKEN}?token=${encodeURIComponent(data.token)}`);
  }
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
