import { useTranslation } from 'react-i18next';
import { Car, Clock, CheckCircle2, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AppointmentDetail } from '../services/appointmentApi';
import { journeyBadge } from '../utils/journey';

/** "On the way · 12 min" / "Running late · 20 min" / "Arrived" / "Leaves 08:30": the patient's trip, from Vita on Doctor Dekho. */
export function JourneyBadge({ appointment }: { appointment: AppointmentDetail }) {
  const { t } = useTranslation();
  const info = journeyBadge(appointment);
  if (!info) return null;
  const base = 'text-[10px] px-1.5 py-0.5 font-semibold gap-1 inline-flex items-center whitespace-nowrap';
  const title = t('appointmentDashboard.journey.title', { defaultValue: "Shared by the patient from Doctor Dekho (time only, not their location)" });
  switch (info.kind) {
    case 'on_the_way':
      return (
        <Badge title={title} className={`${base} bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50`}>
          <Navigation className="h-3 w-3" aria-hidden="true" />
          {info.minutes == null
            ? t('appointmentDashboard.journey.onTheWay', { defaultValue: 'On the way' })
            : info.minutes === 0
              ? t('appointmentDashboard.journey.arriving', { defaultValue: 'Arriving now' })
              : t('appointmentDashboard.journey.onTheWayMin', { defaultValue: 'On the way · {{m}} min', m: info.minutes })}
        </Badge>
      );
    case 'late':
      return (
        <Badge title={title} className={`${base} bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50`}>
          <Clock className="h-3 w-3" aria-hidden="true" />
          {info.minutes
            ? t('appointmentDashboard.journey.lateMin', { defaultValue: 'Running late · {{m}} min', m: info.minutes })
            : t('appointmentDashboard.journey.late', { defaultValue: 'Running late' })}
        </Badge>
      );
    case 'arrived':
      return (
        <Badge title={title} className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50`}>
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {t('appointmentDashboard.journey.arrived', { defaultValue: 'Says arrived' })}
        </Badge>
      );
    case 'planned':
      return (
        <Badge title={title} className={`${base} bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800/50 dark:text-slate-300 dark:border-zinc-700`}>
          <Car className="h-3 w-3" aria-hidden="true" />
          {t('appointmentDashboard.journey.leaves', { defaultValue: 'Leaves {{time}}', time: info.leaveAt })}
        </Badge>
      );
  }
}
