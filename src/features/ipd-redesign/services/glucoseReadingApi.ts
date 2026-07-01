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

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export interface GlucoseReadingItem {
    glucoseReadingId: string;
    value: number;
    unit: GlucoseUnit;
    valueMgDl: number;
    method?: string | null;
    mealTag?: string | null;
    insulinGiven: boolean;
    insulinUnits?: number | null;
    insulinType?: string | null;
    insulinRoute?: string | null;
    isHypo: boolean;
    isHyper: boolean;
    recordedAt: string;
    recordedBy?: string | null;
    notes?: string | null;
}

export interface RecordGlucoseReadingOpts {
    method?: string;
    mealTag?: string;
    insulinGiven?: boolean;
    insulinUnits?: number;
    insulinType?: string;
    insulinRoute?: string;
    notes?: string;
}

interface GetGlucoseReadingsResponse {
    success?: boolean;
    message?: string;
    readings?: GlucoseReadingItem[];
}

interface RecordGlucoseReadingResponse {
    success?: boolean;
    message?: string;
    glucoseReadingId?: string;
    valueMgDl?: number;
    isHypo?: boolean;
    isHyper?: boolean;
}

export const glucoseReadingApi = {
    getReadings: (admissionId: string, fromUtc?: string, toUtc?: string, hospitalId?: string): Promise<GlucoseReadingItem[]> =>
        ipdApiClient
            .get<GetGlucoseReadingsResponse>('/glucose-reading', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, fromUtc, toUtc } })
            .then(r => r.readings ?? []),

    record: async (
        admissionId: string,
        value: number,
        unit: GlucoseUnit,
        opts: RecordGlucoseReadingOpts = {},
        hospitalId?: string,
    ): Promise<{ valueMgDl: number; isHypo: boolean; isHyper: boolean }> => {
        try {
            const r = await ipdApiClient.post<RecordGlucoseReadingResponse>('/glucose-reading', {
                hospitalId: hospitalIdOrThrow(hospitalId), admissionId, value, unit, ...opts,
            });
            return { valueMgDl: r.valueMgDl ?? value, isHypo: !!r.isHypo, isHyper: !!r.isHyper };
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the glucose reading.'));
        }
    },
};
