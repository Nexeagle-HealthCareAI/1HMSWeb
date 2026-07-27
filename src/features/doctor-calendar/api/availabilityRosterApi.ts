import { API_ENDPOINTS } from '@/app/api';
import { apiClient } from '@/services';

export interface DoctorAvailabilityRosterItem {
  doctorId: string;
  fullName?: string | null;
  departmentName?: string | null;
  isAvailable: boolean;
  reason?: string | null;
}

interface GetDoctorAvailabilityRosterResponse {
  success?: boolean;
  doctors?: DoctorAvailabilityRosterItem[];
}

export const availabilityRosterApi = {
  getRoster: async (hospitalId: string, dateIso: string): Promise<DoctorAvailabilityRosterItem[]> => {
    const response = await apiClient.get<GetDoctorAvailabilityRosterResponse>(
      API_ENDPOINTS.CALENDAR.GET_AVAILABILITY_ROSTER(hospitalId, dateIso)
    );
    return response.doctors ?? [];
  },
};
