import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type TriageStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'LEFT_WITHOUT_BEING_SEEN';
export type TriageDisposition = 'NONE' | 'FAST_TRACK_ADMISSION' | 'OPD' | 'DISCHARGE' | 'OBSERVATION' | 'REFERRED' | 'EXPIRED';
export type TriageMode = 'WALK_IN' | 'AMBULANCE' | 'POLICE' | 'REFERRED' | 'OTHER';
export type AcuityColor = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

export interface TriageListItem {
    triageRecordId: string;
    patientId?: string;
    patientName: string;
    age?: number;
    sex?: string;
    mobile?: string;
    chiefComplaint?: string;
    acuityLevel: number;
    acuityColor: AcuityColor | string;
    modeOfArrival?: string;
    arrivedAt: string;
    triagedAt: string;
    triageNurse: string;
    status: TriageStatus | string;
    disposition: TriageDisposition | string;
    waitMinutes: number;
}

export interface TriageRecordDetail {
    triageRecordId: string;
    patientId?: string;
    patientName: string;
    age?: number;
    sex?: string;
    mobile?: string;
    address?: string;
    attendant?: string;
    attendantContact?: string;
    modeOfArrival?: string;
    arrivedAt: string;
    chiefComplaint: string;
    historySummary?: string;
    vitalsSnapshot?: string;
    painScore?: string;
    allergies?: string;
    acuityLevel: number;
    acuityColor: AcuityColor | string;
    triageNurse: string;
    triagedAt: string;
    status: TriageStatus | string;
    disposition: TriageDisposition | string;
    dispositionNotes?: string;
    linkedAdmissionId?: string;
    linkedEncounterId?: string;
    referredTo?: string;
    completedAt?: string;
    completedBy?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface UpsertTriageRequest {
    triageRecordId?: string;
    hospitalId?: string;
    patientId?: string;
    patientName: string;
    age?: number;
    sex?: string;
    mobile?: string;
    address?: string;
    attendant?: string;
    attendantContact?: string;
    modeOfArrival?: TriageMode | string;
    arrivedAt?: string;
    chiefComplaint: string;
    historySummary?: string;
    vitalsSnapshot?: string;
    painScore?: string;
    allergies?: string;
    acuityLevel: number;
    triageNurse?: string;
    triagedAt?: string;
}

export interface UpsertTriageResponse {
    success: boolean;
    message?: string;
    triageRecordId?: string;
    acuityLevel?: number;
    acuityColor?: string;
}

export interface CompleteTriageRequest {
    hospitalId?: string;
    triageRecordId: string;
    disposition: TriageDisposition | 'LEFT_WITHOUT_BEING_SEEN' | string;
    dispositionNotes?: string;
    linkedAdmissionId?: string;
    linkedEncounterId?: string;
    referredTo?: string;
}

export interface CompleteTriageResponse {
    success: boolean;
    message?: string;
    status?: string;
    disposition?: string;
}

export interface TriageActionResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface GetTriageQueueResponse {
    success: boolean;
    message?: string;
    items: TriageListItem[];
}

export interface GetTriageByIdResponse {
    success: boolean;
    message?: string;
    record?: TriageRecordDetail;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const triageService = {
    upsert: (req: UpsertTriageRequest): Promise<UpsertTriageResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.TRIAGE.UPSERT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    queue: (opts?: { status?: string; minAcuity?: number; maxAcuity?: number; search?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetTriageQueueResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.TRIAGE.QUEUE(hospitalIdOrThrow(opts?.hospitalId), opts)),

    getById: (id: string, hospitalId?: string): Promise<GetTriageByIdResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.TRIAGE.GET_BY_ID(id, hospitalIdOrThrow(hospitalId))),

    markInProgress: (triageRecordId: string, hospitalId?: string): Promise<TriageActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.TRIAGE.IN_PROGRESS, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            triageRecordId,
        }),

    complete: (req: CompleteTriageRequest): Promise<CompleteTriageResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.TRIAGE.COMPLETE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
