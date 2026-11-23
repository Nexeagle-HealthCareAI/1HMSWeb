import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, User } from 'lucide-react';
import { appointmentApi, ApiDoctor, Department } from '../services/appointmentApi';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';

// F7: the "Department and doctor" part of the Book Appointment pop-up.
//  - a "Top doctors" chip first: today's most-booked doctors across all departments,
//  - department chips (the busiest few today) and a searchable list of every department,
//  - a doctor scroll box sorted A to Z with degree and specialisation under each name; the
//    most-booked doctor of the chosen department is pinned first with a "Most booked today" badge.
// No new API: doctors come from the existing department-doctor endpoint (one call per department,
// cached and shared with useDoctorsByDepartment) and booking counts from the existing
// appointment-details query for today.

export interface PickedDoctor {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  specialization: string;
  is_available: boolean;
}

interface BookingDoctorTileProps {
  hospitalId: string;
  departments: Department[];
  departmentId: string;
  onDepartmentChange: (departmentId: string) => void;
  doctorId: string;
  onPickDoctor: (doctor: PickedDoctor) => void;
}

interface TileDoctor extends ApiDoctor {
  departmentId: string;
  departmentName: string;
  booked: number;
}

const MAX_DEPT_CHIPS = 4;
const MAX_TOP_DOCTORS = 8;

