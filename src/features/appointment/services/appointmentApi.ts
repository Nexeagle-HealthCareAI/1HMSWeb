import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

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

// Appointment API service
export const appointmentApi = {
  // Get all appointments with pagination and filters
  getAll: (filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/appointments?${params.toString()}`);
  },

  // Get appointment by ID
  getById: (id: string): Promise<ApiResponse<Appointment>> => {
    return apiClient.get(`/appointments/${id}`);
  },

  // Create new appointment
  create: (data: CreateAppointmentRequest): Promise<ApiResponse<Appointment>> => {
    return apiClient.post('/appointments', data);
  },

  // Update appointment
  update: (id: string, data: UpdateAppointmentRequest): Promise<ApiResponse<Appointment>> => {
    return apiClient.put(`/appointments/${id}`, data);
  },

  // Delete appointment
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/appointments/${id}`);
  },

  // Get appointments for today
  getTodayAppointments: (): Promise<ApiResponse<Appointment[]>> => {
    return apiClient.get('/appointments/today');
  },

  // Get appointments for a specific date
  getByDate: (date: string): Promise<ApiResponse<Appointment[]>> => {
    return apiClient.get(`/appointments/date/${date}`);
  },

  // Get appointments for a specific doctor
  getByDoctor: (doctorId: string, filters?: AppointmentFilters): Promise<PaginatedResponse<Appointment>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/appointments/doctor/${doctorId}?${params.toString()}`);
  },

  // Get appointments for a specific patient
  getByPatient: (patientId: string): Promise<ApiResponse<Appointment[]>> => {
    return apiClient.get(`/appointments/patient/${patientId}`);
  },

  // Update appointment status
  updateStatus: (id: string, status: Appointment['status']): Promise<ApiResponse<Appointment>> => {
    return apiClient.patch(`/appointments/${id}/status`, { status });
  },

  // Reschedule appointment
  reschedule: (id: string, date: string, time: string): Promise<ApiResponse<Appointment>> => {
    return apiClient.patch(`/appointments/${id}/reschedule`, { date, time });
  },

  // Cancel appointment
  cancel: (id: string, reason?: string): Promise<ApiResponse<Appointment>> => {
    return apiClient.patch(`/appointments/${id}/cancel`, { reason });
  },

  // Mark appointment as completed
  complete: (id: string, notes?: string): Promise<ApiResponse<Appointment>> => {
    return apiClient.patch(`/appointments/${id}/complete`, { notes });
  },

  // Mark appointment as no-show
  markNoShow: (id: string): Promise<ApiResponse<Appointment>> => {
    return apiClient.patch(`/appointments/${id}/no-show`);
  },

  // Get available time slots for a doctor on a specific date
  getAvailableSlots: (doctorId: string, date: string): Promise<ApiResponse<TimeSlot[]>> => {
    return apiClient.get(`/appointments/slots/${doctorId}/${date}`);
  },

  // Block time slots
  blockTimeSlots: (data: BlockTimeSlotRequest): Promise<ApiResponse<void>> => {
    return apiClient.post('/appointments/block-slots', data);
  },

  // Unblock time slots
  unblockTimeSlots: (data: BlockTimeSlotRequest): Promise<ApiResponse<void>> => {
    return apiClient.post('/appointments/unblock-slots', data);
  },

  // Get appointment statistics
  getStats: (date?: string): Promise<ApiResponse<{
    total: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    no_shows: number;
    follow_ups_required: number;
  }>> => {
    const params = date ? `?date=${date}` : '';
    return apiClient.get(`/appointments/stats${params}`);
  },

  // Export appointments
  exportAppointments: (filters?: AppointmentFilters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/appointments/export?${params.toString()}`, 'appointments.csv');
  },

  // Send appointment reminder
  sendReminder: (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/appointments/${id}/send-reminder`);
  },

  // Bulk send reminders
  sendBulkReminders: (appointmentIds: string[]): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/appointments/bulk-reminders', { appointment_ids: appointmentIds });
  },
};
