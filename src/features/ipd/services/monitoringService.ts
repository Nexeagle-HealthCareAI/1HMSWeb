import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

// ─── Fluid I/O ───────────────────────────────────────────────────────────────

export type FluidDirection = 'IN' | 'OUT';
export type FluidInSubtype = 'IV_FLUID' | 'ORAL' | 'NG_FEED' | 'BLOOD_PRODUCT' | 'OTHER';
export type FluidOutSubtype = 'URINE' | 'DRAIN' | 'STOMA' | 'VOMIT' | 'NG_ASPIRATE' | 'STOOL' | 'OTHER';

export interface FluidEntry {
    fluidEntryId: string;
    direction: FluidDirection | string;
    subtype: string;
    volumeMl: number;
    description?: string;
    routeOrSite?: string;
    colour?: string;
    recordedAt: string;
    recordedBy?: string;
    notes?: string;
}

export interface FluidTotals {
    totalInMl: number;
    totalOutMl: number;
    balanceMl: number;
    last24hInMl: number;
    last24hOutMl: number;
    last24hBalanceMl: number;
}

export interface GetFluidEntriesResponse {
    success: boolean;
    message?: string;
    items: FluidEntry[];
    totals: FluidTotals;
}

export interface RecordFluidEntryRequest {
    hospitalId?: string;
    admissionId: string;
    recordedAt?: string;
    direction: FluidDirection;
    subtype: string;
    volumeMl: number;
    description?: string;
    routeOrSite?: string;
    colour?: string;
    notes?: string;
}

export interface RecordFluidEntryResponse {
    success: boolean;
    message?: string;
    fluidEntryId?: string;
}

// ─── Glucose ─────────────────────────────────────────────────────────────────

export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type GlucoseMethod = 'CBG' | 'LAB' | 'ABG' | 'CGM';
export type GlucoseMealTag = 'FASTING' | 'PRE_BREAKFAST' | 'POST_BREAKFAST' | 'PRE_LUNCH' | 'POST_LUNCH' | 'PRE_DINNER' | 'POST_DINNER' | 'BEDTIME' | 'RANDOM';
export type InsulinRoute = 'SC' | 'IV' | 'IM';

export interface GlucoseReading {
    glucoseReadingId: string;
    value: number;
    unit: GlucoseUnit | string;
    valueMgDl: number;
    method?: string;
    mealTag?: string;
    insulinGiven: boolean;
    insulinUnits?: number;
    insulinType?: string;
    insulinRoute?: string;
    isHypo: boolean;
    isHyper: boolean;
    recordedAt: string;
    recordedBy?: string;
    notes?: string;
}

export interface GlucoseStats {
    count: number;
    meanMgDl?: number;
    minMgDl?: number;
    maxMgDl?: number;
    hypoCount: number;
    hyperCount: number;
    last24hMeanMgDl?: number;
    totalInsulinUnits?: number;
}

export interface GetGlucoseReadingsResponse {
    success: boolean;
    message?: string;
    items: GlucoseReading[];
    stats: GlucoseStats;
}

export interface RecordGlucoseRequest {
    hospitalId?: string;
    admissionId: string;
    recordedAt?: string;
    value: number;
    unit: GlucoseUnit;
    method?: GlucoseMethod | string;
    mealTag?: GlucoseMealTag | string;
    insulinGiven?: boolean;
    insulinUnits?: number;
    insulinType?: string;
    insulinRoute?: InsulinRoute | string;
    notes?: string;
}

export interface RecordGlucoseResponse {
    success: boolean;
    message?: string;
    glucoseReadingId?: string;
    valueMgDl?: number;
    isHypo: boolean;
    isHyper: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const monitoringService = {
    recordFluid: (req: RecordFluidEntryRequest): Promise<RecordFluidEntryResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MONITORING.RECORD_FLUID, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listFluid: (
        admissionId: string,
        opts: { fromUtc?: string; toUtc?: string; hospitalId?: string } = {},
    ): Promise<GetFluidEntriesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MONITORING.LIST_FLUID(
            hospitalIdOrThrow(opts.hospitalId),
            admissionId,
            opts.fromUtc,
            opts.toUtc,
        )),

    recordGlucose: (req: RecordGlucoseRequest): Promise<RecordGlucoseResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MONITORING.RECORD_GLUCOSE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listGlucose: (
        admissionId: string,
        opts: { fromUtc?: string; toUtc?: string; hospitalId?: string } = {},
    ): Promise<GetGlucoseReadingsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MONITORING.LIST_GLUCOSE(
            hospitalIdOrThrow(opts.hospitalId),
            admissionId,
            opts.fromUtc,
            opts.toUtc,
        )),
};
