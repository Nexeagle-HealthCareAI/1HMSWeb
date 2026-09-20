import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Globe, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// A number that visibly *changes*: the old value rolls up and out, the new one springs in, and a
// floating "+N" appears for a couple of seconds when it went up -- so someone glancing at the board
// can tell a count just moved, not merely what it currently is.
export const AnimatedCount: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const reduceMotion = useReducedMotion();
  const previous = useRef(value);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (value > previous.current) {
      setDelta(value - previous.current);
      previous.current = value;
      const timer = window.setTimeout(() => setDelta(0), 2600);
      return () => window.clearTimeout(timer);
    }
    previous.current = value;
  }, [value]);

  return (
    <span className="relative inline-flex items-baseline">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className={className}
          initial={reduceMotion ? false : { y: 18, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: -18, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {delta > 0 && (
          <motion.span
            key="delta"
            className="absolute -right-7 -top-2 text-xs font-extrabold text-emerald-500"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -14 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
          >
            +{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

// An expanding ring that fires once each time `token` changes (i.e. each time a new online booking
// lands). Renders nothing until the first one, and nothing at all with reduced motion.
export const PulseRing: React.FC<{ token: number; className?: string }> = ({ token, className }) => {
  const reduceMotion = useReducedMotion();
  if (token === 0 || reduceMotion) return null;
  return (
    <motion.span
      key={token}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-sky-400', className)}
      initial={{ opacity: 0.85, scale: 1 }}
      animate={{ opacity: 0, scale: 1.14 }}
      transition={{ duration: 1.1, ease: 'easeOut', repeat: 2 }}
    />
  );
};

// "NEW" tag that springs in, bobs gently while it's up, and is unmounted by the caller once the
// booking is no longer fresh.
export const NewPill: React.FC<{ visible: boolean; label: string; className?: string }> = ({ visible, label, className }) => {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          className={cn(
            'inline-flex items-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow',
            className
          )}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -2, 0] }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18, y: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' } }}
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

interface LiveOnlineChipProps {
  count: number;
  pulseToken: number;
  hasFresh: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  className?: string;
}

// Compact, always-visible online-booking counter for the board's "Live" strip. The KPI cards are
// desktop-only (`hidden md:grid`), so this is what phone/tablet users see -- and it doubles as the
// mute toggle for the alert chime.
export const LiveOnlineChip: React.FC<LiveOnlineChipProps> = ({ count, pulseToken, hasFresh, soundOn, onToggleSound, className }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
        hasFresh
          ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/50 dark:bg-sky-500/15 dark:text-sky-200'
          : 'border-slate-200 bg-white text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300',
        className
      )}
    >
      <PulseRing token={pulseToken} />
      <motion.span
        key={pulseToken}
        className="inline-flex"
        initial={{ rotate: 0, scale: 1 }}
        animate={pulseToken > 0 && !reduceMotion ? { rotate: [0, -18, 16, -10, 0], scale: [1, 1.25, 1] } : { rotate: 0, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        <Globe className={cn('h-3.5 w-3.5', hasFresh ? 'text-sky-500' : 'text-slate-400')} />
      </motion.span>
      <span>{t('appointmentDashboard.onlineLive.chipLabel', { defaultValue: 'Online bookings' })}</span>
      <AnimatedCount value={count} className="font-mono text-sm font-black tabular-nums" />
      <NewPill visible={hasFresh} label={t('appointmentDashboard.onlineLive.new', { defaultValue: 'NEW' })} />
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundOn}
        title={soundOn
          ? t('appointmentDashboard.onlineLive.soundOn', { defaultValue: 'Sound alerts on — click to mute' })
          : t('appointmentDashboard.onlineLive.soundOff', { defaultValue: 'Sound alerts off — click to unmute' })}
        aria-label={soundOn
          ? t('appointmentDashboard.onlineLive.soundOn', { defaultValue: 'Sound alerts on — click to mute' })
          : t('appointmentDashboard.onlineLive.soundOff', { defaultValue: 'Sound alerts off — click to unmute' })}
        className="ml-0.5 rounded-full p-0.5 text-slate-400 transition hover:text-sky-600 dark:hover:text-sky-300"
      >
        {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};
