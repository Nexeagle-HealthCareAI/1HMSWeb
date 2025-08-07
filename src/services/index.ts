// Centralized API client
export { apiClient, axiosInstance, type ApiResponse, type PaginatedResponse } from './axiosClient';

// Feature-specific API services
export { authApi } from '@/features/auth/services/authApi';
export { appointmentApi } from '@/features/appointment/services/appointmentApi';
export { patientApi } from '@/features/patient/services/patientApi';
export { doctorApi } from '@/features/doctor/services/doctorApi';
export { billingApi } from '@/features/billing/services/billingApi';
export { messagingApi } from '@/features/messaging/services/messagingApi';
export { aiApi } from '@/features/ai/services/aiApi';

// Re-export types for convenience
export type {
  // Auth types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
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
  Doctor,
  CreateDoctorRequest,
  UpdateDoctorRequest,
  DoctorFilters,
  DoctorStats,
  DoctorSchedule,
  UpdateScheduleRequest,
  Prescription,
  CreatePrescriptionRequest,
} from '@/features/doctor/services/doctorApi';

export type {
  // Billing types
  Bill,
  BillItem,
  CreateBillRequest,
  UpdateBillRequest,
  BillFilters,
  Payment,
  CreatePaymentRequest,
  InsuranceClaim,
  CreateInsuranceClaimRequest,
  BillingStats,
  BillingConfiguration,
} from '@/features/billing/services/billingApi';

export type {
  // Messaging types
  Message,
  MessageAttachment,
  CreateMessageRequest,
  UpdateMessageRequest,
  MessageFilters,
  BulkMessageRequest,
  MessageTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  Conversation,
  MessageStats,
} from '@/features/messaging/services/messagingApi';

export type {
  // AI types
  ChatMessage,
  Conversation as AIConversation,
  CreateConversationRequest,
  SendMessageRequest,
  AIResponse,
  DocumentAnalysis,
  CreateDocumentAnalysisRequest,
  MedicalInsight,
  GenerateInsightRequest,
  AIAssistant,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  AIUsageStats,
  AIModel,
} from '@/features/ai/services/aiApi';
