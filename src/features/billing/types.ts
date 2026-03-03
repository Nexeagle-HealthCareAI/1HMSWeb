export type Patient = {
    id: string;
    patientId: string;
    name: string;
    mobile: string;
    age: number;
    sex: 'M' | 'F';
};

export type VisitStatus = 'OPEN' | 'FINAL';
export type VisitType = 'OPD' | 'IPD' | 'LAB' | 'PHARMACY' | 'ER' | 'OTHER';

export type Visit = {
    id: string;
    patientId: string;
    type: VisitType;
    date: string;
    status: VisitStatus;
    doctorName?: string;
    // Optional fields for dashboard display
    patientName?: string;
    patientIdDisplay?: string;
    mobile?: string;
    age?: number;
    sex?: 'M' | 'F';
    totalDebit?: number;
    totalCredit?: number;
    balance?: number;
};

export type EntryType = 'CHARGE' | 'PAYMENT' | 'ADVANCE' | 'REFUND' | 'ADJUSTMENT';
export type DiscountType = 'NONE' | 'PCT' | 'FLAT';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK';

export type LedgerEntry = {
    id: string;
    visitId: string;
    date: string; // ISO string
    type: EntryType;
    particular: string;

    // Charge details
    qty?: number;
    rate?: number;
    taxPercent?: number;
    discountType?: DiscountType;
    discountValue?: number;

    // Payment details
    amount?: number;
    mode?: PaymentMode;
    ref?: string;

    // Optional override for specific entry type context
    visitType?: VisitType;

    // Computed values stored for ledger integrity
    netDebit: number;
    credit: number;
    runningBalance?: number;

    createdAt: number;
};
