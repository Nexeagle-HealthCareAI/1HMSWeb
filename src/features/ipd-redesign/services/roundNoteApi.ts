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

export interface RoundNoteItem {
    roundNoteId: string;
    doctorId?: string | null;
    doctorName?: string | null;
    notedAt: string;
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    diagnosis?: string | null;
    isAddendum: boolean;
    parentNoteId?: string | null;
    addendumReason?: string | null;
}

export interface CreateRoundNoteFields {
    doctorId?: string;
    doctorName?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    diagnosis?: string;
    parentNoteId?: string;
    addendumReason?: string;
}

interface GetRoundNotesResponse {
    success?: boolean;
    message?: string;
    notes?: RoundNoteItem[];
}

export const roundNoteApi = {
    getNotes: (admissionId: string, hospitalId?: string): Promise<RoundNoteItem[]> =>
        ipdApiClient
            .get<GetRoundNotesResponse>('/round-note', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.notes ?? []),

    create: async (admissionId: string, fields: CreateRoundNoteFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/round-note', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the round note.'));
        }
    },
};
