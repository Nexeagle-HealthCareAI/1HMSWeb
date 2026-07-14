import { AdmissionReferralItem, CaseType, ReferralStatus } from '../services/admissionReferralApi';
import { formatIstDayLabel, toIstDate } from './istDate';

export const STATUS_TONE: Record<ReferralStatus, string> = {
    PENDING: 'border-sky-200 bg-sky-50 text-sky-700',
    CONVERTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    NOT_ADMITTED: 'border-slate-200 bg-slate-100 text-slate-500',
    FOLLOW_UP: 'border-amber-200 bg-amber-50 text-amber-700',
};

export const STATUS_LABEL: Record<ReferralStatus, string> = {
    PENDING: 'Pending',
    CONVERTED: 'Converted',
    NOT_ADMITTED: 'Not Admitted',
    FOLLOW_UP: 'Follow-up',
};

// Fixed display order for KPI tiles / filter chips — mirrors IpdConstants.ReferralStatus.All's
// triage priority (open items first, terminal outcomes last).
export const ALL_STATUSES: ReferralStatus[] = ['PENDING', 'FOLLOW_UP', 'CONVERTED', 'NOT_ADMITTED'];

export const CASE_TONE: Record<CaseType, string> = {
    EMERGENCY: 'border-rose-200 bg-rose-50 text-rose-700',
    URGENT: 'border-amber-200 bg-amber-50 text-amber-700',
    PLANNED: 'border-slate-200 bg-slate-50 text-slate-600',
};

export const CASE_LABEL: Record<CaseType, string> = {
    EMERGENCY: 'Emergency',
    URGENT: 'Urgent',
    PLANNED: 'Planned',
};

export const ALL_CASE_TYPES: CaseType[] = ['EMERGENCY', 'URGENT', 'PLANNED'];

const formatDate = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    return formatIstDayLabel(d);
};

// "Advised for Admission: Pending" / "…: Not Admitted" / "…: Admitted on 12 Jul 2026"
export const admissionReferralStatusText = (referral: Pick<AdmissionReferralItem, 'statusCode' | 'admittedAt' | 'followUpDate'>): string => {
    switch (referral.statusCode) {
        case 'CONVERTED':
            return referral.admittedAt
                ? `Advised for Admission: Admitted on ${formatDate(referral.admittedAt)}`
                : 'Advised for Admission: Admitted';
        case 'NOT_ADMITTED':
            return 'Advised for Admission: Not Admitted';
        case 'FOLLOW_UP':
            return referral.followUpDate
                ? `Advised for Admission: Follow-up on ${formatDate(referral.followUpDate)}`
                : 'Advised for Admission: Follow-up';
        case 'PENDING':
        default:
            return 'Advised for Admission: Pending';
    }
};
