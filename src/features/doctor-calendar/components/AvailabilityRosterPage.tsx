import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, CalendarX, ChevronRight as ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAvailabilityRoster } from '../hooks/useCalendar';
import { MarkUnavailableModal } from './MarkUnavailableModal';
import { DoctorAvailabilityRosterItem } from '../api/availabilityRosterApi';

interface AvailabilityRosterPageProps {
  hospitalId: string;
  onSelectDoctor: (doctorId: string, doctorName?: string) => void;
}

// The staff landing screen: "who's available today" at a glance across every doctor at the
// hospital, before drilling into any one doctor's calendar. Answers the question staff actually
// have first, rather than making them pick a doctor blind.
export const AvailabilityRosterPage: React.FC<AvailabilityRosterPageProps> = ({ hospitalId, onSelectDoctor }) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [markUnavailableTarget, setMarkUnavailableTarget] = useState<DoctorAvailabilityRosterItem | null>(null);

  const dateIso = format(selectedDate, 'yyyy-MM-dd');
  const { data: doctors = [], isLoading, refetch } = useAvailabilityRoster(hospitalId, dateIso);

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateIso;

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(term) ||
        d.departmentName?.toLowerCase().includes(term)
    );
  }, [doctors, search]);

  const availableCount = doctors.filter((d) => d.isAvailable).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 font-medium text-sm">
                {isToday ? t('doctorCalendar.roster.today', 'Today') : format(selectedDate, 'EEEE, MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday && (
            <Button variant="outline" size="sm" className="h-8 ml-1" onClick={() => setSelectedDate(new Date())}>
              {t('doctorCalendar.today', 'Today')}
            </Button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('doctorCalendar.roster.search', 'Search doctors…')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {!isLoading && doctors.length > 0 && (
        <p className="text-xs text-gray-500 px-1">
          {t('doctorCalendar.roster.summary', '{{available}} of {{total}} doctors available', {
            available: availableCount,
            total: doctors.length,
          })}
        </p>
      )}

      {/* Roster list */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">
            {t('doctorCalendar.roster.empty', 'No doctors found.')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.doctorId}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                onClick={() => onSelectDoctor(doctor.doctorId, doctor.fullName || undefined)}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${doctor.isAvailable ? 'bg-[#188038]' : 'bg-[#d93025]'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {doctor.fullName || t('doctorCalendar.doctorFallback')}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {doctor.departmentName}
                    {!doctor.isAvailable && doctor.reason ? ` · ${doctor.reason}` : ''}
                  </p>
                </div>

                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    doctor.isAvailable
                      ? 'bg-[#e6f4ea] text-[#188038]'
                      : 'bg-[#fce8e6] text-[#a50e0e]'
                  }`}
                >
                  {doctor.isAvailable
                    ? t('doctorCalendar.roster.available', 'Available')
                    : t('doctorCalendar.roster.unavailable', 'Unavailable')}
                </span>

                {doctor.isAvailable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMarkUnavailableTarget(doctor);
                    }}
                  >
                    <CalendarX className="h-3 w-3 mr-1" />
                    {t('doctorCalendar.roster.markUnavailable', 'Mark unavailable')}
                  </Button>
                )}

                <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>

      <MarkUnavailableModal
        open={!!markUnavailableTarget}
        onOpenChange={(open) => !open && setMarkUnavailableTarget(null)}
        doctorId={markUnavailableTarget?.doctorId}
        doctorName={markUnavailableTarget?.fullName || undefined}
        hospitalId={hospitalId}
        onCreated={() => refetch()}
      />
    </div>
  );
};
