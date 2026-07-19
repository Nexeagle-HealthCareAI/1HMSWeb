import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// One row from the NMC qualification-ladder catalog (dbo.MedicalSpecialities) — MD/MS
// (broad) or DM/MCh (super-speciality). Used for the doctor-profile "primary speciality"
// picker; kept separate from the free-text QualificationSelector and the Department/
// Specialization system, which this doesn't touch.
export interface MedicalSpeciality {
  specialityId: string;
  qualificationTypeCode: 'MD' | 'MS' | 'DM' | 'MCh';
  qualificationTypeName: string;
  name: string;
  patientFacingName: string | null;
  patientFacingCategory: string | null;
  sortOrder: number;
}

export interface MedicalSpecialitiesResponse {
  items: MedicalSpeciality[];
}

export const medicalSpecialityApi = {
  getAll: async (): Promise<MedicalSpecialitiesResponse> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MEDICAL_SPECIALITIES.GET_ALL);

      if (response && typeof response === 'object' && 'items' in response) {
        return response as MedicalSpecialitiesResponse;
      }

      console.warn('Unexpected medical specialities response structure:', response);
      return { items: [] };
    } catch (error) {
      console.error('Error fetching medical specialities:', error);
      throw error;
    }
  },
};
