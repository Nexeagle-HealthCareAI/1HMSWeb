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

export type IcuLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
export type ChronicHealthCategory = 'NONE' | 'ELECTIVE_POSTOP' | 'NONOPERATIVE_OR_EMERGENCY_POSTOP';
export type VasopressorTier = 'NONE' | 'MAP_LOW' | 'DOPAMINE_LOW_OR_DOBUTAMINE' | 'DOPAMINE_MED_OR_EPI_LOW_OR_NOREPI_LOW' | 'DOPAMINE_HIGH_OR_EPI_HIGH_OR_NOREPI_HIGH';

export interface IcuLevelOfCareEntry {
    icuLevelOfCareId: string;
    level: IcuLevel;
    reason?: string | null;
    notes?: string | null;
    assessedBy: string;
    assessedAt: string;
}

export interface ApacheIIAutoFill {
    temperature?: number | null;
    mapValue?: number | null;
    heartRate?: number | null;
    respiratoryRate?: number | null;
    gcsTotal?: number | null;
    ageYears?: number | null;
    sourceVitalRecordedAt?: string | null;
}

export interface ApacheIIScoreInput {
    temperature?: number;
    mapValue?: number;
    heartRate?: number;
    respiratoryRate?: number;
    fiO2?: number;
    paO2?: number;
    arterialPh?: number;
    serumSodium?: number;
    serumPotassium?: number;
    serumCreatinine?: number;
    isAcuteRenalFailure: boolean;
    hematocrit?: number;
    wbc?: number;
    gcsTotal?: number;
    ageYears?: number;
    chronicHealthCategory: ChronicHealthCategory;
    notes?: string;
}

export interface ApacheIIScoreEntry {
    apacheIIScoreId: string;
    totalScore: number;
    chronicHealthCategory: ChronicHealthCategory;
    scoredBy: string;
    scoredAt: string;
    notes?: string | null;
}

export interface SofaAutoFill {
    mapValue?: number | null;
    gcsTotal?: number | null;
    urineOutputMlPerDay?: number | null;
    sourceVitalRecordedAt?: string | null;
}

export interface SofaScoreInput {
    paO2FiO2Ratio?: number;
    onRespiratorySupport: boolean;
    plateletsCount?: number;
    bilirubinMgDl?: number;
    mapValue?: number;
    vasopressorTier: VasopressorTier;
    gcsTotal?: number;
    creatinineMgDl?: number;
    urineOutputMlPerDay?: number;
    notes?: string;
}

export interface SofaScoreEntry {
    sofaScoreId: string;
    totalScore: number;
    respiratoryScore: number;
    coagulationScore: number;
    liverScore: number;
    cardiovascularScore: number;
    cnsScore: number;
    renalScore: number;
    scoredBy: string;
    scoredAt: string;
    notes?: string | null;
}

export interface IcuBoardCase {
    admissionId: string;
    encounterId: string;
    patientName?: string | null;
    bedCode?: string | null;
    wardCode?: string | null;
    icuLevel?: string | null;
    apacheScore?: number | null;
    sofaScore?: number | null;
    onVentilator: boolean;
    primaryDiagnosis?: string | null;
    ewsScore?: number | null;
    ewsRiskBand?: 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH' | null;
    hasOpenRapidResponse: boolean;
    activeDeviceCount: number;
    hasOverdueBundleCheck: boolean;
}

export const icuApi = {
    getBoard: (hospitalId?: string): Promise<IcuBoardCase[]> =>
        ipdApiClient
            .get<{ cases?: IcuBoardCase[] }>('/icu/board', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.cases ?? []),
    getLevelOfCareHistory: (admissionId: string, hospitalId?: string): Promise<IcuLevelOfCareEntry[]> =>
        ipdApiClient
            .get<{ history?: IcuLevelOfCareEntry[] }>('/icu/level-of-care/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.history ?? []),

    recordLevelOfCare: async (admissionId: string, level: IcuLevel, reason?: string, notes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/icu/level-of-care', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, level, reason, notes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the level of care.'));
        }
    },

    getApacheAutoFill: (admissionId: string, hospitalId?: string): Promise<ApacheIIAutoFill> =>
        ipdApiClient.get<ApacheIIAutoFill>('/icu/apache/autofill', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } }),

    recordApacheScore: async (admissionId: string, input: ApacheIIScoreInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/icu/apache', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the APACHE II score.'));
        }
    },

    getApacheHistory: (admissionId: string, hospitalId?: string): Promise<ApacheIIScoreEntry[]> =>
        ipdApiClient
            .get<{ scores?: ApacheIIScoreEntry[] }>('/icu/apache/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.scores ?? []),

    getSofaAutoFill: (admissionId: string, hospitalId?: string): Promise<SofaAutoFill> =>
        ipdApiClient.get<SofaAutoFill>('/icu/sofa/autofill', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } }),

    recordSofaScore: async (admissionId: string, input: SofaScoreInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/icu/sofa', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the SOFA score.'));
        }
    },

    getSofaHistory: (admissionId: string, hospitalId?: string): Promise<SofaScoreEntry[]> =>
        ipdApiClient
            .get<{ scores?: SofaScoreEntry[] }>('/icu/sofa/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.scores ?? []),
};
