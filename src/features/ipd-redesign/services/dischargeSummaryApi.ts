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

export interface DischargeMedicationItem {
    medicineName?: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    durations?: string;
    instructions?: string;
    saltName?: string;
    displayOrder?: number;
}

export interface DischargeSummaryDraft {
    dischargeSummaryId?: string | null;
    isSigned: boolean;
    signedAt?: string | null;
    signedByDoctorName?: string | null;
    admittingDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    finalDiagnosisIcd10Code?: string | null;
    finalDiagnosisIcd10Name?: string | null;
    chiefComplaint?: string | null;
    historyOfPresentIllness?: string | null;
    courseInHospital?: string | null;
    proceduresPerformed?: string | null;
    conditionAtDischarge?: string | null;
    dischargeMedications?: string | null;
    medications?: DischargeMedicationItem[];
    followUpInstructions?: string | null;
    followUpDate?: string | null;
    dietInstructions?: string | null;
    activityRestrictions?: string | null;
    additionalNotes?: string | null;
    keyInvestigations?: string | null;
    warningSigns?: string | null;
    patientAdviceTranslationsJson?: string | null;
    sectionSourcesJson?: string | null;
}

export interface SaveDischargeSummaryFields {
    admittingDiagnosis?: string;
    finalDiagnosis?: string;
    finalDiagnosisIcd10Code?: string;
    finalDiagnosisIcd10Name?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    courseInHospital?: string;
    proceduresPerformed?: string;
    conditionAtDischarge?: ConditionAtDischarge;
    dischargeMedications?: string;
    medications?: DischargeMedicationItem[];
    followUpInstructions?: string;
    followUpDate?: string;
    dietInstructions?: string;
    activityRestrictions?: string;
    additionalNotes?: string;
    keyInvestigations?: string;
    warningSigns?: string;
    /** {"hi":{"dietInstructions":"…"}} — reviewed second-language patient advice. */
    patientAdviceTranslationsJson?: string;
    /** {"courseInHospital":"AI"} — RECORDS / AI / DOCTOR per section. */
    sectionSourcesJson?: string;
}

/** Section keys the server lets AI draft or rewrite (DischargeAiRules.DraftableSections). */
export type AiSectionKey =
    | 'chiefComplaint' | 'historyOfPresentIllness' | 'courseInHospital' | 'keyInvestigations' | 'proceduresPerformed'
    | 'followUpInstructions' | 'dietInstructions' | 'activityRestrictions' | 'warningSigns';

export type RewriteStyle = 'SHORTER' | 'DETAIL' | 'PATIENT';

export interface AiDraftResult {
    message?: string;
    sections: Partial<Record<AiSectionKey, string>>;
    sourceSummary?: string;
}

export interface MedicationSuggestion {
    medicineName: string;
    action: 'CONTINUE' | 'CHANGE' | 'STOP' | 'ADD';
    newDose?: string | null;
    note?: string | null;
    matchesMedicine?: string | null;
    /** KNOWN = on record for this stay; CORRECTED = heard slightly wrong and fixed; UNVERIFIED = not found, check the spelling. */
    nameCheck?: 'KNOWN' | 'CORRECTED' | 'UNVERIFIED' | null;
    /** What was actually heard, when the name was corrected. */
    heardAs?: string | null;
}

export interface AiDictationResult {
    message?: string;
    transcript?: string;
    sections: Partial<Record<AiSectionKey, string>>;
    medicationChanges: MedicationSuggestion[];
    followUpAfterDays?: number | null;
    /** Medicine names in the transcript that were heard slightly wrong and corrected. */
    corrections: { heard: string; corrected: string }[];
    /** Phrases the transcriber itself was unsure of. */
    unclearPhrases: string[];
    /** Every dose figure heard, to check the numbers at a glance. */
    dosesToCheck: string[];
}

export interface HospitalDischargePreferences {
    patientLanguage?: string | null;
    aiAssistEnabled: boolean;
    aiAvailable: boolean;
    hasHospitalLetterhead: boolean;
    languageOptions: { code: string; name: string }[];
}

