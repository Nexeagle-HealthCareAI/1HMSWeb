// Centralized API client
export { apiClient, axiosInstance, type ApiResponse, type PaginatedResponse } from './axiosClient';

// Feature-specific API services
export { authApi } from '@/features/auth/services/authApi';
export { appointmentApi } from '@/features/appointment/services/appointmentApi';
export { patientApi } from '@/features/patient/services/patientApi';
export { doctorApi } from '@/features/doctor/services/doctorApi';

// Re-export types for convenience
export type {
  // Auth types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/features/auth/services/authApi';

export type {
  // Appointment types
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentFilters,
  TimeSlot,
  BlockTimeSlotRequest,
} from '@/features/appointment/services/appointmentApi';

export type {
  // Patient types
  Patient,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientFilters,
  PatientStats,
  MedicalRecord,
  CreateMedicalRecordRequest,
} from '@/features/patient/services/patientApi';

export type {
  // Doctor types
  Doctor
} from '@/features/doctor/services/doctorApi';
