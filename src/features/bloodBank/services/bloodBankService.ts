import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type BloodComponent = 'WHOLE' | 'PRBC' | 'FFP' | 'PLATELET' | 'CRYO';
export type BloodGroup = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'O_POS' | 'O_NEG' | 'AB_POS' | 'AB_NEG';
export type BloodBagStatus = 'AVAILABLE' | 'RESERVED' | 'TRANSFUSED' | 'DISCARDED';
export type CrossmatchResult = 'COMPATIBLE' | 'INCOMPATIBLE' | 'NOT_DONE';
export type TransfusionReaction = 'NONE' | 'MILD' | 'SEVERE' | 'ANAPHYLAXIS';

export interface BloodBag {
    bloodBagId: string;
    bagNumber: string;
    component: BloodComponent | string;
    bloodGroup: BloodGroup | string;
    volumeMl: number;
    donorRef?: string;
    collectedAt: string;
    expiresAt: string;
    isExpired: boolean;
    isExpiringSoon: boolean;
    storageLocation?: string;
    status: BloodBagStatus | string;
    reservedForAdmissionId?: string;
    reservedForPatientId?: string;
    crossmatchResult?: CrossmatchResult | string;
    reservedAt?: string;
    reservedBy?: string;
    unitRate?: number;
    isTaxable: boolean;
    gstSlabPercent?: number;
}

export interface UpsertBloodBagRequest {
    bloodBagId?: string;
    hospitalId?: string;
    bagNumber: string;
    component: BloodComponent | string;
    bloodGroup: BloodGroup | string;
    volumeMl: number;
    donorRef?: string;
    collectedAt: string;
    expiresAt: string;
    storageLocation?: string;
    chargeId?: string;
    unitRate?: number;
    hsnSacCode?: string;
    gstSlabPercent?: number;
    isTaxable?: boolean;
}

export interface UpsertBloodBagResponse {
    success: boolean;
    message?: string;
    bloodBagId?: string;
    bagNumber?: string;
}

export interface GetBloodBagsResponse {
    success: boolean;
    message?: string;
    items: BloodBag[];
}

export interface ReserveBloodBagRequest {
    hospitalId?: string;
    bloodBagId: string;
    admissionId: string;
    encounterId: string;
    patientId?: string;
    crossmatchResult: CrossmatchResult | string;
    crossmatchBy?: string;
}

export interface ReleaseBloodBagRequest {
    hospitalId?: string;
    bloodBagId: string;
}

export interface DiscardBloodBagRequest {
    hospitalId?: string;
    bloodBagId: string;
    reason: string;
}

export interface BloodBagActionResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface RecordTransfusionRequest {
    hospitalId?: string;
    bloodBagId: string;
    admissionId: string;
    patientId?: string;
    startedAt?: string;
    endedAt?: string;
    volumeGivenMl: number;
    vitalsBefore?: string;
    vitalsAfter?: string;
    reaction: TransfusionReaction | string;
    reactionNotes?: string;
    administeredBy?: string;
    witnessName: string;
    witnessUserId?: string;
    notes?: string;
}

export interface RecordTransfusionResponse {
    success: boolean;
    message?: string;
    transfusionEventId?: string;
    bagStatus?: string;
    chargeEventId?: string;
}

export interface TransfusionEvent {
    transfusionEventId: string;
    bloodBagId: string;
    bagNumber: string;
    component: BloodComponent | string;
    bloodGroup: BloodGroup | string;
    admissionId: string;
    patientId?: string;
    startedAt: string;
    endedAt?: string;
    volumeGivenMl: number;
    reaction: TransfusionReaction | string;
    reactionNotes?: string;
    administeredBy: string;
    witnessName: string;
    chargeEventId?: string;
    notes?: string;
}

export interface GetTransfusionsResponse {
    success: boolean;
    message?: string;
    items: TransfusionEvent[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const bloodBankService = {
    upsertBag: (req: UpsertBloodBagRequest): Promise<UpsertBloodBagResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BLOOD_BANK.UPSERT_BAG, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listBags: (opts?: { component?: string; bloodGroup?: string; status?: string; reservedForAdmissionId?: string; search?: string; take?: number; hospitalId?: string }): Promise<GetBloodBagsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BLOOD_BANK.LIST_BAGS(hospitalIdOrThrow(opts?.hospitalId), opts)),

    reserve: (req: ReserveBloodBagRequest): Promise<BloodBagActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BLOOD_BANK.RESERVE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    release: (req: ReleaseBloodBagRequest): Promise<BloodBagActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BLOOD_BANK.RELEASE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    discard: (req: DiscardBloodBagRequest): Promise<BloodBagActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BLOOD_BANK.DISCARD, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    recordTransfusion: (req: RecordTransfusionRequest): Promise<RecordTransfusionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BLOOD_BANK.RECORD_TRANSFUSION, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listTransfusions: (opts?: { admissionId?: string; bloodBagId?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetTransfusionsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BLOOD_BANK.LIST_TRANSFUSIONS(hospitalIdOrThrow(opts?.hospitalId), opts)),
};
