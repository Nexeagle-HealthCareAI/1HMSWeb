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
    { value: 'OPD', label: 'OPD' },
    { value: 'IPD', label: 'IPD' },
    { value: 'ER', label: 'Emergency' },
    { value: 'LAB', label: 'Lab' },
    { value: 'PHARMACY', label: 'Pharmacy' },
];
