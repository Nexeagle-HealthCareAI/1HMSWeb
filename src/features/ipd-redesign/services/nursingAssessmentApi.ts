import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface NursingAssessmentItem {
    nursingAssessmentId: string;
    assessedAt: string;
    assessedBy?: string | null;
    morseHistoryOfFalling: number;
    morseSecondaryDiagnosis: number;
    morseAmbulatoryAid: number;
    morseIvHeparinLock: number;
    morseGait: number;
    morseMentalStatus: number;
    morseTotal: number;
    morseRisk: string;
    bradenSensoryPerception: number;
    bradenMoisture: number;
    bradenActivity: number;
    bradenMobility: number;
    bradenNutrition: number;
    bradenFrictionShear: number;
    bradenTotal: number;
    bradenRisk: string;
    mustBmiScore: number;
    mustWeightLossScore: number;
    mustAcuteDiseaseScore: number;
    mustTotal: number;
    mustRisk: string;
    notes?: string | null;
}

export interface RecordNursingAssessmentFields {
    morseHistoryOfFalling: number;
    morseSecondaryDiagnosis: number;
    morseAmbulatoryAid: number;
    morseIvHeparinLock: number;
    morseGait: number;
    morseMentalStatus: number;
    bradenSensoryPerception: number;
    bradenMoisture: number;
    bradenActivity: number;
    bradenMobility: number;
    bradenNutrition: number;
    bradenFrictionShear: number;
    mustBmiScore: number;
    mustWeightLossScore: number;
    mustAcuteDiseaseScore: number;
    notes?: string;
}

interface GetNursingAssessmentsResponse {
    success?: boolean;
    message?: string;
    assessments?: NursingAssessmentItem[];
}

export const nursingAssessmentApi = {
    getAssessments: (admissionId: string, hospitalId?: string): Promise<NursingAssessmentItem[]> =>
        ipdApiClient
            .get<GetNursingAssessmentsResponse>('/nursing-assessment', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.assessments ?? []),

    record: async (admissionId: string, fields: RecordNursingAssessmentFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-assessment', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the nursing assessment.'));
        }
    },
};
