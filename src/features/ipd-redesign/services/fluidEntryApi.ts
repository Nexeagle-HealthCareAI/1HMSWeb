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

export type FluidDirection = 'IN' | 'OUT';

export interface FluidEntryItem {
    fluidEntryId: string;
    direction: FluidDirection;
    subtype: string;
    volumeMl: number;
    description?: string | null;
    routeOrSite?: string | null;
    colour?: string | null;
    recordedAt: string;
    recordedBy?: string | null;
    notes?: string | null;
}

export interface FluidDayTotal {
    dayKey: string;
    totalInMl: number;
    totalOutMl: number;
    balanceMl: number;
}

interface GetFluidBalanceResponse {
    success?: boolean;
    message?: string;
    entries?: FluidEntryItem[];
    dailyTotals?: FluidDayTotal[];
}

export const fluidEntryApi = {
    getBalance: (admissionId: string, fromUtc?: string, toUtc?: string, hospitalId?: string): Promise<{ entries: FluidEntryItem[]; dailyTotals: FluidDayTotal[] }> =>
        ipdApiClient
            .get<GetFluidBalanceResponse>('/fluid-entry/balance', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, fromUtc, toUtc } })
            .then(r => ({ entries: r.entries ?? [], dailyTotals: r.dailyTotals ?? [] })),

    record: async (
        admissionId: string,
        direction: FluidDirection,
        subtype: string,
        volumeMl: number,
        opts: { description?: string; routeOrSite?: string; colour?: string; notes?: string } = {},
        hospitalId?: string,
    ) => {
        try {
            return await ipdApiClient.post('/fluid-entry', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, direction, subtype, volumeMl, ...opts });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the fluid entry.'));
        }
    },
};
