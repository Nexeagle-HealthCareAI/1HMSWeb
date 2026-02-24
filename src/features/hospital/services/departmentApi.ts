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

export interface DepartmentsResponse {
  departments: Department[];
}

// API Functions
export const departmentApi = {
  /**
   * Get global departments
   */
  getGlobalDepartments: async (): Promise<DepartmentsResponse> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS.GLOBAL);
      console.log('Global Departments API Response:', response);

      let departments: Department[] = [];

      // Handle object structure { departments: [] }
      if (response && typeof response === 'object' && 'departments' in response) {
        departments = (response as any).departments;
      } else if (Array.isArray(response)) {
        departments = response;
      }

      // Normalize fields
      const normalizedDepartments = departments.map((dept: any) => ({
        departmentID: dept.departmentID || dept.departmentId || dept.id,
        hospitalID: dept.hospitalID || dept.hospitalId,
        name: dept.name || dept.departmentName || '',
        description: dept.description || '',
        isActive: dept.isActive !== false,
      }));

      return { departments: normalizedDepartments };
    } catch (error) {
      console.error('Error fetching global departments:', error);
      throw error;
    }
  },

  getDepartmentsByHospitalId: async (hospitalId: string): Promise<DepartmentsResponse> => {
    try {
      const url = API_ENDPOINTS.DEPARTMENTS.GET_BY_HOSPITAL_ID(hospitalId);
      console.log(`[DepartmentAPI] Fetching from: ${url}`);
      const response = await apiClient.get(url);
      console.log(`[DepartmentAPI] Response for ${hospitalId}:`, response);

      let departments: any[] = [];

      if (!response) {
        console.warn(`[DepartmentAPI] Received empty response for hospital ${hospitalId}`);
        return { departments: [] };
      }

      // Handle various structures
      if (Array.isArray(response)) {
        departments = response;
      } else if (typeof response === 'object') {
        const anyResponse = response as any;
        if ('departments' in anyResponse && Array.isArray(anyResponse.departments)) {
          departments = anyResponse.departments;
        } else if ('data' in anyResponse) {
          if (Array.isArray(anyResponse.data)) {
            departments = anyResponse.data;
          } else if (anyResponse.data && typeof anyResponse.data === 'object' && 'departments' in anyResponse.data) {
            departments = anyResponse.data.departments;
          }
        } else if ('items' in anyResponse && Array.isArray(anyResponse.items)) {
          departments = anyResponse.items;
        }
      }

      console.log(`[DepartmentAPI] Extracted ${departments.length} departments before normalization`);

      // Normalize fields
      const normalizedDepartments = departments.map((dept: any, index: number) => {
        const id = dept.departmentID || dept.departmentId || dept.id || dept.DepartmentID || `dept-${index}`;
        const name = dept.name || dept.departmentName || dept.label || dept.Name || 'Unknown Department';

        return {
          departmentID: String(id),
          hospitalID: dept.hospitalID || dept.hospitalId || hospitalId,
          name: String(name),
          description: dept.description || '',
          isActive: dept.isActive !== false,
        };
      });

      console.log(`[DepartmentAPI] Normalized departments:`, normalizedDepartments);
      return { departments: normalizedDepartments };
    } catch (error) {
      console.error(`[DepartmentAPI] Error fetching departments for hospital ${hospitalId}:`, error);
      throw error;
    }
  },
};
