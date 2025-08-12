import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types
export interface Department {
  departmentID: string;
  hospitalID: string | null;
  name: string;
  description: string;
  isActive: boolean;
}

export interface GlobalDepartmentsResponse {
  departments: Department[];
}

// API Functions
export const departmentApi = {
  /**
   * Get global departments
   */
  getGlobalDepartments: async (): Promise<GlobalDepartmentsResponse> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS.GLOBAL);
      console.log('Raw API Response:', response);
      
      // The API returns { departments: Department[] }
      if (response && typeof response === 'object' && 'departments' in response) {
        return response as GlobalDepartmentsResponse;
      }
      
      // Fallback for unexpected response structure
      console.warn('Unexpected API response structure:', response);
      return { departments: [] };
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error; // Let React Query handle the error
    }
  },
};