export const BookingDoctorTile: React.FC<BookingDoctorTileProps> = ({
  hospitalId, departments, departmentId, onDepartmentChange, doctorId, onPickDoctor,
}) => {
  const { t } = useTranslation();
  const [topView, setTopView] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: apptData } = useAppointmentDetails('All', today, today, hospitalId, !!hospitalId);

  const doctorQueries = useQueries({
    queries: departments.map((d) => ({
      queryKey: ['doctorsByDepartment', d.departmentId, hospitalId],
      queryFn: () => appointmentApi.getDoctorsByDepartment(d.departmentId, hospitalId),
      enabled: !!hospitalId,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  // Booked today per doctor (cancelled bookings do not count).
  const bookedByDoctor = useMemo(() => {
    const map = new Map<string, number>();
    (apptData?.items ?? []).forEach((a: any) => {
      if (!a?.doctorId) return;
      if (String(a.finalStatusCode || '').toUpperCase().includes('CANCEL')) return;
      map.set(a.doctorId, (map.get(a.doctorId) ?? 0) + 1);
    });
    return map;
  }, [apptData]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, TileDoctor[]>();
    departments.forEach((d, i) => {
      const list = doctorQueries[i]?.data?.doctors ?? [];
      map.set(d.departmentId, list.map((dr) => ({
        ...dr,
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        booked: bookedByDoctor.get(dr.doctorId) ?? 0,
      })));
    });
    return map;
  }, [departments, doctorQueries.map((q) => q.dataUpdatedAt).join(','), bookedByDoctor]);

  const allDoctors = useMemo(() => Array.from(byDepartment.values()).flat(), [byDepartment]);

  const topDoctors = useMemo(() => allDoctors
    .filter((d) => d.booked > 0)
    .sort((a, b) => b.booked - a.booked || a.doctorName.localeCompare(b.doctorName))
    .slice(0, MAX_TOP_DOCTORS), [allDoctors]);

  const deptBookings = (id: string) => (byDepartment.get(id) ?? []).reduce((n, d) => n + d.booked, 0);

  // Busiest departments today (A to Z when nobody is booked yet); the chosen one always shows.
  const chipDepartments = useMemo(() => {
    const sorted = [...departments].sort((a, b) => deptBookings(b.departmentId) - deptBookings(a.departmentId) || a.departmentName.localeCompare(b.departmentName));
    const chips = sorted.slice(0, MAX_DEPT_CHIPS);
    const chosen = departments.find((d) => d.departmentId === departmentId);
    if (!topView && chosen && !chips.some((c) => c.departmentId === chosen.departmentId)) chips.push(chosen);
    return chips;
  }, [departments, byDepartment, departmentId, topView]);

  const searchedDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...departments]
      .filter((d) => !q || d.departmentName.toLowerCase().includes(q))
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
  }, [departments, query]);

  const chosenDepartment = departments.find((d) => d.departmentId === departmentId);
  const deptDoctors = byDepartment.get(departmentId) ?? [];
  const deptLoading = !topView && !!departmentId && (doctorQueries[departments.findIndex((d) => d.departmentId === departmentId)]?.isLoading ?? false);

  // A to Z, with the department's most-booked doctor pinned first.
  const listDoctors: TileDoctor[] = useMemo(() => {
    if (topView) return topDoctors;
    const sorted = [...deptDoctors].sort((a, b) => a.doctorName.localeCompare(b.doctorName));
    const top = sorted.reduce<TileDoctor | null>((best, d) => (d.booked > (best?.booked ?? 0) ? d : best), null);
    return top ? [top, ...sorted.filter((d) => d !== top)] : sorted;
  }, [topView, topDoctors, deptDoctors]);

  const pinnedId = !topView && listDoctors[0]?.booked > 0 ? listDoctors[0].doctorId : '';

  // The highlighted doctor always matches the top of the list: when the department (or Top doctors)
  // changes, and once on first load unless the user already picked someone, select the list's first
  // doctor. The pop-up also picks a default doctor when the department changes, so this keeps
  // re-checking (doctorId is a dependency) until the list's first doctor really is the selected one.
  const handledKey = useRef<string | null>(null);
  const userPicked = useRef(false);
  const listKey = topView ? 'top' : departmentId;
  useEffect(() => {
    if (listDoctors.length === 0 || deptLoading) return;
    if (handledKey.current === listKey) return;
    if (handledKey.current === null && userPicked.current) { handledKey.current = listKey; return; }
    if (listDoctors[0].doctorId === doctorId) { handledKey.current = listKey; return; }
    pick(listDoctors[0]);
  }, [listKey, listDoctors, deptLoading, doctorId]);

  const pick = (d: TileDoctor) => {
    onPickDoctor({
      id: d.doctorId,
      name: d.doctorName,
      department: d.departmentName,
      departmentId: d.departmentId,
      specialization: d.specializations?.length > 0 ? d.specializations.join(', ') : t('appointmentBooking.generalSpecialization', { defaultValue: 'General' }),
      is_available: true,
    });
  };

  const pickByUser = (d: TileDoctor) => { userPicked.current = true; pick(d); };

  const chooseDepartment = (id: string) => {
    setTopView(false);
    setListOpen(false);
    setQuery('');
    onDepartmentChange(id);
  };

  const chipBase = 'min-h-[40px] px-3 rounded-full border text-sm font-semibold transition-colors';
  const chipOn = 'bg-brand-600 border-brand-600 text-white';
  const chipOff = 'bg-white border-gray-300 text-foreground hover:border-brand-300 dark:bg-white/5 dark:border-white/10 dark:text-white';

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400 uppercase">
        {t('bookingPopup.departmentAndDoctor', { defaultValue: 'Department and doctor' })}
        <span className="ml-1 font-medium text-gray-400">({departments.length})</span>
      </h4>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('bookingPopup.department', { defaultValue: 'Department' })}>
        <button
          type="button"
          aria-pressed={topView}
          onClick={() => { setTopView(true); setListOpen(false); setQuery(''); }}
          className={`${chipBase} ${topView ? chipOn : 'bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100'}`}
        >
          ★ {t('bookingPopup.topDoctors', { defaultValue: 'Top doctors' })}
        </button>
        {chipDepartments.map((d) => {
          const on = !topView && d.departmentId === departmentId;
          return (
            <button key={d.departmentId} type="button" aria-pressed={on} onClick={() => chooseDepartment(d.departmentId)} className={`${chipBase} ${on ? chipOn : chipOff}`}>
              {d.departmentName}
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={listOpen}
          onClick={() => { setListOpen((o) => !o); setQuery(''); }}
          className={`${chipBase} border-dashed border-brand-300 bg-white text-brand-700 hover:bg-brand-50 dark:bg-transparent`}
        >
          {listOpen
            ? t('bookingPopup.closeList', { defaultValue: 'Close list' })
            : t('bookingPopup.allDepartments', { defaultValue: 'All {{count}} departments', count: departments.length })}
        </button>
      </div>

      {listOpen && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-2 flex flex-col gap-2 bg-white dark:bg-white/5">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('bookingPopup.searchDepartment', { defaultValue: 'Search department' })}
              aria-label={t('bookingPopup.searchDepartment', { defaultValue: 'Search department' })}
              className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 dark:border-white/10 bg-background text-sm"
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto grid grid-cols-1 gap-1.5 pr-1">
            {searchedDepartments.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-2">{t('bookingPopup.noDepartmentMatch', { defaultValue: 'No department matches.' })}</p>
            )}
            {searchedDepartments.map((d) => {
              const n = byDepartment.get(d.departmentId)?.length ?? 0;
              const on = !topView && d.departmentId === departmentId;
              return (
                <button
                  key={d.departmentId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseDepartment(d.departmentId)}
                  className={`min-h-[40px] px-2.5 rounded-lg border text-sm flex items-center justify-between gap-2 text-left ${on ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-gray-300 bg-white dark:bg-white/5 dark:border-white/10 hover:border-brand-300'}`}
                >
                  <span className="font-semibold">{d.departmentName}</span>
                  <span className="text-xs text-muted-foreground">
                    {n === 1
                      ? t('bookingPopup.doctorCountOne', { defaultValue: '1 doctor' })
                      : t('bookingPopup.doctorCount', { defaultValue: '{{count}} doctors', count: n })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <h4 className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400 uppercase mt-1">
        {t('bookingPopup.doctor', { defaultValue: 'Doctor' })}
        <span className="ml-1 font-medium text-gray-400">
          · {topView ? t('bookingPopup.topDoctorsAll', { defaultValue: 'Top doctors, all departments' }) : (chosenDepartment?.departmentName ?? '')}
        </span>
      </h4>

      <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2" role="group" aria-label={t('bookingPopup.doctor', { defaultValue: 'Doctor' })}>
        {deptLoading ? (
          <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 animate-pulse">
            {t('appointmentBooking.loadingDoctors', { defaultValue: 'Loading doctors…' })}
          </div>
        ) : listDoctors.length === 0 ? (
          <div className="p-3 rounded-xl border border-dashed border-gray-300 text-center text-xs text-muted-foreground">
            {topView
              ? t('bookingPopup.noTopDoctors', { defaultValue: 'No bookings yet today. Pick a department.' })
              : t('bookingPopup.noDoctors', { defaultValue: 'No doctors available in this department.' })}
          </div>
        ) : (
          listDoctors.map((d) => {
            const selected = d.doctorId === doctorId;
            const degree = d.qualifications?.length > 0 ? d.qualifications.join(', ') : '';
            const spec = d.specializations?.length > 0 ? d.specializations.join(', ') : t('appointmentBooking.generalSpecialization', { defaultValue: 'General' });
            return (
              <button
                key={`${d.departmentId}-${d.doctorId}`}
                type="button"
                aria-pressed={selected}
                onClick={() => pickByUser(d)}
                className={`w-full min-h-[56px] p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all shrink-0 ${selected
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-600'
                  : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 hover:border-brand-300 hover:bg-brand-50/30'}`}
              >
                <span className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-500" aria-hidden="true">
                  <User className="h-6 w-6" />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground dark:text-white">{d.doctorName}</span>
                    {(d.doctorId === pinnedId || (topView && d.booked > 0 && d === topDoctors[0])) && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 text-[11px] font-bold">
                        {t('bookingPopup.mostBooked', { defaultValue: 'Most booked today' })}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {degree ? `${degree} · ${spec}` : spec}
                    {topView ? ` · ${d.departmentName}` : ''}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
