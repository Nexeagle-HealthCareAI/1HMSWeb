import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Globe, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { OnlineBookingAlert } from '../hooks/useOnlineBookingPulse';

const ALERT_LIFETIME_S = 12;

interface Props {
  alerts: OnlineBookingAlert[];
  onDismiss: (id: string) => void;
  /** "View" -- the board jumps to the right tab and clears filters so the booking is visible. */
  onView: (alert: OnlineBookingAlert) => void;
}

// Slide-in cards, one per new online booking, stacked top-right. Each one shows who booked with
// whom and when, counts itself down and dismisses itself, and is unmistakably different from the
// app's ordinary toasts (sky gradient, ringing globe) so front desk knows it's an online booking.
export const OnlineBookingAlerts: React.FC<Props> = ({ alerts, onDismiss, onView }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  // Day label + clock time for the appointment ("Today, 4:30 PM" / "Tomorrow, 10:00 AM" / "Mon 22 Sep, 9:15 AM").
  const describeSlot = (startAt: string, apptDate: string): string => {
    const start = new Date(startAt || apptDate);
    if (Number.isNaN(start.getTime())) return '';
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((day - today) / 86_400_000);
    const dayLabel =
      diffDays === 0 ? t('appointmentDashboard.onlineLive.today', { defaultValue: 'Today' })
      : diffDays === 1 ? t('appointmentDashboard.onlineLive.tomorrow', { defaultValue: 'Tomorrow' })
      : start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dayLabel}, ${time}`;
  };

  return (
    <div className="pointer-events-none fixed right-3 top-20 z-[110] flex w-[min(92vw,22rem)] flex-col gap-2.5 sm:right-5">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => {
          const { booking } = alert;
          const slot = describeSlot(booking.startAt, booking.apptDate);
          return (
            <motion.div
              key={alert.id}
              layout={!reduceMotion}
              role="status"
              aria-live="polite"
              className="pointer-events-auto relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-xl shadow-sky-500/20 dark:border-sky-500/40 dark:from-sky-950 dark:via-zinc-900 dark:to-cyan-950"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <div className="flex gap-3 p-3.5">
                <div className="relative mt-0.5 h-10 w-10 shrink-0">
                  {!reduceMotion && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-sky-400/50"
                      animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-md">
                    <Globe className="h-5 w-5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-sky-300">
                    {t('appointmentDashboard.onlineLive.newBooking', { defaultValue: 'New online appointment' })}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {booking.patientName || t('appointmentDashboard.onlineLive.aPatient', { defaultValue: 'A patient' })}
                  </p>
                  {booking.doctorName && (
                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                      {t('appointmentDashboard.onlineLive.withDoctor', { defaultValue: 'with {{doctor}}', doctor: booking.doctorName })}
                    </p>
                  )}
                  {slot && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                      <CalendarClock className="h-3 w-3" />
                      {slot}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onView(alert);
                        onDismiss(alert.id);
                      }}
                      className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-sky-600 active:scale-95"
                    >
                      {t('appointmentDashboard.onlineLive.view', { defaultValue: 'View' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismiss(alert.id)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
                    >
                      {t('appointmentDashboard.onlineLive.dismiss', { defaultValue: 'Dismiss' })}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDismiss(alert.id)}
                  aria-label={t('appointmentDashboard.onlineLive.dismiss', { defaultValue: 'Dismiss' })}
                  className="-mr-1 -mt-1 h-6 w-6 shrink-0 self-start rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Countdown to auto-dismiss */}
              <motion.div
                aria-hidden
                className="h-1 origin-left bg-sky-400/70"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: ALERT_LIFETIME_S, ease: 'linear' }}
                onAnimationComplete={() => onDismiss(alert.id)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
