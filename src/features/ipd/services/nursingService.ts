import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type MorseRisk = 'NONE' | 'LOW' | 'HIGH';
export type BradenRisk = 'NONE' | 'MILD' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type MustRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NursingAssessment {
    nursingAssessmentId: string;
    assessedAt: string;
    assessedBy?: string;

    morseHistoryOfFalling: number;
    morseSecondaryDiagnosis: number;
    morseAmbulatoryAid: number;
    morseIvHeparinLock: number;
    morseGait: number;
    morseMentalStatus: number;
    morseTotal: number;
    morseRisk: MorseRisk | string;

    bradenSensoryPerception: number;
    bradenMoisture: number;
    bradenActivity: number;
    bradenMobility: number;
    bradenNutrition: number;
    bradenFrictionShear: number;
    bradenTotal: number;
    bradenRisk: BradenRisk | string;

    mustBmiScore: number;
    mustWeightLossScore: number;
    mustAcuteDiseaseScore: number;
    mustTotal: number;
    mustRisk: MustRisk | string;

    notes?: string;
}

export interface GetNursingAssessmentsResponse {
    success: boolean;
    message?: string;
    items: NursingAssessment[];
}

export interface RecordNursingAssessmentRequest {
    hospitalId?: string;
    admissionId: string;
    assessedAt?: string;

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

export interface RecordNursingAssessmentResponse {
    success: boolean;
    message?: string;
    nursingAssessmentId?: string;
    morseTotal: number;
    morseRisk?: MorseRisk | string;
    bradenTotal: number;
    bradenRisk?: BradenRisk | string;
    mustTotal: number;
    mustRisk?: MustRisk | string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const nursingService = {
    record: (req: RecordNursingAssessmentRequest): Promise<RecordNursingAssessmentResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.NURSING.RECORD, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (admissionId: string, hospitalId?: string): Promise<GetNursingAssessmentsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.NURSING.LIST(hospitalIdOrThrow(hospitalId), admissionId)),
};
