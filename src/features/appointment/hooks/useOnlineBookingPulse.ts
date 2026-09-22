import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentApi, type RecentOnlineBooking } from '../services/appointmentApi';
import {
  playOnlineBookingChime,
  readOnlineBookingSoundPreference,
  writeOnlineBookingSoundPreference,
} from '../utils/onlineBookingChime';

const POLL_MS = 8000;
// How long a just-arrived booking keeps its "new" highlight on the board rows/cards.
const FRESH_MS = 60_000;
const MAX_ALERTS = 5;
const MAX_REMEMBERED_IDS = 200;

export interface OnlineBookingAlert {
  id: string;
  booking: RecentOnlineBooking;
  receivedAt: number;
}

interface Options {
  hospitalId: string;
  enabled?: boolean;
  /** Fired once per batch of genuinely new bookings -- the board uses it to refetch its list. */
  onNewBookings?: (bookings: RecentOnlineBooking[]) => void;
}

// Near-live detection of online (Doctor Dekho / NexEagle) bookings for the appointment board.
//
// Polls GET /appointments/online-bookings/recent every few seconds with the server's own clock as
// a cursor. The first response is only a baseline (nothing that already existed is announced);
// after that anything new raises an alert, highlights the booking, plays the chime and lets the
// board refetch. React Query pauses the interval while the tab is hidden and refetches on
// refocus, so a receptionist returning to the tab still sees what they missed (server-capped).
export const useOnlineBookingPulse = ({ hospitalId, enabled = true, onNewBookings }: Options) => {
  const cursorRef = useRef<string | undefined>(undefined);
  const seenRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);
  const onNewRef = useRef(onNewBookings);
  onNewRef.current = onNewBookings;

  const [alerts, setAlerts] = useState<OnlineBookingAlert[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  // Bumps on every batch -- consumers key one-shot animations (ring pulse, bounce) off it.
  const [pulseToken, setPulseToken] = useState(0);
  const [soundOn, setSoundOn] = useState<boolean>(readOnlineBookingSoundPreference);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  // A different hospital is a different stream: start again from a fresh baseline.
  useEffect(() => {
    cursorRef.current = undefined;
    seenRef.current = new Set();
    setAlerts([]);
    setFreshIds(new Set());
  }, [hospitalId]);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const { data } = useQuery({
    queryKey: ['onlineBookingPulse', hospitalId],
    queryFn: () => appointmentApi.getRecentOnlineBookings(hospitalId, cursorRef.current),
    enabled: enabled && !!hospitalId,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    const isBaseline = cursorRef.current === undefined;
    cursorRef.current = data.serverTime;

    if (isBaseline) {
      data.items.forEach((item) => seenRef.current.add(item.appointmentId));
      return;
    }

    // The server deliberately re-reads a short window before the cursor (so a row that commits a
    // moment late isn't lost), which means the same booking can be returned twice -- announce once.
    const fresh = data.items.filter((item) => !seenRef.current.has(item.appointmentId));
    if (fresh.length === 0) return;
    fresh.forEach((item) => seenRef.current.add(item.appointmentId));
    if (seenRef.current.size > MAX_REMEMBERED_IDS) {
      seenRef.current = new Set(Array.from(seenRef.current).slice(-MAX_REMEMBERED_IDS));
    }

    const receivedAt = Date.now();
    // Server returns newest first, which is the order the alert stack wants (newest on top).
    setAlerts((prev) => [...fresh.map((booking) => ({ id: booking.appointmentId, booking, receivedAt })), ...prev].slice(0, MAX_ALERTS));
    setFreshIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((item) => next.add(item.appointmentId));
      return next;
    });
    setPulseToken((n) => n + 1);
    if (soundOnRef.current) playOnlineBookingChime();
    onNewRef.current?.(fresh);

    timersRef.current.push(
      window.setTimeout(() => {
        setFreshIds((prev) => {
          const next = new Set(prev);
          fresh.forEach((item) => next.delete(item.appointmentId));
          return next;
        });
      }, FRESH_MS)
    );
  }, [data]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    writeOnlineBookingSoundPreference(next);
    setSoundOn(next);
    // Confirm the choice audibly when turning it ON so people know it works.
    if (next) playOnlineBookingChime();
  }, []);

  return { alerts, dismissAlert, freshIds, pulseToken, soundOn, toggleSound };
};
