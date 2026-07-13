export interface PrintSettings {
    hospitalName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gstin?: string;
    pan?: string;
    nabhNumber?: string;
    logoUrl?: string;
    footerText?: string;
    terms?: string[];
}

export interface PrintItem {
    srNo: number;
    description: string;
    period?: string;   // e.g. bed/room stay date-range
    qty: number;
    rate: number;
    discount: number;
    total: number;
}

export interface InvoicePrintData {
    invoiceNo: string;
    date: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    mobile: string;
    doctorName: string;
    department?: string;
    status: 'OPEN' | 'FINAL' | 'CANCELLED';
    items: PrintItem[];
    subTotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    dayWise?: InvoiceDayWiseRow[];
}

export interface InterimBillLine {
    srNo: number;
    description: string;
    serviceDate: string;
    qty: number;
    rate: number;
    discount: number;
    total: number;
}

export interface InterimBillPrintData {
    interimBillNo: string;
    dayNumber: number;
    fromLabel: string;
    toLabel: string;
    date: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    mobile: string;
    admissionNo?: string;
    lines: InterimBillLine[];
    dayNet: number;
    cumulativeNet: number;
    advanceReceived: number;
    balanceDue: number;
}

// Optional day-wise summary appended to the final invoice for admitted patients.
export interface InvoiceDayWiseRow {
    dayNumber: number;
    label: string;     // e.g. "01 Jun 14:30 → 02 Jun 14:30"
    netAmount: number;
}

export interface ReceiptPrintData {
    receiptNo: string;
    date: string;
    invoiceNo: string;
    patientName: string;
    patientId: string;
    amount: number;
    mode: string; // CASH | CARD | UPI
    transactionId?: string;
    receivedBy: string;
    remarks?: string;
    invoiceTotal: number;
    invoiceBalanceBefore: number;
    invoiceBalanceAfter: number;
    // Services billed on the invoice this receipt belongs to, with per-line + overall discount —
    // shown on the receipt so the patient can see what they paid for, not just the total.
    items: PrintItem[];
    subTotal: number;
    discountTotal: number;
}

export interface BillCumReceiptPrintData {
    invoice: InvoicePrintData;
    receipt: ReceiptPrintData;
}

export interface DischargeSummaryTpaLine {
    displayName: string;
    netAmount: number;
}

export interface DischargeSummaryPrintData {
    admissionNo: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    mobile: string;
    patientAddress?: string;
    admittedAt: string;
    dischargedAt: string;
    admittingDiagnosis?: string;
    finalDiagnosis?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    courseInHospital?: string;
    proceduresPerformed?: string;
    conditionAtDischarge: string;
    dischargeMedications?: string;
    followUpInstructions?: string;
    followUpDate?: string;
    dietInstructions?: string;
    activityRestrictions?: string;
    additionalNotes?: string;
    signedByDoctorName?: string;
    signedAt?: string;
    // Present only for TPA/SCHEME admissions.
    tpaSplit?: {
        payableTotal: number;
        nonPayableTotal: number;
        unclassifiedTotal: number;
        nonPayableLines: DischargeSummaryTpaLine[];
    };
}

export interface PaymentStatementLine {
    srNo: number;
    date: string;
    receiptNo: string;
    mode: string;
    type: string; // PAYMENT | ADVANCE | REFUND
    amount: number;
}

export interface PaymentStatementPrintData {
    invoiceNo: string;
    patientName: string;
    patientId: string;
    ageGender?: string;
    mobile?: string;
    date: string;
    invoiceTotal: number;
    totalReceived: number;
    balanceDue: number;
    payments: PaymentStatementLine[];
}

export interface DashboardInvoice {
    id: string; // Visit ID
    patientName: string;
    patientId: string;
    date: string;
    status: 'OPEN' | 'FINAL';
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    latestReceiptNo?: string;
}

export interface AdmissionConfirmationPrintData {
    admissionNo: string;
    admittedAt: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    admissionType?: string | null;
    wardBed?: string;               // e.g. "General Ward · B-104", undefined => "to be assigned"
    admittingDoctorName?: string | null;
    provisionalDiagnosis?: string | null;
    payerType: string;
    depositExpected?: number | null;
    attendantName?: string;
    attendantPhone?: string;
}

export interface SurgeryChecklistPhasePrintData {
    label: string;             // "Sign-In (before anaesthesia)"
    completedAt?: string | null;
    completedBy?: string | null;
    items: { label: string; checked: boolean }[];
}

export interface SurgeryCasePrintData {
    admissionNo: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    mobile?: string;
    wardBed?: string;
    procedureName: string;
    surgeryType: string;
    urgency: string;
    statusCode: string;
    surgeonName?: string | null;
    anaesthetistName?: string | null;
    cancelledReason?: string | null;
    booking?: {
        theatreName?: string | null;
        scheduledStart: string;
        scheduledEnd: string;
        statusCode: string;
    } | null;
    preOp?: {
        asaGrade?: string | null;
        npoConfirmed: boolean;
        allergiesReviewed: boolean;
        investigationsReviewed: boolean;
        consentConfirmed: boolean;
        notes?: string | null;
        assessedBy: string;
        assessedAt: string;
    } | null;
    checklistPhases: SurgeryChecklistPhasePrintData[];
    intraOp?: {
        anaesthesiaType?: string | null;
        surgeryStartAt?: string | null;
        surgeryEndAt?: string | null;
        estimatedBloodLossMl?: number | null;
        findings?: string | null;
        procedurePerformed?: string | null;
        surgicalTeam?: string | null;
        complicationsNotes?: string | null;
    } | null;
    itemsUsed: { itemName: string; category: string; qty: number; lotNumber?: string | null; serialNumber?: string | null }[];
}

export interface LedgerEntry {
    date: string;
    particulars: string;
    type: 'CHARGE' | 'PAYMENT' | 'DISCOUNT' | 'REFUND';
    debit: number;
    credit: number;
    balance: number;
}
