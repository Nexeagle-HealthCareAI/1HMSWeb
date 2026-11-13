// Vita "takes you there": the patient's trip to the clinic, shown on the reception board ("On the way · 12 min", "Running late ·
// 20 min"). 1HMS sends these fields only when the patient agreed to share them, and never a location.
import type { AppointmentDetail } from '../services/appointmentApi';

export type JourneyBadgeKind = 'on_the_way' | 'late' | 'arrived' | 'planned';

export interface JourneyBadgeInfo {
  kind: JourneyBadgeKind;
  /** Minutes until the ETA (on the way), how late (late), or the leave time "HH:mm" (planned). */
  minutes?: number;
  leaveAt?: string;
}

/** The board's own "done" states: no trip badge once the patient is in the system or the visit is over. */
const PAST_ARRIVAL = new Set(['UNDER_CONSULT', 'LAB_REQUIRED', 'AWAITING_RECONSULT', 'COMPLETED', 'CANCELLED']);
/** An ETA this far in the past is stale (the navigation stopped reporting). */
const STALE_MS = 30 * 60_000;

const utc = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);

export function journeyBadge(a: Pick<AppointmentDetail, 'finalStatusCode' | 'journeyStatus' | 'journeyEtaAt' | 'journeyLateByMinutes' | 'journeyPlannedLeaveAt'>,
  now: Date = new Date()): JourneyBadgeInfo | null {
  if (!a.journeyStatus || PAST_ARRIVAL.has(a.finalStatusCode)) return null;
  switch (a.journeyStatus) {
    case 'on_the_way': {
      if (!a.journeyEtaAt) return { kind: 'on_the_way' };
      const left = utc(a.journeyEtaAt).getTime() - now.getTime();
      if (left < -STALE_MS) return null;
      return { kind: 'on_the_way', minutes: Math.max(0, Math.ceil(left / 60_000)) };
    }
    case 'late':
      return { kind: 'late', minutes: a.journeyLateByMinutes ?? undefined };
    case 'arrived':
      return { kind: 'arrived' };
    case 'planned':
      return a.journeyPlannedLeaveAt ? { kind: 'planned', leaveAt: a.journeyPlannedLeaveAt.slice(11, 16) } : null;
    default:
      return null;
  }
}
