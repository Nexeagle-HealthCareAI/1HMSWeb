import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_history?: string;
  allergies?: string[];
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  insurance_info?: {
    provider: string;
    policy_number: string;
    group_number?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreatePatientRequest {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_history?: string;
  allergies?: string[];
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  insurance_info?: {
    provider: string;
    policy_number: string;
    group_number?: string;
  };
}

export interface UpdatePatientRequest {
  name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_history?: string;
  allergies?: string[];
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  insurance_info?: {
    provider: string;
    policy_number: string;
    group_number?: string;
  };
}

export interface PatientFilters {
  search?: string;
  gender?: string;
  blood_type?: string;
  age_min?: number;
  age_max?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PatientStats {
  total: number;
  male: number;
  female: number;
  other: number;
  new_this_month: number;
  new_this_year: number;
  age_groups: {
    '0-18': number;
    '19-30': number;
    '31-50': number;
    '51-70': number;
    '70+': number;
  };
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
  date: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
}

export interface CreateMedicalRecordRequest {
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
  date: string;
}

export interface PatientData {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  contact: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  registrationDate: string;
  doctorNames?: string;
}

export interface DoctorData {
  doctorName: string;
  totalPatientCount: number;
  femalePatientCount: number;
  malePatientCount: number;
  sharedPatientCount: number;
}

export interface Statistics {
  totalPatientCount: number;
  malePatientCount: number;
  femalePatientCount: number;
  newRegistrations: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    previousYear: number;
  };
}

export interface PatientListResponse {
  hospitalId?: string;
  doctorsData?: DoctorData[];
  patientsData: PatientData[];
  statistics?: Statistics;
  success: boolean;
  message: string;
}

// Patient API service
export const patientApi = {
  // Get all patients by hospital ID
  getAllPatients: (hospitalId: string): Promise<PatientListResponse> => {
    return apiClient.get(`/patient/hospitalId=${hospitalId}`);
  },

  // Get all patients with pagination and filters
  getAll: (filters?: PatientFilters): Promise<PaginatedResponse<Patient>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/patients?${params.toString()}`);
  },

  // Get patient by ID
  getById: (id: string): Promise<ApiResponse<Patient>> => {
    return apiClient.get(`/patients/${id}`);
  },

  // Create new patient
  create: (data: CreatePatientRequest): Promise<ApiResponse<Patient>> => {
    return apiClient.post('/patients', data);
  },

  // Update patient
  update: (id: string, data: UpdatePatientRequest): Promise<ApiResponse<Patient>> => {
    return apiClient.put(`/patients/${id}`, data);
  },

  // Delete patient
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/patients/${id}`);
  },

  // Search patients
  search: (query: string): Promise<ApiResponse<Patient[]>> => {
    return apiClient.get(`/patients/search?q=${encodeURIComponent(query)}`);
  },

  // Get patient statistics
  getStats: (): Promise<ApiResponse<PatientStats>> => {
    return apiClient.get('/patients/stats');
  },

  // Get patient profile
  getProfile: (id: string): Promise<ApiResponse<Patient>> => {
    return apiClient.get(`/patients/${id}/profile`);
  },

  // Update patient profile
  updateProfile: (id: string, data: UpdatePatientRequest): Promise<ApiResponse<Patient>> => {
    return apiClient.put(`/patients/${id}/profile`, data);
  },


  // Get patient medical records
  getMedicalRecords: (id: string): Promise<ApiResponse<MedicalRecord[]>> => {
    return apiClient.get(`/patients/${id}/medical-records`);
  },

  // Create medical record
  createMedicalRecord: (data: CreateMedicalRecordRequest): Promise<ApiResponse<MedicalRecord>> => {
    return apiClient.post('/patients/medical-records', data);
  },

  // Update medical record
  updateMedicalRecord: (id: string, data: Partial<CreateMedicalRecordRequest>): Promise<ApiResponse<MedicalRecord>> => {
    return apiClient.put(`/patients/medical-records/${id}`, data);
  },

  // Delete medical record
  deleteMedicalRecord: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/patients/medical-records/${id}`);
  },

  // Get patient appointments
  getAppointments: (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get(`/patients/${id}/appointments`);
  },

  // Get patient billing history
  getBillingHistory: (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get(`/patients/${id}/billing`);
  },

  // Export patients
  exportPatients: (filters?: PatientFilters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/patients/export?${params.toString()}`, 'patients.csv');
  },

  // Send patient reminder
  sendReminder: (id: string, message: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/patients/${id}/send-reminder`, { message });
  },

  // Bulk send reminders
  sendBulkReminders: (patientIds: string[], message: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/patients/bulk-reminders', { patient_ids: patientIds, message });
  },

  // Get patient dashboard data
  getDashboardData: (id: string): Promise<ApiResponse<{
    recent_appointments: any[];
    upcoming_appointments: any[];
    medical_records_count: number;
    total_bills: number;
    unpaid_bills: number;
  }>> => {
    return apiClient.get(`/patients/${id}/dashboard`);
  },
};
