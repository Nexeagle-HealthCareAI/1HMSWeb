import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export interface DischargeTemplate {
    dischargeTemplateId: string;
    name: string;
    contentJson: string;
    useCount: number;
    lastUsedAt?: string | null;
    updatedAt: string;
}

export interface SaveTemplateResult { success: boolean; message?: string | null; nameTaken?: boolean; template?: DischargeTemplate | null }

/** Reusable discharge summary templates, shared by everyone in the hospital. */
export const dischargeTemplateApi = {
    list: async (hospitalId?: string): Promise<DischargeTemplate[]> => {
        const r = await ipdApiClient.get<{ success: boolean; templates?: DischargeTemplate[] }>('/discharge-summary/templates', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } });
        return r.templates ?? [];
    },

    /** A refused save (name already used, nothing to save) comes back as success:false — it is not thrown. */
    save: (input: { name: string; contentJson: string; dischargeTemplateId?: string; replaceExisting?: boolean }, hospitalId?: string): Promise<SaveTemplateResult> =>
        ipdApiClient.post<SaveTemplateResult>('/discharge-summary/templates', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    remove: (templateId: string, hospitalId?: string): Promise<SaveTemplateResult> =>
        ipdApiClient.delete<SaveTemplateResult>(`/discharge-summary/templates/${encodeURIComponent(templateId)}`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } }),

    /** Counts a use so the most-used templates list first. Never worth failing the screen over. */
    markUsed: (templateId: string, hospitalId?: string): Promise<void> =>
        ipdApiClient.post<SaveTemplateResult>(`/discharge-summary/templates/${encodeURIComponent(templateId)}/used`, undefined, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(() => undefined).catch(() => undefined),
};
