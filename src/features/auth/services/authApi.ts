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
  success: boolean;
  message: string;
  role: string;
  permissions: string[];
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
  }
};

// Utility function to fetch and store user permissions
export const fetchAndStoreUserPermissions = async (userId: string, token: string) => {
  try {
    // Set token for the API call
    const authStore = useAuthStore.getState();
    authStore.setToken(token);
    
    // Fetch permissions
    const response = await authApi.getUserPermissions({ userId });
    
    if (response.success) {
      // Store role and permissions
      authStore.setUserRole(response.role);
      authStore.setPermissions(response.permissions);
      
      console.log('✅ Permissions fetched and stored:', {
        role: response.role,
        permissions: response.permissions
      });
      
      return response;
    } else {
      console.error('❌ Failed to fetch permissions:', response.message);
      throw new Error(response.message || 'Failed to fetch permissions');
    }
  } catch (error) {
    console.error('❌ Error fetching permissions:', error);
    throw error;
  }
};
