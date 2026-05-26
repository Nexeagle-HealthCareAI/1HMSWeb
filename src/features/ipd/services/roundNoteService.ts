import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export interface RoundNote {
    roundNoteId: string;
    admissionId: string;
    encounterId: string;
    doctorId?: string;
    doctorName?: string;
    notedAt: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    diagnosis?: string;
    isAddendum: boolean;
    parentNoteId?: string;
    addendumReason?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
    updatedBy?: string;
    editLocked: boolean;
}

export interface CreateRoundNoteRequest {
    hospitalId?: string;
    admissionId: string;
    doctorId?: string;
    notedAt?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    diagnosis?: string;
    isAddendum?: boolean;
    parentNoteId?: string;
    addendumReason?: string;
}

export interface CreateRoundNoteResponse {
    success: boolean;
    message?: string;
    roundNoteId?: string;
}

export interface UpdateRoundNoteRequest {
    notedAt?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    diagnosis?: string;
}

export interface UpdateRoundNoteResponse {
    success: boolean;
    message?: string;
    requiresAddendum: boolean;
}

export interface GetRoundNotesResponse {
    success: boolean;
    message?: string;
    items: RoundNote[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const roundNoteService = {
    create: (req: CreateRoundNoteRequest): Promise<CreateRoundNoteResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ROUND_NOTE.CREATE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    update: (roundNoteId: string, req: UpdateRoundNoteRequest, hospitalId?: string): Promise<UpdateRoundNoteResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.ROUND_NOTE.UPDATE(roundNoteId, hospitalIdOrThrow(hospitalId)), req),

    list: (admissionId: string, hospitalId?: string): Promise<GetRoundNotesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ROUND_NOTE.LIST(hospitalIdOrThrow(hospitalId), admissionId)),
};
