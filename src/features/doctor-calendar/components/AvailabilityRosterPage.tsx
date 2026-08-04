import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, CalendarX, ChevronRight as ArrowRight, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAvailabilityRoster } from '../hooks/useCalendar';
import { MarkUnavailableModal } from './MarkUnavailableModal';
import { availabilityRosterApi, DoctorAvailabilityRosterItem } from '../api/availabilityRosterApi';

interface AvailabilityRosterPageProps {
  hospitalId: string;
  onSelectDoctor: (doctorId: string, doctorName?: string) => void;
}

const initialsFrom = (name?: string | null) => {
  const parts = (name || '').replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
};

// The staff landing screen: "who's available today" at a glance across every doctor at the
// hospital, before drilling into any one doctor's calendar. Answers the question staff actually
// have first, rather than making them pick a doctor blind. Unavailable doctors sort first —
// that's the signal staff are scanning for.
export const AvailabilityRosterPage: React.FC<AvailabilityRosterPageProps> = ({ hospitalId, onSelectDoctor }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [markUnavailableTarget, setMarkUnavailableTarget] = useState<DoctorAvailabilityRosterItem | null>(null);
  // Optimistic overlay for the "Online now" switch — cleared once a fresh roster fetch lands.
  const [onlineOverrides, setOnlineOverrides] = useState<Record<string, boolean>>({});
  const [savingOnlineIds, setSavingOnlineIds] = useState<Set<string>>(new Set());

  const dateIso = format(selectedDate, 'yyyy-MM-dd');
  const { data: doctors = [], isLoading, refetch } = useAvailabilityRoster(hospitalId, dateIso);

  const handleToggleOnline = async (doctor: DoctorAvailabilityRosterItem, next: boolean) => {
    setOnlineOverrides((prev) => ({ ...prev, [doctor.doctorId]: next }));
    setSavingOnlineIds((prev) => new Set(prev).add(doctor.doctorId));
    try {
      const response = await availabilityRosterApi.updateOnlineStatus(hospitalId, doctor.doctorId, next);
      if (!response.success) {
        setOnlineOverrides((prev) => ({ ...prev, [doctor.doctorId]: !next }));
        toast({
          variant: 'destructive',
          title: t('doctorCalendar.roster.onlineStatusSaveFailed', 'Could not save'),
          description: response.message ?? '',
        });
      } else {
        refetch();
      }
    } catch (e: any) {
      setOnlineOverrides((prev) => ({ ...prev, [doctor.doctorId]: !next }));
      toast({
        variant: 'destructive',
        title: t('doctorCalendar.roster.onlineStatusSaveFailed', 'Could not save'),
        description: e?.message ?? '',
      });
    } finally {
      setSavingOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(doctor.doctorId);
        return next;
      });
    }
  };

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateIso;

  const sortedDoctors = useMemo(
    () => [...doctors].sort((a, b) => Number(a.isAvailable) - Number(b.isAvailable) || (a.fullName || '').localeCompare(b.fullName || '')),
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedDoctors;
    return sortedDoctors.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(term) ||
        d.departmentName?.toLowerCase().includes(term)
    );
  }, [sortedDoctors, search]);

  const availableCount = doctors.filter((d) => d.isAvailable).length;
  const unavailableCount = doctors.length - availableCount;

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

      {/* Stat tiles */}
      {!isLoading && doctors.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#e6f4ea] flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-[#188038]" />
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white leading-none">{availableCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('doctorCalendar.roster.availableLabel', 'Available')}</p>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#fce8e6] flex items-center justify-center shrink-0">
              <UserX className="h-4 w-4 text-[#d93025]" />
            </span>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white leading-none">{unavailableCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('doctorCalendar.roster.unavailableLabel', 'Unavailable')}</p>
            </div>
          </div>
        </div>
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
                <span className="relative shrink-0">
                  <span className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {initialsFrom(doctor.fullName)}
                  </span>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${doctor.isAvailable ? 'bg-[#188038]' : 'bg-[#d93025]'}`}
                  />
                </span>

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
                  className={`hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    doctor.isAvailable
                      ? 'bg-[#e6f4ea] text-[#188038]'
                      : 'bg-[#fce8e6] text-[#a50e0e]'
                  }`}
                >
                  {doctor.isAvailable
                    ? t('doctorCalendar.roster.available', 'Available')
                    : t('doctorCalendar.roster.unavailable', 'Unavailable')}
                </span>

                <span className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-gray-500">{t('doctorCalendar.roster.online', 'Online')}</span>
                  <Switch
                    checked={onlineOverrides[doctor.doctorId] ?? doctor.isOnlineNow}
                    disabled={savingOnlineIds.has(doctor.doctorId)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => handleToggleOnline(doctor, checked)}
                    className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
                  />
                </span>

                {doctor.isAvailable && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMarkUnavailableTarget(doctor);
                    }}
                  >
                    <CalendarX className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('doctorCalendar.roster.markUnavailable', 'Mark unavailable')}</span>
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
