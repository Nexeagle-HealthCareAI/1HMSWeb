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

export type InfectionType = 'CLABSI' | 'CAUTI' | 'VAP' | 'OTHER';

export interface InfectionEventItem {
    infectionEventId: string;
    deviceAssignmentId?: string | null;
    infectionType: InfectionType;
    diagnosedAt: string;
    diagnosedByDoctorName: string;
    cultureOrganism?: string | null;
    notes?: string | null;
}

export interface LogInfectionEventFields {
    deviceAssignmentId?: string;
    infectionType: InfectionType;
    diagnosedAt?: string;
    diagnosedByDoctorName: string;
    cultureOrganism?: string;
    notes?: string;
}

interface GetInfectionEventsResponse {
    success?: boolean;
    message?: string;
    events?: InfectionEventItem[];
}

export const infectionApi = {
    getEvents: (admissionId: string, hospitalId?: string): Promise<InfectionEventItem[]> =>
        ipdApiClient
            .get<GetInfectionEventsResponse>('/infection-events', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.events ?? []),

    log: async (admissionId: string, fields: LogInfectionEventFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/infection-events', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not log the infection event.'));
        }
    },
};
