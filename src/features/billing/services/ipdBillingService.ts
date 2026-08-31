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

    // TPA/insurance
    isIRDAIPayable?: boolean;

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

    // TPA/insurance
    isIRDAIPayable?: boolean;

    isActive: boolean;
    sortOrder?: number;
    notes?: string;
}

export interface UpsertChargeMasterResponse {
    chargeId: string;
    chargeCode?: string;
}

// ─── Rate cards (payer override + room-class multiplier) ─────────────────────

export type PayerType = 'CASH' | 'TPA' | 'SCHEME';

export interface ChargeMasterPayerRate {
    chargeMasterPayerRateId: string;
    chargeId: string;
    chargeDisplayName?: string;
    chargeCode?: string;
    payerType: PayerType | string;
    overrideRate: number;
    isActive: boolean;
}

export interface RoomClassRateMultiplier {
    roomClassRateMultiplierId: string;
    roomType: string;
    multiplierPercent: number;
}

export interface GetRateCardConfigResponse {
    payerRates?: ChargeMasterPayerRate[];
    roomMultipliers?: RoomClassRateMultiplier[];
}

export interface UpsertPayerRateRequest {
    chargeId: string;
    payerType: PayerType | string;
    overrideRate: number;
    isActive?: boolean;
}

export interface UpsertRoomMultiplierRequest {
    roomType: string;
    multiplierPercent: number;
}

// ─── Charge Events ────────────────────────────────────────────────────────────

