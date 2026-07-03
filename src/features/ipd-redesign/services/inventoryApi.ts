import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export interface InventoryItem {
    inventoryItemId: string;
    itemCode: string;
    itemName: string;
    genericName?: string | null;
    category: 'CONSUMABLE' | 'DRUG' | 'DISPOSABLE' | 'SURGICAL' | 'IMPLANT' | 'OTHER';
    unit: string;
    defaultRate?: number | null;
    currentStock: number;
    minStockLevel: number;
    storeLocation?: string | null;
    isActive: boolean;
}

export const inventoryApi = {
    getItems: (params: { category?: string; search?: string } = {}, hospitalId?: string): Promise<InventoryItem[]> =>
        ipdApiClient
            .get<{ items?: InventoryItem[] }>('/inventory/items', { params: { hospitalId: hospitalIdOrThrow(hospitalId), ...params } })
            .then(r => r.items ?? []),
};
