import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar } from '@/components/ui/calendar';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { DoctorSwitcher } from './DoctorSwitcher';
import { HospitalDoctorItem } from '../api/doctorListApi';

interface CalendarSidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  showDoctorSwitcher: boolean;
  doctors: HospitalDoctorItem[];
  selectedDoctorId?: string;
  onSelectDoctor: (doctor: HospitalDoctorItem) => void;
  doctorsLoading?: boolean;
}

// Matches the flat event-chip palette in DoctorCalendarPage.tsx's calendar CSS.
const LEGEND_ITEMS = [
  { key: 'shift', dotClass: 'bg-[#1a73e8]', labelKey: 'doctorCalendar.legend.defaultShifts', fallback: 'Regular shift' },
  { key: 'override', dotClass: 'bg-[#188038]', labelKey: 'doctorCalendar.legend.personalizedShifts', fallback: 'Custom override' },
  { key: 'timeoff', dotClass: 'bg-[#d93025]', labelKey: 'doctorCalendar.legend.unavailable', fallback: 'Time off / unavailable' },
] as const;

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  currentDate,
  onDateChange,
  showDoctorSwitcher,
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  doctorsLoading,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {showDoctorSwitcher && (
        <div className="rounded-lg p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
            {t('doctorCalendar.switcher.label', 'Managing availability for')}
          </p>
          <DoctorSwitcher
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onSelect={onSelectDoctor}
            isLoading={doctorsLoading}
          />
        </div>
      )}

      <div className="rounded-lg p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => date && onDateChange(date)}
          className="border-none"
        />
      </div>

      <div className="rounded-lg p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
          {t('doctorCalendar.legend.title', 'Legend')}
        </p>
        <div className="flex flex-col gap-2.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dotClass}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(item.labelKey, item.fallback)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
