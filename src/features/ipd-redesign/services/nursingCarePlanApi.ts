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

export type NursingCarePlanStatus = 'ACTIVE' | 'RESOLVED' | 'DISCONTINUED';

export interface NursingCarePlanItemModel {
    carePlanItemId: string;
    nursingDiagnosis: string;
    goal?: string | null;
    plannedInterventions?: string | null;
    statusCode: NursingCarePlanStatus;
    createdAt: string;
    createdBy?: string | null;
    resolvedAt?: string | null;
    resolvedBy?: string | null;
    resolutionNotes?: string | null;
}

interface GetNursingCarePlanResponse {
    success?: boolean;
    message?: string;
    items?: NursingCarePlanItemModel[];
}

export const nursingCarePlanApi = {
    getItems: (admissionId: string, hospitalId?: string): Promise<NursingCarePlanItemModel[]> =>
        ipdApiClient
            .get<GetNursingCarePlanResponse>('/nursing-care-plan', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.items ?? []),

    create: async (admissionId: string, nursingDiagnosis: string, goal?: string, plannedInterventions?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-care-plan', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, nursingDiagnosis, goal, plannedInterventions });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not add the care plan item.'));
        }
    },

    resolve: async (carePlanItemId: string, statusCode: 'RESOLVED' | 'DISCONTINUED', resolutionNotes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-care-plan/resolve', { hospitalId: hospitalIdOrThrow(hospitalId), carePlanItemId, statusCode, resolutionNotes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not update the care plan item.'));
        }
    },
};
