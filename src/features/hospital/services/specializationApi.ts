import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types
export interface Specialization {
  specializationId: string;
  name: string;
  description: string;
}

export interface SpecializationsResponse {
  departmentId: string;
  hospitalId: string;
  includeGlobal: boolean;
  items: Specialization[];
}

// API Functions
export const specializationApi = {
  /**
   * Get specializations by department ID
   */
  getSpecializationsByDepartment: async (
    departmentId: string,
    hospitalId: string,
    includeGlobal: boolean = true
  ): Promise<SpecializationsResponse> => {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.SPECIALIZATIONS.BY_DEPARTMENT}?departmentId=${departmentId}&hospitalId=${hospitalId}&includeGlobal=${includeGlobal}`
      );
      console.log('Specializations API Response:', response);
      
      if (response && typeof response === 'object' && 'items' in response) {
        return response as SpecializationsResponse;
      }
      
      console.warn('Unexpected API response structure:', response);
      return { departmentId, hospitalId, includeGlobal, items: [] };
    } catch (error) {
      console.error('Error fetching specializations:', error);
      throw error; // Let React Query handle the error
    }
  },
};
