// Pure helpers behind the patient workspace Overview: which vitals to highlight, what is due now,
// investigation status, today's fluid balance and discharge readiness. No React, no network —
// unit-tested in workspaceOverview.test.ts. Highlights are visual cues only, not clinical advice.
import type { VitalReadingItem } from '../services/vitalsApi';
import type { MarLineItem } from '../services/marApi';
import type { ClinicalOrderItem } from '../services/clinicalOrderApi';
import type { FluidDayTotal } from '../services/fluidEntryApi';
import type { DischargeSummaryDraft } from '../services/dischargeSummaryApi';
import { toIstDate } from './istDate';

export type Level = 'ok' | 'warn' | 'high';

export interface VitalTile { key: string; label: string; value: string; unit: string; level: Level; note: string }

const toCelsius = (t: number, unit?: string | null) => ((unit ?? '').toUpperCase().startsWith('F') || t > 60 ? (t - 32) * 5 / 9 : t);

/** Tiles for the most recent reading. Thresholds are simple adult ranges used only to colour a tile. */
export const vitalTiles = (r: VitalReadingItem | null | undefined): VitalTile[] => {
    if (!r) return [];
    const tiles: VitalTile[] = [];
    if (r.systolicBP != null && r.diastolicBP != null) {
        const s = r.systolicBP;
        const level: Level = s < 90 || s >= 180 ? 'high' : s < 100 || s >= 160 ? 'warn' : 'ok';
        tiles.push({ key: 'bp', label: 'BP', value: `${s}/${r.diastolicBP}`, unit: 'mmHg', level, note: s < 100 ? 'Low' : s >= 160 ? 'High' : 'Normal' });
    }
    if (r.pulse != null) {
        const p = r.pulse;
        const level: Level = p < 45 || p > 130 ? 'high' : p < 50 || p > 100 ? 'warn' : 'ok';
        tiles.push({ key: 'pulse', label: 'Pulse', value: String(p), unit: '/min', level, note: p > 100 ? 'Fast' : p < 50 ? 'Slow' : 'Normal' });
    }
    if (r.spO2 != null) {
        const o = r.spO2;
        const level: Level = o < 90 ? 'high' : o < 94 ? 'warn' : 'ok';
        tiles.push({ key: 'spo2', label: 'SpO₂', value: String(o), unit: '%', level, note: o < 94 ? 'Low' : 'Normal' });
    }
    if (r.temperature != null) {
        const c = toCelsius(r.temperature, r.temperatureUnit);
        const level: Level = c >= 39 || c < 35 ? 'high' : c >= 38 || c < 36 ? 'warn' : 'ok';
        const isF = (r.temperatureUnit ?? '').toUpperCase().startsWith('F') || r.temperature > 60;
        tiles.push({ key: 'temp', label: 'Temp', value: String(r.temperature), unit: isF ? '°F' : '°C', level, note: c >= 38 ? 'Fever' : c < 36 ? 'Low' : 'Normal' });
    }
    if (r.respiratoryRate != null) {
        const rr = r.respiratoryRate;
        const level: Level = rr < 10 || rr > 24 ? 'high' : rr > 20 ? 'warn' : 'ok';
        tiles.push({ key: 'rr', label: 'Resp. rate', value: String(rr), unit: '/min', level, note: rr > 20 ? 'Fast' : rr < 10 ? 'Slow' : 'Normal' });
    }
    if (r.painScore != null) {
        const level: Level = r.painScore >= 7 ? 'warn' : 'ok';
        tiles.push({ key: 'pain', label: 'Pain', value: String(r.painScore), unit: '/10', level, note: r.painScore >= 7 ? 'Severe' : r.painScore >= 4 ? 'Moderate' : 'Mild' });
    }
    if (r.gcsTotal != null && r.gcsTotal < 15) {
        tiles.push({ key: 'gcs', label: 'GCS', value: String(r.gcsTotal), unit: '/15', level: r.gcsTotal <= 8 ? 'high' : 'warn', note: 'Reduced' });
    }
    return tiles;
};

export const latestReading = (readings: VitalReadingItem[]): VitalReadingItem | null =>
    readings.length === 0 ? null : [...readings].sort((a, b) => toIstDate(b.recordedAt).getTime() - toIstDate(a.recordedAt).getTime())[0];

