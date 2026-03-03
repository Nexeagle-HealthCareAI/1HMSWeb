import { apiClient } from '@/services/axiosClient';
import { Patient } from '../types';
import { useAuthStore } from '@/store/authStore';
import { API_ENDPOINTS } from '@/app/api';

export interface PatientSearchResponse {
    items: PatientResult[];
    totalPatients: number;
}

export interface PatientResult {
    patientId: string;
    fullName: string;
    mobile: string;
    sex: string;
    age: number;
    dateOfBirth: string;
    address: string;
    city: string;
    pincode: string;
    lastRegistrationAt: string;
    lastRegistrationId: string;
    matched?: {
        by: string;
        value: string;
    };
    appointmentDate: string | null;
    appointmentId: string | null;
    tokenNumber: string | null;
}

export const patientService = {
    searchPatients: async (query: string, by: 'patientId' | 'name' | 'contact'): Promise<Patient[]> => {
        try {
            // Get hospitalId from auth store
            let hospitalId = '';
            try {
                hospitalId = useAuthStore.getState().getHospitalId();
            } catch (e) {
                console.warn("Could not retrieve hospitalId from store", e);
            }

            const url = API_ENDPOINTS.PATIENTS.SEARCH(query, hospitalId);

            const response = await apiClient.get<PatientSearchResponse>(url);

            if (response && response.items) {
                return response.items.map(item => ({
                    id: item.patientId, // Using patientId as internal ID as well for now
                    patientId: item.patientId,
                    name: item.fullName,
                    mobile: item.mobile,
                    age: item.age,
                    sex: (item.sex === 'Male' ? 'M' : item.sex === 'Female' ? 'F' : 'M') as 'M' | 'F'
                }));
            }
            return [];
        } catch (error) {
            console.error("Error searching patients:", error);
            throw error;
        }
    }
};
