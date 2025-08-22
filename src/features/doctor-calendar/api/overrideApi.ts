import { API_ENDPOINTS } from '@/app/api';
import { apiClient } from '@/services';
import { 
  CreateOverridePayload,
  CreateOverrideResponse,
  DeleteOverrideResponse
} from './types';

export const overrideApi = {
  // Create a new doctor shift override
  createDoctorOverride: (data: CreateOverridePayload): Promise<CreateOverrideResponse> => {
    return apiClient.post(API_ENDPOINTS.CALENDAR.CREATE_DOCTOR_OVERRIDE, data);
  },
  
  // Delete a doctor shift override
  deleteDoctorOverride: (overrideId: string): Promise<DeleteOverrideResponse> => {
    return apiClient.delete(API_ENDPOINTS.CALENDAR.DELETE_DOCTOR_OVERRIDE(overrideId));
  },
};
