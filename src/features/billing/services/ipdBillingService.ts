import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// ─── Charge Master ────────────────────────────────────────────────────────────

export type AppliesTo = 'OPD' | 'IPD' | 'LAB' | 'RAD' | 'PHARMACY' | 'ANY';

export interface ChargeMaster {
    chargeId: string;
    chargeCode?: string;
    displayName?: string;
    categoryCode?: string;
    subCategoryCode?: string;
    appliesTo?: AppliesTo | string;
    defaultRate: number;
    defaultQty: number;
    maxDiscountPercent?: number;
    incentiveAmount?: number;

    // GST
    hsnSacCode?: string;
    isTaxable?: boolean;
    gstSlabPercent?: number;
    taxInclusive?: boolean;

    isActive: boolean;
    sortOrder: number;
    notes?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface GetChargeMastersResponse {
    items: ChargeMaster[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface UpsertChargeMasterRequest {
    chargeId?: string;
    hospitalId?: string;
    chargeCode?: string;
    displayName: string;
    categoryCode: string;
    subCategoryCode?: string;
    appliesTo: AppliesTo | string;
    defaultRate: number;
    defaultQty: number;
    maxDiscountPercent?: number;
    incentiveAmount?: number;

    // GST
    hsnSacCode?: string;
    isTaxable?: boolean;
    gstSlabPercent?: number;
    taxInclusive?: boolean;

    isActive: boolean;
    sortOrder?: number;
    notes?: string;
}

export interface UpsertChargeMasterResponse {
    chargeId: string;
    chargeCode?: string;
}

// ─── Charge Events ────────────────────────────────────────────────────────────

export interface CreateEncounterRequest {
    hospitalId?: string;
    patientId: string;
    encounterType: 'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY';
    // Specific appointment to bill against. When omitted, the patient's latest is used.
    appointmentId?: string;
}

export interface CreateEncounterResponse {
    success: boolean;
    message?: string;
    data?: {
        encounterId: string;
        doctorName?: string;
        // OPD consult auto-charge outcome
        consultChargePosted?: boolean;   // a consult charge was posted on this call
        consultFee?: number;             // the fee amount (0 when none)
        consultAlreadyCharged?: boolean; // an existing consult charge was found (idempotent reuse)
        consultChargeEventId?: string | null;
        consultPaid?: boolean;           // the existing consult charge is already fully paid
        receiptNo?: string | null;       // latest receipt for the consult, when paid
    };
}

export interface AddChargeEventRequest {
    hospitalId?: string;
    patientId: string;
    encounterId: string;

    // Optional billing-recipient context for GST
    placeOfSupplyStateCode?: string;
    buyerGstin?: string;

    charges: Array<{
        // Optional link to ChargeMaster — when set, HSN/GST snapshot is taken from there.
        chargeId?: string;
        displayName: string;
        qty: number;
        rate: number;
        discountPercent: number;
        categoryCode: string;
        // GST overrides — when supplied they override the ChargeMaster snapshot.
        hsnSacCode?: string;
        gstRate?: number;
        taxInclusive?: boolean;
        // Per-charge incentive (referrer/doctor accrual) — for manual charges with no master.
        incentiveAmount?: number;
    }>;
}

export interface AddChargeEventResponse {
    success: boolean;
    message?: string;
    data?: {
        encounterId: string;
        chargeCount: number;
        totalGross: number;
        totalDiscount: number;
        totalNet: number;
        totalTaxable?: number;
        totalCgst?: number;
        totalSgst?: number;
        totalIgst?: number;
        totalTax?: number;
        chargeEvents: Array<{
            chargeEventId: string;
            displayName?: string;
            qty: number;
            unitPrice: number;
            grossAmount: number;
            discountAmount: number;
            netAmount: number;
            hsnSacCode?: string;
            gstRate?: number;
            taxableAmount?: number;
            cgstAmount?: number;
            sgstAmount?: number;
            igstAmount?: number;
            taxAmount?: number;
            isTaxInclusive?: boolean;
            isInterState?: boolean;
        }>;
    };
}

export interface CancelChargeEventRequest {
    hospitalId?: string;
    patientId: string;
    cancelReason?: string;
}

export interface CancelChargeEventResponse {
    success: boolean;
    message?: string;
}

// ─── Invoice / Finalize ──────────────────────────────────────────────────────

export interface CreateDraftInvoiceRequest {
    hospitalId?: string;
    patientId: string;
    encounterId: string;
    invoiceDiscountAmount?: number;
}

export interface CreateDraftInvoiceResponse {
    success: boolean;
    message?: string;
    data?: {
        invoiceId: string;
        invoiceNo?: string;
        encounterId: string;
        linkedChargeCount: number;
        grossAmount: number;
        discountAmount: number;
        netAmount: number;
        taxableAmount?: number;
        cgstAmount?: number;
        sgstAmount?: number;
        igstAmount?: number;
        taxAmount?: number;
        wasReused: boolean;
    };
}

export type FinalizeAction = 'finalize' | 'reopen';

export interface FinalizeBillingRequest {
    hospitalId?: string;
    patientId: string;
    encounterId: string;
    reason?: string;
}

export interface FinalizeBillingResponse {
    success: boolean;
    message?: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentType = 'PAYMENT' | 'ADVANCE' | 'REFUND';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'INSURANCE';

export interface AddPaymentRequest {
    hospitalId?: string;
    patientId: string;
    encounterId: string;
    payment: {
        paymentType: PaymentType;
        paymentMode: PaymentMode;
        description?: string;
        transactionId?: string;
        amount: number;
    };
}

export interface AddPaymentResponse {
    success: boolean;
    message?: string;
    data?: {
        paymentId: string;
        receiptNo?: string;
        allocatedAmount: number;
        creditAmount?: number;
    };
}

// ─── Encounter Events (read) ─────────────────────────────────────────────────

export type ChargeEventStatus = 'DRAFT' | 'POSTED' | 'INVOICED' | 'VOID';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

export interface BillingChargeRow {
    chargeEventId: string;
    createdDateTime: string;
    displayName?: string;
    categoryCode?: string;
    sourceModule?: string;
    rate: number;
    qty: number;
    grossAmount: number;
    discountAmount: number;
    netAmount: number;

    // GST snapshot
    hsnSacCode?: string;
    gstRate?: number;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    taxAmount?: number;
    isTaxInclusive?: boolean;
    isInterState?: boolean;

    statusCode?: ChargeEventStatus | string;
    isInvoiced: boolean;
}

export interface BillingPaymentRow {
    paymentId: string;
    createdDateTime: string;
    paymentType?: PaymentType | string;
    paymentMode?: PaymentMode | string;
    paymentDescription?: string;
    receiptNo?: string;
    amount: number;
}

export interface CurrentInvoiceInfo {
    invoiceId: string;
    invoiceNo?: string;
    statusCode?: InvoiceStatus | string;
    invoiceDate: string;
    finalizedAt?: string;
    finalizedBy?: string;
    grossAmount?: number;
    discountAmount?: number;
    netAmount?: number;

    // GST roll-up
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    taxAmount?: number;
    buyerGstin?: string;
    placeOfSupplyStateCode?: string;

    isReopened?: boolean;
    reopenedReason?: string;
}

export interface GetEncounterEventsResponse {
    success: boolean;
    message?: string;
    data?: {
        totalBilledAmount: number;
        amountReceived: number;
        netBalance: number;
        currentInvoice?: CurrentInvoiceInfo | null;
        charges: BillingChargeRow[];
        payments: BillingPaymentRow[];
    };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const ipdBillingService = {
    // Charge Master
    listChargeMasters: (opts: { page?: number; pageSize?: number; hospitalId?: string } = {}): Promise<GetChargeMastersResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CHARGE.GET_MASTERS(
            hospitalIdOrThrow(opts.hospitalId),
            opts.page ?? 1,
            opts.pageSize ?? 50,
        )),

    getChargeMaster: (chargeId: string, hospitalId?: string): Promise<ChargeMaster> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CHARGE.GET_MASTER_BY_ID(chargeId, hospitalIdOrThrow(hospitalId))),

    upsertChargeMaster: (req: UpsertChargeMasterRequest): Promise<UpsertChargeMasterResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.CHARGE.UPSERT_MASTER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    deleteChargeMaster: (chargeId: string, hospitalId?: string): Promise<{ isSucess: boolean; message?: string }> =>
        ipdApiClient.delete(IPD_API_ENDPOINTS.CHARGE.DELETE_MASTER, {
            data: { chargeId, hospitalId: hospitalIdOrThrow(hospitalId) },
        }),

    updateChargeMasterStatus: (chargeId: string, isActive: boolean, hospitalId?: string): Promise<{ isSucess: boolean; message?: string }> =>
        ipdApiClient.patch(IPD_API_ENDPOINTS.CHARGE.UPDATE_MASTER_STATUS(chargeId, hospitalIdOrThrow(hospitalId)), { isActive }),

    // Charge Events
    // Creates a billing encounter for a registered patient without requiring an appointment
    // (manual billing, e.g. IPD). The OPD consult flow still uses charge/create-event.
    createEncounter: (req: CreateEncounterRequest): Promise<CreateEncounterResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CHARGE.CREATE_ENCOUNTER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    addChargeEvents: (req: AddChargeEventRequest): Promise<AddChargeEventResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CHARGE.ADD_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    cancelChargeEvent: (req: CancelChargeEventRequest): Promise<CancelChargeEventResponse> =>
        ipdApiClient.patch(IPD_API_ENDPOINTS.CHARGE.CANCEL_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    // Invoice / Finalize
    createDraftInvoice: (req: CreateDraftInvoiceRequest): Promise<CreateDraftInvoiceResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BILLING.CREATE_INVOICE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    finalize: (action: FinalizeAction, req: FinalizeBillingRequest): Promise<FinalizeBillingResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BILLING.FINALIZE(action), {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    // Payment
    addPayment: (req: AddPaymentRequest): Promise<AddPaymentResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.PAYMENT.ADD_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    // Billing reads
    getEncounterEvents: (encounterId: string, patientId: string, hospitalId?: string): Promise<GetEncounterEventsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.GET_EVENTS(encounterId, patientId, hospitalIdOrThrow(hospitalId))),

    getPatientEvents: (patientId: string, hospitalId?: string) =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.GET_PATIENT_EVENTS(patientId, hospitalIdOrThrow(hospitalId))),

    deleteEvent: (eventId: string, type: 'Charges' | 'Payment', patientId: string, hospitalId?: string) =>
        ipdApiClient.delete(IPD_API_ENDPOINTS.BILLING.DELETE_EVENT(hospitalIdOrThrow(hospitalId), patientId, eventId, type)),

    dashboard: (hospitalId?: string) =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.DASHBOARD(hospitalIdOrThrow(hospitalId))),

    print: (patientId: string, encounterId: string, hospitalId?: string) =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.PRINT(patientId, hospitalIdOrThrow(hospitalId), encounterId)),

    // Policy
    getPolicy: (hospitalId?: string) =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.GET_POLICY(hospitalIdOrThrow(hospitalId))),

    updatePolicy: (req: any) =>
        ipdApiClient.put(IPD_API_ENDPOINTS.BILLING.UPDATE_POLICY, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
