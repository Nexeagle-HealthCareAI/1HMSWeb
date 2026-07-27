import { API_ENDPOINTS } from '@/app/api';
import { apiClient } from '@/services';

export interface HospitalDoctorItem {
  doctorId: string;
  fullName?: string | null;
  departmentName?: string | null;
}

interface GetHospitalDoctorsResponse {
  success?: boolean;
  doctors?: HospitalDoctorItem[];
}

export const doctorListApi = {
  getHospitalDoctors: async (hospitalId: string): Promise<HospitalDoctorItem[]> => {
    const response = await apiClient.get<GetHospitalDoctorsResponse>(API_ENDPOINTS.CALENDAR.GET_HOSPITAL_DOCTORS(hospitalId));
    return response.doctors ?? [];
  },
};
