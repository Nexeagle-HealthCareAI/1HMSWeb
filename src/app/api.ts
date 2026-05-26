const ensureProtocol = (url: string): string =>
  !url ? url : (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const trimEnd = (s: string) => s.replace(/\/+$/, '');
const trimStart = (s: string) => s.replace(/^\/+/, '');
const join = (base: string, path: string) => `${trimEnd(base)}/${trimStart(path)}`;

const rawApiUrl = import.meta.env.VITE_API_BASE_URL
  || 'easyhmsapiservices-bgasabd9ddbbdden.centralindia-01.azurewebsites.net';

const rawIpdApiUrl = import.meta.env.VITE_IPD_API_BASE_URL
  || rawApiUrl;

export const API_BASE_URL = ensureProtocol(rawApiUrl);
export const IPD_API_BASE_URL = ensureProtocol(rawIpdApiUrl);

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
    GET_ANALYSIS: (hospitalId: string) => `hospitals/analysis/hospitalId=${hospitalId}`,
  },
  DEPARTMENTS: {
    GLOBAL: 'departments/global',
    GET_BY_HOSPITAL_ID: (hospitalId: string) => `appointments/departments?hospitalId=${encodeURIComponent(hospitalId)}`,
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
    GET_ANALYSIS: (hospitalId: string, doctorId: string) =>
      `doctor-dashboard/analysis/hospitalId=${encodeURIComponent(hospitalId)}&doctorId=${encodeURIComponent(doctorId)}`,
    GET_BY_DEPARTMENT: (departmentId: string, hospitalId: string) =>
      `appointments/department-doctor?departmentId=${encodeURIComponent(departmentId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
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
  BILLING: {
    CREATE_CHARGE: 'billing/config/changes',
    GET_CHARGES: (hospitalId: string) => `billing/config/charges/hospitalId=${encodeURIComponent(hospitalId)}`,
    DELETE_CHARGE: 'billing/config/charges',
  },
} as const;

// New IPD API endpoints — hosted on IPD_API_BASE_URL
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
    ADD_EVENT: 'charge/add-event',
    CANCEL_EVENT: 'charge/cancel-event',
  },
  BILLING: {
    GET_POLICY: (hospitalId: string) => `billing/policy?hospitalId=${encodeURIComponent(hospitalId)}`,
    UPDATE_POLICY: 'billing/policy',
    GET_EVENTS: (encounterId: string, patientId: string, hospitalId: string) =>
      `billing/get-events?encounterId=${encodeURIComponent(encounterId)}&patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    GET_PATIENT_EVENTS: (patientId: string, hospitalId: string) =>
      `billing/get-event?patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}`,
    DELETE_EVENT: (hospitalId: string, patientId: string, eventId: string, type: string) =>
      `billing/delete-event?hospitalId=${encodeURIComponent(hospitalId)}&patientId=${encodeURIComponent(patientId)}&eventId=${encodeURIComponent(eventId)}&type=${encodeURIComponent(type)}`,
    DASHBOARD: (hospitalId: string) => `billing/dashboard?hospitalId=${encodeURIComponent(hospitalId)}`,
    CREATE_INVOICE: 'billing/invoice',
    FINALIZE: (type: string) => `billing/finalize?type=${encodeURIComponent(type)}`,
    PRINT: (patientId: string, hospitalId: string, encounterId: string) =>
      `billing/print?patientId=${encodeURIComponent(patientId)}&hospitalId=${encodeURIComponent(hospitalId)}&encounterId=${encodeURIComponent(encounterId)}`,
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
  },
  ADMISSION: {
    ADMIT: 'admission/admit',
    TRANSFER: 'admission/transfer',
    DISCHARGE: 'admission/discharge',
    CANCEL: 'admission/cancel',
    GET_BY_ID: (admissionId: string, hospitalId: string) =>
      `admission/${encodeURIComponent(admissionId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    LIST: (hospitalId: string, statusCode?: string, page = 1, pageSize = 50) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `page=${page}`, `pageSize=${pageSize}`];
      if (statusCode) parts.push(`statusCode=${encodeURIComponent(statusCode)}`);
      return `admission?${parts.join('&')}`;
    },
  },
  ROUND_NOTE: {
    CREATE: 'round-note',
    UPDATE: (roundNoteId: string, hospitalId: string) =>
      `round-note/${encodeURIComponent(roundNoteId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    LIST: (hospitalId: string, admissionId: string) =>
      `round-note?hospitalId=${encodeURIComponent(hospitalId)}&admissionId=${encodeURIComponent(admissionId)}`,
  },
  VITALS: {
    RECORD: 'vitals',
    LIST: (hospitalId: string, admissionId: string, fromUtc?: string, toUtc?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (fromUtc) parts.push(`fromUtc=${encodeURIComponent(fromUtc)}`);
      if (toUtc) parts.push(`toUtc=${encodeURIComponent(toUtc)}`);
      return `vitals?${parts.join('&')}`;
    },
  },
  DISCHARGE_SUMMARY: {
    GET: (hospitalId: string, admissionId: string) =>
      `discharge-summary?hospitalId=${encodeURIComponent(hospitalId)}&admissionId=${encodeURIComponent(admissionId)}`,
    SAVE: 'discharge-summary',
    SIGN: 'discharge-summary/sign',
  },
  CONSENT: {
    TEMPLATES: (hospitalId: string, typeCode?: string, language?: string, isActive?: boolean) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (typeCode) parts.push(`typeCode=${encodeURIComponent(typeCode)}`);
      if (language) parts.push(`language=${encodeURIComponent(language)}`);
      if (isActive !== undefined) parts.push(`isActive=${isActive}`);
      return `consent/templates?${parts.join('&')}`;
    },
    UPSERT_TEMPLATE: 'consent/templates',
    RECORDS: (hospitalId: string, admissionId: string, includeBody = false) =>
      `consent/records?hospitalId=${encodeURIComponent(hospitalId)}&admissionId=${encodeURIComponent(admissionId)}&includeBody=${includeBody}`,
    SIGN: 'consent/sign',
  },
  MONITORING: {
    RECORD_FLUID: 'monitoring/fluid',
    LIST_FLUID: (hospitalId: string, admissionId: string, fromUtc?: string, toUtc?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (fromUtc) parts.push(`fromUtc=${encodeURIComponent(fromUtc)}`);
      if (toUtc) parts.push(`toUtc=${encodeURIComponent(toUtc)}`);
      return `monitoring/fluid?${parts.join('&')}`;
    },
    RECORD_GLUCOSE: 'monitoring/glucose',
    LIST_GLUCOSE: (hospitalId: string, admissionId: string, fromUtc?: string, toUtc?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (fromUtc) parts.push(`fromUtc=${encodeURIComponent(fromUtc)}`);
      if (toUtc) parts.push(`toUtc=${encodeURIComponent(toUtc)}`);
      return `monitoring/glucose?${parts.join('&')}`;
    },
  },
  NURSING: {
    RECORD: 'nursing/assessment',
    LIST: (hospitalId: string, admissionId: string) =>
      `nursing/assessment?hospitalId=${encodeURIComponent(hospitalId)}&admissionId=${encodeURIComponent(admissionId)}`,
  },
  TRIAGE: {
    UPSERT: 'triage',
    QUEUE: (hospitalId: string, opts?: { status?: string; minAcuity?: number; maxAcuity?: number; search?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)              parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.minAcuity != null)   parts.push(`minAcuity=${opts.minAcuity}`);
      if (opts?.maxAcuity != null)   parts.push(`maxAcuity=${opts.maxAcuity}`);
      if (opts?.search)              parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.fromUtc)             parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)               parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)                parts.push(`take=${opts.take}`);
      return `triage?${parts.join('&')}`;
    },
    GET_BY_ID: (id: string, hospitalId: string) =>
      `triage/${encodeURIComponent(id)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    IN_PROGRESS: 'triage/in-progress',
    COMPLETE: 'triage/complete',
  },
  VISITORS: {
    ISSUE: 'visitors',
    CHECK_OUT: 'visitors/check-out',
    LIST: (hospitalId: string, opts?: { status?: string; admissionId?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)       parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.admissionId)  parts.push(`admissionId=${encodeURIComponent(opts.admissionId)}`);
      if (opts?.search)       parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.fromUtc)      parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)        parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)         parts.push(`take=${opts.take}`);
      return `visitors?${parts.join('&')}`;
    },
    GET_BY_ID: (id: string, hospitalId: string) =>
      `visitors/${encodeURIComponent(id)}?hospitalId=${encodeURIComponent(hospitalId)}`,
  },
  EQUIPMENT: {
    UPSERT: 'equipment',
    LIST: (hospitalId: string, opts?: { category?: string; department?: string; status?: string; search?: string; dueSoonOnly?: boolean; dueSoonDays?: number; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.category)    parts.push(`category=${encodeURIComponent(opts.category)}`);
      if (opts?.department)  parts.push(`department=${encodeURIComponent(opts.department)}`);
      if (opts?.status)      parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.search)      parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.dueSoonOnly) parts.push('dueSoonOnly=true');
      if (opts?.dueSoonDays) parts.push(`dueSoonDays=${opts.dueSoonDays}`);
      if (opts?.take)        parts.push(`take=${opts.take}`);
      return `equipment?${parts.join('&')}`;
    },
    GET_BY_ID: (id: string, hospitalId: string) =>
      `equipment/${encodeURIComponent(id)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    MAINTENANCE: 'equipment/maintenance',
    EVALUATE_PM: 'equipment/evaluate-pm',
  },
  MLC: {
    UPSERT_RECORD: 'mlc/records',
    LIST: (hospitalId: string, opts?: { status?: string; caseType?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)   parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.caseType) parts.push(`caseType=${encodeURIComponent(opts.caseType)}`);
      if (opts?.search)   parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.fromUtc)  parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)    parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)     parts.push(`take=${opts.take}`);
      return `mlc/records?${parts.join('&')}`;
    },
    GET_BY_ID: (id: string, hospitalId: string) =>
      `mlc/records/${encodeURIComponent(id)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    FINALIZE: 'mlc/records/finalize',
    UPSERT_INJURY: 'mlc/injuries',
    DELETE_INJURY: 'mlc/injuries/delete',
  },
  MRD: {
    RECORDS: (hospitalId: string, opts?: {
      year?: number; fromUtc?: string; toUtc?: string;
      patientId?: string; patientName?: string; mobile?: string; admissionNo?: string;
      attendingDoctorId?: string; wardCode?: string;
      diagnosis?: string; procedure?: string; status?: string; take?: number;
    }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.year)              parts.push(`year=${opts.year}`);
      if (opts?.fromUtc)           parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)             parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.patientId)         parts.push(`patientId=${encodeURIComponent(opts.patientId)}`);
      if (opts?.patientName)       parts.push(`patientName=${encodeURIComponent(opts.patientName)}`);
      if (opts?.mobile)            parts.push(`mobile=${encodeURIComponent(opts.mobile)}`);
      if (opts?.admissionNo)       parts.push(`admissionNo=${encodeURIComponent(opts.admissionNo)}`);
      if (opts?.attendingDoctorId) parts.push(`attendingDoctorId=${encodeURIComponent(opts.attendingDoctorId)}`);
      if (opts?.wardCode)          parts.push(`wardCode=${encodeURIComponent(opts.wardCode)}`);
      if (opts?.diagnosis)         parts.push(`diagnosis=${encodeURIComponent(opts.diagnosis)}`);
      if (opts?.procedure)         parts.push(`procedure=${encodeURIComponent(opts.procedure)}`);
      if (opts?.status)            parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.take)              parts.push(`take=${opts.take}`);
      return `mrd/records?${parts.join('&')}`;
    },
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
  BLOOD_BANK: {
    UPSERT_BAG: 'blood-bank/bags',
    LIST_BAGS: (hospitalId: string, opts?: { component?: string; bloodGroup?: string; status?: string; reservedForAdmissionId?: string; search?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.component)              parts.push(`component=${encodeURIComponent(opts.component)}`);
      if (opts?.bloodGroup)             parts.push(`bloodGroup=${encodeURIComponent(opts.bloodGroup)}`);
      if (opts?.status)                 parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.reservedForAdmissionId) parts.push(`reservedForAdmissionId=${encodeURIComponent(opts.reservedForAdmissionId)}`);
      if (opts?.search)                 parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.take)                   parts.push(`take=${opts.take}`);
      return `blood-bank/bags?${parts.join('&')}`;
    },
    RESERVE: 'blood-bank/bags/reserve',
    RELEASE: 'blood-bank/bags/release',
    DISCARD: 'blood-bank/bags/discard',
    RECORD_TRANSFUSION: 'blood-bank/transfusions',
    LIST_TRANSFUSIONS: (hospitalId: string, opts?: { admissionId?: string; bloodBagId?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.admissionId) parts.push(`admissionId=${encodeURIComponent(opts.admissionId)}`);
      if (opts?.bloodBagId)  parts.push(`bloodBagId=${encodeURIComponent(opts.bloodBagId)}`);
      if (opts?.fromUtc)     parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)       parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)        parts.push(`take=${opts.take}`);
      return `blood-bank/transfusions?${parts.join('&')}`;
    },
  },
  ANALYTICS: {
    IPD: (hospitalId: string, opts?: { fromUtc?: string; toUtc?: string; readmissionWindowDays?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.fromUtc)               parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)                 parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.readmissionWindowDays) parts.push(`readmissionWindowDays=${opts.readmissionWindowDays}`);
      return `analytics/ipd?${parts.join('&')}`;
    },
    REVENUE: (hospitalId: string, opts?: { fromUtc?: string; toUtc?: string; granularity?: string; topServicesLimit?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.fromUtc)          parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)            parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.granularity)      parts.push(`granularity=${encodeURIComponent(opts.granularity)}`);
      if (opts?.topServicesLimit) parts.push(`topServicesLimit=${opts.topServicesLimit}`);
      return `analytics/revenue?${parts.join('&')}`;
    },
  },
  DAY_CLOSE: {
    PREVIEW: (hospitalId: string, businessDate: string) =>
      `day-close/preview?hospitalId=${encodeURIComponent(hospitalId)}&businessDate=${encodeURIComponent(businessDate)}`,
    LIST: (hospitalId: string, opts?: { fromDate?: string; toDate?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.fromDate) parts.push(`fromDate=${encodeURIComponent(opts.fromDate)}`);
      if (opts?.toDate)   parts.push(`toDate=${encodeURIComponent(opts.toDate)}`);
      if (opts?.take)     parts.push(`take=${opts.take}`);
      return `day-close?${parts.join('&')}`;
    },
    CLOSE: 'day-close/close',
    REOPEN: 'day-close/reopen',
    RECEIPT: (paymentId: string, hospitalId: string) =>
      `day-close/receipt/${encodeURIComponent(paymentId)}?hospitalId=${encodeURIComponent(hospitalId)}`,
  },
  INVENTORY: {
    UPSERT_ITEM: 'inventory/items',
    LIST_ITEMS: (hospitalId: string, opts?: { category?: string; search?: string; isActive?: boolean; lowStockOnly?: boolean; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.category)      parts.push(`category=${encodeURIComponent(opts.category)}`);
      if (opts?.search)        parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.isActive !== undefined) parts.push(`isActive=${opts.isActive}`);
      if (opts?.lowStockOnly)  parts.push('lowStockOnly=true');
      if (opts?.take)          parts.push(`take=${opts.take}`);
      return `inventory/items?${parts.join('&')}`;
    },
    RECEIVE: 'inventory/receive',
    ISSUE: 'inventory/issue',
    ADJUST: 'inventory/adjust',
    LIST_MOVEMENTS: (hospitalId: string, opts?: { inventoryItemId?: string; encounterId?: string; movementType?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.inventoryItemId) parts.push(`inventoryItemId=${encodeURIComponent(opts.inventoryItemId)}`);
      if (opts?.encounterId)     parts.push(`encounterId=${encodeURIComponent(opts.encounterId)}`);
      if (opts?.movementType)    parts.push(`movementType=${encodeURIComponent(opts.movementType)}`);
      if (opts?.fromUtc)         parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)           parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)            parts.push(`take=${opts.take}`);
      return `inventory/movements?${parts.join('&')}`;
    },
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
  PCPNDT: {
    CREATE: 'pcpndt/form-f',
    LIST: (hospitalId: string, opts?: { status?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number }) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`];
      if (opts?.status)  parts.push(`status=${encodeURIComponent(opts.status)}`);
      if (opts?.search)  parts.push(`search=${encodeURIComponent(opts.search)}`);
      if (opts?.fromUtc) parts.push(`fromUtc=${encodeURIComponent(opts.fromUtc)}`);
      if (opts?.toUtc)   parts.push(`toUtc=${encodeURIComponent(opts.toUtc)}`);
      if (opts?.take)    parts.push(`take=${opts.take}`);
      return `pcpndt/form-f?${parts.join('&')}`;
    },
    GET_BY_ID: (id: string, hospitalId: string) =>
      `pcpndt/form-f/${encodeURIComponent(id)}?hospitalId=${encodeURIComponent(hospitalId)}`,
    FINALIZE: 'pcpndt/form-f/finalize',
  },
  AUDIT: {
    LOGS: (params: {
      hospitalId: string;
      admissionId?: string;
      patientId?: string;
      entityName?: string;
      entityId?: string;
      userId?: string;
      action?: string;
      fromUtc?: string;
      toUtc?: string;
      take?: number;
    }) => {
      const parts = [`hospitalId=${encodeURIComponent(params.hospitalId)}`];
      if (params.admissionId) parts.push(`admissionId=${encodeURIComponent(params.admissionId)}`);
      if (params.patientId)   parts.push(`patientId=${encodeURIComponent(params.patientId)}`);
      if (params.entityName)  parts.push(`entityName=${encodeURIComponent(params.entityName)}`);
      if (params.entityId)    parts.push(`entityId=${encodeURIComponent(params.entityId)}`);
      if (params.userId)      parts.push(`userId=${encodeURIComponent(params.userId)}`);
      if (params.action)      parts.push(`action=${encodeURIComponent(params.action)}`);
      if (params.fromUtc)     parts.push(`fromUtc=${encodeURIComponent(params.fromUtc)}`);
      if (params.toUtc)       parts.push(`toUtc=${encodeURIComponent(params.toUtc)}`);
      if (params.take)        parts.push(`take=${params.take}`);
      return `audit/logs?${parts.join('&')}`;
    },
  },
  MEDICATION: {
    CREATE_ORDER: 'medication/orders',
    LIST_ORDERS: (hospitalId: string, admissionId: string, status?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (status) parts.push(`status=${encodeURIComponent(status)}`);
      return `medication/orders?${parts.join('&')}`;
    },
    UPDATE_ORDER_STATUS: 'medication/orders/status',
    RECORD_ADMINISTRATION: 'medication/administrations',
    LIST_ADMINISTRATIONS: (hospitalId: string, admissionId: string, medicationOrderId?: string, fromUtc?: string, toUtc?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (medicationOrderId) parts.push(`medicationOrderId=${encodeURIComponent(medicationOrderId)}`);
      if (fromUtc) parts.push(`fromUtc=${encodeURIComponent(fromUtc)}`);
      if (toUtc) parts.push(`toUtc=${encodeURIComponent(toUtc)}`);
      return `medication/administrations?${parts.join('&')}`;
    },
    LIST_DUE: (hospitalId: string, admissionId: string, windowStartUtc?: string, windowEndUtc?: string) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`];
      if (windowStartUtc) parts.push(`windowStartUtc=${encodeURIComponent(windowStartUtc)}`);
      if (windowEndUtc) parts.push(`windowEndUtc=${encodeURIComponent(windowEndUtc)}`);
      return `medication/due?${parts.join('&')}`;
    },
    ADD_ALLERGY: 'medication/allergies',
    LIST_ALLERGIES: (hospitalId: string, patientId: string, includeInactive = false) =>
      `medication/allergies?hospitalId=${encodeURIComponent(hospitalId)}&patientId=${encodeURIComponent(patientId)}&includeInactive=${includeInactive}`,
    DEACTIVATE_ALLERGY: 'medication/allergies/deactivate',
    CHECK_SAFETY: (hospitalId: string, admissionId: string, proposedDrugName?: string, proposedGenericName?: string, includeExistingOrders = true) => {
      const parts = [`hospitalId=${encodeURIComponent(hospitalId)}`, `admissionId=${encodeURIComponent(admissionId)}`, `includeExistingOrders=${includeExistingOrders}`];
      if (proposedDrugName) parts.push(`proposedDrugName=${encodeURIComponent(proposedDrugName)}`);
      if (proposedGenericName) parts.push(`proposedGenericName=${encodeURIComponent(proposedGenericName)}`);
      return `medication/safety?${parts.join('&')}`;
    },
  },
} as const;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const; 