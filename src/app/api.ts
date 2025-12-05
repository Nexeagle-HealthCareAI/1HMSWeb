const ensureProtocol = (url: string): string =>
  !url ? url : (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const trimEnd = (s: string) => s.replace(/\/+$/, '');
const trimStart = (s: string) => s.replace(/^\/+/, '');
const join = (base: string, path: string) => `${trimEnd(base)}/${trimStart(path)}`;

const rawApiUrl = import.meta.env.VITE_API_BASE_URL
  || 'easyhmsapiservices-bgasabd9ddbbdden.centralindia-01.azurewebsites.net';

export const API_BASE_URL = ensureProtocol(rawApiUrl);

// API Endpoints
export const API_ENDPOINTS = {
  E_PRESCRIPTION: {
    GET_FIELD_PREFERENCES: (doctorId: string, hospitalId?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      return `/e-prescription/configuration/preference-setting/${params.join('&')}`;
    },
    UPDATE_FIELD_PREFERENCES: (doctorId: string, hospitalId?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      return `/e-prescription/configuration/update-preference-setting/${params.join('&')}`;
    },
  },
  AUTH: {
    LOGIN: 'auth/user/login',
    SEND_OTP: 'auth/otp/send',
    SIGN_UP: 'auth/user/register',
    ONBOARDING_REGISTER: 'auth/user/onboarding/register',
    OTP_CHECKER: 'auth/otp/verify',    
    SET_PASSWORD: 'auth/user/password?scope=set-password',
    RESET_PASSWORD: 'auth/user/password?scope=reset-password',
  },
  USER: {    
    PERMISSIONS: 'user/permissions',
    GET_DETAILS: (userId: string) => `user/get-user-details?userId=${userId}`,
    UPDATE_DETAILS: 'user/update-user-details',
    UPLOAD_PROFILE_PICTURE: 'user/profile-picture/upload',
    GET_PROFILE_PICTURE: (userId: string) => `user/profile-picture/${userId}`,
    REMOVE_PROFILE_PICTURE: 'user/profile-picture/remove',
  },
  HOSPITALS: {
    REGISTER: 'hospitals/register',
    GET_BY_ID: (id: string) => `hospitals/${id}`,
    GET_BY_USER_ID: (userId: string) => `hospitals/users/${userId}`,
  },
  DEPARTMENTS: {
    GLOBAL: 'departments/global',
  },
  SPECIALIZATIONS: {
    BY_DEPARTMENT: 'doctors/specializations',
  },
  DOCTORS: {
    PROFILE: 'doctors',
    GET_ALL: 'doctors',
    GET_BY_ID: (id: string) => `doctors/${id}`,
    CREATE: 'doctors',    
    GET_PROFILE: 'doctors/profile',
    UPDATE_PROFILE: 'doctors/profile',    
    GET_STATS: 'doctors/stats',    
    GET_TODAY_APPOINTMENTS: 'doctors/appointments/today',    
    CREATE_PRESCRIPTION: 'doctors/prescriptions',
    GET_DASHBOARD: 'doctors/dashboard',
    UPDATE_AVAILABILITY: 'doctors/availability',
    GET_AVAILABLE_SLOTS: (date: string) => `doctors/available-slots/${date}`,
    UPDATE_PRESCRIPTION_SETTINGS: () => `prescription/prescription-settings`,
    GET_PRESCRIPTION_SETTINGS: (id: string) => `prescription/prescription-settings?doctorId=${id}`,
    RESET_PRESCRIPTION_SETTINGS: (id: string) => `prescription/prescription-settings/reset?doctorId=${id}`,
  },
  USER_MANAGEMENT: {
    INVITE_USER: 'admin/user-onboarding/invitations?scope=new',
    GET_INVITED_USERS: 'admin/user-onboarding/invitations',
    GET_ONBOARDED_USERS: 'admin/users/onboarded',
    GET_ALL_USERS: 'admin/user-onboarding/allusers',
    MANAGE_INVITATION: 'admin/user-onboarding/invitations/manage',
    DEACTIVATE_USER: 'admin/user-onboarding/deactivate-user',
    UPDATE_INVITED_USER: 'admin/user-onboarding/invited/Update-user',
    VALIDATE_TOKEN: 'admin/user-onboarding/validate',
  },
  APPOINTMENTS: {
    
  },
  PATIENTS: {
    // Patient Profile API endpoints
    GET_PROFILE_DETAILS: (hospitalId: string, patientId: string) => `patient-profile?hospitalId=${hospitalId}&patientId=${patientId}`,
    UPDATE_PROFILE_DETAILS: (hospitalId: string, patientId: string) => `patient-profile?hospitalId=${hospitalId}&patientId=${patientId}`,
  },  
  CALENDAR: {
          GET_DOCTOR_TIMEOFF: (doctorId: string, hospitalId: string) => `calendar/doctor/timeoff?doctorId=${doctorId}&hospitalId=${hospitalId}`,
              CREATE_DOCTOR_TIMEOFF: 'calendar/doctor/timeoff',
              DELETE_DOCTOR_TIMEOFF: (timeOffId: string) => `calendar/doctor/timeoff/${timeOffId}`,
              GET_DOCTOR_CONFIG: (doctorId: string, hospitalId: string, startDate: string, days: number) => `calendar/doctor/config?doctorId=${doctorId}&hospitalId=${hospitalId}&startDate=${encodeURIComponent(startDate)}&daysCount=${days}`,
    CREATE_DOCTOR_OVERRIDE: 'calendar/doctor/override',
    DELETE_DOCTOR_OVERRIDE: (overrideId: string) => `calendar/doctor/override/${overrideId}`,
   },
  PRESCRIPTION: {
    UPLOAD_ASSET: 'prescription/assets/upload',
    GET_ASSETS: (doctorId: string) => `prescription/assets?doctorId=${doctorId}`,
    DELETE_ASSET: 'prescription/assets/remove',
    UPLOAD_TEMPLATE: 'prescription-settings/upload-template',
    UPDATE_SETTINGS: 'prescription-settings',
    GET_SETTINGS: (doctorId: string, hospitalId?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      return `prescription-settings?${params.join('&')}`;
    },
  },
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 