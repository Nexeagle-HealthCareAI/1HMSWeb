import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type DayCloseStatus = 'CLOSED' | 'REOPENED';

export interface DayCloseSummary {
    success: boolean;
    message?: string;
    businessDate: string;
    fromUtc: string;
    toUtc: string;
    paymentCount: number;
    refundCount: number;
    invoiceFinalizedCount: number;
    grossCollected: number;
    refundsIssued: number;
    netCollected: number;
    cashAmount: number;
    upiAmount: number;
    cardAmount: number;
    bankAmount: number;
    insuranceAmount: number;
    otherAmount: number;
    alreadyClosed: boolean;
    dayCloseId?: string;
    status?: DayCloseStatus | string;
    closedAt?: string;
    closedBy?: string;
}

export interface DayCloseListItem {
    dayCloseId: string;
    businessDate: string;
    status: DayCloseStatus | string;
    closedAt: string;
    closedBy?: string;
    reopenedAt?: string;
    reopenedBy?: string;
    paymentCount: number;
    refundCount: number;
    grossCollected: number;
    refundsIssued: number;
    netCollected: number;
    cashAmount: number;
    upiAmount: number;
    cardAmount: number;
    bankAmount: number;
    insuranceAmount: number;
    otherAmount: number;
}

export interface GetDayClosesResponse {
    success: boolean;
    message?: string;
    items: DayCloseListItem[];
}

export interface CloseDayRequest {
    hospitalId?: string;
    businessDate: string;
    closingNote?: string;
}

export interface CloseDayResponse {
    success: boolean;
    message?: string;
    dayCloseId?: string;
    closedAt?: string;
    netCollected?: number;
}

export interface ReopenDayRequest {
    hospitalId?: string;
    dayCloseId: string;
    reopenReason: string;
}

export interface ReopenDayResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface PaymentReceipt {
    hospitalName?: string;
    supplierGstin?: string;
    placeOfSupplyStateCode?: string;
    paymentId: string;
    receiptNo?: string;
    paidAt: string;
    paymentType: string;
    paymentMode: string;
    paymentDescription?: string;
    transactionId?: string;
    amount: number;
    amountInWords: string;
    receivedBy?: string;
    patientId?: string;
    patientName?: string;
    encounterId?: string;
    encounterType?: string;
    invoiceId?: string;
    invoiceNo?: string;
    invoiceNetAmount?: number;
    invoicePaidTotal?: number;
    invoiceBalance?: number;
}

export interface GetPaymentReceiptResponse {
    success: boolean;
    message?: string;
    receipt?: PaymentReceipt;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const dayCloseService = {
    preview: (businessDate: string, hospitalId?: string): Promise<DayCloseSummary> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.DAY_CLOSE.PREVIEW(hospitalIdOrThrow(hospitalId), businessDate)),

    list: (opts?: { fromDate?: string; toDate?: string; take?: number; hospitalId?: string }): Promise<GetDayClosesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.DAY_CLOSE.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    close: (req: CloseDayRequest): Promise<CloseDayResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.DAY_CLOSE.CLOSE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    reopen: (req: ReopenDayRequest): Promise<ReopenDayResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.DAY_CLOSE.REOPEN, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    receipt: (paymentId: string, hospitalId?: string): Promise<GetPaymentReceiptResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.DAY_CLOSE.RECEIPT(paymentId, hospitalIdOrThrow(hospitalId))),
};
