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
  // Optional link into the NMC qualification-ladder catalog — additive, sits alongside the
  // department/specializations above.
  primaryMedicalSpecialityId?: string;
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
  primaryMedicalSpecialityId?: string;
  primaryMedicalSpecialityName?: string;
  primaryMedicalSpecialityPatientFacingName?: string;
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
    primaryMedicalSpecialityId?: string;
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
    if (doctorId === 'PREVIEW-USER') {
      return Promise.resolve({
        doctorId: 'd1',
        userId: 'PREVIEW-USER',
        licenseNumber: 'MC-12345',
        qualifications: ['MBBS', 'MD (Cardiology)'],
        experienceYears: 15,
        medicalCouncil: 'Medical Council of India',
        registrationYear: 2011,
        bio: 'Senior consultant cardiologist specializing in interventional cardiology.',
        primaryDepartmentID: 'dept-1',
        primaryDepartmentName: 'Cardiology',
        primaryMedicalSpecialityId: 'spec-1',
        primaryMedicalSpecialityName: 'Cardiology',
        primaryMedicalSpecialityPatientFacingName: 'Cardiologist',
        profileCompletionPercentage: 100,
        createdAt: new Date().toISOString(),
        doctorDepartments: [],
        doctorSpecializations: []
      });
    }
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

  // Get doctors by department and hospital
  getDoctorsByDepartment: async (departmentId: string, hospitalId: string): Promise<any[]> => {
    try {
      const url = API_ENDPOINTS.DOCTORS.GET_BY_DEPARTMENT(departmentId, hospitalId);
      console.log(`[DoctorAPI] Fetching from: ${url}`);
      const response = await apiClient.get(url);
      console.log(`[DoctorAPI] Response for dept ${departmentId}:`, response);

      let doctors: any[] = [];

      if (!response) {
        console.warn(`[DoctorAPI] Received empty response for department ${departmentId}`);
        return [];
      }

      // Handle various structures
      if (Array.isArray(response)) {
        doctors = response;
      } else if (typeof response === 'object') {
        const anyResponse = response as any;
        if ('doctors' in anyResponse && Array.isArray(anyResponse.doctors)) {
          doctors = anyResponse.doctors;
        } else if ('data' in anyResponse) {
          if (Array.isArray(anyResponse.data)) {
            doctors = anyResponse.data;
          } else if (anyResponse.data && typeof anyResponse.data === 'object' && 'doctors' in anyResponse.data) {
            doctors = anyResponse.data.doctors;
          }
        } else if ('items' in anyResponse && Array.isArray(anyResponse.items)) {
          doctors = anyResponse.items;
        }
      }

      console.log(`[DoctorAPI] Extracted ${doctors.length} doctors before normalization`);

      // Normalize fields to match component expectations (userId, fullName)
      const normalizedDoctors = doctors.map((doc: any, index: number) => ({
        userId: String(doc.userId || doc.doctorId || doc.id || doc.DoctorID || `doc-${index}`),
        fullName: String(doc.fullName || doc.doctorName || doc.name || doc.FullName || 'Unknown Doctor'),
        ...doc
      }));

      console.log(`[DoctorAPI] Normalized doctors:`, normalizedDoctors);
      return normalizedDoctors;
    } catch (error) {
      console.error(`[DoctorAPI] Error fetching doctors for department ${departmentId}:`, error);
      throw error;
    }
  },
};
