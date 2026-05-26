import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type TemperatureUnit = 'C' | 'F';

export interface VitalReading {
    vitalReadingId: string;
    admissionId: string;
    recordedAt: string;
    recordedBy?: string;
    temperature?: number;
    temperatureUnit?: TemperatureUnit | string;
    pulse?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    spO2?: number;
    weightKg?: number;
    heightCm?: number;
    bmi?: number;
    gcsEye?: number;
    gcsVerbal?: number;
    gcsMotor?: number;
    gcsTotal?: number;
    painScore?: number;
    notes?: string;
    createdAt: string;
}

export interface RecordVitalsRequest {
    hospitalId?: string;
    admissionId: string;
    recordedAt?: string;
    temperature?: number;
    temperatureUnit?: TemperatureUnit;
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

export interface RecordVitalsResponse {
    success: boolean;
    message?: string;
    vitalReadingId?: string;
    bmi?: number;
    gcsTotal?: number;
}

export interface GetVitalsResponse {
    success: boolean;
    message?: string;
    items: VitalReading[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const vitalsService = {
    record: (req: RecordVitalsRequest): Promise<RecordVitalsResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.VITALS.RECORD, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (admissionId: string, opts: { fromUtc?: string; toUtc?: string; hospitalId?: string } = {}): Promise<GetVitalsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.VITALS.LIST(
            hospitalIdOrThrow(opts.hospitalId),
            admissionId,
            opts.fromUtc,
            opts.toUtc,
        )),
};