export interface CreateEncounterRequest {
    hospitalId?: string;
    patientId: string;
    encounterType: 'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY';
    // Specific appointment to bill against. When omitted, the patient's latest is used.
    appointmentId?: string;
    // Optional visit-date override -- every charge/invoice on this visit silently uses this date
    // instead of "now". Omit for today (unchanged behavior).
    serviceDate?: string;
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
        // Canonical origin tag (e.g. "LAB_PATH") — lets a downstream view filter "which module
        // posted this charge" reliably instead of guessing from the encounter's own type.
        sourceModule?: string;
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

export interface UpdateChargeEventRequest {
    hospitalId?: string;
    patientId?: string;
    chargeEventId: string;
    displayName?: string;
    qty: number;
    rate: number;
    discountPercent: number;
}

export interface UpdateChargeEventResponse {
    success: boolean;
    message?: string;
    data?: {
        charge?: {
            chargeEventId: string;
            displayName?: string;
            qty: number;
            unitPrice: number;
            grossAmount: number;
            discountAmount: number;
            netAmount: number;
        };
        invoiceId?: string;
        invoiceGrossAmount?: number;
        invoiceDiscountAmount?: number;
        invoiceNetAmount?: number;
    };
}

// Cancels the patient's entire latest encounter and voids every charge on it -- NOT a
// single-charge cancel. Renamed from CancelChargeEventRequest/Response, which had no
// chargeEventId field at all and was a misleading name for what this actually does.
export interface CancelEncounterChargesRequest {
    hospitalId?: string;
    patientId: string;
    cancelReason?: string;
}

export interface CancelEncounterChargesResponse {
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
    // True when an explicit discount request would have reduced NetAmount below what's already
    // been collected — held as a PENDING CreditApproval instead of applied.
    pendingApproval?: boolean;
    creditApprovalId?: string;
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

export interface DeleteInvoiceRequest {
    hospitalId?: string;
    patientId: string;
    encounterId: string;
    // Which invoice to delete -- an encounter can have more than one BillingInvoice row over its
    // life (delete one, keep billing, a fresh draft appears later), so this must be explicit.
    invoiceId: string;
    reason: string;
}

export interface DeleteInvoiceResponse {
    success: boolean;
    message?: string;
    chargesVoided: number;
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
    extraCharges?: Array<{
        reason: string;
        amount: number;
    }>;
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
    // True when this would have left the patient with a credit balance and was held for
    // admin approval instead of being posted — no payment was recorded yet.
    pendingApproval?: boolean;
    creditApprovalId?: string;
}

// ─── Encounter Events (read) ─────────────────────────────────────────────────

export type ChargeEventStatus = 'DRAFT' | 'POSTED' | 'INVOICED' | 'VOID';
export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

export interface BillingChargeRow {
    chargeEventId: string;
    createdDateTime: string;
    // The visit's own date (Encounter.ServiceDate-derived) -- on a backdated visit this differs
    // from createdDateTime (real audit time of when the row was actually keyed in). The ledger
    // should display this, not createdDateTime.
    serviceDate: string;
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

// Every invoice ever issued for the encounter (draft, finalized, cancelled), newest first --
// lets the ledger show invoice history instead of only the single current one.
export interface InvoiceSummary {
    invoiceId: string;
    invoiceNo?: string;
    invoiceDate: string;
    statusCode?: InvoiceStatus | string;
    netAmount?: number;
}

export interface GetEncounterEventsResponse {
    success: boolean;
    message?: string;
    data?: {
        totalBilledAmount: number;
        amountReceived: number;
        netBalance: number;
        currentInvoice?: CurrentInvoiceInfo | null;
        invoices?: InvoiceSummary[];
        charges: BillingChargeRow[];
        payments: BillingPaymentRow[];
    };
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface CategoryBreakdownItem {
    categoryCode: string;
    amount: number;
    count: number;
}

export interface DailyTrendPoint {
    date: string;
    revenue: number;
    expense: number;
}

export interface BillingAnalyticsSummaryResponse {
    success: boolean;
    message?: string;
    data?: {
        totalRevenue: number;
        totalExpense: number;
        netAmount: number;
        revenueByCategory: CategoryBreakdownItem[];
        expenseByCategory: CategoryBreakdownItem[];
        dailyTrend: DailyTrendPoint[];
    };
}

export interface CategoryTrendItem {
    categoryCode: string;
    changePercent: number;
    isLeak: boolean;
}

// Nexeagle AI Predictive Analysis -- all numeric fields are computed deterministically server-side
// (see BillingTrendCalculator.cs); Groq only supplies `outlook`/`insights` narration around them.
export interface BillingAiInsightsResponse {
    success: boolean;
    message?: string;
    data?: {
        predictedNext30DayRevenue: number;
        predictedNext30DayExpense: number;
        predictedNext30DayNet: number;
        avg7DayRevenue: number;
        avg30DayRevenue: number;
        monthOverMonthRevenueChangePercent: number;
        monthOverMonthExpenseChangePercent: number;
        outlook: string;
        categoryTrends: CategoryTrendItem[];
        insights: string[];
        historicalTrend: DailyTrendPoint[];
        projectedTrend: DailyTrendPoint[];
    };
}

// ─── Service ─────────────────────────────────────────────────────────────────

// ─── Admission day-wise interim billing ──────────────────────────────────────
export interface AdmissionDayLine {
    chargeEventId: string;
    categoryCode?: string | null;
    displayName?: string | null;
    serviceDate: string;
    qty: number;
    unitPrice: number;
    grossAmount: number;
    discountAmount: number;
    taxAmount: number;
    netAmount: number;
}
export interface AdmissionDayView {
    dayNumber: number;
    fromUtc: string;
    toUtc: string;
    isClosed: boolean;
    isCurrent: boolean;
    admissionDayBillId?: string | null;
    interimBillNo?: string | null;
    netAmount: number;
    cumulativeNetAmount: number;
    lines: AdmissionDayLine[];
}
export interface AdmissionDayBillsData {
    admissionId: string;
    encounterId: string;
    patientId?: string | null;
    admittedAt: string;
    totalDays: number;
    totalCharged: number;
    totalReceived: number;
    balance: number;
    days: AdmissionDayView[];
}
export interface GetAdmissionDayBillsResponse {
    success?: boolean;
    message?: string;
    data?: AdmissionDayBillsData;
}
export interface CloseAdmissionDayResponse {
    success?: boolean;
    message?: string;
    admissionDayBillId?: string;
    dayNumber?: number;
    interimBillNo?: string;
    netAmount?: number;
    balanceDue?: number;
}
export interface ReopenAdmissionDayResponse {
    success?: boolean;
    message?: string;
}
export interface AdmissionInfo {
    admissionId: string;
    admissionNo: string;
    patientId?: string | null;
    encounterId: string;
    admittedAt: string;
    dischargedAt?: string | null;
    statusCode: string;
    admissionReason?: string | null;
}
export interface GetAdmissionByEncounterResponse {
    success?: boolean;
    message?: string;
    data?: AdmissionInfo | null;
}
export interface AdmitPatientRequest {
    patientId: string;
    encounterId: string;
    admittedAt?: string;
    admissionReason?: string;
    primaryDoctorId?: string;
    hospitalId?: string;
}
export interface AdmitPatientResponse {
    success?: boolean;
    message?: string;
    admissionId?: string;
    admissionNo?: string;
    admittedAt?: string;
    wasExisting?: boolean;
}

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

    // Rate cards: payer-type rate override + room-class multiplier. Both optional — absence
    // falls through to ChargeMaster.defaultRate at charge-posting time.
    getRateCardConfig: (hospitalId?: string): Promise<GetRateCardConfigResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CHARGE.GET_RATE_CARD(hospitalIdOrThrow(hospitalId))),

