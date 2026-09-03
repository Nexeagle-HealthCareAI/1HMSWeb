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

export interface ReturnableLineRow {
    chargeEventId: string;
    inventoryItemId: string;
    itemName: string;
    batchId: string;
    batchNumber: string;
    expiryDate?: string;
    isExpired: boolean;
    dispensedQty: number;
    alreadyReturnedQty: number;
    returnableQty: number;
    unitPrice: number;
}

export interface GetReturnableInvoiceLinesResponse {
    found: boolean;
    message?: string;
    invoiceId: string;
    invoiceNo: string;
    encounterId: string;
    patientId?: string;
    invoiceDate: string;
    lines: ReturnableLineRow[];
}

export interface PharmacyReturnLineInput {
    chargeEventId: string;
    inventoryItemId: string;
    batchId: string;
    returnedQty: number;
    unitPrice: number;
}

export interface CreatePharmacyReturnRequest {
    invoiceNo: string;
    refundMode?: string;
    notes?: string;
    lines: PharmacyReturnLineInput[];
}

export interface CreatePharmacyReturnResponse {
    success: boolean;
    message?: string;
    returnId: string;
    returnNo: string;
    totalRefundAmount: number;
}

export interface RtvEligibleBatchRow {
    batchId: string;
    inventoryItemId: string;
    itemName: string;
    batchNumber: string;
    expiryDate?: string;
    daysToExpiry?: number;
    remainingQty: number;
    unitCost?: number;
    estimatedValue: number;
}

export interface VendorReturnLineInput {
    batchId: string;
    qty: number;
}

export interface CreateVendorReturnRequest {
    vendorId: string;
    notes?: string;
    lines: VendorReturnLineInput[];
}

export interface CreateVendorReturnResponse {
    success: boolean;
    message?: string;
    vendorReturnId: string;
    returnNoteNo: string;
    totalQty: number;
    totalValue: number;
}

export interface VendorReturnLineRow {
    itemName: string;
    batchNumber?: string;
    expiryDate?: string;
    qty: number;
    unitCost: number;
    lineValue: number;
}

export interface VendorReturnRow {
    vendorReturnId: string;
    returnNoteNo: string;
    vendorName?: string;
    totalQty: number;
    totalValue: number;
    generatedAt: string;
    generatedBy?: string;
    lines: VendorReturnLineRow[];
}

export interface SalesTrendPoint {
    periodLabel: string;
    periodStart: string;
    totalSales: number;
    totalQty: number;
    lineCount: number;
}

export interface AbcAnalysisRow {
    inventoryItemId?: string;
    itemName: string;
    totalValue: number;
    totalQty: number;
    cumulativePercent: number;
    class: 'A' | 'B' | 'C';
}

export interface GstLiabilityRow {
    hsnSacCode?: string;
    gstRate?: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    totalSales: number;
}

export interface ExpiryLossPreventedResponse {
    recoveredValue: number;
    atRiskValue: number;
    atRiskBatchCount: number;
    rtvNoteCount: number;
}

const dateParam = (d: Date) => d.toISOString().slice(0, 10);

export const pharmacyReturnApi = {
    getReturnableInvoiceLines: (invoiceNo: string, hospitalId?: string): Promise<GetReturnableInvoiceLinesResponse> =>
        ipdApiClient.get<GetReturnableInvoiceLinesResponse>('/pharmacy-returns/invoice-lines', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), invoiceNo },
        }),

    createReturn: async (input: CreatePharmacyReturnRequest, hospitalId?: string): Promise<CreatePharmacyReturnResponse> => {
        try {
            return await ipdApiClient.post<CreatePharmacyReturnResponse>('/pharmacy-returns', {
                hospitalId: hospitalIdOrThrow(hospitalId), ...input,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the return.'));
        }
    },

    getRtvEligibleBatches: (vendorId: string, daysWindow = 60, hospitalId?: string): Promise<RtvEligibleBatchRow[]> =>
        ipdApiClient
            .get<{ batches?: RtvEligibleBatchRow[] }>('/pharmacy-returns/rtv/eligible-batches', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), vendorId, daysWindow },
            })
            .then(r => r.batches ?? []),

    getVendorReturns: (vendorId?: string, hospitalId?: string): Promise<VendorReturnRow[]> =>
        ipdApiClient
            .get<{ returns?: VendorReturnRow[] }>('/pharmacy-returns/rtv', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), vendorId: vendorId || undefined },
            })
            .then(r => r.returns ?? []),

    createVendorReturn: async (input: CreateVendorReturnRequest, hospitalId?: string): Promise<CreateVendorReturnResponse> => {
        try {
            return await ipdApiClient.post<CreateVendorReturnResponse>('/pharmacy-returns/rtv', {
                hospitalId: hospitalIdOrThrow(hospitalId), ...input,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not generate the vendor return note.'));
        }
    },

    getSalesTrend: (fromDate: Date, toDate: Date, groupBy: 'DAY' | 'WEEK' | 'MONTH', hospitalId?: string): Promise<SalesTrendPoint[]> =>
        ipdApiClient
            .get<{ points?: SalesTrendPoint[] }>('/pharmacy-returns/analytics/sales-trend', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate: dateParam(fromDate), toDate: dateParam(toDate), groupBy },
            })
            .then(r => r.points ?? []),

    getAbcAnalysis: (fromDate: Date, toDate: Date, hospitalId?: string): Promise<AbcAnalysisRow[]> =>
        ipdApiClient
            .get<{ items?: AbcAnalysisRow[] }>('/pharmacy-returns/analytics/abc', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate: dateParam(fromDate), toDate: dateParam(toDate) },
            })
            .then(r => r.items ?? []),

    getGstLiability: (fromDate: Date, toDate: Date, hospitalId?: string): Promise<{ rows: GstLiabilityRow[]; grandTotalTax: number }> =>
        ipdApiClient.get<{ rows?: GstLiabilityRow[]; grandTotalTax?: number }>('/pharmacy-returns/analytics/gst-liability', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate: dateParam(fromDate), toDate: dateParam(toDate) },
        }).then(r => ({ rows: r.rows ?? [], grandTotalTax: r.grandTotalTax ?? 0 })),

    getExpiryLossPrevented: (fromDate: Date, toDate: Date, hospitalId?: string): Promise<ExpiryLossPreventedResponse> =>
        ipdApiClient.get<ExpiryLossPreventedResponse>('/pharmacy-returns/analytics/expiry-loss-prevented', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate: dateParam(fromDate), toDate: dateParam(toDate) },
        }),
};
