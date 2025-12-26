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
    GET_PATIENT_VITALS: (patientId: string, appointmentId: string) =>
      `/e-prescription/patient-details/vitals?patientId=${encodeURIComponent(patientId)}&appointmentId=${encodeURIComponent(appointmentId)}`,
    PERSONALIZED_DATA: (doctorId: string, hospitalId?: string, lookupType?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      if (lookupType) {
        params.push(`lookupType=${encodeURIComponent(lookupType)}`);
      }
      return `/e-prescription/configuration/personalized-data?${params.join('&')}`;
    },
    MEDICINE_DOCTOR_PREFERENCE: '/medicines/doctor-preference',
    MEDICINE_DOCTOR_PREFERENCE_LIST: (doctorId: string, hospitalId: string) =>
      `/medicines/doctor-preference/doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    PERSONALIZED_MEDICINE: (doctorId: string, hospitalId: string) =>
      `/e-prescription/configuration/personalized-medicine/doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    LOOKUP_SEARCH: (lookupType: string, hospitalId: string, doctorId: string, searchText: string) =>
      `/e-prescription/lookup/search?lookupType=${encodeURIComponent(lookupType)}&hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&searchText=${encodeURIComponent(searchText)}`,
    LOOKUP_DETAILS: (hospitalId: string, doctorId: string) =>
      `/e-prescription/lookup/details?hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}`,
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
    SAVE_VITALS: 'appointments/patient-vitals',
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
    GENERATE_DETAILS: 'e-prescription/generate-prescription-details',
    GET_SETTINGS: (doctorId: string, hospitalId?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      return `prescription-settings?${params.join('&')}`;
    },
  },
  ATTACHMENTS: {
    UPLOAD: 'e-prescription/attachments/upload',
    LIST: (appointmentId: string, hospitalId: string, doctorId: string, patientId: string) =>
      `e-prescription/attachments/list?appointmentId=${encodeURIComponent(appointmentId)}&hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&patientId=${encodeURIComponent(patientId)}`,
    DELETE: (attachmentId: string) => `e-prescription/attachments/delete?AttachmentId=${encodeURIComponent(attachmentId)}`,
  },
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 