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

export interface ConsentTemplateItem {
    consentTemplateId: string;
    typeCode: string;
    title?: string | null;
    language?: string | null;
    version: number;
    bodyHtml?: string | null;
    isActive: boolean;
}

export interface ConsentRecordItem {
    consentRecordId: string;
    templateTypeCode: string;
    templateTitle?: string | null;
    templateVersion: number;
    procedureName?: string | null;
    signedByName: string;
    signerRelation: string;
    witnessName?: string | null;
    witnessRole?: string | null;
    signedAt: string;
}

export interface SignConsentFields {
    procedureName?: string;
    signedByName: string;
    signerRelation: string;
    signerIdType?: string;
    signerIdNumber?: string;
    signatureImageBase64?: string;
    witnessName?: string;
    witnessRole?: string;
}

interface GetConsentTemplatesResponse {
    success?: boolean;
    message?: string;
    templates?: ConsentTemplateItem[];
}

interface GetConsentRecordsResponse {
    success?: boolean;
    message?: string;
    records?: ConsentRecordItem[];
}

export const consentApi = {
    getTemplates: (typeCode?: string, hospitalId?: string): Promise<ConsentTemplateItem[]> =>
        ipdApiClient
            .get<GetConsentTemplatesResponse>('/consent-template', { params: { hospitalId: hospitalIdOrThrow(hospitalId), typeCode } })
            .then(r => r.templates ?? []),

    getRecords: (admissionId: string, hospitalId?: string): Promise<ConsentRecordItem[]> =>
        ipdApiClient
            .get<GetConsentRecordsResponse>('/consent-record', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.records ?? []),

    sign: async (admissionId: string, consentTemplateId: string, fields: SignConsentFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/consent-record', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, consentTemplateId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not sign the consent.'));
        }
    },
};
