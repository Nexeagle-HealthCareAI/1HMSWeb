import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { CalendarEvent, DoctorCalendarConfigResponse } from '../api/types';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, endOfDay } from 'date-fns';

interface ShiftDetailsCardProps {
  events?: CalendarEvent[];
  calendarConfig?: DoctorCalendarConfigResponse;
  isLoading?: boolean;
  isTimeOffWarningClosed?: boolean;
  onCloseTimeOffWarning?: () => void;
  currentDate?: Date;
  currentView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
}

export const ShiftDetailsCard: React.FC<ShiftDetailsCardProps> = ({
  events = [],
  calendarConfig,
  isLoading = false,
  isTimeOffWarningClosed = false,
  onCloseTimeOffWarning,
  currentDate,
  currentView
}) => {
  const { t } = useTranslation();
  const OVERRIDE_SHIFT_COLOR = '#6366f1';

  const isDayView = currentView === 'timeGridDay' && Boolean(currentDate);

  const visibleEvents = React.useMemo(() => {
    if (!isDayView || !currentDate) return events;
    const dayStart = startOfDay(currentDate);
    const dayEnd = endOfDay(currentDate);

    return events.filter(event => {
      if (!event.start) return false;
      const eventStart = new Date(event.start);
      return eventStart >= dayStart && eventStart <= dayEnd;
    });
  }, [events, isDayView, currentDate]);

  const extractSlotMinutes = React.useCallback((event: CalendarEvent): number | null => {
    const extended = event.extendedProps || {};
    const slotLike = extended.slotMinutes ?? extended.slotDurationInMinutes ?? extended.slotDuration ?? extended.slotLengthMinutes;

    if (slotLike == null) return null;
    if (typeof slotLike === 'number') return slotLike;
    if (typeof slotLike === 'string') {
      if (slotLike.includes(':')) {
        const [hoursStr, minutesStr] = slotLike.split(':');
        const hours = Number(hoursStr) || 0;
        const minutes = Number(minutesStr) || 0;
        return hours * 60 + minutes;
      }
      const parsed = parseInt(slotLike, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }, []);

  // Extract unique shifts from visible events
  const uniqueShifts = React.useMemo(() => {
    const shifts = new Map<
      string,
      {
        displayName: string;
        dataSource: 'Default' | 'Override';
        color: string;
        instances: Array<{
          groupKey: string;
          timeRange: string;
          slotMinutes: number | null;
          maxPatients?: number | null;
          dayLabels: Set<string>;
        }>;
      }
    >();

    visibleEvents.forEach(event => {
      if (event.type === 'shift') {
        const shiftName =
          event.extendedProps?.shiftName || t('doctorCalendar.shiftDetails.untitledShift');
        const startDate = event.start ? new Date(event.start) : null;
        const endDate = event.end ? new Date(event.end) : startDate;
        const deriveTime = (fallbackDate: Date | null, explicit?: string) => {
          if (explicit) return explicit;
          if (!fallbackDate) return '';
          try {
            return format(fallbackDate, 'HH:mm');
          } catch (error) {
            console.warn('Failed to format shift time', { fallbackDate, eventId: event.id, error });
            return '';
          }
        };
        const startTime = deriveTime(startDate, event.extendedProps?.startTime);
        const endTime = deriveTime(endDate, event.extendedProps?.endTime);
        const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : t('doctorCalendar.shiftDetails.customTiming');
        const slotMinutes = extractSlotMinutes(event);
        const maxPatients = event.extendedProps?.maxPatients ?? event.extendedProps?.patientLimit;
        const dayLabel = startDate ? format(startDate, 'EEE') : null;
        const dataSource = event.extendedProps?.dataSource === 'Override' ? 'Override' : 'Default';
        const shiftKey = `${shiftName}-${dataSource}`;
        const isOverrideShift = dataSource === 'Override';

        if (!shifts.has(shiftKey)) {
          let shiftColor = event.backgroundColor || '#6b7280';
          if (isOverrideShift) {
            shiftColor = OVERRIDE_SHIFT_COLOR;
          } else if (shiftName === t('doctorCalendar.shifts.morning')) {
            shiftColor = '#10b981';
          } else if (shiftName === t('doctorCalendar.shifts.afternoon')) {
            shiftColor = '#f59e0b';
          } else if (shiftName === t('doctorCalendar.shifts.evening')) {
            shiftColor = '#f97316';
          }

          shifts.set(shiftKey, {
            displayName: shiftName,
            dataSource,
            color: shiftColor,
            instances: []
          });
        }

        const shift = shifts.get(shiftKey)!;
        const groupKey = `${timeRange}-${slotMinutes ?? 'custom'}-${maxPatients ?? 'unlimited'}`;
        let instanceEntry = shift.instances.find(instance => instance.groupKey === groupKey);

        if (!instanceEntry) {
          instanceEntry = {
            groupKey,
            timeRange,
            slotMinutes,
            maxPatients,
            dayLabels: new Set<string>()
          };
          shift.instances.push(instanceEntry);
        }

        if (dayLabel) {
          instanceEntry.dayLabels.add(dayLabel);
        }
      }
    });

    return Array.from(shifts.values()).map(data => ({
      name: data.displayName,
      color: data.color,
      dataSource: data.dataSource,
      instances: data.instances.map(instance => ({
        timeRange: instance.timeRange,
        slotMinutes: instance.slotMinutes,
        maxPatients: instance.maxPatients,
        dayLabels: Array.from(instance.dayLabels)
      }))
    }));
  }, [visibleEvents, extractSlotMinutes, t]);

  // Check for time-off events
  const timeOffEvents = React.useMemo(() => {
    return events.filter(event =>
      event.type === 'timeoff' ||
      event.id?.startsWith('timeoff-') ||
      event.extendedProps?.type === 'timeoff'
    );
  }, [events]);

  const formatTimeOffRange = React.useCallback(
    (start: Date | null, end: Date | null) => {
      if (!start) {
        return t('doctorCalendar.shiftDetails.timeOffUnknown');
      }
      const endDate = end ?? start;
      const sameDay = start.toDateString() === endDate.toDateString();
      if (sameDay) {
        return format(start, 'EEE, MMM d');
      }
      return `${format(start, 'MMM d')} - ${format(endDate, 'MMM d')}`;
    },
    [t]
  );

  const timeOffSummaries = React.useMemo(() => {
    return timeOffEvents.map((event, idx) => {
      const start = event.start ? new Date(event.start) : null;
      // FullCalendar allDay end is exclusive (+1 day was added in useCalendar.ts),
      // so subtract 1 day to get the real inclusive end date for display
      let end = event.end ? new Date(event.end) : null;
      if (end && event.allDay) {
        end = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      }
      const reason = event.extendedProps?.reason || event.title || t('doctorCalendar.shiftDetails.timeOff');
      return {
        id: event.id ?? `timeoff-${idx}`,
        range: formatTimeOffRange(start, end),
        reason
      };
    });
  }, [timeOffEvents, formatTimeOffRange, t]);

  // Check if there are time-off conflicts with shifts
  const hasTimeOffConflicts = React.useMemo(() => {
    if (timeOffEvents.length === 0) return false;

    // Check if any time-off events overlap with shift events
    return events.some(event => {
      if (event.type !== 'shift') return false;

      const shiftStart = new Date(event.start);
      const shiftEnd = new Date(event.end);

      return timeOffEvents.some(timeOffEvent => {
        const timeOffStart = new Date(timeOffEvent.start);
        const timeOffEnd = new Date(timeOffEvent.end);

        // Check for overlap - only consider it a conflict if the time-off completely overlaps or significantly overlaps with the shift
        const overlapStart = Math.max(shiftStart.getTime(), timeOffStart.getTime());
        const overlapEnd = Math.min(shiftEnd.getTime(), timeOffEnd.getTime());
        const overlapDuration = overlapEnd - overlapStart;
        const shiftDuration = shiftEnd.getTime() - shiftStart.getTime();

        // Only mark as conflict if overlap is more than 50% of the shift duration
        return overlapDuration > 0 && (overlapDuration / shiftDuration) > 0.5;
      });
    });
  }, [events, timeOffEvents]);



  return (
    <Card className="h-fit bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 lg:max-w-xs">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Info className="h-4 w-4 text-brand-600" />
          {t('doctorCalendar.shiftDetails.shiftOverview')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">


        {timeOffSummaries.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-900/20 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {t('doctorCalendar.shiftDetails.timeOffSummary')}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-200 text-amber-700 dark:border-amber-400 dark:text-amber-200 bg-white/70 dark:bg-transparent">
                {timeOffSummaries.length} {t('doctorCalendar.shiftDetails.entries')}
              </Badge>
            </div>
            <div className="space-y-1">
              {timeOffSummaries.map(summary => (
                <div key={summary.id} className="text-[11px] text-amber-900 dark:text-amber-100">
                  <span className="font-semibold">{summary.range}</span>
                  {summary.reason && (
                    <span className="text-amber-800/80 dark:text-amber-200/80"> • {summary.reason}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Shifts */}
        <div className="space-y-2">

          {isLoading ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('doctorCalendar.shiftDetails.loadingShifts')}</div>
          ) : uniqueShifts.length > 0 ? (
            <div className="space-y-1">
              {uniqueShifts.map((shift, index) => {
                const shiftHasTimeOffConflict = false;
                const cardStyle = shiftHasTimeOffConflict
                  ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
                  : { backgroundColor: `${shift.color}10`, borderColor: `${shift.color}35` };

                return (
                  <div
                    key={index}
                    className={`space-y-1.5 rounded-md border p-1.5 ${shiftHasTimeOffConflict ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                    style={cardStyle}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: shiftHasTimeOffConflict ? '#ef4444' : shift.color }}
                      ></div>
                      <span
                        className={`text-xs font-semibold flex-1 ${shiftHasTimeOffConflict
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-900 dark:text-gray-100'
                          }`}
                      >
                        {shift.name}
                        {shiftHasTimeOffConflict && (
                          <span className="ml-1 text-red-500">{t('doctorCalendar.shiftDetails.timeOffConflictLabel')}</span>
                        )}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${shiftHasTimeOffConflict
                          ? 'border-red-300 text-red-600'
                          : 'text-gray-700 dark:text-gray-200'
                          }`}
                        style={
                          shiftHasTimeOffConflict
                            ? undefined
                            : {
                              backgroundColor: `${shift.color}15`,
                              borderColor: `${shift.color}35`,
                            }
                        }
                      >
                        {shift.instances.length} {t('doctorCalendar.shiftDetails.timeRanges')}
                      </Badge>
                    </div>

                    {shift.instances.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {shift.instances.map((instance, idx) => (
                          <Badge
                            key={`${shift.name}-${idx}`}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-white/90 dark:bg-white/10 text-slate-700 dark:text-gray-200 border border-white/70"
                          >
                            {instance.timeRange}
                            {(() => {
                              const dayAnnotation =
                                !isDayView && instance.dayLabels?.length
                                  ? ` (${instance.dayLabels.join(', ')})`
                                  : '';
                              if (instance.slotMinutes != null) {
                                return (
                                  <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    • {instance.slotMinutes}-min {t('doctorCalendar.shiftDetails.slots')}
                                    {dayAnnotation}
                                  </span>
                                );
                              }

                              if (dayAnnotation) {
                                return (
                                  <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
                                    {dayAnnotation.trim()}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {instance.maxPatients != null && (
                              <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
                                • {instance.maxPatients} {t('doctorCalendar.shiftDetails.patients')}
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {t('doctorCalendar.shiftDetails.noTimeRanges')}
                      </p>
                    )}

                    {shift.dataSource === 'Default' && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/50 rounded px-2 py-1">
                        {t('doctorCalendar.shiftDetails.defaultShiftNotice')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('doctorCalendar.shiftDetails.noShiftsScheduled')}</div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};
