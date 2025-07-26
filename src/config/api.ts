// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net/api';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    SEND_OTP: '/Auth/send-otp',
    FORGOT_PASSWORD_SEND_OTP: '/Auth/forgot-password-send-otp',
    RESET_PASSWORD: '/Auth/reset-password',
  },
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  DOCTORS: '/doctors',
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 