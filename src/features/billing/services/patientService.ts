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

export interface RegisterWalkInPatientInput {
    fullName: string;
    mobile: string;
    age?: number;
    ageUnit?: string;
    sex?: 'Male' | 'Female';
    guardianName?: string;
}

interface RegisterWalkInPatientResponse {
    success: boolean;
    message?: string;
    patientId?: string;
    fullName?: string;
    mobile?: string;
    age?: number;
    sex?: string;
}

export const patientService = {
    // Registers a patient with no appointment/admission attached -- for a walk-in with no
    // doctor/slot/bed to book against. Matches by mobile+name and updates in place server-side
    // (AppointmentBookingHelpers.FindOrCreatePatientAsync), same as every other registration path.
    registerWalkIn: async (hospitalId: string, patient: RegisterWalkInPatientInput): Promise<Patient> => {
        let userId: string | undefined;
        try {
            userId = useAuthStore.getState().getUserId() || undefined;
        } catch (e) {
            console.warn("Could not retrieve userId from store", e);
        }
        const response = await apiClient.post<RegisterWalkInPatientResponse>(API_ENDPOINTS.PATIENTS.REGISTER, {
            hospitalId,
            userId,
            patient: {
                fullName: patient.fullName,
                mobile: patient.mobile,
                age: patient.age,
                ageUnit: patient.ageUnit || 'Y',
                sex: patient.sex,
                guardianName: patient.guardianName || undefined,
            },
        });
        if (!response.success || !response.patientId) {
            throw new Error(response.message || 'Could not register patient');
        }
        return {
            id: response.patientId,
            patientId: response.patientId,
            name: response.fullName || patient.fullName,
            mobile: response.mobile || patient.mobile,
            age: response.age ?? patient.age ?? 0,
            sex: (response.sex === 'Male' ? 'M' : response.sex === 'Female' ? 'F' : (patient.sex === 'Female' ? 'F' : 'M')) as 'M' | 'F',
        };
    },

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
