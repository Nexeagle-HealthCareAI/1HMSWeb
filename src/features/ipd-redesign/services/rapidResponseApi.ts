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

export type RrtTriggerReason = 'HIGH_EWS' | 'NURSE_CONCERN' | 'OTHER';
export type RrtOutcome = 'STABILIZED_ON_WARD' | 'TRANSFERRED_ICU' | 'OTHER';

export interface RapidResponseActivation {
    activationId: string;
    admissionId: string;
    patientName?: string | null;
    triggerReason: RrtTriggerReason;
    triggeredEwsScore?: number | null;
    calledBy: string;
    calledAt: string;
    respondingTeam?: string | null;
    arrivedAt?: string | null;
    responseTimeSeconds?: number | null;
    outcome?: RrtOutcome | null;
    outcomeNotes?: string | null;
    resolvedAt?: string | null;
}

export const rapidResponseApi = {
    activate: async (admissionId: string, triggerReason: RrtTriggerReason, triggeredEwsScore?: number, respondingTeam?: string, hospitalId?: string): Promise<{ success: boolean; message?: string; activationId?: string }> => {
        try {
            return await ipdApiClient.post('/rapid-response', {
                hospitalId: hospitalIdOrThrow(hospitalId), admissionId, triggerReason, triggeredEwsScore, respondingTeam,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not activate Rapid Response.'));
        }
    },

    markArrived: async (activationId: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/rapid-response/arrive', { hospitalId: hospitalIdOrThrow(hospitalId), activationId });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record arrival.'));
        }
    },

    resolve: async (activationId: string, outcome: RrtOutcome, outcomeNotes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/rapid-response/resolve', { hospitalId: hospitalIdOrThrow(hospitalId), activationId, outcome, outcomeNotes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not resolve Rapid Response.'));
        }
    },

    getHistory: (admissionId: string, hospitalId?: string): Promise<RapidResponseActivation[]> =>
        ipdApiClient
            .get<{ activations?: RapidResponseActivation[] }>('/rapid-response/history', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.activations ?? []),

    getOpen: (hospitalId?: string): Promise<RapidResponseActivation[]> =>
        ipdApiClient
            .get<{ activations?: RapidResponseActivation[] }>('/rapid-response/open', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.activations ?? []),
};
