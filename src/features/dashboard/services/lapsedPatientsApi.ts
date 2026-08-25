import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface LapsedPatientItem {
    patientId: string;
    fullName: string;
    marketingConsent: boolean;
    visitCount: number;
    lastVisitDate: string;
    daysSinceLastVisit: number;
    averageGapDays: number;
}

export interface LapsedPatientsResponse {
    success: boolean;
    message: string;
    data: {
        totalCount: number;
        page: number;
        limit: number;
        outlook: string;
        suggestedOutreachMessage: string;
        patients: LapsedPatientItem[];
    } | null;
}

export const fetchLapsedPatients = async (hospitalId: string, page = 1, limit = 20): Promise<LapsedPatientsResponse> => {
    return await apiClient.get<LapsedPatientsResponse>(API_ENDPOINTS.HOSPITALS.GET_LAPSED_PATIENTS(hospitalId, page, limit));
};
