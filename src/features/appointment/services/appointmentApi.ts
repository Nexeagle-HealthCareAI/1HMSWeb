import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';
import { useAuthStore } from '@/store/authStore';

// Utility function to generate unique patient ID
export const generatePatientId = (): string => {
  const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `PTID${randomDigits}`;
};

// Types
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled';
  type: 'consultation' | 'follow-up' | 'emergency' | 'surgery';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface CreateAppointmentRequest {
  patient_id: string;
  doctor_id: string;
  date: string;
  time: string;
  type: 'consultation' | 'follow-up' | 'emergency' | 'surgery';
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  time?: string;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show' | 'rescheduled';
  type?: 'consultation' | 'follow-up' | 'emergency' | 'surgery';
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface AppointmentFilters {
  date?: string;
  doctor_id?: string;
  patient_id?: string;
  status?: string;
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  is_available: boolean;
  is_booked: boolean;
  doctor_id: string;
  date: string;
}

export interface BlockTimeSlotRequest {
  doctor_id: string;
  date: string;
  time_slots: string[];
  reason?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address?: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  department: string;
  is_available: boolean;
}

export interface Department {
  departmentId: string;
  departmentName: string;
}

export interface HospitalUser {
  hospitalUserId: string;
  hospitalId: string;
  userId: string;
  employeeID: string;
  isPrimary: string;
  createdAt: string;
}

export interface UserDetails {
  userId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: string;
  // Add other fields as needed based on the API response
}

export interface ApiDoctor {
  doctorId: string;
  doctorName: string;
  licenseNumber: string;
  qualifications: string[];
  specializations: string[];
}

export interface ShiftDayDetail {
  overrideId: string | null;
  shiftName: string;
  startTime: string;
  endTime: string;
  slotDurationInMinutes: number;
  recurringDays: string | null;
}

export interface ShiftInfo {
  shiftDate: string;
  dataSource: string;
  shiftDayDetails: ShiftDayDetail[];
}

export interface DoctorSlotsResponse {
  doctorId: string;
  requestedDate: string;
  isTimeOff: boolean;
  timeOffReason: string | null;
  shiftInfo: ShiftInfo[];
}

export interface BookedSlotsResponse {
  doctorId: string;
  date: string;
  bookedSlots: string[];
}

export interface PatientVitalsRequest {
  appointmentId: string;
  patientId: string;
  vitalsJson: {
    bp: {
      sys: number;
      dia: number;
    };
    pulse: number;
    tempC: number;
    spo2: number;
    heightCm: number;
    weightKg: number;
    bmi: number;
    respiratoryRate: number;
  };
  recordedBy: string;
}

export interface PatientVitalsResponse {
  success: boolean;
  message: string;
  vitalsId?: string;
}

export interface RegisterAppointmentRequest {
  patient: {
    fullName: string;
    mobile: string;
    ageYears: number;
    sex: string;
    addressLine1: string;
    city: string;
    pincode: string;
    insuranceId: string;
    paymentMode: string;
    patientId: string;
  };
  doctorId: string;
  apptDate: string;
  startAt: string;
  reason: string;
  slotTimeInMinutes: number;
  userId: string;
}

export interface RegisterAppointmentResponse {
  appointmentId: string;
  patientId: string;
  tokenNumber: string;
}

export interface PatientSearchRequest {
  by: 'patientId' | 'name' | 'appointmentId' | 'contact';
  q: string;
  scope?: 'local' | 'global';
}

export interface PatientSearchItem {
  patientId: string;
  fullName: string;
  mobile: string;
  sex: string;
  age: number;
  dateOfBirth: string;
  address: string;
  city: string;
  pincode: string;
  lastRegistrationAt: string;
  lastRegistrationId: string;
  matched: {
    by: string;
    value: string;
  };
  appointmentDate: string | null;
  appointmentId: string | null;
  tokenNumber: string;
}

export interface PatientSearchResponse {
  items: PatientSearchItem[];
  totalPatients: number;
}

export interface AppointmentDetailsResponse {
  items: AppointmentDetail[];
}

export interface AppointmentDetail {
  appointmentId: string;
  patientId: string;
  patientFullName: string;
  patientMobile: string;
  patientSex: string;
  patientAgeYears: number;
  doctorId: string;
  doctorName: string | null;
  appointmentDate: string;
  startAt: string;
  endAt: string;
  finalStatusCode: string;
  reason: string;
  insuranceId: string | null;
  paymentMode: string;
  lastStatusAt: string;
  appointmentType: string | null;
  createdAt: string;
  token: {
    tokenId: string;
    tokenNumber: number;
    status: string | null;
    createdAt: string;
  };
  departments?: string[];
  departmentId?: string;
  departmentName?: string;
}

// Appointment API service
export const appointmentApi = {

  // Get all departments
  getDepartments: (hospitalId: string): Promise<{ departments: Department[] }> => {
    const url = `/appointments/departments?hospitalId=${hospitalId}`;

    return apiClient.get(url);
  },

  // Get hospital user information
  getHospitalUser: (userId: string): Promise<HospitalUser> => {
    const url = `/hospitals/users/${userId}`;
    return apiClient.get(url);
  },

  // Get doctors by department
  getDoctorsByDepartment: (departmentId: string, hospitalId: string): Promise<{ doctors: ApiDoctor[] }> => {
    const url = `/appointments/department-doctor?departmentId=${departmentId}&hospitalId=${hospitalId}`;
    return apiClient.get(url);
  },

  // Get doctor slots
  getDoctorSlots: (doctorId: string, hospitalId: string, date: string): Promise<DoctorSlotsResponse> => {
    const url = `/calendar/doctor/slots?doctorId=${doctorId}&hospitalId=${hospitalId}&slotDate=${date}`;
    return apiClient.get(url);
  },

  // Get booked slots for a doctor on a specific date
  getBookedSlots: (doctorId: string, hospitalId: string, date: string): Promise<BookedSlotsResponse> => {
    const url = `/appointments/patient-booked-slots?doctorId=${doctorId}&hospitalId=${hospitalId}&date=${date}`;
    return apiClient.get(url);
  },

  // Register appointment
  registerAppointment: (hospitalId: string, request: RegisterAppointmentRequest): Promise<RegisterAppointmentResponse> => {
    const url = `/appointments/register/${hospitalId}?allocateToken=true`;
    return apiClient.post(url, request);
  },

  // Search patients
  searchPatients: (request: PatientSearchRequest): Promise<PatientSearchResponse> => {
    // Get hospitalId from auth store
    let hospitalId = '';
    try {
      hospitalId = useAuthStore.getState().getHospitalId();
    } catch (e) { }
    const url = `/appointments/patient-details/search?by=${request.by}&q=${encodeURIComponent(request.q)}&scope=${request.scope || 'local'}${hospitalId ? `&hospitalId=${hospitalId}` : ''}`;
    return apiClient.get(url);
  },

  // Save patient vitals
  savePatientVitals: (request: PatientVitalsRequest): Promise<PatientVitalsResponse> => {
    const url = `/appointments/patient-vitals`;
    return apiClient.post(url, request);
  },

  // Get patient vitals
  getPatientVitals: (patientId: string, appointmentId: string): Promise<{ vitals: any; success: boolean; message: string }> => {
    const url = `/e-prescription/patient-details/vitals?patientId=${patientId}&appointmentId=${appointmentId}`;
    return apiClient.get(url);
  },

  // Get appointment details
  getAppointmentDetails: (params: {
    status: string;
    startDate: string;
    endDate: string;
    hospitalId: string;
  }): Promise<AppointmentDetailsResponse> => {
    const url = `/appointments/patient-appointment-details?status=${params.status}&startDate=${params.startDate}&endDate=${params.endDate}&hospitalId=${params.hospitalId}`;
    return apiClient.get(url);
  },

  // Cancel appointment
  cancelAppointment: (request: {
    appointmentId: string;
    patientId: string;
  }): Promise<ApiResponse<any>> => {
    const url = `/appointments/patient-cancel`;
    return apiClient.patch(url, request);
  },

  // Complete appointment
  completeAppointment: (request: {
    hospitalId: string;
    doctordId: string;
    appointmentId: string;
    patientId: string;
  }): Promise<ApiResponse<any>> => {
    const url = `/appointments/complete-appointment`;
    return apiClient.post(url, request);
  },

  // Reschedule appointment
  rescheduleAppointment: (request: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    hospitalId: string;
    newDate: string; // YYYY-MM-DD
    newSlot: string; // HH:mm
    reason?: string;
  }): Promise<ApiResponse<any>> => {
    const url = `/appointments/reschedule`;
    return apiClient.put(url, request);
  },
};