    upsertPayerRate: (req: UpsertPayerRateRequest, hospitalId?: string) =>
        ipdApiClient.put(IPD_API_ENDPOINTS.CHARGE.UPSERT_PAYER_RATE, { ...req, hospitalId: hospitalIdOrThrow(hospitalId) }),

    upsertRoomMultiplier: (req: UpsertRoomMultiplierRequest, hospitalId?: string) =>
        ipdApiClient.put(IPD_API_ENDPOINTS.CHARGE.UPSERT_ROOM_MULTIPLIER, { ...req, hospitalId: hospitalIdOrThrow(hospitalId) }),

    // Charge Events
    // Creates a billing encounter for a registered patient without requiring an appointment
    // (manual billing, e.g. IPD).
    createEncounter: (req: CreateEncounterRequest): Promise<CreateEncounterResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CHARGE.CREATE_ENCOUNTER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    // The OPD consult flow uses charge/create-event to auto-post consult charges.
    createChargeEvent: (req: CreateEncounterRequest): Promise<CreateEncounterResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CHARGE.CREATE_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    addChargeEvents: (req: AddChargeEventRequest): Promise<AddChargeEventResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CHARGE.ADD_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    // Corrects an already-posted charge line (qty/rate/discount/name) in place — no admin
    // approval / discount-cap gate, that workflow was removed.
    updateChargeEvent: (req: UpdateChargeEventRequest): Promise<UpdateChargeEventResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.CHARGE.UPDATE_EVENT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    cancelEncounterCharges: (req: CancelEncounterChargesRequest): Promise<CancelEncounterChargesResponse> =>
        ipdApiClient.patch(IPD_API_ENDPOINTS.CHARGE.CANCEL_ENCOUNTER_CHARGES, {
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

    // Manually deletes (soft-cancels) an invoice regardless of status -- draft or finalized.
    // Every charge on it is voided, not just unlinked.
    deleteInvoice: (req: DeleteInvoiceRequest): Promise<DeleteInvoiceResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BILLING.DELETE_INVOICE, {
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

    // Approval gating removed — deletion is immediate. reason is an optional audit note.
    deleteEvent: (eventId: string, type: 'Charges' | 'Payment', patientId: string, reason?: string, hospitalId?: string): Promise<{ success: boolean; message?: string }> =>
        ipdApiClient.delete(IPD_API_ENDPOINTS.BILLING.DELETE_EVENT(hospitalIdOrThrow(hospitalId), patientId, eventId, type, reason)),

    dashboard: (hospitalId?: string) =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.DASHBOARD(hospitalIdOrThrow(hospitalId))),

    // Analytics: category/date revenue-vs-expense summary. Omit both dates for all-time.
    getAnalyticsSummary: (opts?: { startDate?: string; endDate?: string; hospitalId?: string }): Promise<BillingAnalyticsSummaryResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.ANALYTICS_SUMMARY(hospitalIdOrThrow(opts?.hospitalId), opts?.startDate, opts?.endDate)),

    // Nexeagle AI Predictive Analysis: trend numbers are computed server-side; Groq only narrates them.
    getAiInsights: (hospitalId?: string): Promise<BillingAiInsightsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.ANALYTICS_AI_INSIGHTS(hospitalIdOrThrow(hospitalId))),

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

    // Visit day-wise interim billing (opt-in, anchored to the visit; no admission)
    getVisitDayBills: (encounterId: string, hospitalId?: string): Promise<GetAdmissionDayBillsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BILLING.VISIT_DAY_BILLS(hospitalIdOrThrow(hospitalId), encounterId)),

    closeVisitDay: (encounterId: string, hospitalId?: string): Promise<CloseAdmissionDayResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BILLING.CLOSE_VISIT_DAY, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            encounterId,
        }),

    reopenVisitDay: (admissionDayBillId: string, reason: string, hospitalId?: string): Promise<ReopenAdmissionDayResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BILLING.REOPEN_VISIT_DAY, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            admissionDayBillId,
            reason,
        }),

    // Admission lifecycle (minimal — anchors day-wise billing)
    getAdmissionByEncounter: (encounterId: string, hospitalId?: string): Promise<GetAdmissionByEncounterResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION.GET_BY_ENCOUNTER(hospitalIdOrThrow(hospitalId), encounterId)),

    admitPatient: (req: AdmitPatientRequest): Promise<AdmitPatientResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION.ADMIT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
