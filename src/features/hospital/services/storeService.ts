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

export type StoreType = 'MAIN' | 'SUB' | 'DEPARTMENT' | 'OT' | 'PHARMACY' | 'COLD_CHAIN' | 'NARCOTIC' | 'BLOOD_BANK' | 'CSSD';

export interface StoreItem {
    storeId: string;
    storeCode: string;
    storeName: string;
    storeType: StoreType;
    parentStoreId?: string | null;
    parentStoreName?: string | null;
    minTempCelsius?: number | null;
    maxTempCelsius?: number | null;
    isActive: boolean;
}

export interface UpsertStoreInput {
    storeId?: string;
    storeCode: string;
    storeName: string;
    storeType: StoreType;
    parentStoreId?: string | null;
    minTempCelsius?: number | null;
    maxTempCelsius?: number | null;
    isActive: boolean;
}

export const storeService = {
    getStores: (hospitalId?: string, includeInactive = false): Promise<StoreItem[]> =>
        ipdApiClient
            .get<{ stores?: StoreItem[] }>('/inventory/stores', { params: { hospitalId: hospitalIdOrThrow(hospitalId), includeInactive } })
            .then(r => r.stores ?? []),

    upsertStore: async (input: UpsertStoreInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/inventory/stores', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the store.'));
        }
    },
};
