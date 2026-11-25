import type { ActiveAdmissionItem } from '../services/admissionApi';
import type { BedBoardItem } from '../services/bedBoardApi';
import { istDateKey, toIstDate } from './istDate';

/**
 * Pure rules behind the IPD roster and bed board: the at-a-glance tiles, the filters, ward
 * grouping, and the one action a row offers for its stage. Kept free of React so they can be
 * tested directly.
 */

export const NO_WARD = 'No bed yet';

export const admittedDayKey = (a: ActiveAdmissionItem): string => istDateKey(toIstDate(a.admittedAt));
export const todayKey = (now: Date = new Date()): string => istDateKey(now);

const DAY_MS = 86400000;
const daysBetweenKeys = (fromKey: string, toKey: string): number =>
    Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);

/** Day of stay counted by calendar date in IST — the admission day is Day 1. */
export const stayDay = (a: ActiveAdmissionItem, now: Date = new Date()): number =>
    Math.max(1, daysBetweenKeys(admittedDayKey(a), todayKey(now)) + 1);

export const isInHouse = (a: ActiveAdmissionItem): boolean =>
    a.statusCode === 'ADMITTED' || a.statusCode === 'DISCHARGE_INITIATED' || a.statusCode === 'DISCHARGE_BILLED';

export type ExpectedTone = 'none' | 'overdue' | 'today' | 'soon' | 'later';
export interface ExpectedDischarge { tone: ExpectedTone; dateKey: string | null; note: string }

/** When the patient is expected to leave, relative to today. Only meaningful while in house. */
export const expectedDischarge = (a: ActiveAdmissionItem, now: Date = new Date()): ExpectedDischarge => {
    if (!a.expectedDischargeAt) return { tone: 'none', dateKey: null, note: '' };
    const d = toIstDate(a.expectedDischargeAt);
    if (isNaN(d.getTime())) return { tone: 'none', dateKey: null, note: '' };
    const dateKey = istDateKey(d);
    if (!isInHouse(a)) return { tone: 'later', dateKey, note: '' };
    const diff = daysBetweenKeys(todayKey(now), dateKey);
    if (diff < 0) return { tone: 'overdue', dateKey, note: `${-diff} day${diff === -1 ? '' : 's'} over` };
    if (diff === 0) return { tone: 'today', dateKey, note: 'Today' };
    if (diff === 1) return { tone: 'soon', dateKey, note: 'Tomorrow' };
    return { tone: 'later', dateKey, note: `In ${diff} days` };
};

export type QuickFilter = 'ALL' | 'NO_BED' | 'AWAITING_ARRIVAL' | 'ADMITTED_TODAY' | 'DUE_TODAY' | 'OVERDUE' | 'DISCHARGE_IN_PROGRESS' | 'NON_CASH';

export const matchesQuick = (a: ActiveAdmissionItem, quick: QuickFilter, now: Date = new Date()): boolean => {
    switch (quick) {
        case 'NO_BED': return !a.bedCode && a.statusCode !== 'PRE_ADMIT';
        case 'AWAITING_ARRIVAL': return a.statusCode === 'PRE_ADMIT';
        case 'ADMITTED_TODAY': return a.statusCode !== 'PRE_ADMIT' && admittedDayKey(a) === todayKey(now);
        case 'DUE_TODAY': return expectedDischarge(a, now).tone === 'today';
        case 'OVERDUE': return expectedDischarge(a, now).tone === 'overdue';
        case 'DISCHARGE_IN_PROGRESS': return a.statusCode === 'DISCHARGE_INITIATED' || a.statusCode === 'DISCHARGE_BILLED';
        case 'NON_CASH': return a.payerType !== 'CASH';
        default: return true;
    }
};

export interface RosterTile { key: QuickFilter; label: string; value: number; tone: 'brand' | 'amber' | 'sky' | 'emerald' | 'rose' | 'slate' }

