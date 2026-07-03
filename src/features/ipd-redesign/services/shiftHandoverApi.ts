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

export type ShiftCode = 'MORNING' | 'EVENING' | 'NIGHT';

export interface ShiftHandoverNoteItem {
    shiftHandoverNoteId: string;
    shiftCode: ShiftCode;
    shiftDate: string;
    outgoingNurseName: string;
    incomingNurseName?: string | null;
    incomingAckAt?: string | null;
    isFreeText: boolean;
    freeTextNote?: string | null;
    situation?: string | null;
    background?: string | null;
    assessment?: string | null;
    recommendation?: string | null;
    handoverAt: string;
}

export interface CreateShiftHandoverFields {
    shiftCode: ShiftCode;
    outgoingNurseName: string;
    incomingNurseName?: string;
    isFreeText: boolean;
    freeTextNote?: string;
    situation?: string;
    background?: string;
    assessment?: string;
    recommendation?: string;
}

interface GetShiftHandoverNotesResponse {
    success?: boolean;
    message?: string;
    notes?: ShiftHandoverNoteItem[];
}

export const shiftHandoverApi = {
    getNotes: (admissionId: string, hospitalId?: string): Promise<ShiftHandoverNoteItem[]> =>
        ipdApiClient
            .get<GetShiftHandoverNotesResponse>('/shift-handover', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.notes ?? []),

    create: async (admissionId: string, fields: CreateShiftHandoverFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/shift-handover', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the handover.'));
        }
    },

    acknowledge: async (shiftHandoverNoteId: string, incomingNurseName: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/shift-handover/acknowledge', { hospitalId: hospitalIdOrThrow(hospitalId), shiftHandoverNoteId, incomingNurseName });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not acknowledge the handover.'));
        }
    },
};
