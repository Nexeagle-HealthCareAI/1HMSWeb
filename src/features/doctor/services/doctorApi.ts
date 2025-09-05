import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface DoctorDepartment {
  doctorDepartmentId: string;
  departmentId: string;
  departmentName: string;
  departmentDescription: string;
  assignedAt: string;
}

export interface DoctorSpecialization {
  doctorSpecializationId: string;
  specializationId: string;
  specializationName: string;
  specializationDescription: string;
  assignedAt: string;
}

export interface Doctor {
  doctorId: string;
  userId: string;
  licenseNumber: string;
  qualifications: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartmentID: string;
  primaryDepartmentName: string;
  profileCompletionPercentage: number;
  createdAt: string;
  doctorDepartments: DoctorDepartment[];
  doctorSpecializations: DoctorSpecialization[];
  // Legacy fields for backward compatibility
  id?: string;
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
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorAppointmentDetail {
  patientId: string;
  patientFullName: string;
  patientMobile: string;
  patientSex: string;
  patientAgeYears: number;
  appointmentId: string;
  appointmentDate: string;
  startAt: string;
  endAt: string;
  finalStatusCode: string;
  reason: string;
  insuranceId: string | null;
  paymentMode: string;
  lastStatusAt: string;
  createdAt: string;
  tokenDetails: {
    tokenId: string;
    tokenNumber: number;
    createdAt: string;
  };
}


// API service for doctor-related operations

// Doctor API service
export const doctorApi = {
  // Get doctor by ID
  getById: (doctorId: string): Promise<Doctor> => {
    const url = `/doctors/${doctorId}`;
    return apiClient.get(url);
  },

  // Get doctor dashboard appointment details
  getAppointmentDetails: (request: {
    status: string;
    startDate: string;
    endDate: string;
    hospitalId: string;
    doctorId: string;
  }): Promise<{ items: DoctorAppointmentDetail[] }> => {
    const params = new URLSearchParams();
    params.append('status', request.status);
    params.append('startDate', request.startDate);
    params.append('endDate', request.endDate);
    params.append('hospitalId', request.hospitalId);
    params.append('doctorId', request.doctorId);
    
    const url = `/doctor-dashboard/appointment-details?${params.toString()}`;
    return apiClient.get<{ items: DoctorAppointmentDetail[] }>(url);
  },

};
