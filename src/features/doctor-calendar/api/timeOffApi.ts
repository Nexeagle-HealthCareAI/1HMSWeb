import { API_ENDPOINTS } from '@/app/api';
import { apiClient } from '@/services';
import { 
  GetTimeOffResponse, 
  CreateTimeOffRequest, 
  CreateTimeOffResponse,
  DeleteTimeOffResponse,
  DoctorCalendarConfigResponse
} from './types';

export const timeOffApi = {
  // Get doctor's time-off data
  getDoctorTimeOff: (doctorId: string, hospitalId: string): Promise<GetTimeOffResponse> => {
    return apiClient.get(API_ENDPOINTS.CALENDAR.GET_DOCTOR_TIMEOFF(doctorId, hospitalId));
  },

  // Create a new time-off entry
  createDoctorTimeOff: (data: CreateTimeOffRequest): Promise<CreateTimeOffResponse> => {
    return apiClient.post(API_ENDPOINTS.CALENDAR.CREATE_DOCTOR_TIMEOFF, data);
  },

  // Delete a time-off entry
  deleteDoctorTimeOff: (timeOffId: string): Promise<DeleteTimeOffResponse> => {
    return apiClient.delete(API_ENDPOINTS.CALENDAR.DELETE_DOCTOR_TIMEOFF(timeOffId));
  },

  // Get doctor calendar configuration
  getDoctorCalendarConfig: (doctorId: string, hospitalId: string, startDate: string, days: number): Promise<DoctorCalendarConfigResponse> => {
    return apiClient.get(API_ENDPOINTS.CALENDAR.GET_DOCTOR_CONFIG(doctorId, hospitalId, startDate, days));
  },
};
