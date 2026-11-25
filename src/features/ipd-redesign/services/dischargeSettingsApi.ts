// A doctor+hospital's discharge-summary letterhead settings (upload a PDF background template,
// reserve header/footer margins over it, set typography) — mirrors
// features/doctor/services/prescriptionFieldConfigApi.ts's settings half (not the field-layout
// half, which is dischargeFieldLayoutApi.ts). Backed by GET/PUT /discharge-settings and
// POST /discharge-settings/upload-template (DischargeSettingsController.cs).
import { ipdApiClient } from '@/services/ipdApiClient';

export interface DischargeSettings {
    dischargeSettingId?: string;
    hospitalId: string;
    doctorId: string;
    headerHeight?: number;
    footerHeight?: number;
    contentLeftMargin?: number;
    contentRightMargin?: number;
    overFlowPage?: boolean;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    textColour?: string;
    uri?: string | null;
    useSystemDefaultLetterhead?: boolean;
}

export interface UpdateDischargeSettingsInput extends Partial<Omit<DischargeSettings, 'hospitalId' | 'doctorId'>> {
    hospitalId: string;
    doctorId: string;
}

export interface UploadDischargeTemplateInput {
    file: File;
    doctorId: string;
    hospitalId: string;
}

export interface UploadDischargeTemplateResponse {
    success: boolean;
    message: string;
    url: string | null;
}

interface GetDischargeSettingsResponse {
    success: boolean;
    message?: string;
    data: DischargeSettings | null;
    /** The hospital's letterhead, sent to a doctor so printing can fall back to it. */
    hospitalDefault?: DischargeSettings | null;
}

/**
 * Pass this as the doctorId to edit the hospital's own letterhead (Admin → Configuration). Every
 * doctor without a letterhead of their own prints discharge summaries on it. Routed to the
 * admin-only /discharge-settings/hospital endpoints.
 */
export const HOSPITAL_LETTERHEAD_ID = 'hospital';
export const isHospitalLetterhead = (doctorId?: string | null) => doctorId === HOSPITAL_LETTERHEAD_ID;

/** Which letterhead a doctor's discharge summary prints on: their own (an upload, or a deliberate
 * "system default" choice), else the hospital's, else null (the system default is generated). */
export const pickEffectiveLetterhead = (own: DischargeSettings | null | undefined, hospital: DischargeSettings | null | undefined): DischargeSettings | null => {
    if (own && (own.uri || own.useSystemDefaultLetterhead)) return own;
    if (hospital?.uri) return hospital;
    return own ?? null;
};

export const dischargeSettingsApi = {
    async getDischargeSettings(doctorId: string, hospitalId: string): Promise<DischargeSettings | null> {
        if (!doctorId || !hospitalId) return null;
        try {
            const response = isHospitalLetterhead(doctorId)
                ? await ipdApiClient.get<GetDischargeSettingsResponse>('/discharge-settings/hospital', { params: { hospitalId } })
                : await ipdApiClient.get<GetDischargeSettingsResponse>('/discharge-settings', { params: { doctorId, hospitalId } });
            return response.data ?? null;
        } catch {
            return null;
        }
    },

    /** The settings a discharge summary actually prints with — see pickEffectiveLetterhead. */
    async getEffectiveDischargeSettings(doctorId: string, hospitalId: string): Promise<DischargeSettings | null> {
        if (!doctorId || !hospitalId) return null;
        try {
            const response = await ipdApiClient.get<GetDischargeSettingsResponse>('/discharge-settings', { params: { doctorId, hospitalId } });
            return pickEffectiveLetterhead(response.data, response.hospitalDefault);
        } catch {
            return null;
        }
    },

    async updateDischargeSettings(input: UpdateDischargeSettingsInput): Promise<void> {
        if (isHospitalLetterhead(input.doctorId)) {
            const { doctorId: _ignored, ...rest } = input;
            await ipdApiClient.put('/discharge-settings/hospital', rest);
            return;
        }
        await ipdApiClient.put('/discharge-settings', input);
    },

    async uploadTemplate(input: UploadDischargeTemplateInput): Promise<UploadDischargeTemplateResponse> {
        const formData = new FormData();
        formData.append('File', input.file);
        const hospital = isHospitalLetterhead(input.doctorId);
        if (!hospital) formData.append('DoctorId', input.doctorId);
        formData.append('HospitalId', input.hospitalId);
        const response = await ipdApiClient.post<UploadDischargeTemplateResponse>(
            hospital ? '/discharge-settings/hospital/upload-template' : '/discharge-settings/upload-template',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    },

    // Presigned template URLs (S3/MinIO) expire, so the template is always fetched fresh by URL
    // rather than cached — mirrors usePrescriptionDesigner.ts's hydrateTemplateFromServer.
    async fetchTemplateFile(uri: string): Promise<File | null> {
        if (!uri) return null;
        try {
            const response = await fetch(uri, { method: 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (!response.ok) return null;
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const fileNameCandidate = uri.split('?')[0]?.split('/')?.pop() || 'discharge-template.pdf';
            let fileName = fileNameCandidate;
            try { fileName = decodeURIComponent(fileNameCandidate); } catch { /* keep raw name */ }
            return new File([arrayBuffer], fileName, { type: blob.type || 'application/pdf' });
        } catch {
            return null;
        }
    },
};
