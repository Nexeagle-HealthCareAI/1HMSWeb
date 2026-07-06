import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export type IndentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'CANCELLED';
export type PurchaseOrderStatus = 'DRAFT' | 'APPROVED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type GrnMatchStatus = 'MATCHED' | 'MISMATCH' | 'PENDING';

export interface IndentItem {
    indentId: string;
    indentNumber: string;
    requestingStoreId: string;
    requestingStoreName?: string | null;
    status: IndentStatus;
    isSystemGenerated: boolean;
    requestedBy?: string | null;
    requestedAt: string;
    lineCount: number;
}

export interface IndentLineItem {
    indentLineId: string;
    inventoryItemId: string;
    itemName: string;
    unit: string;
    qty: number;
    notes?: string | null;
}

export interface IndentDetail {
    indent: IndentItem;
    lines: IndentLineItem[];
}

export interface PurchaseOrderItem {
    purchaseOrderId: string;
    poNumber: string;
    vendorId: string;
    vendorName?: string | null;
    indentId?: string | null;
    status: PurchaseOrderStatus;
    orderedAt: string;
    expectedDeliveryDate?: string | null;
    lineCount: number;
}

export interface PurchaseOrderLineItem {
    purchaseOrderLineId: string;
    inventoryItemId: string;
    itemName: string;
    unit: string;
    qty: number;
    rate: number;
    receivedQty: number;
}

export interface PurchaseOrderDetail {
    purchaseOrder: PurchaseOrderItem;
    lines: PurchaseOrderLineItem[];
}

export interface GoodsReceiptNoteItem {
    grnId: string;
    grnNumber: string;
    purchaseOrderId: string;
    poNumber?: string | null;
    vendorId: string;
    vendorName?: string | null;
    receivedStoreName?: string | null;
    invoiceNumber?: string | null;
    invoiceAmount?: number | null;
    matchStatus: GrnMatchStatus;
    receivedAt: string;
}

export const procurementApi = {
    getIndents: (status?: string, hospitalId?: string): Promise<IndentItem[]> =>
        ipdApiClient
            .get<{ indents?: IndentItem[] }>('/inventory/indents', { params: { hospitalId: hospitalIdOrThrow(hospitalId), status } })
            .then(r => r.indents ?? []),

    getIndentDetail: (indentId: string, hospitalId?: string): Promise<IndentDetail> =>
        ipdApiClient
            .get<{ indent: IndentItem; lines: IndentLineItem[] }>(`/inventory/indents/${indentId}`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => ({ indent: r.indent, lines: r.lines })),

    createIndent: (input: { requestingStoreId: string; isSystemGenerated?: boolean; notes?: string; lines: { inventoryItemId: string; qty: number; notes?: string }[] }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/indents', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    decideIndent: (indentId: string, approve: boolean, reason?: string, hospitalId?: string) =>
        ipdApiClient.post(`/inventory/indents/${indentId}/decide`, { hospitalId: hospitalIdOrThrow(hospitalId), approve, reason }),

    convertIndentToPo: (indentId: string, input: { vendorId: string; expectedDeliveryDate?: string; lines: { indentLineId: string; rate: number }[] }, hospitalId?: string) =>
        ipdApiClient.post(`/inventory/indents/${indentId}/convert-to-po`, { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getPurchaseOrders: (status?: string, hospitalId?: string): Promise<PurchaseOrderItem[]> =>
        ipdApiClient
            .get<{ purchaseOrders?: PurchaseOrderItem[] }>('/inventory/purchase-orders', { params: { hospitalId: hospitalIdOrThrow(hospitalId), status } })
            .then(r => r.purchaseOrders ?? []),

    getPurchaseOrderDetail: (purchaseOrderId: string, hospitalId?: string): Promise<PurchaseOrderDetail> =>
        ipdApiClient
            .get<{ purchaseOrder: PurchaseOrderItem; lines: PurchaseOrderLineItem[] }>(`/inventory/purchase-orders/${purchaseOrderId}`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => ({ purchaseOrder: r.purchaseOrder, lines: r.lines })),

    createPurchaseOrder: (input: { vendorId: string; expectedDeliveryDate?: string; notes?: string; lines: { inventoryItemId: string; qty: number; rate: number }[] }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/purchase-orders', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    approvePurchaseOrder: (purchaseOrderId: string, hospitalId?: string) =>
        ipdApiClient.post(`/inventory/purchase-orders/${purchaseOrderId}/approve`, { hospitalId: hospitalIdOrThrow(hospitalId) }),

    markPurchaseOrderSent: (purchaseOrderId: string, hospitalId?: string) =>
        ipdApiClient.post(`/inventory/purchase-orders/${purchaseOrderId}/mark-sent`, { hospitalId: hospitalIdOrThrow(hospitalId) }),

    cancelPurchaseOrder: (purchaseOrderId: string, reason: string, hospitalId?: string) =>
        ipdApiClient.post(`/inventory/purchase-orders/${purchaseOrderId}/cancel`, { hospitalId: hospitalIdOrThrow(hospitalId), reason }),

    getGoodsReceiptNotes: (hospitalId?: string): Promise<GoodsReceiptNoteItem[]> =>
        ipdApiClient
            .get<{ goodsReceiptNotes?: GoodsReceiptNoteItem[] }>('/inventory/grn', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.goodsReceiptNotes ?? []),

    createGoodsReceiptNote: (input: {
        purchaseOrderId: string; receivedStoreId: string; invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number; notes?: string;
        lines: { purchaseOrderLineId: string; inventoryItemId: string; batchNumber: string; manufactureDate?: string; expiryDate?: string; qty: number; rate: number }[];
    }, hospitalId?: string) =>
        ipdApiClient.post('/inventory/grn', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),
};
