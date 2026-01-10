import { API_ENDPOINTS } from '@/app/api';
import { apiClient, ApiResponse, PaginatedResponse, axiosInstance } from '@/services/axiosClient';

// Types
export interface DoctorDepartment {
  doctorDepartmentId: string;
  departmentId: string;
  departmentName: string;
  departmentDescription: string;
  assignedAt: string;
  hospitalDepartmentMappingId?: string;
}

export interface DoctorProfessionalData {
  userId: string;
  licenseNumber: string;
  qualification: string[];
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
  primaryDepartment: string;
  department: string;
  specializations: string[];
  hospitalId: string;
  hospitalDepartmentMappingId?: string;
}

export interface DoctorProfileResponse {
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
}

export interface DoctorSpecialization {
  doctorSpecializationId: string;
  specializationId: string;
  specializationName: string;
  specializationDescription: string;
  assignedAt: string;
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
  appointmentType?: string;
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

  updateDoctorProfessional: async (payload: {
    userId: string;
    hospitalDepartmentMappingId: string;
    licenseNumber: string;
    qualification: string[];
    experienceYears: number;
    medicalCouncil: string;
    registrationYear: number;
    bio: string;
    primaryDepartment: string;
    department: string;
    specializations: string[];
  }) => {
    try {
      const response = await apiClient.put(`${API_ENDPOINTS.DOCTORS.UPDATE_PROFILE}`,
        payload,
        {
          headers: {
            'accept': 'text/plain',
            'Content-Type': 'application/json',
          },
        }
      );

      return response;
    } catch (error) {
      throw error;
    }
  },
  // Get doctor profile
  getDoctorProfile: async (doctorId: string): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.DOCTORS.PROFILE}/${doctorId}`);
      return response as DoctorProfileResponse;
    } catch (error) {
      throw error;
    }
  },

  // Create doctor profile
  createDoctorProfile: async (doctorData: DoctorProfessionalData): Promise<DoctorProfileResponse> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.DOCTORS.PROFILE, doctorData);
      return response as DoctorProfileResponse;
    } catch (error) {
      throw error;
    }
  },
};
