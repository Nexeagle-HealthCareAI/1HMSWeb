import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// Same HTTP-400-on-business-failure normalization as clinicalOrderApi/bedBoardApi.
const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export type MarSlotStatus = 'PENDING' | 'DUE' | 'OVERDUE' | 'MISSED' | 'ADMINISTERED' | 'HELD' | 'REFUSED' | 'PATIENT_NOT_AVAILABLE';
export type MedicationActionStatus = 'ADMINISTERED' | 'HELD' | 'REFUSED' | 'PATIENT_NOT_AVAILABLE';

export interface MarSlotItem {
    scheduledForUtc: string;
    status: MarSlotStatus;
    medicationAdministrationId?: string | null;
    actedAt?: string | null;
    actedBy?: string | null;
    administeredDose?: string | null;
    administeredRoute?: string | null;
    reason?: string | null;
    notes?: string | null;
    witnessRequired: boolean;
    witnessName?: string | null;
    witnessConfirmedAt?: string | null;
}

export interface MarLineItem {
    orderLineId: string;
    orderId: string;
    itemName?: string | null;
    saltName?: string | null;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    instructions?: string | null;
    isHighAlert: boolean;
    orderLineStatusCode: string;   // ACTIVE / DISCONTINUED
    isAdHocOnly: boolean;          // SOS/PRN or unrecognized/legacy free-text Frequency — no fixed slots
    slots: MarSlotItem[];
}

interface GetMarGridResponse {
    success?: boolean;
    message?: string;
    dayStartUtc?: string;
    dayEndUtc?: string;
    lines?: MarLineItem[];
}

export interface RecordAdministrationOpts {
    administeredDose?: string;
    administeredRoute?: string;
    administrationSite?: string;
    reason?: string;
    notes?: string;
    fiveRightsConfirmed: boolean;
    witnessName?: string;
    witnessUserId?: string;
}

export const marApi = {
    getGrid: (admissionId: string, dayStartUtc: string, hospitalId?: string): Promise<MarLineItem[]> =>
        ipdApiClient
            .get<GetMarGridResponse>('/mar/grid', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, dayStartUtc } })
            .then(r => r.lines ?? []),

    record: async (
        orderLineId: string,
        scheduledFor: string,
        actionStatus: MedicationActionStatus,
        opts: RecordAdministrationOpts,
        hospitalId?: string,
    ) => {
        try {
            return await ipdApiClient.post('/mar/record', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                orderLineId,
                scheduledFor,
                actionStatus,
                ...opts,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the administration.'));
        }
    },
};
