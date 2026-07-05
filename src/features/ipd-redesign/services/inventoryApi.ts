import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export type InventoryCategory = 'CONSUMABLE' | 'DRUG' | 'DISPOSABLE' | 'SURGICAL' | 'IMPLANT' | 'OTHER';
export type DrugScheduleClass = 'H' | 'H1' | 'X' | 'NARCOTIC';
export type StorageCondition = 'ROOM' | 'COLD_CHAIN' | 'FROZEN' | 'CONTROLLED';

export interface InventoryItem {
    inventoryItemId: string;
    itemCode: string;
    itemName: string;
    genericName?: string | null;
    manufacturer?: string | null;
    category: InventoryCategory;
    unit: string;
    defaultRate?: number | null;
    hsnSacCode?: string | null;
    gstSlabPercent?: number | null;
    isTaxable: boolean;
    chargeId?: string | null;
    currentStock: number;
    minStockLevel: number;
    storeLocation?: string | null;
    scheduleClass?: DrugScheduleClass | null;
    isLasa: boolean;
    isHighAlert: boolean;
    storageCondition?: StorageCondition | null;
    reorderQty: number;
    maxStockLevel?: number | null;
    isActive: boolean;
}

export interface UpsertInventoryItemInput {
    inventoryItemId?: string;
    itemCode: string;
    itemName: string;
    genericName?: string;
    manufacturer?: string;
    category: InventoryCategory;
    unit?: string;
    defaultRate?: number;
    hsnSacCode?: string;
    gstSlabPercent?: number;
    isTaxable?: boolean;
    chargeId?: string;
    minStockLevel: number;
    storeLocation?: string;
    scheduleClass?: DrugScheduleClass | null;
    isLasa?: boolean;
    isHighAlert?: boolean;
    storageCondition?: StorageCondition | null;
    reorderQty?: number;
    maxStockLevel?: number | null;
    isActive?: boolean;
}

export interface BatchItem {
    batchId: string;
    storeId: string;
    storeName?: string | null;
    batchNumber: string;
    manufactureDate?: string | null;
    expiryDate?: string | null;
    unitCost?: number | null;
    receivedQty: number;
    remainingQty: number;
    status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'QUARANTINED' | 'RECALLED';
}

export interface RecordMovementInput {
    inventoryItemId: string;
    movementType: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUST_IN' | 'ADJUST_OUT';
    qty: number;
    unitCost?: number;
    batchId?: string;
    storeId?: string;
    encounterId?: string;
    patientId?: string;
    sourceModule?: string;
    sourceRefId?: string;
    reason?: string;
    notes?: string;
}

export interface StockOverviewRow {
    inventoryItemId: string;
    itemName: string;
    category: InventoryCategory;
    unit: string;
    storeId: string;
    storeName: string;
    qtyOnHand: number;
}

export interface ExpiryAlertRow {
    batchId: string;
    inventoryItemId: string;
    itemName: string;
    storeName: string;
    batchNumber: string;
    expiryDate: string;
    daysToExpiry: number;
    remainingQty: number;
    tier: 30 | 60 | 90;
}

export interface ReorderAlertRow {
    inventoryItemId: string;
    itemName: string;
    category: InventoryCategory;
    unit: string;
    currentStock: number;
    minStockLevel: number;
    reorderQty: number;
}

export interface InventoryBoard {
    stockByStore: StockOverviewRow[];
    expiryAlerts: ExpiryAlertRow[];
    reorderAlerts: ReorderAlertRow[];
}

export const inventoryApi = {
    getItems: (params: { category?: string; search?: string; activeOnly?: boolean } = {}, hospitalId?: string): Promise<InventoryItem[]> =>
        ipdApiClient
            .get<{ items?: InventoryItem[] }>('/inventory/items', { params: { hospitalId: hospitalIdOrThrow(hospitalId), ...params } })
            .then(r => r.items ?? []),

    upsertItem: (input: UpsertInventoryItemInput, hospitalId?: string) =>
        ipdApiClient.post('/inventory/items', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getBatches: (inventoryItemId: string, opts: { storeId?: string; activeOnly?: boolean } = {}, hospitalId?: string): Promise<BatchItem[]> =>
        ipdApiClient
            .get<{ batches?: BatchItem[] }>(`/inventory/items/${inventoryItemId}/batches`, {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), storeId: opts.storeId, activeOnly: opts.activeOnly ?? true },
            })
            .then(r => r.batches ?? []),

    createBatch: (input: {
        inventoryItemId: string; storeId: string; batchNumber: string; manufactureDate?: string;
        expiryDate?: string; unitCost?: number; receivedQty: number;
    }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/batches', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    recordMovement: (input: RecordMovementInput, hospitalId?: string) =>
        ipdApiClient.post('/inventory/items/movement', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getBoard: (hospitalId?: string): Promise<InventoryBoard> =>
        ipdApiClient
            .get<{ stockByStore?: StockOverviewRow[]; expiryAlerts?: ExpiryAlertRow[]; reorderAlerts?: ReorderAlertRow[] }>(
                '/inventory/board', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } },
            )
            .then(r => ({ stockByStore: r.stockByStore ?? [], expiryAlerts: r.expiryAlerts ?? [], reorderAlerts: r.reorderAlerts ?? [] })),
};
