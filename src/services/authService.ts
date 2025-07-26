// Types for API requests and responses
export interface LoginRequest {
  isEmailUsed: boolean;
  emailAddress?: string;
  password?: string;
  mobileNumber?: string;
  otp?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
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

  // Login with email and password
  static async loginWithEmail(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        isEmailUsed: true,
        emailAddress: email,
        password: password,
        mobileNumber: "",
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
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        isEmailUsed: false,
        emailAddress: "",
        password: "",
        mobileNumber: mobile,
        otp: otp
      } as LoginRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data as LoginResponse;
  }

  // Send OTP to mobile number
  static async sendOTP(mobile: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.SEND_OTP}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ mobileNumber: mobile }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
  }

  // Forgot password - send OTP
  static async forgotPasswordSendOTP(mobile: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.FORGOT_PASSWORD_SEND_OTP}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ mobileNumber: mobile }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
  }

  // Reset password
  static async resetPassword(mobile: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.RESET_PASSWORD}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        mobileNumber: mobile,
        otp: otp,
        newPassword: newPassword
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }

    return data;
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
