import { describe, expect, it } from 'vitest';
import { journeyBadge } from './journey';

const NOW = new Date('2026-10-26T03:00:00Z'); // 08:30 IST

describe('journeyBadge', () => {
  it('shows the minutes left on the way (the ETA is UTC without a zone)', () => {
    expect(journeyBadge({ finalStatusCode: 'PRE_APPOINTMENT', journeyStatus: 'on_the_way', journeyEtaAt: '2026-10-26T03:12:00' }, NOW))
      .toEqual({ kind: 'on_the_way', minutes: 12 });
  });
  it('says arriving when the ETA has just passed, and hides a stale one', () => {
    expect(journeyBadge({ finalStatusCode: 'SCHEDULED', journeyStatus: 'on_the_way', journeyEtaAt: '2026-10-26T02:50:00Z' }, NOW)?.minutes).toBe(0);
    expect(journeyBadge({ finalStatusCode: 'SCHEDULED', journeyStatus: 'on_the_way', journeyEtaAt: '2026-10-26T02:00:00Z' }, NOW)).toBeNull();
  });
  it('shows how late, the planned leave time, and arrival', () => {
    expect(journeyBadge({ finalStatusCode: 'PRE_APPOINTMENT', journeyStatus: 'late', journeyLateByMinutes: 20 }, NOW))
      .toEqual({ kind: 'late', minutes: 20 });
    expect(journeyBadge({ finalStatusCode: 'PRE_APPOINTMENT', journeyStatus: 'planned', journeyPlannedLeaveAt: '2026-10-26T08:30:00' }, NOW))
      .toEqual({ kind: 'planned', leaveAt: '08:30' });
    expect(journeyBadge({ finalStatusCode: 'SCHEDULED', journeyStatus: 'arrived' }, NOW)).toEqual({ kind: 'arrived' });
  });
  it('shows nothing once the patient is in consult or the visit is over, or with no shared trip', () => {
    expect(journeyBadge({ finalStatusCode: 'UNDER_CONSULT', journeyStatus: 'late', journeyLateByMinutes: 5 }, NOW)).toBeNull();
    expect(journeyBadge({ finalStatusCode: 'CANCELLED', journeyStatus: 'on_the_way' }, NOW)).toBeNull();
    expect(journeyBadge({ finalStatusCode: 'PRE_APPOINTMENT', journeyStatus: null }, NOW)).toBeNull();
  });
});
