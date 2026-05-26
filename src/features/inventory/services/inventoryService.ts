import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type InventoryCategory = 'CONSUMABLE' | 'DRUG' | 'DISPOSABLE' | 'SURGICAL' | 'IMPLANT' | 'OTHER';
export type MovementType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUST_IN' | 'ADJUST_OUT';

export interface InventoryItem {
    inventoryItemId: string;
    itemCode: string;
    itemName: string;
    genericName?: string;
    manufacturer?: string;
    category: InventoryCategory | string;
    unit: string;
    defaultRate?: number;
    hsnSacCode?: string;
    gstSlabPercent?: number;
    isTaxable: boolean;
    chargeId?: string;
    currentStock: number;
    minStockLevel: number;
    isLowStock: boolean;
    storeLocation?: string;
    isActive: boolean;
    updatedAt: string;
    updatedBy?: string;
}

export interface UpsertInventoryItemRequest {
    inventoryItemId?: string;
    hospitalId?: string;
    itemCode: string;
    itemName: string;
    genericName?: string;
    manufacturer?: string;
    category: InventoryCategory | string;
    unit: string;
    defaultRate?: number;
    hsnSacCode?: string;
    gstSlabPercent?: number;
    isTaxable?: boolean;
    chargeId?: string;
    minStockLevel: number;
    storeLocation?: string;
    isActive?: boolean;
}

export interface UpsertInventoryItemResponse {
    success: boolean;
    message?: string;
    inventoryItemId?: string;
    itemCode?: string;
}

export interface GetInventoryItemsResponse {
    success: boolean;
    message?: string;
    items: InventoryItem[];
}

export interface ReceiveStockRequest {
    hospitalId?: string;
    inventoryItemId: string;
    qty: number;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
}

export interface IssueStockRequest {
    hospitalId?: string;
    inventoryItemId: string;
    qty: number;
    patientId?: string;
    encounterId?: string;
    unitRate?: number;
    discountPercent?: number;
    batchNumber?: string;
    reason?: string;
    notes?: string;
}

export interface AdjustStockRequest {
    hospitalId?: string;
    inventoryItemId: string;
    qty: number;          // signed
    reason: string;
    notes?: string;
}

export interface RecordStockMovementResponse {
    success: boolean;
    message?: string;
    inventoryMovementId?: string;
    currentStock?: number;
    lowStockReached?: boolean;
    chargeEventId?: string;
}

export interface InventoryMovementItem {
    inventoryMovementId: string;
    inventoryItemId: string;
    itemName?: string;
    itemCode?: string;
    movementType: MovementType | string;
    qty: number;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: string;
    encounterId?: string;
    patientId?: string;
    chargeEventId?: string;
    reason?: string;
    notes?: string;
    movedAt: string;
    movedBy?: string;
}

export interface GetInventoryMovementsResponse {
    success: boolean;
    message?: string;
    items: InventoryMovementItem[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const inventoryService = {
    upsertItem: (req: UpsertInventoryItemRequest): Promise<UpsertInventoryItemResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.INVENTORY.UPSERT_ITEM, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listItems: (opts?: { category?: string; search?: string; isActive?: boolean; lowStockOnly?: boolean; take?: number; hospitalId?: string }): Promise<GetInventoryItemsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.INVENTORY.LIST_ITEMS(hospitalIdOrThrow(opts?.hospitalId), opts)),

    receive: (req: ReceiveStockRequest): Promise<RecordStockMovementResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.INVENTORY.RECEIVE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    issue: (req: IssueStockRequest): Promise<RecordStockMovementResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.INVENTORY.ISSUE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    adjust: (req: AdjustStockRequest): Promise<RecordStockMovementResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.INVENTORY.ADJUST, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listMovements: (opts?: { inventoryItemId?: string; encounterId?: string; movementType?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetInventoryMovementsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.INVENTORY.LIST_MOVEMENTS(hospitalIdOrThrow(opts?.hospitalId), opts)),
};
