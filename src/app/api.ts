// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/user/login',
    SEND_OTP: 'auth/otp/send',
    SIGN_UP: '/auth/user/register',
    OTP_CHECKER: '/auth/otp/verify',    
    SET_PASSWORD: '/auth/user/password?scope=set-password',
    RESET_PASSWORD: '/auth/user/password?scope=reset-password',
  },
  USER: {
    PROFILE_UPDATE: '/User/update-user-details',
  },
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  DOCTORS: '/doctors',
  BILLING: '/billing',
  MESSAGING: '/messaging',
  AI: '/ai',
  HOSPITAL: '/hospital',
  REPORTS: '/reports',
  PRESCRIPTIONS: '/prescriptions',
  CALENDAR: '/calendar',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings'
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 