// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/user/login',
    SEND_OTP: 'auth/otp/send',
    SIGN_UP: '/auth/user/register',
    ONBOARDING_REGISTER: '/auth/user/onboarding/register',
    OTP_CHECKER: '/auth/otp/verify',    
    SET_PASSWORD: '/auth/user/password?scope=set-password',
    RESET_PASSWORD: '/auth/user/password?scope=reset-password',
  },
  USER: {    
    PERMISSIONS: '/user/permissions',
    PROFILE_PHOTO: {
      UPLOAD: '/user/profile/photo/upload',
      FINALIZE: '/user/profile/photo/finalize',
      DELETE: '/user/profile/photo',
    },
  },
  HOSPITALS: {
    REGISTER: '/hospitals/register',
    GET_BY_ID: (id: string) => `/hospitals/${id}`,
    GET_BY_USER_ID: (userId: string) => `/hospitals/users/${userId}`,
  },
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 