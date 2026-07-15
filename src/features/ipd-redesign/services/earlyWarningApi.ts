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

export type EwsConsciousnessLevel = 'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE' | 'CONFUSION_NEW';
export type EwsRiskBand = 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';

export interface EarlyWarningAutoFill {
    respiratoryRate?: number | null;
    spo2?: number | null;
    systolicBp?: number | null;
    pulse?: number | null;
    temperatureC?: number | null;
    sourceVitalRecordedAt?: string | null;
}

export interface EarlyWarningScoreInput {
    respiratoryRate?: number;
    spo2?: number;
    supplementalOxygen: boolean;
    systolicBp?: number;
    pulse?: number;
    consciousnessLevel: EwsConsciousnessLevel;
    temperatureC?: number;
    notes?: string;
}

export interface EarlyWarningScoreEntry {
    scoreId: string;
    totalScore: number;
    riskBand: EwsRiskBand;
    rrScore: number;
    spo2Score: number;
    o2Score: number;
    bpScore: number;
    pulseScore: number;
    consciousnessScore: number;
    tempScore: number;
    scoredBy: string;
    scoredAt: string;
    notes?: string | null;
}

export interface RecordEarlyWarningScoreResponse {
    success: boolean;
    message?: string;
    scoreId?: string;
    totalScore?: number;
    riskBand?: EwsRiskBand;
    escalationRecommended: boolean;
}

export const earlyWarningApi = {
    getAutoFill: (admissionId: string, hospitalId?: string): Promise<EarlyWarningAutoFill> =>
        ipdApiClient.get<EarlyWarningAutoFill>('/vitals/ews/autofill', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } }),

    recordScore: async (admissionId: string, input: EarlyWarningScoreInput, hospitalId?: string): Promise<RecordEarlyWarningScoreResponse> => {
        try {
            return await ipdApiClient.post('/vitals/ews', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the Early Warning Score.'));
        }
    },

    getHistory: (admissionId: string, hospitalId?: string): Promise<EarlyWarningScoreEntry[]> =>
        ipdApiClient
            .get<{ scores?: EarlyWarningScoreEntry[] }>('/vitals/ews/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.scores ?? []),
};
