import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type MlcStatus = 'DRAFT' | 'FINALIZED' | 'AMENDED';
export type MlcCaseType = 'RTA' | 'ASSAULT' | 'BURN' | 'POISONING' | 'SEXUAL_ASSAULT' | 'FALL' | 'SUICIDE_ATTEMPT' | 'FIREARM' | 'ELECTRIC_SHOCK' | 'DROWNING' | 'OTHER';
export type MlcOutcome = 'UNDER_TREATMENT' | 'ADMITTED' | 'DISCHARGED' | 'REFERRED' | 'DAMA' | 'EXPIRED';

export type InjuryRegion = 'HEAD' | 'FACE' | 'NECK' | 'CHEST' | 'ABDOMEN' | 'BACK' | 'PELVIS' | 'GENITALS'
    | 'UPPER_LIMB_LEFT' | 'UPPER_LIMB_RIGHT' | 'LOWER_LIMB_LEFT' | 'LOWER_LIMB_RIGHT' | 'MULTIPLE' | 'OTHER';
export type InjuryType = 'ABRASION' | 'CONTUSION' | 'LACERATION' | 'INCISED' | 'STAB' | 'PUNCTURE' | 'BURN' | 'FIREARM' | 'BITE' | 'FRACTURE' | 'OTHER';
export type InjurySeverity = 'SIMPLE' | 'GRIEVOUS' | 'DANGEROUS' | 'FATAL' | 'NOT_OPINED';

export interface MlcListItem {
    mlcRecordId: string;
    mlcNumber: string;
    arrivedAt: string;
    patientName: string;
    age?: number;
    sex?: string;
    caseType: MlcCaseType | string;
    status: MlcStatus | string;
    outcome: MlcOutcome | string;
    policeIntimated: boolean;
    firNumber?: string;
    examinedBy: string;
    injuryCount: number;
}

export interface MlcRecordDetail {
    mlcRecordId: string;
    mlcNumber: string;
    mlcDate: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    patientName: string;
    guardianName?: string;
    age?: number;
    sex?: string;
    address?: string;
    idProofType?: string;
    idProofNumber?: string;
    broughtBy?: string;
    broughtByRelation?: string;
    broughtByContact?: string;
    arrivedAt: string;
    modeOfArrival?: string;
    caseType: MlcCaseType | string;
    allegedHistory?: string;
    incidentAt?: string;
    incidentPlace?: string;
    policeStation?: string;
    firNumber?: string;
    diaryEntryNumber?: string;
    policeInformedAt?: string;
    policeInformedBy?: string;
    policeIntimated: boolean;
    generalCondition?: string;
    vitalsSnapshot?: string;
    smellOfAlcohol?: string;
    samplesCollected?: string;
    examinedBy: string;
    examinedAt: string;
    outcome: MlcOutcome | string;
    outcomeNotes?: string;
    status: MlcStatus | string;
    finalizedAt?: string;
    finalizedBy?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface InjuryMarkItem {
    injuryMarkId: string;
    sortOrder: number;
    region: InjuryRegion | string;
    side?: string;
    surface?: string;
    xPercent?: number;
    yPercent?: number;
    view?: string;
    injuryType: InjuryType | string;
    sizeLengthCm?: number;
    sizeBreadthCm?: number;
    depthCm?: number;
    severity: InjurySeverity | string;
    ageOfInjury?: string;
    causativeAgent?: string;
    description?: string;
}

export interface UpsertMlcRecordRequest {
    mlcRecordId?: string;
    hospitalId?: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    patientName: string;
    guardianName?: string;
    age?: number;
    sex?: string;
    address?: string;
    idProofType?: string;
    idProofNumber?: string;
    broughtBy?: string;
    broughtByRelation?: string;
    broughtByContact?: string;
    arrivedAt?: string;
    modeOfArrival?: string;
    caseType: MlcCaseType | string;
    allegedHistory?: string;
    incidentAt?: string;
    incidentPlace?: string;
    policeStation?: string;
    firNumber?: string;
    diaryEntryNumber?: string;
    policeInformedAt?: string;
    policeInformedBy?: string;
    policeIntimated?: boolean;
    generalCondition?: string;
    vitalsSnapshot?: string;
    smellOfAlcohol?: string;
    samplesCollected?: string;
    examinedBy?: string;
    examinedAt?: string;
    outcome: MlcOutcome | string;
    outcomeNotes?: string;
    finalize?: boolean;
}

export interface UpsertMlcRecordResponse {
    success: boolean;
    message?: string;
    mlcRecordId?: string;
    mlcNumber?: string;
    status?: string;
}

export interface MlcActionResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface UpsertInjuryMarkRequest {
    injuryMarkId?: string;
    hospitalId?: string;
    mlcRecordId: string;
    sortOrder?: number;
    region: InjuryRegion | string;
    side?: string;
    surface?: string;
    xPercent?: number;
    yPercent?: number;
    view?: string;
    injuryType: InjuryType | string;
    sizeLengthCm?: number;
    sizeBreadthCm?: number;
    depthCm?: number;
    severity: InjurySeverity | string;
    ageOfInjury?: string;
    causativeAgent?: string;
    description?: string;
}

export interface UpsertInjuryMarkResponse {
    success: boolean;
    message?: string;
    injuryMarkId?: string;
}

export interface GetMlcRecordsResponse {
    success: boolean;
    message?: string;
    items: MlcListItem[];
}

export interface GetMlcRecordByIdResponse {
    success: boolean;
    message?: string;
    record?: MlcRecordDetail;
    injuries: InjuryMarkItem[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const mlcService = {
    upsert: (req: UpsertMlcRecordRequest): Promise<UpsertMlcRecordResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MLC.UPSERT_RECORD, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (opts?: { status?: string; caseType?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetMlcRecordsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MLC.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    getById: (id: string, hospitalId?: string): Promise<GetMlcRecordByIdResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MLC.GET_BY_ID(id, hospitalIdOrThrow(hospitalId))),

    finalize: (mlcRecordId: string, hospitalId?: string): Promise<MlcActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MLC.FINALIZE, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            mlcRecordId,
        }),

    upsertInjury: (req: UpsertInjuryMarkRequest): Promise<UpsertInjuryMarkResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MLC.UPSERT_INJURY, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    deleteInjury: (injuryMarkId: string, hospitalId?: string): Promise<MlcActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MLC.DELETE_INJURY, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            injuryMarkId,
        }),
};
