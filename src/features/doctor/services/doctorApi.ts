import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department: string;
  license_number: string;
  experience_years: number;
  education: string[];
  certifications: string[];
  is_available: boolean;
  working_hours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  consultation_fee: number;
  avatar?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDoctorRequest {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department: string;
  license_number: string;
  experience_years: number;
  education: string[];
  certifications: string[];
  working_hours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  consultation_fee: number;
  bio?: string;
}

export interface UpdateDoctorRequest {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  department?: string;
  license_number?: string;
  experience_years?: number;
  education?: string[];
  certifications?: string[];
  is_available?: boolean;
  working_hours?: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  consultation_fee?: number;
  bio?: string;
}

export interface DoctorFilters {
  search?: string;
  department?: string;
  specialization?: string;
  is_available?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DoctorStats {
  total: number;
  available: number;
  unavailable: number;
  by_department: Record<string, number>;
  by_specialization: Record<string, number>;
  average_consultation_fee: number;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  date: string;
  time_slots: {
    time: string;
    is_available: boolean;
    is_booked: boolean;
    appointment_id?: string;
  }[];
}

export interface UpdateScheduleRequest {
  date: string;
  time_slots: {
    time: string;
    is_available: boolean;
  }[];
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  diagnosis: string;
  notes?: string;
  prescribed_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionRequest {
  patient_id: string;
  appointment_id?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  diagnosis: string;
  notes?: string;
  prescribed_date: string;
}

// Doctor API service
export const doctorApi = {
  // Get all doctors with pagination and filters
  getAll: (filters?: DoctorFilters): Promise<PaginatedResponse<Doctor>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/doctors?${params.toString()}`);
  },

  // Get doctor by ID
  getById: (id: string): Promise<ApiResponse<Doctor>> => {
    return apiClient.get(`/doctors/${id}`);
  },

  // Create new doctor
  create: (data: CreateDoctorRequest): Promise<ApiResponse<Doctor>> => {
    return apiClient.post('/doctors', data);
  },

  // Update doctor
  update: (id: string, data: UpdateDoctorRequest): Promise<ApiResponse<Doctor>> => {
    return apiClient.put(`/doctors/${id}`, data);
  },

  // Delete doctor
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/doctors/${id}`);
  },

  // Get doctor profile
  getProfile: (): Promise<ApiResponse<Doctor>> => {
    return apiClient.get('/doctors/profile');
  },

  // Update doctor profile
  updateProfile: (data: UpdateDoctorRequest): Promise<ApiResponse<Doctor>> => {
    return apiClient.put('/doctors/profile', data);
  },

  // Upload doctor avatar
  uploadAvatar: (file: File): Promise<ApiResponse<{ avatar_url: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.upload('/doctors/avatar', formData);
  },

  // Search doctors
  search: (query: string): Promise<ApiResponse<Doctor[]>> => {
    return apiClient.get(`/doctors/search?q=${encodeURIComponent(query)}`);
  },

  // Get doctor statistics
  getStats: (): Promise<ApiResponse<DoctorStats>> => {
    return apiClient.get('/doctors/stats');
  },

  // Get doctor schedule
  getSchedule: (id: string, date: string): Promise<ApiResponse<DoctorSchedule>> => {
    return apiClient.get(`/doctors/${id}/schedule/${date}`);
  },

  // Update doctor schedule
  updateSchedule: (id: string, data: UpdateScheduleRequest): Promise<ApiResponse<DoctorSchedule>> => {
    return apiClient.put(`/doctors/${id}/schedule`, data);
  },

  // Get doctor appointments
  getAppointments: (id: string, filters?: any): Promise<PaginatedResponse<any>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/doctors/${id}/appointments?${params.toString()}`);
  },

  // Get today's appointments for doctor
  getTodayAppointments: (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/doctors/appointments/today');
  },

  // Get doctor's patients
  getPatients: (id: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get(`/doctors/${id}/patients`);
  },

  // Create prescription
  createPrescription: (data: CreatePrescriptionRequest): Promise<ApiResponse<Prescription>> => {
    return apiClient.post('/doctors/prescriptions', data);
  },

  // Get prescriptions
  getPrescriptions: (filters?: any): Promise<PaginatedResponse<Prescription>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/doctors/prescriptions?${params.toString()}`);
  },

  // Update prescription
  updatePrescription: (id: string, data: Partial<CreatePrescriptionRequest>): Promise<ApiResponse<Prescription>> => {
    return apiClient.put(`/doctors/prescriptions/${id}`, data);
  },

  // Delete prescription
  deletePrescription: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/doctors/prescriptions/${id}`);
  },

  // Get doctor dashboard data
  getDashboardData: (): Promise<ApiResponse<{
    today_appointments: any[];
    upcoming_appointments: any[];
    total_patients: number;
    total_prescriptions: number;
    recent_prescriptions: Prescription[];
  }>> => {
    return apiClient.get('/doctors/dashboard');
  },

  // Export doctors
  exportDoctors: (filters?: DoctorFilters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/doctors/export?${params.toString()}`, 'doctors.csv');
  },

  // Toggle availability
  toggleAvailability: (isAvailable: boolean): Promise<ApiResponse<Doctor>> => {
    return apiClient.patch('/doctors/availability', { is_available: isAvailable });
  },

  // Get available time slots
  getAvailableSlots: (date: string): Promise<ApiResponse<{ time: string; is_available: boolean }[]>> => {
    return apiClient.get(`/doctors/available-slots/${date}`);
  },
};
