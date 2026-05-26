import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type PcpndtStatus = 'DRAFT' | 'FINALIZED' | 'AMENDED';
export type PcpndtProcedure = 'USG' | 'DOPPLER' | 'OTHER';

export type PcpndtIndication =
    | 'ANC' | 'FETAL_ANOMALY' | 'IUGR' | 'POLYHYDRAMNIOS' | 'OLIGOHYDRAMNIOS'
    | 'VAGINAL_BLEEDING' | 'PAIN_ABDOMEN' | 'PREVIOUS_LSCS' | 'MULTIPLE_GESTATION' | 'OTHER';

export interface PcpndtFormFListItem {
    pcpndtFormFId: string;
    serialNumber: string;
    patientName: string;
    age: number;
    mobile?: string;
    performedAt: string;
    procedureType: PcpndtProcedure | string;
    status: PcpndtStatus | string;
    sonologistName: string;
}

export interface PcpndtFormFDetail {
    pcpndtFormFId: string;
    serialNumber: string;
    serialDate: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    patientName: string;
    husbandOrFatherName?: string;
    age: number;
    address: string;
    mobile?: string;
    idProofType?: string;
    idProofNumber?: string;
    referredByName?: string;
    referredByAddress?: string;
    referralSlipNumber?: string;
    lastMenstrualPeriod?: string;
    gestationalWeeks?: number;
    gestationalDays?: number;
    previousPregnancies: number;
    livingMaleChildren: number;
    livingFemaleChildren: number;
    abortions: number;
    indications: string[];
    indicationOtherText?: string;
    procedureType: PcpndtProcedure | string;
    performedAt: string;
    performedLocation: string;
    sonologistName: string;
    sonologistQualification: string;
    sonologistRegistrationNumber: string;
    findings: string;
    doctorDeclarationGiven: boolean;
    doctorDeclarationSignedBy?: string;
    doctorDeclarationSignedAt?: string;
    patientDeclarationGiven: boolean;
    patientDeclarationSignedBy?: string;
    patientDeclarationSignedAt?: string;
    status: PcpndtStatus | string;
    finalizedAt?: string;
    finalizedBy?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface CreatePcpndtFormFRequest {
    hospitalId?: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    patientName: string;
    husbandOrFatherName?: string;
    age: number;
    address: string;
    mobile?: string;
    idProofType?: string;
    idProofNumber?: string;
    referredByName?: string;
    referredByAddress?: string;
    referralSlipNumber?: string;
    lastMenstrualPeriod?: string;
    gestationalWeeks?: number;
    gestationalDays?: number;
    previousPregnancies?: number;
    livingMaleChildren?: number;
    livingFemaleChildren?: number;
    abortions?: number;
    indications: string[];
    indicationOtherText?: string;
    procedureType: PcpndtProcedure | string;
    performedAt?: string;
    performedLocation: string;
    sonologistName: string;
    sonologistQualification: string;
    sonologistRegistrationNumber: string;
    findings: string;
    finalize?: boolean;
    doctorDeclarationGiven?: boolean;
    doctorDeclarationSignedBy?: string;
    patientDeclarationGiven?: boolean;
    patientDeclarationSignedBy?: string;
}

export interface CreatePcpndtFormFResponse {
    success: boolean;
    message?: string;
    pcpndtFormFId?: string;
    serialNumber?: string;
    status?: string;
}

export interface FinalizePcpndtFormFRequest {
    hospitalId?: string;
    pcpndtFormFId: string;
    doctorDeclarationSignedBy: string;
    patientDeclarationSignedBy: string;
}

export interface FinalizePcpndtFormFResponse {
    success: boolean;
    message?: string;
    status?: string;
    finalizedAt?: string;
}

export interface GetPcpndtFormFsResponse {
    success: boolean;
    message?: string;
    items: PcpndtFormFListItem[];
}

export interface GetPcpndtFormFByIdResponse {
    success: boolean;
    message?: string;
    item?: PcpndtFormFDetail;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const pcpndtService = {
    create: (req: CreatePcpndtFormFRequest): Promise<CreatePcpndtFormFResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.PCPNDT.CREATE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (opts?: { status?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetPcpndtFormFsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.PCPNDT.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    getById: (id: string, hospitalId?: string): Promise<GetPcpndtFormFByIdResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.PCPNDT.GET_BY_ID(id, hospitalIdOrThrow(hospitalId))),

    finalize: (req: FinalizePcpndtFormFRequest): Promise<FinalizePcpndtFormFResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.PCPNDT.FINALIZE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
