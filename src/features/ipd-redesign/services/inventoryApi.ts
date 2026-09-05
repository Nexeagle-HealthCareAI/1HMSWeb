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
    saltCompositionId?: string | null;
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
    saltCompositionId?: string | null;
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
    mrp?: number | null; // maps to backend's `Mrp` property, camelCased
    barcodeValue?: string | null;
    receivedQty: number;
    remainingQty: number;
    status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'QUARANTINED' | 'RECALLED';
    // Only populated by getAllBatches — every other caller already knows the item from context.
    inventoryItemId?: string | null;
    itemName?: string | null;
    itemCode?: string | null;
}

export interface BatchByBarcodeResult {
    found: boolean;
    inventoryItemId: string;
    itemName?: string | null;
    batch?: BatchItem | null;
}

export type ExpiryBucket = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface NearExpiryBatch {
    batchId: string;
    inventoryItemId: string;
    itemName?: string | null;
    genericName?: string | null;
    storeId: string;
    storeName?: string | null;
    vendorId?: string | null;
    vendorName?: string | null;
    batchNumber: string;
    expiryDate?: string | null;
    daysToExpiry?: number | null;
    bucket: ExpiryBucket;
    remainingQty: number;
    mrp?: number | null;
}

export interface BulkImportPreviewRow {
    rowIndex: number;
    isValid: boolean;
    errorMessage?: string | null;
    // Non-blocking — set alongside isValid=true when the batch number already exists for the
    // item+store (same expiry = will top up; different expiry = possible typo, still importable).
    existingBatchWarning?: string | null;
    storeCode?: string | null;
    itemCode?: string | null;
    itemName?: string | null;
    // True when itemCode doesn't exist in the catalogue yet but itemName was supplied -- the
    // commit step will create the medicine automatically instead of rejecting the row.
    willCreateItem?: boolean;
    batchNumber?: string | null;
    manufactureDate?: string | null;
    expiryDate?: string | null;
    unitCost?: number | null;
    mrp?: number | null;
    barcodeValue?: string | null;
    receivedQty: number;
}

export interface BulkImportPreviewResult {
    success: boolean;
    message?: string | null;
    unrecognizedColumns: string[];
    rows: BulkImportPreviewRow[];
}

export interface ReorderThresholdSuggestion {
    inventoryItemId: string;
    itemName: string;
    unit: string;
    trailing4WeekIssuedQty: number;
    weeklyAverageConsumption: number;
    currentMinStockLevel: number;
    currentMaxStockLevel?: number | null;
    suggestedMinStockLevel: number;
    suggestedMaxStockLevel: number;
    isBelowSuggestedMin: boolean;
}

export interface DrugScheduleRegisterEntryItem {
    registerEntryId: string;
    itemName?: string | null;
    batchNumber?: string | null;
    storeName?: string | null;
    scheduleClass: string;
    qty: number;
    patientId?: string | null;
    prescriberRef?: string | null;
    dispensedBy?: string | null;
    recordedAt: string;
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

export interface StoreStockSummaryRow {
    storeName: string;
    itemCount: number;
}

export interface BloodStockSummaryRow {
    storeName: string;
    component: string;
    bloodGroup: string;
    status: string;
    bagCount: number;
    totalVolumeMl: number;
}

export interface CssdStockSummaryRow {
    storeName: string;
    currentStatus: string;
    setCount: number;
}

export interface UnifiedStockVisibility {
    inventoryByStore: StoreStockSummaryRow[];
    bloodByStore: BloodStockSummaryRow[];
    cssdByStore: CssdStockSummaryRow[];
}

export interface TransferStockInput {
    inventoryItemId: string;
    fromStoreId: string;
    toStoreId: string;
    batchId?: string;
    qty: number;
    notes?: string;
}

export interface UseAndBillStockInput {
    storeId: string;
    inventoryItemId: string;
    qty: number;
    encounterId: string;
    patientId: string;
    attributedDoctorId?: string;
    notes?: string;
}

export interface UseAndBillStockResult {
    success: boolean;
    message?: string;
    inventoryMovementId?: string;
    chargeEventId?: string;
    noChargeConfigured: boolean;
}

export interface QuickReceiveStockInput {
    storeId: string;
    inventoryItemId: string;
    qty: number;
    batchNumber?: string;
    manufactureDate?: string;
    expiryDate?: string;
    unitCost?: number;
    notes?: string;
}

export interface QuickReceiveStockResult {
    success: boolean;
    message?: string;
    batchId?: string;
    inventoryMovementId?: string;
    newCurrentStock?: number;
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

