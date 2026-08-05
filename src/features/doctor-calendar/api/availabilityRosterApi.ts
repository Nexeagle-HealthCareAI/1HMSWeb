import { API_ENDPOINTS } from '@/app/api';
import { apiClient } from '@/services';

export interface DoctorAvailabilityRosterItem {
  doctorId: string;
  fullName?: string | null;
  departmentName?: string | null;
  isAvailable: boolean;
  reason?: string | null;
  timeOffId?: string | null;
  timeOffFromDate?: string | null;
  timeOffToDate?: string | null;
  isOnlineNow: boolean;
}

interface GetDoctorAvailabilityRosterResponse {
  success?: boolean;
  doctors?: DoctorAvailabilityRosterItem[];
}

interface UpdateDoctorOnlineStatusResponse {
  success: boolean;
  message?: string | null;
}

export const availabilityRosterApi = {
  getRoster: async (hospitalId: string, dateIso: string): Promise<DoctorAvailabilityRosterItem[]> => {
    const response = await apiClient.get<GetDoctorAvailabilityRosterResponse>(
      API_ENDPOINTS.CALENDAR.GET_AVAILABILITY_ROSTER(hospitalId, dateIso)
    );
    return response.doctors ?? [];
  },

  updateOnlineStatus: (
    hospitalId: string,
    doctorId: string,
    isOnlineNow: boolean
  ): Promise<UpdateDoctorOnlineStatusResponse> =>
    apiClient.patch(API_ENDPOINTS.CALENDAR.UPDATE_ONLINE_STATUS(hospitalId), { doctorId, isOnlineNow }),
};
