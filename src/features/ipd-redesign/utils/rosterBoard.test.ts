import { describe, expect, it } from 'vitest';
import type { ActiveAdmissionItem } from '../services/admissionApi';
import type { BedBoardItem } from '../services/bedBoardApi';
import {
    NO_WARD, bedCounts, bedState, expectedDischarge, filterOptions, filterRoster, groupByWard, matchesQuick,
    occupancyPercent, rosterTiles, rowAction, statusLabel, stayDay, type RosterFilters,
} from './rosterBoard';

// 25 Nov 2026, 10:00 IST
const NOW = new Date('2026-11-25T04:30:00Z');

const adm = (over: Partial<ActiveAdmissionItem>): ActiveAdmissionItem => ({
    admissionId: 'a', admissionNo: 'ADM-1', statusCode: 'ADMITTED', payerType: 'CASH',
    admittedAt: '2026-11-25T03:00:00', bedCode: 'GW-01', wardName: 'General Ward', ...over,
});

const NONE: RosterFilters = { search: '', quick: 'ALL', ward: 'ALL', doctor: 'ALL', payer: 'ALL', dateMode: 'ALL', rangeFrom: '', rangeTo: '' };

describe('stayDay', () => {
    it('counts the admission day as day 1', () => {
        expect(stayDay(adm({}), NOW)).toBe(1);
    });
    it('counts by IST calendar date, not by 24-hour blocks', () => {
        // 22 Nov 23:30 IST = 22 Nov 18:00 UTC → 22, 23, 24, 25 = day 4
        expect(stayDay(adm({ admittedAt: '2026-11-22T18:00:00' }), NOW)).toBe(4);
    });
    it('treats a late-evening UTC time as the next IST day', () => {
        // 24 Nov 19:00 UTC = 25 Nov 00:30 IST → day 1
        expect(stayDay(adm({ admittedAt: '2026-11-24T19:00:00' }), NOW)).toBe(1);
    });
});

describe('expectedDischarge', () => {
    it('is empty when no date is set', () => {
        expect(expectedDischarge(adm({}), NOW).tone).toBe('none');
    });
    it('flags today, tomorrow and later', () => {
        expect(expectedDischarge(adm({ expectedDischargeAt: '2026-11-25T08:00:00' }), NOW)).toMatchObject({ tone: 'today', note: 'Today' });
        expect(expectedDischarge(adm({ expectedDischargeAt: '2026-11-26T08:00:00' }), NOW)).toMatchObject({ tone: 'soon', note: 'Tomorrow' });
        expect(expectedDischarge(adm({ expectedDischargeAt: '2026-11-28T08:00:00' }), NOW)).toMatchObject({ tone: 'later', note: 'In 3 days' });
    });
    it('flags a passed date while the patient is still in', () => {
        expect(expectedDischarge(adm({ expectedDischargeAt: '2026-11-23T08:00:00' }), NOW)).toMatchObject({ tone: 'overdue', note: '2 days over' });
        expect(expectedDischarge(adm({ expectedDischargeAt: '2026-11-24T08:00:00' }), NOW).note).toBe('1 day over');
    });
    it('never flags a discharged or pre-admit patient', () => {
        expect(expectedDischarge(adm({ statusCode: 'DISCHARGED', expectedDischargeAt: '2026-11-23T08:00:00' }), NOW).tone).toBe('later');
        expect(expectedDischarge(adm({ statusCode: 'PRE_ADMIT', expectedDischargeAt: '2026-11-23T08:00:00' }), NOW).tone).toBe('later');
    });
});

describe('roster tiles and quick filters', () => {
    const list = [
        adm({ admissionId: '1' }),
        adm({ admissionId: '2', bedCode: null, wardName: null, admittedAt: '2026-11-23T03:00:00' }),
        adm({ admissionId: '3', statusCode: 'PRE_ADMIT', bedCode: null, wardName: null }),
        adm({ admissionId: '4', statusCode: 'DISCHARGE_INITIATED', payerType: 'INSURANCE', admittedAt: '2026-11-20T03:00:00', expectedDischargeAt: '2026-11-25T08:00:00' }),
        adm({ admissionId: '5', statusCode: 'DISCHARGE_BILLED', payerType: 'TPA', admittedAt: '2026-11-20T03:00:00', expectedDischargeAt: '2026-11-24T08:00:00' }),
    ];
    const value = (key: string) => rosterTiles(list, NOW).find(t => t.key === key)!.value;

    it('counts each tile over the active census', () => {
        expect(value('ALL')).toBe(4);                    // pre-admit is not in hospital yet
        expect(value('ADMITTED_TODAY')).toBe(1);
        expect(value('AWAITING_ARRIVAL')).toBe(1);
        expect(value('NO_BED')).toBe(1);                 // a pre-admit without a bed is not "no bed yet"
        expect(value('DUE_TODAY')).toBe(1);
        expect(value('OVERDUE')).toBe(1);
        expect(value('DISCHARGE_IN_PROGRESS')).toBe(2);
        expect(value('NON_CASH')).toBe(2);
    });
    it('a tile count always equals the rows its filter shows', () => {
        for (const t of rosterTiles(list, NOW).filter(t => t.key !== 'ALL')) {
            expect(list.filter(a => matchesQuick(a, t.key, NOW)).length).toBe(t.value);
        }
    });
});

