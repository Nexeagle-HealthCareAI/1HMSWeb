import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type ConsentTypeCode =
    | 'GENERAL_ADMISSION'
    | 'PROCEDURE'
    | 'RADIATION'
    | 'IV_CONTRAST'
    | 'BLOOD_TRANSFUSION'
    | 'ANAESTHESIA'
    | 'OTHER';

export interface ConsentTemplate {
    consentTemplateId: string;
    typeCode: ConsentTypeCode | string;
    title?: string;
    language?: string;
    version: number;
    bodyHtml?: string;
    isActive: boolean;
    updatedAt: string;
}

export interface GetConsentTemplatesResponse {
    success: boolean;
    message?: string;
    items: ConsentTemplate[];
}

export interface ConsentRecord {
    consentRecordId: string;
    consentTemplateId: string;
    templateTypeCode: ConsentTypeCode | string;
    templateTitle?: string;
    templateLanguage?: string;
    templateVersion: number;
    templateBodyHtmlSnapshot?: string;
    procedureName?: string;
    signedByName?: string;
    signerRelation?: string;
    signerIdType?: string;
    signerIdNumberMasked?: string;
    signatureImageBase64?: string;
    witnessName?: string;
    witnessRole?: string;
    signedAt: string;
    createdBy?: string;
}

export interface GetConsentRecordsResponse {
    success: boolean;
    message?: string;
    items: ConsentRecord[];
}

export interface UpsertConsentTemplateRequest {
    hospitalId?: string;
    consentTemplateId?: string;
    typeCode: ConsentTypeCode | string;
    title?: string;
    language?: string;
    bodyHtml: string;
    isActive?: boolean;
}

export interface UpsertConsentTemplateResponse {
    success: boolean;
    message?: string;
    consentTemplateId?: string;
    version?: number;
}

export interface SignConsentRequest {
    hospitalId?: string;
    admissionId: string;
    consentTemplateId: string;
    procedureName?: string;
    signedByName: string;
    signerRelation: string;
    signerIdType?: string;
    signerIdNumber?: string;
    signatureImageBase64: string;
    witnessName?: string;
    witnessRole?: string;
}

export interface SignConsentResponse {
    success: boolean;
    message?: string;
    consentRecordId?: string;
    signedAt?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const consentService = {
    listTemplates: (
        opts: { typeCode?: string; language?: string; isActive?: boolean; hospitalId?: string } = {},
    ): Promise<GetConsentTemplatesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CONSENT.TEMPLATES(
            hospitalIdOrThrow(opts.hospitalId),
            opts.typeCode,
            opts.language,
            opts.isActive,
        )),

    upsertTemplate: (req: UpsertConsentTemplateRequest): Promise<UpsertConsentTemplateResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.CONSENT.UPSERT_TEMPLATE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listRecords: (admissionId: string, opts: { includeBody?: boolean; hospitalId?: string } = {}): Promise<GetConsentRecordsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CONSENT.RECORDS(
            hospitalIdOrThrow(opts.hospitalId),
            admissionId,
            opts.includeBody ?? false,
        )),

    sign: (req: SignConsentRequest): Promise<SignConsentResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CONSENT.SIGN, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
