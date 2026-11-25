import { describe, expect, it } from 'vitest';
import {
    countDue, countPendingInvestigations, dayOfStay, dischargeReadiness, dischargeStage, dueNow, fluidForDay,
    investigationRows, latestReading, timeAgo, vitalTiles,
} from './workspaceOverview';

const now = new Date('2026-11-25T08:30:00Z'); // 14:00 IST

describe('vitals', () => {
    it('picks the newest reading and colours out-of-range values', () => {
        const latest = latestReading([
            { vitalReadingId: 'a', recordedAt: '2026-11-25T03:00:00' },
            { vitalReadingId: 'b', recordedAt: '2026-11-25T07:10:00', systolicBP: 132, diastolicBP: 84, pulse: 104, spO2: 89, temperature: 38.1, respiratoryRate: 22, painScore: 2 },
        ] as any);
        expect(latest?.vitalReadingId).toBe('b');
        const t = Object.fromEntries(vitalTiles(latest).map(x => [x.key, x.level]));
        expect(t).toEqual({ bp: 'ok', pulse: 'warn', spo2: 'high', temp: 'warn', rr: 'warn', pain: 'ok' });
    });
    it('understands Fahrenheit', () => {
        const [temp] = vitalTiles({ vitalReadingId: 'x', recordedAt: now.toISOString(), temperature: 98.6, temperatureUnit: 'F' } as any);
        expect(temp.level).toBe('ok');
        expect(temp.unit).toBe('°F');
    });
    it('no reading, no tiles', () => expect(vitalTiles(null)).toEqual([]));
    it('time ago', () => {
        expect(timeAgo('2026-11-25T07:10:00', now)).toBe('1 h 20 min ago');
        expect(timeAgo('2026-11-25T08:25:00Z', now)).toBe('5 min ago');
        expect(timeAgo('2026-11-23T08:30:00Z', now)).toBe('2 days ago');
    });
});

describe('due now', () => {
    const line = (name: string, slots: any[], extra: any = {}) => ({ orderLineId: name, orderId: 'o', itemName: name, dose: '1 g', route: 'IV', frequency: 'BD', isHighAlert: false, orderLineStatusCode: 'ACTIVE', isAdHocOnly: false, slots, ...extra });
    it('orders overdue, then due, then coming up; skips given, far-off and stopped medicines', () => {
        const items = dueNow([
            line('Soon', [{ scheduledForUtc: '2026-11-25T09:30:00Z', status: 'PENDING', witnessRequired: false }]),
            line('Later', [{ scheduledForUtc: '2026-11-25T14:30:00Z', status: 'PENDING', witnessRequired: false }]),
            line('Due', [{ scheduledForUtc: '2026-11-25T08:30:00Z', status: 'DUE', witnessRequired: false }]),
            line('Late', [{ scheduledForUtc: '2026-11-25T08:00:00Z', status: 'OVERDUE', witnessRequired: false }]),
            line('Given', [{ scheduledForUtc: '2026-11-25T08:00:00Z', status: 'ADMINISTERED', witnessRequired: false }]),
            line('Stopped', [{ scheduledForUtc: '2026-11-25T08:00:00Z', status: 'OVERDUE', witnessRequired: false }], { orderLineStatusCode: 'DISCONTINUED' }),
        ] as any, now);
        expect(items.map(i => i.name)).toEqual(['Late', 'Due', 'Soon']);
        expect(items[0].lateMinutes).toBe(30);
        expect(countDue(items)).toBe(2);
    });
});

describe('investigations', () => {
    it('gives each active test a plain status, newest first', () => {
        const rows = investigationRows(
            [{ orderId: '1', statusCode: 'ACTIVE', orderedAt: '2026-11-25T04:00:00Z', lines: [
                { orderLineId: 'a', itemName: 'CBC', statusCode: 'ACTIVE', linkedPathologyReportStatus: 'DRAFT' },
                { orderLineId: 'b', itemName: 'Troponin', statusCode: 'ACTIVE', linkedPathologyReportStatus: 'APPROVED' },
                { orderLineId: 'c', itemName: 'Cancelled', statusCode: 'DISCONTINUED' },
            ] }] as any,
            [{ orderId: '2', statusCode: 'ACTIVE', orderedAt: '2026-11-25T06:00:00Z', lines: [{ orderLineId: 'x', itemName: 'Chest X-ray', statusCode: 'ACTIVE', urgency: 'STAT' }] }] as any,
        );
        expect(rows.map(r => `${r.name}:${r.status}`)).toEqual(['Chest X-ray:Ordered', 'CBC:In lab', 'Troponin:Report ready']);
        expect(rows[0].urgent).toBe(true);
        expect(countPendingInvestigations(rows)).toBe(2);
    });
});

describe('stay and discharge', () => {
    it('day of stay counts admission day as day 1', () => {
        expect(dayOfStay('2026-11-25T02:00:00Z', now)).toBe(1);
        expect(dayOfStay('2026-11-22T08:50:00Z', now)).toBe(3);
        expect(dayOfStay('2026-11-22T08:00:00Z', now)).toBe(4);
    });
    it('fluid totals for a day', () => {
        expect(fluidForDay([{ dayKey: '2026-11-25', totalInMl: 1450, totalOutMl: 1100, balanceMl: 350 }], '2026-11-25')?.balanceMl).toBe(350);
        expect(fluidForDay([], '2026-11-25')).toBeNull();
    });
    it('readiness follows the saved summary and status', () => {
        expect(dischargeReadiness(null, 'ADMITTED').every(i => !i.done)).toBe(true);
        const items = dischargeReadiness({ dischargeSummaryId: 's', isSigned: true, finalDiagnosis: 'MI', medications: [{ medicineName: 'Aspirin' }] }, 'DISCHARGE_BILLED');
        expect(items.every(i => i.done)).toBe(true);
        // a fresh, never-saved draft is not "started" even though it has composed medicines
        expect(dischargeReadiness({ isSigned: false, medications: [{ medicineName: 'Aspirin' }] }, 'ADMITTED').some(i => i.done)).toBe(false);
    });
    it('stage from status', () => {
        expect(['ADMITTED', 'DISCHARGE_INITIATED', 'DISCHARGE_BILLED', 'DISCHARGED', 'PRE_ADMIT'].map(dischargeStage)).toEqual([0, 1, 2, 3, 0]);
    });
});