/** "1 h 20 min ago", "5 min ago", "2 days ago". */
export const timeAgo = (iso: string, now: Date = new Date()): string => {
    const mins = Math.max(0, Math.round((now.getTime() - toIstDate(iso).getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return mins % 60 ? `${h} h ${mins % 60} min ago` : `${h} h ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ago`;
};

export interface DueItem { key: string; at: string; name: string; detail: string; state: 'overdue' | 'due' | 'soon'; isHighAlert: boolean; lateMinutes: number }

/** Medicine doses that need attention now: overdue and due slots, plus doses coming up in the next 2 hours. */
export const dueNow = (lines: MarLineItem[], now: Date = new Date(), soonMinutes = 120): DueItem[] => {
    const items: DueItem[] = [];
    lines.filter(l => l.orderLineStatusCode === 'ACTIVE').forEach(l => {
        l.slots.forEach(s => {
            const at = toIstDate(s.scheduledForUtc);
            const diff = Math.round((now.getTime() - at.getTime()) / 60000);
            let state: DueItem['state'] | null = null;
            if (s.status === 'OVERDUE') state = 'overdue';
            else if (s.status === 'DUE') state = 'due';
            else if (s.status === 'PENDING' && diff < 0 && -diff <= soonMinutes) state = 'soon';
            if (!state) return;
            items.push({
                key: `${l.orderLineId}-${s.scheduledForUtc}`,
                at: s.scheduledForUtc,
                name: l.itemName || 'Medicine',
                detail: [l.dose, l.route, l.frequency].filter(Boolean).join(' · '),
                state,
                isHighAlert: l.isHighAlert,
                lateMinutes: Math.max(0, diff),
            });
        });
    });
    const rank = { overdue: 0, due: 1, soon: 2 } as const;
    return items.sort((a, b) => rank[a.state] - rank[b.state] || toIstDate(a.at).getTime() - toIstDate(b.at).getTime());
};

export const countDue = (items: DueItem[]) => items.filter(i => i.state !== 'soon').length;

export interface InvestigationRow { key: string; name: string; kind: 'Lab' | 'Imaging'; status: string; tone: 'ok' | 'wait' | 'info'; orderedAt: string; urgent: boolean }

const LAB_STATUS: Record<string, { status: string; tone: InvestigationRow['tone'] }> = {
    APPROVED: { status: 'Report ready', tone: 'ok' },
    TECH_SIGNED: { status: 'Awaiting approval', tone: 'wait' },
    DRAFT: { status: 'In lab', tone: 'wait' },
};

/** Lab and imaging orders of this stay with a plain status, newest first. */
export const investigationRows = (labOrders: ClinicalOrderItem[], radiologyOrders: ClinicalOrderItem[]): InvestigationRow[] => {
    const rows: InvestigationRow[] = [];
    const add = (orders: ClinicalOrderItem[], kind: InvestigationRow['kind']) => orders.forEach(o => o.lines
        .filter(l => l.statusCode === 'ACTIVE')
        .forEach(l => {
            const s = kind === 'Lab' && l.linkedPathologyReportStatus ? LAB_STATUS[l.linkedPathologyReportStatus] : undefined;
            rows.push({
                key: l.orderLineId, name: l.itemName || kind, kind,
                status: s?.status ?? 'Ordered', tone: s?.tone ?? 'info',
                orderedAt: o.orderedAt, urgent: l.urgency === 'STAT' || l.urgency === 'URGENT',
            });
        }));
    add(labOrders, 'Lab');
    add(radiologyOrders, 'Imaging');
    return rows.sort((a, b) => toIstDate(b.orderedAt).getTime() - toIstDate(a.orderedAt).getTime());
};

export const countPendingInvestigations = (rows: InvestigationRow[]) => rows.filter(r => r.tone !== 'ok').length;

export const fluidForDay = (totals: FluidDayTotal[], dayKey: string): FluidDayTotal | null => totals.find(t => t.dayKey === dayKey) ?? null;

/** Day of stay, counting the admission day as day 1. */
export const dayOfStay = (admittedAt: string, now: Date = new Date()): number =>
    Math.max(1, Math.floor((now.getTime() - toIstDate(admittedAt).getTime()) / 86400000) + 1);

export interface ReadinessItem { label: string; done: boolean }

export const dischargeReadiness = (draft: DischargeSummaryDraft | null | undefined, statusCode: string): ReadinessItem[] => {
    const started = !!draft?.dischargeSummaryId;
    const billed = statusCode === 'DISCHARGE_BILLED' || statusCode === 'DISCHARGED';
    return [
        { label: 'Discharge summary started', done: started },
        { label: 'Final diagnosis written', done: started && !!draft?.finalDiagnosis?.trim() },
        { label: 'Discharge medicines listed', done: started && (draft?.medications?.length ?? 0) > 0 },
        { label: 'Summary signed', done: !!draft?.isSigned },
        { label: 'Final bill done', done: billed },
    ];
};

export type DischargeStage = 0 | 1 | 2 | 3;
export const DISCHARGE_STAGE_LABELS = ['Admitted', 'Discharge started', 'Bill settled', 'Discharged'] as const;

/** Where an admission is on the way out, from its status code. */
export const dischargeStage = (statusCode: string): DischargeStage =>
    statusCode === 'DISCHARGED' || statusCode === 'LAMA' ? 3 : statusCode === 'DISCHARGE_BILLED' ? 2 : statusCode === 'DISCHARGE_INITIATED' ? 1 : 0;