describe('filterRoster', () => {
    const list = [
        adm({ admissionId: '1', patientName: 'Rajesh Kumar', primaryDoctorName: 'Dr. Rao', bedCode: 'ICU-04', wardName: 'ICU' }),
        adm({ admissionId: '2', patientName: 'Anita Deshpande', primaryDoctorName: 'Dr. Kulkarni', payerType: 'INSURANCE', admittedAt: '2026-11-22T03:00:00' }),
        adm({ admissionId: '3', patientName: 'Sunita Rani', bedCode: null, wardName: null, mobile: '9820011223' }),
    ];
    const ids = (f: Partial<RosterFilters>) => filterRoster(list, { ...NONE, ...f }, NOW).map(a => a.admissionId);

    it('returns everything with no filters', () => expect(ids({})).toEqual(['1', '2', '3']));
    it('searches name, bed, doctor and mobile', () => {
        expect(ids({ search: 'anita' })).toEqual(['2']);
        expect(ids({ search: 'icu-04' })).toEqual(['1']);
        expect(ids({ search: 'kulkarni' })).toEqual(['2']);
        expect(ids({ search: '98200' })).toEqual(['3']);
    });
    it('filters by ward, including patients with no bed', () => {
        expect(ids({ ward: 'ICU' })).toEqual(['1']);
        expect(ids({ ward: NO_WARD })).toEqual(['3']);
    });
    it('filters by consultant and payer', () => {
        expect(ids({ doctor: 'Dr. Rao' })).toEqual(['1']);
        expect(ids({ payer: 'INSURANCE' })).toEqual(['2']);
    });
    it('filters by admission date', () => {
        expect(ids({ dateMode: 'TODAY' })).toEqual(['1', '3']);
        expect(ids({ dateMode: 'RANGE', rangeFrom: '2026-11-20', rangeTo: '2026-11-23' })).toEqual(['2']);
    });
    it('combines filters', () => {
        expect(ids({ dateMode: 'TODAY', quick: 'NO_BED' })).toEqual(['3']);
    });
    it('lists filter options with the no-bed group last', () => {
        const o = filterOptions(list);
        expect(o.wards).toEqual(['General Ward', 'ICU', NO_WARD]);
        expect(o.doctors).toEqual(['Dr. Kulkarni', 'Dr. Rao']);
        expect(o.payers).toEqual(['CASH', 'INSURANCE']);
    });
});

describe('groupByWard', () => {
    it('groups rows, sorts beds naturally and puts patients without a bed last', () => {
        const groups = groupByWard([
            adm({ admissionId: '1', bedCode: null, wardName: null }),
            adm({ admissionId: '2', bedCode: 'GW-10' }),
            adm({ admissionId: '3', bedCode: 'GW-2' }),
            adm({ admissionId: '4', bedCode: 'ICU-01', wardName: 'ICU' }),
        ]);
        expect(groups.map(g => g.ward)).toEqual(['General Ward', 'ICU', NO_WARD]);
        expect(groups[0].rows.map(r => r.bedCode)).toEqual(['GW-2', 'GW-10']);
    });
});

describe('rowAction', () => {
    it('offers the next step for each stage', () => {
        expect(rowAction(adm({ statusCode: 'PRE_ADMIT' })).kind).toBe('CONFIRM_ARRIVAL');
        expect(rowAction(adm({})).kind).toBe('OPEN');
        expect(rowAction(adm({ bedCode: null })).kind).toBe('ASSIGN_BED');
        expect(rowAction(adm({ statusCode: 'DISCHARGE_INITIATED' })).label).toBe('Continue discharge');
        expect(rowAction(adm({ statusCode: 'DISCHARGE_BILLED' })).label).toBe('Finish discharge');
        expect(rowAction(adm({ statusCode: 'DISCHARGED' })).kind).toBe('PRINT_DISCHARGE');
        expect(rowAction(adm({ statusCode: 'CANCELLED' })).kind).toBe('VIEW');
    });
    it('labels statuses in plain words', () => {
        expect(statusLabel('PRE_ADMIT')).toBe('Awaiting arrival');
        expect(statusLabel('SOMETHING_NEW')).toBe('Something new');
    });
});

describe('bed board', () => {
    const bed = (over: Partial<BedBoardItem>): BedBoardItem => ({ bedId: 'b', isActive: true, effectiveDailyRate: 1000, sortOrder: 1, ...over });
    const beds = [
        bed({ bedId: '1', admissionId: 'a1', statusCode: 'OCCUPIED' }),
        bed({ bedId: '2', statusCode: 'AVAILABLE' }),
        bed({ bedId: '3', statusCode: 'CLEANING' }),
        bed({ bedId: '4', statusCode: 'RESERVED' }),
        bed({ bedId: '5', statusCode: 'BLOCKED' }),
        bed({ bedId: '6', statusCode: null }),
        bed({ bedId: '7', admissionId: 'a2', statusCode: 'AVAILABLE' }),
        bed({ bedId: '8', statusCode: 'OCCUPIED' }),
    ];
    it('an occupant always wins over the stored status', () => {
        expect(bedState(beds[6])).toBe('OCCUPIED');
    });
    it('a bed marked occupied is never shown as free, even without an occupant on record', () => {
        expect(bedState(beds[7])).toBe('OCCUPIED');
    });
    it('counts every bed exactly once', () => {
        const c = bedCounts(beds);
        expect(c).toEqual({ OCCUPIED: 3, AVAILABLE: 2, CLEANING: 1, RESERVED: 1, BLOCKED: 1 });
        expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(beds.length);
    });
    it('works out occupancy', () => {
        expect(occupancyPercent(beds)).toBe(38);
        expect(occupancyPercent([])).toBe(0);
    });
});
