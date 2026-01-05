import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface PatientAnalysisResponse {
    hospitalId: string;
    patientId: string;
    patientAnalysis: {
        totalVisit: number;
        lastVisitDate: string;
        visitFrequency: number;
        patientTags: string;
        followUpsDue: boolean;
        noShow: boolean;
        doctorConsulted: Record<string, number>;
    };
    success: boolean;
    message: string;
}

export const patientAnalysisApi = {
    getPatientAnalysis: async (hospitalId: string, patientId: string): Promise<PatientAnalysisResponse> => {
        return apiClient.get<PatientAnalysisResponse>(
            API_ENDPOINTS.PATIENT_ANALYSIS(hospitalId, patientId)
        );
    },
};
