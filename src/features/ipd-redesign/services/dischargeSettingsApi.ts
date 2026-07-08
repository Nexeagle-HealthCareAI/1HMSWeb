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
}

export const dischargeSettingsApi = {
    async getDischargeSettings(doctorId: string, hospitalId: string): Promise<DischargeSettings | null> {
        if (!doctorId || !hospitalId) return null;
        try {
            const response = await ipdApiClient.get<GetDischargeSettingsResponse>('/discharge-settings', { params: { doctorId, hospitalId } });
            return response.data ?? null;
        } catch {
            return null;
        }
    },

    async updateDischargeSettings(input: UpdateDischargeSettingsInput): Promise<void> {
        await ipdApiClient.put('/discharge-settings', input);
    },

    async uploadTemplate(input: UploadDischargeTemplateInput): Promise<UploadDischargeTemplateResponse> {
        const formData = new FormData();
        formData.append('File', input.file);
        formData.append('DoctorId', input.doctorId);
        formData.append('HospitalId', input.hospitalId);
        const response = await ipdApiClient.post<UploadDischargeTemplateResponse>(
            '/discharge-settings/upload-template',
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
