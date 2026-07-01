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

export interface VitalReadingItem {
    vitalReadingId: string;
    recordedAt: string;
    recordedBy?: string | null;
    temperature?: number | null;
    temperatureUnit?: string | null;
    pulse?: number | null;
    systolicBP?: number | null;
    diastolicBP?: number | null;
    respiratoryRate?: number | null;
    spO2?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
    bmi?: number | null;
    gcsEye?: number | null;
    gcsVerbal?: number | null;
    gcsMotor?: number | null;
    gcsTotal?: number | null;
    painScore?: number | null;
    notes?: string | null;
}

export interface RecordVitalReadingFields {
    temperature?: number;
    temperatureUnit?: string;
    pulse?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    spO2?: number;
    weightKg?: number;
    heightCm?: number;
    gcsEye?: number;
    gcsVerbal?: number;
    gcsMotor?: number;
    painScore?: number;
    notes?: string;
}

interface GetVitalReadingsResponse {
    success?: boolean;
    message?: string;
    readings?: VitalReadingItem[];
}

export const vitalsApi = {
    getReadings: (admissionId: string, fromUtc?: string, toUtc?: string, hospitalId?: string): Promise<VitalReadingItem[]> =>
        ipdApiClient
            .get<GetVitalReadingsResponse>('/vitals', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, fromUtc, toUtc } })
            .then(r => r.readings ?? []),

    record: async (admissionId: string, fields: RecordVitalReadingFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/vitals', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the vital reading.'));
        }
    },
};