/** The eight tiles above the roster — always counted over the current (not yet discharged) census. */
export const rosterTiles = (active: ActiveAdmissionItem[], now: Date = new Date()): RosterTile[] => {
    const count = (q: QuickFilter) => active.filter(a => matchesQuick(a, q, now)).length;
    return [
        { key: 'ALL', label: 'In hospital', value: active.filter(a => a.statusCode !== 'PRE_ADMIT').length, tone: 'brand' },
        { key: 'ADMITTED_TODAY', label: 'Admitted today', value: count('ADMITTED_TODAY'), tone: 'emerald' },
        { key: 'AWAITING_ARRIVAL', label: 'Awaiting arrival', value: count('AWAITING_ARRIVAL'), tone: 'sky' },
        { key: 'NO_BED', label: 'No bed yet', value: count('NO_BED'), tone: 'amber' },
        { key: 'DUE_TODAY', label: 'Due out today', value: count('DUE_TODAY'), tone: 'brand' },
        { key: 'OVERDUE', label: 'Past expected date', value: count('OVERDUE'), tone: 'rose' },
        { key: 'DISCHARGE_IN_PROGRESS', label: 'Discharge in progress', value: count('DISCHARGE_IN_PROGRESS'), tone: 'amber' },
        { key: 'NON_CASH', label: 'Insurance / panel', value: count('NON_CASH'), tone: 'slate' },
    ];
};

export interface RosterFilters {
    search: string;
    quick: QuickFilter;
    ward: string;       // 'ALL' or a ward name (NO_WARD for unassigned)
    doctor: string;     // 'ALL' or a doctor name
    payer: string;      // 'ALL' or a payer type
    dateMode: 'TODAY' | 'ALL' | 'RANGE';
    rangeFrom: string;
    rangeTo: string;
}

export const wardOf = (a: ActiveAdmissionItem): string => (a.bedCode ? (a.wardName || 'Other') : NO_WARD);

export const filterRoster = (list: ActiveAdmissionItem[], f: RosterFilters, now: Date = new Date()): ActiveAdmissionItem[] => {
    const q = f.search.trim().toLowerCase();
    const today = todayKey(now);
    return list.filter(a => {
        const key = admittedDayKey(a);
        if (f.dateMode === 'TODAY' && key !== today) return false;
        if (f.dateMode === 'RANGE') {
            if (f.rangeFrom && key < f.rangeFrom) return false;
            if (f.rangeTo && key > f.rangeTo) return false;
        }
        if (!matchesQuick(a, f.quick, now)) return false;
        if (f.ward !== 'ALL' && wardOf(a) !== f.ward) return false;
        if (f.doctor !== 'ALL' && (a.primaryDoctorName || '') !== f.doctor) return false;
        if (f.payer !== 'ALL' && a.payerType !== f.payer) return false;
        if (!q) return true;
        return (a.patientName ?? '').toLowerCase().includes(q)
            || (a.patientId ?? '').toLowerCase().includes(q)
            || a.admissionNo.toLowerCase().includes(q)
            || (a.bedCode ?? '').toLowerCase().includes(q)
            || (a.primaryDoctorName ?? '').toLowerCase().includes(q)
            || (a.mobile ?? '').includes(q);
    });
};

/** Distinct, sorted values for the filter dropdowns. */
export const filterOptions = (list: ActiveAdmissionItem[]) => {
    const uniq = (values: (string | null | undefined)[]) =>
        Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));
    const wards = uniq(list.map(wardOf)).filter(w => w !== NO_WARD);
    if (list.some(a => wardOf(a) === NO_WARD)) wards.push(NO_WARD);
    return { wards, doctors: uniq(list.map(a => a.primaryDoctorName)), payers: uniq(list.map(a => a.payerType)) };
};

export interface WardGroup { ward: string; rows: ActiveAdmissionItem[] }