interface AiEnvelope { success?: boolean; message?: string }
const requireSuccess = <T extends AiEnvelope>(r: T, fallback: string): T => {
    if (r && r.success === false) throw new Error(r.message || fallback);
    return r;
};

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
    getCustomFields: (admissionId: string, hospitalId?: string): Promise<Record<string, string>> =>
        ipdApiClient
            .get<{ values?: Record<string, string> }>('/discharge-summary/custom-fields', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r?.values ?? {}),

    saveCustomFields: async (admissionId: string, values: Record<string, string>, hospitalId?: string): Promise<void> => {
        try {
            await ipdApiClient.put('/discharge-summary/custom-fields', values, { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the custom discharge fields.'));
        }
    },

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

    // Admin (or discharge_unsign) only, and a reason is mandatory; the server keeps it in the audit trail.
    unsign: async (admissionId: string, reason: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/discharge-summary/unsign', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, reason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not revoke signature on the discharge summary.'));
        }
    },

    // Uploads the client-rendered PDF, returning a long-lived AccessToken the caller encodes into
    // the QR code / WhatsApp link (never the AdmissionId itself — see backend PdfBlobKey/AccessToken).
    uploadPdf: async (admissionId: string, file: Blob, hospitalId?: string): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('HospitalId', hospitalIdOrThrow(hospitalId));
            formData.append('AdmissionId', admissionId);
            formData.append('File', file, 'discharge-summary.pdf');
            const res = await ipdApiClient.post<{ accessToken?: string }>('/discharge-summary/upload-pdf', formData, {
                headers: { 'Content-Type': undefined },
            } as any);
            if (!res.accessToken) throw new Error('No access token returned.');
            return res.accessToken;
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not generate the shareable discharge summary PDF.'));
        }
    },

    sendWhatsApp: async (admissionId: string, mobileNumber?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/discharge-summary/send-whatsapp', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, mobileNumber });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not send the discharge summary via WhatsApp.'));
        }
    },

    // Ready-to-embed PNG bytes (NexEagle logo centered) encoding the WhatsApp-delivery link --
    // mints AccessToken on first call. Fetched at PDF-render time and drawn directly into the
    // page via pdf-lib's embedPng, no client-side QR generation involved.
    getQrCode: async (admissionId: string, hospitalId?: string): Promise<ArrayBuffer> => {
        try {
            return await ipdApiClient.get<ArrayBuffer>(
                `/discharge-summary/qr-code?hospitalId=${hospitalIdOrThrow(hospitalId)}&admissionId=${admissionId}`,
                { responseType: 'arraybuffer' } as any
            );
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not generate the QR code.'));
        }
    },

    // ── AI help (Groq on the server). Nothing here saves; results are proposals to accept. ──
    aiDraft: async (admissionId: string, sections?: AiSectionKey[], hospitalId?: string): Promise<AiDraftResult> => {
        try {
            const r = await ipdApiClient.post<AiEnvelope & { sections?: AiDraftResult['sections']; sourceSummary?: string }>(
                '/discharge-summary/ai/draft', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, sections });
            requireSuccess(r, 'Could not draft the summary.');
            return { message: r.message, sections: r.sections ?? {}, sourceSummary: r.sourceSummary };
        } catch (err) {
            throw new Error(err instanceof Error && !axios.isAxiosError(err) ? err.message : messageFrom(err, 'Could not draft the summary.'));
        }
    },

    aiDictate: async (admissionId: string, audio: Blob, language?: 'en' | 'hi', hospitalId?: string): Promise<AiDictationResult> => {
        try {
            const form = new FormData();
            form.append('HospitalId', hospitalIdOrThrow(hospitalId));
            form.append('AdmissionId', admissionId);
            if (language) form.append('Language', language);
            const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
            form.append('Audio', audio, `dictation.${ext}`);
            const r = await ipdApiClient.post<AiEnvelope & Partial<AiDictationResult>>('/discharge-summary/ai/dictate', form, {
                headers: { 'Content-Type': undefined }, timeout: 120000,
            } as any);
            requireSuccess(r, 'Could not process the dictation.');
            return { message: r.message, transcript: r.transcript, sections: r.sections ?? {}, medicationChanges: r.medicationChanges ?? [], followUpAfterDays: r.followUpAfterDays,
                corrections: r.corrections ?? [], unclearPhrases: r.unclearPhrases ?? [], dosesToCheck: r.dosesToCheck ?? [] };
        } catch (err) {
            throw new Error(err instanceof Error && !axios.isAxiosError(err) ? err.message : messageFrom(err, 'Could not process the dictation.'));
        }
    },

    aiRewrite: async (admissionId: string, section: AiSectionKey, style: RewriteStyle, text: string, hospitalId?: string): Promise<string> => {
        try {
            const r = await ipdApiClient.post<AiEnvelope & { text?: string }>('/discharge-summary/ai/rewrite', {
                hospitalId: hospitalIdOrThrow(hospitalId), admissionId, section, style, text,
            });
            requireSuccess(r, 'Could not rewrite the text.');
            return r.text ?? '';
        } catch (err) {
            throw new Error(err instanceof Error && !axios.isAxiosError(err) ? err.message : messageFrom(err, 'Could not rewrite the text.'));
        }
    },

    aiTranslateAdvice: async (admissionId: string, language: string, sections: Record<string, string>, hospitalId?: string): Promise<Record<string, string>> => {
        try {
            const r = await ipdApiClient.post<AiEnvelope & { sections?: Record<string, string> }>('/discharge-summary/ai/translate-advice', {
                hospitalId: hospitalIdOrThrow(hospitalId), admissionId, language, sections,
            });
            requireSuccess(r, 'Could not translate.');
            return r.sections ?? {};
        } catch (err) {
            throw new Error(err instanceof Error && !axios.isAxiosError(err) ? err.message : messageFrom(err, 'Could not translate.'));
        }
    },

    getHospitalPreferences: async (hospitalId?: string): Promise<HospitalDischargePreferences> => {
        const r = await ipdApiClient.get<AiEnvelope & Partial<HospitalDischargePreferences>>('/discharge-summary/hospital-preferences', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId) },
        });
        return {
            patientLanguage: r.patientLanguage ?? null,
            aiAssistEnabled: r.aiAssistEnabled !== false,
            aiAvailable: r.aiAvailable === true,
            hasHospitalLetterhead: r.hasHospitalLetterhead === true,
            languageOptions: r.languageOptions ?? [],
        };
    },

    updateHospitalPreferences: async (prefs: { patientLanguage: string | null; aiAssistEnabled: boolean }, hospitalId?: string): Promise<void> => {
        try {
            await ipdApiClient.put('/discharge-summary/hospital-preferences', { hospitalId: hospitalIdOrThrow(hospitalId), ...prefs });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the discharge settings.'));
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
