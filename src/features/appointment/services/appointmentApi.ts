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
  getDoctorsByDepartment: (departmentId: string): Promise<{ doctors: ApiDoctor[] }> => {
       const url = `/appointments/department-doctor?departmentId=${departmentId}`;    
       return apiClient.get(url);
   },

  // Get doctor slots
  getDoctorSlots: (doctorId: string, date: string): Promise<DoctorSlotsResponse> => {
    const url = `/calendar/doctor/slots?doctorId=${doctorId}&slotDate=${date}`;
    return apiClient.get(url);
  }
};