    getBatchByBarcode: (barcodeValue: string, opts: { storeId?: string } = {}, hospitalId?: string): Promise<BatchByBarcodeResult> =>
        ipdApiClient.get<BatchByBarcodeResult>('/inventory/batches/by-barcode', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), barcodeValue, storeId: opts.storeId },
        }),

    getNearExpiryReport: (opts: { storeId?: string; vendorId?: string; bucket?: string } = {}, hospitalId?: string): Promise<NearExpiryBatch[]> =>
        ipdApiClient
            .get<{ batches?: NearExpiryBatch[] }>('/inventory/expiry/near-expiry-report', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), storeId: opts.storeId, vendorId: opts.vendorId, bucket: opts.bucket },
            })
            .then(r => r.batches ?? []),

    getScheduleRegister: (opts: { inventoryItemId?: string; scheduleClass?: string } = {}, hospitalId?: string): Promise<DrugScheduleRegisterEntryItem[]> =>
        ipdApiClient
            .get<{ entries?: DrugScheduleRegisterEntryItem[] }>('/inventory/schedule-register', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), inventoryItemId: opts.inventoryItemId, scheduleClass: opts.scheduleClass },
            })
            .then(r => r.entries ?? []),

    createBatch: (input: {
        inventoryItemId: string; storeId: string; batchNumber: string; manufactureDate?: string;
        expiryDate?: string; unitCost?: number; mrp?: number; barcodeValue?: string; receivedQty: number;
    }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/batches', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    bulkUploadBatches: (input: { rows: any[] }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/batches/bulk', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    previewBulkImport: (file: File, hospitalId?: string): Promise<BulkImportPreviewResult> => {
        const formData = new FormData();
        formData.append('hospitalId', hospitalIdOrThrow(hospitalId));
        formData.append('file', file);
        return ipdApiClient.post<BulkImportPreviewResult>('/inventory/batches/bulk-import/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    // Flat, hospital-wide "everything currently in stock" view — backs the Batches tab and the
    // duplicate-check lookups in the bulk-entry grid / single quick-add dialog.
    getAllBatches: (opts: { storeId?: string; search?: string; activeOnly?: boolean } = {}, hospitalId?: string): Promise<BatchItem[]> =>
        ipdApiClient
            .get<{ batches?: BatchItem[] }>('/inventory/batches', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), storeId: opts.storeId, search: opts.search, activeOnly: opts.activeOnly ?? true },
            })
            .then(r => r.batches ?? []),

    getReorderThresholdSuggestions: (opts: { storeId?: string; bufferMultiplier?: number } = {}, hospitalId?: string): Promise<ReorderThresholdSuggestion[]> =>
        ipdApiClient
            .get<{ suggestions?: ReorderThresholdSuggestion[] }>('/inventory/reorder-threshold-suggestions', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), storeId: opts.storeId, bufferMultiplier: opts.bufferMultiplier },
            })
            .then(r => r.suggestions ?? []),

    acceptThresholdSuggestion: (input: { inventoryItemId: string; minStockLevel: number; maxStockLevel: number }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/reorder-threshold-suggestions/accept', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    recordMovement: (input: RecordMovementInput, hospitalId?: string) =>
        ipdApiClient.post('/inventory/items/movement', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    transferStock: (input: TransferStockInput, hospitalId?: string) =>
        ipdApiClient.post('/inventory/transfer', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    quickReceive: (input: QuickReceiveStockInput, hospitalId?: string): Promise<QuickReceiveStockResult> =>
        ipdApiClient.post<QuickReceiveStockResult>('/inventory/receive', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    useAndBillStock: (input: UseAndBillStockInput, hospitalId?: string): Promise<UseAndBillStockResult> =>
        ipdApiClient.post<UseAndBillStockResult>('/inventory/use-and-bill', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getBoard: (hospitalId?: string): Promise<InventoryBoard> =>
        ipdApiClient
            .get<{ stockByStore?: StockOverviewRow[]; expiryAlerts?: ExpiryAlertRow[]; reorderAlerts?: ReorderAlertRow[] }>(
                '/inventory/board', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } },
            )
            .then(r => ({ stockByStore: r.stockByStore ?? [], expiryAlerts: r.expiryAlerts ?? [], reorderAlerts: r.reorderAlerts ?? [] })),

    getUnifiedStock: (hospitalId?: string): Promise<UnifiedStockVisibility> =>
        ipdApiClient
            .get<{ inventoryByStore?: StoreStockSummaryRow[]; bloodByStore?: BloodStockSummaryRow[]; cssdByStore?: CssdStockSummaryRow[] }>(
                '/inventory/unified-stock', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } },
            )
            .then(r => ({ inventoryByStore: r.inventoryByStore ?? [], bloodByStore: r.bloodByStore ?? [], cssdByStore: r.cssdByStore ?? [] })),
};
