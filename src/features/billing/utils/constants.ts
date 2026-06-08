import type { PaymentMode } from '../services/ipdBillingService';

export type VisitTypeCode = 'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY';

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK', label: 'Bank Transfer' },
    { value: 'INSURANCE', label: 'Insurance' },
];

export const VISIT_TYPES: { value: VisitTypeCode; label: string }[] = [
    { value: 'OPD', label: 'Outpatient' },
    { value: 'IPD', label: 'Inpatient' },
    { value: 'ER', label: 'Emergency' },
    { value: 'LAB', label: 'Laboratory' },
    { value: 'PHARMACY', label: 'Pharmacy' },
];

// Friendly display label for any stored visit-type / encounter-type CODE (value is never changed).
// Use everywhere a raw code would otherwise be shown to the user.
export const VISIT_TYPE_LABEL: Record<string, string> = {
    OPD: 'Outpatient',
    IPD: 'Inpatient',
    ER: 'Emergency',
    LAB: 'Laboratory',
    PHARMACY: 'Pharmacy',
    RAD: 'Radiology',
    OTHER: 'Other',
    ANY: 'Any',
};

export const visitTypeLabel = (code?: string | null): string =>
    code ? (VISIT_TYPE_LABEL[code.toUpperCase()] ?? code) : '';
