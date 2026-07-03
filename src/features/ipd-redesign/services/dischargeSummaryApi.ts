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

export type ConditionAtDischarge = 'STABLE' | 'IMPROVED' | 'RECOVERED' | 'REFERRED' | 'LAMA' | 'EXPIRED';

export interface DischargeSummaryDraft {
    dischargeSummaryId?: string | null;
    isSigned: boolean;
    signedAt?: string | null;
    signedByDoctorName?: string | null;
    admittingDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    chiefComplaint?: string | null;
    historyOfPresentIllness?: string | null;
    courseInHospital?: string | null;
    proceduresPerformed?: string | null;
    conditionAtDischarge?: string | null;
    dischargeMedications?: string | null;
    followUpInstructions?: string | null;
    followUpDate?: string | null;
    dietInstructions?: string | null;
    activityRestrictions?: string | null;
    additionalNotes?: string | null;
}

export interface SaveDischargeSummaryFields {
    admittingDiagnosis?: string;
    finalDiagnosis?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    courseInHospital?: string;
    proceduresPerformed?: string;
    conditionAtDischarge?: ConditionAtDischarge;
    dischargeMedications?: string;
    followUpInstructions?: string;
    followUpDate?: string;
    dietInstructions?: string;
    activityRestrictions?: string;
    additionalNotes?: string;
}

interface GetDischargeSummaryDraftResponse {
    success?: boolean;
    message?: string;
    draft?: DischargeSummaryDraft;
}

interface GenerateDischargeNarrativeResponse {
    success?: boolean;
    message?: string;
    courseInHospital?: string;
}

export const dischargeSummaryApi = {
    getDraft: (admissionId: string, hospitalId?: string): Promise<DischargeSummaryDraft | undefined> =>
        ipdApiClient
            .get<GetDischargeSummaryDraftResponse>('/discharge-summary/draft', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.draft),

    save: async (admissionId: string, fields: SaveDischargeSummaryFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.put('/discharge-summary', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the discharge summary.'));
        }
    },

    sign: async (admissionId: string, doctorName?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/discharge-summary/sign', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, doctorName });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not sign the discharge summary.'));
        }
    },

    generateNarrative: async (admissionId: string, hospitalId?: string): Promise<string> => {
        try {
            const r = await ipdApiClient.post<GenerateDischargeNarrativeResponse>('/discharge-summary/narrate', {
                hospitalId: hospitalIdOrThrow(hospitalId), admissionId,
            });
            return r.courseInHospital ?? '';
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not generate the narrative.'));
        }
    },
};