/** Rows grouped by ward (in first-seen order, with the no-bed group last), sorted by bed inside a ward. */
export const groupByWard = (rows: ActiveAdmissionItem[]): WardGroup[] => {
    const map = new Map<string, ActiveAdmissionItem[]>();
    for (const r of rows) {
        const w = wardOf(r);
        if (!map.has(w)) map.set(w, []);
        map.get(w)!.push(r);
    }
    const groups = Array.from(map.entries()).map(([ward, list]) => ({
        ward,
        rows: [...list].sort((a, b) => (a.bedCode ?? '').localeCompare(b.bedCode ?? '', undefined, { numeric: true })),
    }));
    return groups.sort((a, b) => (a.ward === NO_WARD ? 1 : 0) - (b.ward === NO_WARD ? 1 : 0));
};

export type RowActionKind = 'CONFIRM_ARRIVAL' | 'ASSIGN_BED' | 'OPEN' | 'CONTINUE_DISCHARGE' | 'PRINT_DISCHARGE' | 'VIEW';
export interface RowAction { kind: RowActionKind; label: string }

/** The single next step a row offers; everything else sits in the row's "more" menu. */
export const rowAction = (a: ActiveAdmissionItem): RowAction => {
    switch (a.statusCode) {
        case 'PRE_ADMIT': return { kind: 'CONFIRM_ARRIVAL', label: 'Confirm arrival' };
        case 'ADMITTED': return a.bedCode ? { kind: 'OPEN', label: 'Open' } : { kind: 'ASSIGN_BED', label: 'Assign bed' };
        case 'DISCHARGE_INITIATED': return { kind: 'CONTINUE_DISCHARGE', label: 'Continue discharge' };
        case 'DISCHARGE_BILLED': return { kind: 'CONTINUE_DISCHARGE', label: 'Finish discharge' };
        case 'DISCHARGED': return { kind: 'PRINT_DISCHARGE', label: 'Print summary' };
        default: return { kind: 'VIEW', label: 'View' };
    }
};

export const STATUS_LABEL: Record<string, string> = {
    PRE_ADMIT: 'Awaiting arrival',
    ADMITTED: 'Admitted',
    DISCHARGE_INITIATED: 'Discharge started',
    DISCHARGE_BILLED: 'Bill settled',
    DISCHARGED: 'Discharged',
    LAMA: 'Left against advice',
    CANCELLED: 'Cancelled',
};
export const statusLabel = (code: string): string =>
    STATUS_LABEL[code] ?? code.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase());

const PAYER_LABEL: Record<string, string> = { CASH: 'Cash', INSURANCE: 'Insurance', TPA: 'TPA', CORPORATE: 'Corporate' };
export const payerLabel = (type: string): string => PAYER_LABEL[type] ?? type;
export const titleCase = (s?: string | null): string =>
    (s ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

// ── Bed board ──────────────────────────────────────────────────────────────────────────────

export type BedState = 'OCCUPIED' | 'AVAILABLE' | 'CLEANING' | 'RESERVED' | 'BLOCKED';
export const BED_STATES: BedState[] = ['OCCUPIED', 'AVAILABLE', 'CLEANING', 'RESERVED', 'BLOCKED'];
export const BED_STATE_LABEL: Record<BedState, string> = {
    OCCUPIED: 'Occupied', AVAILABLE: 'Available', CLEANING: 'Cleaning', RESERVED: 'Reserved', BLOCKED: 'Blocked',
};

export const bedState = (b: BedBoardItem): BedState => {
    if (b.admissionId) return 'OCCUPIED';
    const s = (b.statusCode ?? 'AVAILABLE').toUpperCase();
    return (BED_STATES as string[]).includes(s) ? (s as BedState) : 'AVAILABLE';
};

export const bedCounts = (beds: BedBoardItem[]): Record<BedState, number> => {
    const counts: Record<BedState, number> = { OCCUPIED: 0, AVAILABLE: 0, CLEANING: 0, RESERVED: 0, BLOCKED: 0 };
    for (const b of beds) counts[bedState(b)] += 1;
    return counts;
};

export const occupancyPercent = (beds: BedBoardItem[]): number =>
    beds.length === 0 ? 0 : Math.round((bedCounts(beds).OCCUPIED / beds.length) * 100);
