// Types for API requests and responses
export interface LoginRequest {
  isLoginWithOtp: boolean;
  emailOrPhone: string;
  password?: string;
  otp?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  userId: string | null;
  accessToken: string | null;
}

export interface SignUpRequest {
  mobileNumber: string;
  roles: string;
}

export interface SignUpResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface OTPCheckerRequest {
  mobileNumber: string;
  otp: string;
}

export interface OTPCheckerResponse {
  success: boolean;
  message: string;
  userId?: string;
}

export interface UserProfileUpdateRequest {
  userId: string;
  email: string;
  password: string;
  fullName: string;
  gender: string;
  language: string;
  profilePictureUrl: string;
}

export interface UserProfileUpdateResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
}

import { API_BASE_URL, API_ENDPOINTS, DEFAULT_HEADERS } from '@/config/api';
import { SessionManager } from '@/utils/sessionManager';
import { CSRFProtection } from '@/utils/csrfProtection';

// API configuration

// Auth service class
export class AuthService {
  public static getAuthHeaders(): HeadersInit {
    const token = SessionManager.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    return CSRFProtection.addCSRFHeader(headers);
  }

  // Login with email/phone and password
  static async loginWithPassword(emailOrPhone: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        isLoginWithOtp: false,
        emailOrPhone: emailOrPhone,
        password: password,
        otp: ""
      } as LoginRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data as LoginResponse;
  }

  // Login with mobile and OTP
  static async loginWithOTP(mobile: string, otp: string): Promise<LoginResponse> {
    const payload = {
      isLoginWithOtp: true,
      emailOrPhone: mobile,
      password: "",
      otp: otp
    } as LoginRequest;
    
    console.log('Login with OTP request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`);
    console.log('Payload:', payload);
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Login Response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data as LoginResponse;
  }

  // Send OTP to mobile number
  static async sendOTP(mobile: string): Promise<{ success: boolean; message: string }> {
    console.log('Sending OTP request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.SEND_OTP}`);
    console.log('Payload:', { mobileNumber: mobile });
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.SEND_OTP}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ mobileNumber: mobile }),
    });

    const data = await response.json();
    console.log('OTP Response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate OTP');
    }

    return data;
  }

  // Forgot password - send OTP (using OTP generator API)
  static async forgotPasswordSendOTP(mobile: string): Promise<{ success: boolean; message: string; userId?: string }> {
    console.log('=== FORGOT PASSWORD OTP REQUEST ===');
    console.log('API URL:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.SEND_OTP}`);
    console.log('Payload:', { mobileNumber: mobile });
    console.log('Headers:', DEFAULT_HEADERS);
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.SEND_OTP}`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ mobileNumber: mobile }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Forgot password OTP response:', data);

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.message || 'Failed to send OTP');
      }

      console.log('=== OTP SENT SUCCESSFULLY ===');
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('=== FORGOT PASSWORD OTP ERROR ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Reset password (using profile update API only)
  static async resetPassword(mobile: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    console.log('=== RESET PASSWORD REQUEST ===');
    console.log('Mobile:', mobile);
    console.log('OTP:', otp);
    
    // Get userId from session (should be set during OTP verification in step 2)
    const userId = SessionManager.getUserId();
    if (!userId) {
      console.error('UserId not found in session. OTP verification may have failed.');
      throw new Error('User ID not found. Please verify OTP first.');
    }

    console.log('Reset password - Profile update request to:', `${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE_UPDATE}`);
    console.log('Payload:', { userId, password: newPassword });
    
    // Update password using profile update API
    const profileResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE_UPDATE}`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        userId: userId,
        email: '', // Keep existing email
        password: newPassword,
        fullName: '', // Keep existing name
        gender: '', // Keep existing gender
        language: '', // Keep existing language
        profilePictureUrl: '' // Keep existing profile picture
      }),
    });

    const profileData = await profileResponse.json();
    console.log('Profile update response:', profileData);

    if (!profileResponse.ok) {
      throw new Error(profileData.message || 'Failed to update password');
    }

    return profileData;
  }

  // Sign up with mobile and roles
  static async signUp(mobileNumber: string, roles: string): Promise<SignUpResponse> {
    console.log('Sign up request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.SIGN_UP}`);
    console.log('Payload:', { mobileNumber, roles });
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.SIGN_UP}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        mobileNumber: mobileNumber,
        roles: roles
      } as SignUpRequest),
    });

    const data = await response.json();
    console.log('Sign up response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to sign up');
    }

    return data as SignUpResponse;
  }

  // Check OTP for registration
  static async checkOTP(mobileNumber: string, otp: string): Promise<OTPCheckerResponse> {
    console.log('OTP check request to:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.OTP_CHECKER}`);
    console.log('Payload:', { mobileNumber, otp });
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.OTP_CHECKER}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        mobileNumber: mobileNumber,
        otp: otp
      } as OTPCheckerRequest),
    });

    const data = await response.json();
    console.log('OTP check response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify OTP');
    }

    return data as OTPCheckerResponse;
  }

  // Update user profile
  static async updateUserProfile(profileData: UserProfileUpdateRequest): Promise<UserProfileUpdateResponse> {
    console.log('Profile update request to:', `${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE_UPDATE}`);
    console.log('Payload:', profileData);
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.USER.PROFILE_UPDATE}`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    console.log('Profile update response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    return data as UserProfileUpdateResponse;
  }

  // Logout
  static logout(): void {
    SessionManager.clearSession();
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return SessionManager.isAuthenticated();
  }

  // Get access token
  static getAccessToken(): string | null {
    return SessionManager.getToken();
  }

  // Set access token
  static setAccessToken(token: string): void {
    SessionManager.setToken(token);
  }
}

// Generic API helper for authenticated requests
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...AuthService.getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data as T;
};
