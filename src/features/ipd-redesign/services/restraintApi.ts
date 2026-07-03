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

export interface RestraintOrderItem {
    restraintOrderId: string;
    restraintType: string;
    reason: string;
    orderedByDoctorName: string;
    orderedAt: string;
    startedAt: string;
    startedBy?: string | null;
    monitoringIntervalMins: number;
    familyNotified: boolean;
    familyNotificationNotes?: string | null;
    releasedAt?: string | null;
    releasedBy?: string | null;
    releaseReason?: string | null;
    statusCode: 'ACTIVE' | 'RELEASED';
    notes?: string | null;
}

export interface StartRestraintFields {
    restraintType: string;
    reason: string;
    orderedByDoctorName: string;
    monitoringIntervalMins: number;
    familyNotified: boolean;
    familyNotificationNotes?: string;
    relatedConsentRecordId?: string;
    notes?: string;
}

interface GetRestraintOrdersResponse {
    success?: boolean;
    message?: string;
    orders?: RestraintOrderItem[];
}

export const restraintApi = {
    getOrders: (admissionId: string, hospitalId?: string): Promise<RestraintOrderItem[]> =>
        ipdApiClient
            .get<GetRestraintOrdersResponse>('/restraint', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.orders ?? []),

    start: async (admissionId: string, fields: StartRestraintFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/restraint', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not start the restraint.'));
        }
    },

    release: async (restraintOrderId: string, releaseReason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/restraint/release', { hospitalId: hospitalIdOrThrow(hospitalId), restraintOrderId, releaseReason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not release the restraint.'));
        }
    },
};
