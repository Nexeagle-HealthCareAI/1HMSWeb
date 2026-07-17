const ensureProtocol = (url: string): string =>
  !url ? url : (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const trimEnd = (s: string) => s.replace(/\/+$/, '');
const trimStart = (s: string) => s.replace(/^\/+/, '');
const join = (base: string, path: string) => `${trimEnd(base)}/${trimStart(path)}`;

const rawApiUrl = import.meta.env.VITE_API_BASE_URL
  || 'http://151.185.45.77:5001';

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
    VOICE_PARSE: '/e-prescription/voice/parse',
    GET_FIELD_LAYOUT: (doctorId: string) =>
      `/e-prescription/configuration/field-layout/doctorId=${encodeURIComponent(doctorId)}`,
    UPDATE_FIELD_LAYOUT: (doctorId: string) =>
      `/e-prescription/configuration/field-layout/doctorId=${encodeURIComponent(doctorId)}`,
    GET_PATIENT_VITALS: (patientId: string, appointmentId: string) =>
      `/e-prescription/patient-details/vitals?patientId=${encodeURIComponent(patientId)}&appointmentId=${encodeURIComponent(appointmentId)}`,
    PERSONALIZED_DATA: (doctorId: string, hospitalId?: string, lookupType?: string, source?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      if (lookupType) {
        params.push(`lookupType=${encodeURIComponent(lookupType)}`);
      }
      if (source) {
        params.push(`source=${encodeURIComponent(source)}`);
      }
      return `/e-prescription/configuration/personalized-data?${params.join('&')}`;
    },
    MEDICINE_DOCTOR_PREFERENCE: (source?: string) => source ? `/medicines/doctor-preference?source=${encodeURIComponent(source)}` : '/medicines/doctor-preference',
    MEDICINE_DOCTOR_PREFERENCE_LIST: (doctorId: string, hospitalId: string) =>
      `/medicines/doctor-preference/doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    PERSONALIZED_MEDICINE: (doctorId: string, hospitalId: string) =>
      `/e-prescription/configuration/personalized-medicine/doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    MEDICINE_SEARCH: (hospitalId: string, doctorId: string, searchText: string) =>
      `/medicines/search?hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&searchText=${encodeURIComponent(searchText)}`,
    SAVE_DRAFT: (actionType: string = 'draft') => `/e-prescription/details/actionType=${actionType}`,
    GET_DRAFT: (appointmentId: string, patientId: string, doctorId: string, hospitalId: string) =>
      `/e-prescription/details/appointmentId=${encodeURIComponent(appointmentId)}&patientId=${encodeURIComponent(patientId)}&doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    LOOKUP_SEARCH: (lookupType: string, hospitalId: string, doctorId: string, searchText: string) =>
      `/e-prescription/lookup/search?lookupType=${encodeURIComponent(lookupType)}&hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&searchText=${encodeURIComponent(searchText)}`,
    LOOKUP_DETAILS: (hospitalId: string, doctorId: string) =>
      `/e-prescription/lookup/details?hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}`,
    UPLOAD_VISIT_SUMMARY: 'e-prescription/visit-summary/upload',
  },
  AUTH: {
    LOGIN: 'auth/user/login',
    SEND_OTP: 'auth/otp/send',
    SIGN_UP: 'auth/user/register',
    OTP_CHECKER: 'auth/otp/verify',
    SET_PASSWORD: 'auth/user/password?scope=set-password',
    RESET_PASSWORD: 'auth/user/password?scope=reset-password',
    CHANGE_PASSWORD: 'auth/user/password?scope=change-password',
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
    MINE: 'hospitals/mine',
    GET_ANALYSIS: (hospitalId: string) => `hospitals/analysis/hospitalId=${hospitalId}`,
    DEACTIVATE: (id: string) => `hospitals/${id}/deactivate`,
  },
  CHAINS: {
    CREATE: 'chains',
    MINE: 'chains/mine',
    ONBOARD_HOSPITAL: (chainId: string) => `chains/${chainId}/hospitals`,
    MINE_DOCTORS: 'chains/mine/doctors',
    ADD_DOCTOR: (chainId: string) => `chains/${chainId}/doctors`,
  },
  DEPARTMENTS: {
    GLOBAL: 'departments/global',
    GET_BY_HOSPITAL_ID: (hospitalId: string) => `appointments/departments?hospitalId=${encodeURIComponent(hospitalId)}`,
  },
  SPECIALIZATIONS: {
    BY_DEPARTMENT: 'doctors/specializations',
  },
  MEDICAL_SPECIALITIES: {
    GET_ALL: 'doctors/medical-specialities',
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
    GET_ANALYSIS: (hospitalId: string, doctorId: string) =>
      `doctor-dashboard/analysis/hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}`,
    GET_BY_DEPARTMENT: (departmentId: string, hospitalId: string) =>
      `appointments/department-doctor?departmentId=${encodeURIComponent(departmentId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
  },
  USER_MANAGEMENT: {
    QUICK_ADD_USER: 'admin/users/quick-add',
    SHARE_CREDENTIALS: 'admin/users/share-credentials',
    RESET_CREDENTIALS: 'admin/users/reset-credentials',
    GET_ALL_USERS: 'admin/user-onboarding/allusers',
    DEACTIVATE_USER: 'admin/user-onboarding/deactivate-user',
    REACTIVATE_USER: 'admin/user-onboarding/reactivate-user',
  },
  SUBSCRIPTION: {
    GET_STATUS: (hospitalId: string) => `/api/v1/Subscription/${encodeURIComponent(hospitalId)}`,
    SELECT_PLAN: (hospitalId: string) => `/api/v1/Subscription/${encodeURIComponent(hospitalId)}/select-plan`,
    SUBMIT_PAYMENT: (hospitalId: string) => `/api/v1/Subscription/${encodeURIComponent(hospitalId)}/submit-payment`,
    // Proxied through easyHMSAPI (server-to-server to CMSAPI) — the browser has no CMS
    // credential, and CMSAPI's plan endpoints require CMS auth, so this can't hit CMS directly.
    GET_PLANS: '/api/v1/Subscription/plans',
  },
  APPOINTMENTS: {
    SAVE_VITALS: 'appointments/patient-vitals',
  },
  PATIENTS: {
    // Patient Profile API endpoints
    GET_PROFILE_DETAILS: (hospitalId: string, patientId: string) => `patient-profile?hospitalId=${hospitalId}&patientId=${patientId}`,
    UPDATE_PROFILE_DETAILS: (hospitalId: string, patientId: string) => `patient-profile?hospitalId=${hospitalId}&patientId=${patientId}`,
    SEARCH: (searchText: string, hospitalId: string) =>
      `/patient/search?searchText=${encodeURIComponent(searchText)}&hospitalId=${encodeURIComponent(hospitalId)}`,
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
    GENERATE_DETAILS: 'e-prescription/details/generate-prescription',
    GET_SETTINGS: (doctorId: string, hospitalId?: string) => {
      const params = [`doctorId=${encodeURIComponent(doctorId)}`];
      if (hospitalId) {
        params.push(`hospitalId=${encodeURIComponent(hospitalId)}`);
      }
      return `prescription-settings?${params.join('&')}`;
    },
  },
  TIMELINE: {
    GET_EVENTS: (patientId: string, doctorId: string, hospitalId: string) =>
      `e-prescription/patient-details/timeline?patientId=${encodeURIComponent(patientId)}&doctorId=${encodeURIComponent(doctorId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
  },
  PATIENT_ANALYSIS: (hospitalId: string, patientId: string) =>
    `patient/analysis/hospitalId=${encodeURIComponent(hospitalId)}&patientId=${encodeURIComponent(patientId)}`,
  ATTACHMENTS: {
    UPLOAD: 'e-prescription/attachments/upload',
    LIST: (appointmentId: string, hospitalId: string, doctorId: string, patientId: string) =>
      `e-prescription/attachments/list?appointmentId=${encodeURIComponent(appointmentId)}&hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&patientId=${encodeURIComponent(patientId)}`,
    DELETE: (attachmentId: string) => `e-prescription/attachments/delete?AttachmentId=${encodeURIComponent(attachmentId)}`,
  },
  DRAWINGS: {
    UPLOAD: 'e-prescription/drawings/upload',
    LIST: (appointmentId: string, hospitalId: string, doctorId: string, patientId: string) =>
      `e-prescription/drawings/list?appointmentId=${encodeURIComponent(appointmentId)}&hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}&patientId=${encodeURIComponent(patientId)}`,
    DELETE: (drawingId: string) => `e-prescription/drawings/delete?DrawingId=${encodeURIComponent(drawingId)}`,
  },
  BILLING: {
    CREATE_CHARGE: 'billing/config/changes',
    GET_CHARGES: (hospitalId: string) => `billing/config/charges/hospitalId=${encodeURIComponent(hospitalId)}`,
    DELETE_CHARGE: 'billing/config/charges',
  },
} as const;

// IPD-flavoured endpoints (billing, charge/bed masters, alerts) — now served by easyHMSAPI.
export const IPD_API_ENDPOINTS = {
  CHARGE: {
    GET_MASTERS: (hospitalId: string, page = 1, pageSize = 20) =>
      `charge/master?hospitalId=${encodeURIComponent(hospitalId)}&page=${page}&pageSize=${pageSize}`,
    GET_MASTER_BY_ID: (chargeId: string, hospitalId: string) =>
      `charge/master/${encodeURIComponent(chargeId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPSERT_MASTER: 'charge/master',
    UPDATE_MASTER_STATUS: (chargeId: string, hospitalId: string) =>
      `charge/master/status?chargeId=${encodeURIComponent(chargeId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    DELETE_MASTER: 'charge/master',
    CREATE_EVENT: 'charge/create-event',
    CREATE_ENCOUNTER: 'charge/encounter',
    ADD_EVENT: 'charge/add-event',
    UPDATE_EVENT: 'charge/update-event',
    CANCEL_EVENT: 'charge/cancel-event',
    GET_RATE_CARD: (hospitalId: string) => `charge/rate-card?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPSERT_PAYER_RATE: 'charge/rate-card/payer-rate',
    UPSERT_ROOM_MULTIPLIER: 'charge/rate-card/room-multiplier',
  },
  BILLING: {
    GET_POLICY: (hospitalId: string) => `billing/policy?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPDATE_POLICY: 'billing/policy',
    GET_EVENTS: (encounterId: string, patientId: string, hospitalId: string) =>
      `billing/get-events?encounterId=${encodeURIComponent(encounterId)}&patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    GET_PATIENT_EVENTS: (patientId: string, hospitalId: string) =>
      `billing/get-event?patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    DELETE_EVENT: (hospitalId: string, patientId: string, eventId: string, type: string, reason?: string) =>
      `billing/delete-event?hospitalId=${encodeURIComponent(hospitalId)}&patientId=${encodeURIComponent(patientId)}&eventId=${encodeURIComponent(eventId)}&type=${encodeURIComponent(type)}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`,
    DASHBOARD: (hospitalId: string) => `billing/dashboard?hospitalId=${encodeURIComponent(hospitalId)}`,
    CREATE_INVOICE: 'billing/invoice',
    FINALIZE: (type: string) => `billing/finalize?type=${encodeURIComponent(type)}`,
    PRINT: (patientId: string, hospitalId: string, encounterId: string) =>
      `billing/print?patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}&encounterId=${encodeURIComponent(encounterId)}`,
    // Visit day-wise interim billing (opt-in, anchored to the visit; no admission)
    VISIT_DAY_BILLS: (hospitalId: string, encounterId: string) =>
      `billing/visit-day-bills?hospitalId=${encodeURIComponent(hospitalId)}&encounterId=${encodeURIComponent(encounterId)}`,
    CLOSE_VISIT_DAY: 'billing/visit-day/close',
    REOPEN_VISIT_DAY: 'billing/visit-day/reopen',
  },
  ADMISSION: {
    GET_BY_ENCOUNTER: (hospitalId: string, encounterId: string) =>
      `admission?hospitalId=${encodeURIComponent(hospitalId)}&encounterId=${encodeURIComponent(encounterId)}`,
    ADMIT: 'admission',
  },
  ADMISSION_REFERRAL: {
    ADVISE: 'admission-referral/advise',
    LIST: (hospitalId: string, opts?: { patientId?: string; statusCode?: string; caseType?: string; referringDoctorId?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.patientId) parts.push(`patientId=${encodeURIComponent(opts.patientId)}`);
      if (opts?.statusCode) parts.push(`statusCode=${encodeURIComponent(opts.statusCode)}`);
      if (opts?.caseType) parts.push(`caseType=${encodeURIComponent(opts.caseType)}`);
      if (opts?.referringDoctorId) parts.push(`referringDoctorId=${encodeURIComponent(opts.referringDoctorId)}`);
      if (opts?.fromDate) parts.push(`fromDate=${encodeURIComponent(opts.fromDate)}`);
      if (opts?.toDate) parts.push(`toDate=${encodeURIComponent(opts.toDate)}`);
      if (opts?.page) parts.push(`page=${opts.page}`);
      if (opts?.pageSize) parts.push(`pageSize=${opts.pageSize}`);
      return `admission-referral/list?${parts.join('&')}`;
    },
    UPDATE_STATUS: 'admission-referral/status',
    ADD_COMMENT: 'admission-referral/comment',
    COMMENTS: (hospitalId: string, referralId: string) =>
      `admission-referral/comments?hospitalId=${encodeURIComponent(hospitalId)}&referralId=${encodeURIComponent(referralId)}`,
  },
  PAYMENT: {
    ADD_EVENT: 'payment/add-event',
  },
  BED: {
    GET_MASTERS: (hospitalId: string, page = 1, pageSize = 50) =>
      `bed/master?hospitalId=${encodeURIComponent(hospitalId)}&page=${page}&pageSize=${pageSize}`,
    GET_MASTER_BY_ID: (bedId: string, hospitalId: string) =>
      `bed/master/${encodeURIComponent(bedId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPSERT_MASTER: 'bed/master',
    BULK_CREATE: 'bed/master/bulk',
    BULK_DELETE: 'bed/master/bulk-delete',
    HARD_DELETE: (bedId: string, hospitalId: string) =>
      `bed/master/${encodeURIComponent(bedId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    BULK_HARD_DELETE: 'bed/master/bulk-hard-delete',
  },
  ROOM: {
    GET_MASTERS: (hospitalId: string, page = 1, pageSize = 50) =>
      `bed/room/master?hospitalId=${encodeURIComponent(hospitalId)}&page=${page}&pageSize=${pageSize}`,
    GET_MASTER_BY_ID: (roomId: string, hospitalId: string) =>
      `bed/room/master/${encodeURIComponent(roomId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPSERT_MASTER: 'bed/room/master',
  },
  OT_PLAN: {
    LIST: (hospitalId: string, departmentId?: string, includeInactive?: boolean) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (departmentId) parts.push(`departmentId=${encodeURIComponent(departmentId)}`);
      if (includeInactive) parts.push(`includeInactive=true`);
      return `ot-plan/list?${parts.join('&')}`;
    },
    UPSERT: 'ot-plan/upsert',
  },
  PACKAGE_TYPE: {
    LIST: (hospitalId: string, includeInactive?: boolean) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (includeInactive) parts.push(`includeInactive=true`);
      return `package-type/list?${parts.join('&')}`;
    },
    UPSERT: 'package-type/upsert',
  },
  ALERTS: {
    LIST: (hospitalId: string, opts?: { status?: string; severity?: string; alertCode?: string; admissionId?: string; audienceUserId?: string; role?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)         parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.severity)       parts.push(`severity=${encodeURIComponent(opts.severity)}`);
      if (opts?.alertCode)      parts.push(`alertCode=${encodeURIComponent(opts.alertCode)}`);
      if (opts?.admissionId)    parts.push(`admissionId=${encodeURIComponent(opts.admissionId)}`);
      if (opts?.audienceUserId) parts.push(`audienceUserId=${encodeURIComponent(opts.audienceUserId)}`);
      if (opts?.role)           parts.push(`role=${encodeURIComponent(opts.role)}`);
      if (opts?.fromUtc)        parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)          parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)           parts.push(`take=${opts.take}`);
      return `alerts?${parts.join('&')}`;
    },
    COUNTS: (hospitalId: string, opts?: { audienceUserId?: string; role?: string }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.audienceUserId) parts.push(`audienceUserId=${encodeURIComponent(opts.audienceUserId)}`);
      if (opts?.role)           parts.push(`role=${encodeURIComponent(opts.role)}`);
      return `alerts/counts?${parts.join('&')}`;
    },
    RAISE:        'alerts/raise',
    ACKNOWLEDGE:  'alerts/acknowledge',
    DISMISS:      'alerts/dismiss',
    SNOOZE:       'alerts/snooze',
    EVALUATE:     'alerts/evaluate',
  },
  DISCOUNT_APPROVAL: {
    LIST: (hospitalId: string, opts?: { status?: string; encounterId?: string; patientId?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)      parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.encounterId) parts.push(`encounterId=${encodeURIComponent(opts.encounterId)}`);
      if (opts?.patientId)   parts.push(`patientId=${encodeURIComponent(opts.patientId)}`);
      if (opts?.take)        parts.push(`take=${opts.take}`);
      return `discount-approvals?${parts.join('&')}`;
    },
    DECIDE: 'discount-approvals/decide',
  },
  CREDIT_APPROVAL: {
    LIST: (hospitalId: string, opts?: { status?: string; encounterId?: string; patientId?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)      parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.encounterId) parts.push(`encounterId=${encodeURIComponent(opts.encounterId)}`);
      if (opts?.patientId)   parts.push(`patientId=${encodeURIComponent(opts.patientId)}`);
      if (opts?.take)        parts.push(`take=${opts.take}`);
      return `credit-approvals?${parts.join('&')}`;
    },
    DECIDE: 'credit-approvals/decide',
  },
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 