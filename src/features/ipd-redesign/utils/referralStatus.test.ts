import { describe, expect, it } from 'vitest';
import { probableDateNote } from './referralStatus';

// 25 Nov 2026, 10:00 IST
const NOW = new Date('2026-11-25T04:30:00Z');

describe('probableDateNote', () => {
    it('is empty when there is no usable date', () => {
        expect(probableDateNote(null, NOW)).toBeNull();
        expect(probableDateNote('not a date', NOW)).toBeNull();
    });
    it('marks today, tomorrow and later', () => {
        expect(probableDateNote('2026-11-25T09:00:00Z', NOW)).toEqual({ text: 'Today', tone: 'today' });
        expect(probableDateNote('2026-11-26T09:00:00Z', NOW)).toEqual({ text: 'Tomorrow', tone: 'soon' });
        expect(probableDateNote('2026-11-30T09:00:00Z', NOW)).toEqual({ text: 'In 5 days', tone: 'later' });
    });
    it('marks a passed date as overdue', () => {
        expect(probableDateNote('2026-11-24T09:00:00Z', NOW)).toEqual({ text: '1 day overdue', tone: 'overdue' });
        expect(probableDateNote('2026-11-20T09:00:00Z', NOW)).toEqual({ text: '5 days overdue', tone: 'overdue' });
    });
    it('goes by the calendar day in India, not by 24-hour blocks', () => {
        // 24 Nov 20:00 UTC is already 25 Nov in India.
        expect(probableDateNote('2026-11-24T20:00:00Z', NOW)!.text).toBe('Today');
    });
});
