import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeOffApi } from '../api/timeOffApi';
import { overrideApi } from '../api/overrideApi';
import {
  CalendarEvent,
  GetTimeOffResponse,
  DoctorCalendarConfigResponse
} from '../api/types';

// Query keys
export const calendarKeys = {
  all: ['doctor-calendar'] as const,
  events: (
    doctorId: string,
    hospitalId: string,
    fromISO: string,
    toISO: string,
    configFingerprint: string
  ) => [...calendarKeys.all, 'events', doctorId, hospitalId, fromISO, toISO, configFingerprint] as const,
  timeOff: (doctorId: string) => [...calendarKeys.all, 'timeOff', doctorId] as const,
  config: (doctorId: string, hospitalId: string, startDate: string, days: number) =>
    [...calendarKeys.all, 'config', doctorId, hospitalId, startDate, days] as const,
};

// Time-off hooks
export function useTimeOff(doctorId: string, hospitalId: string) {
  return useQuery<GetTimeOffResponse>({
    queryKey: calendarKeys.timeOff(doctorId),
    queryFn: () => timeOffApi.getDoctorTimeOff(doctorId, hospitalId),
    enabled: !!doctorId,
  });
}

// Doctor calendar configuration hook
export function useDoctorCalendarConfig(doctorId: string, hospitalId: string, startDate: string, days: number) {
  return useQuery<DoctorCalendarConfigResponse>({
    queryKey: calendarKeys.config(doctorId, hospitalId, startDate, days),
    queryFn: async () => timeOffApi.getDoctorCalendarConfig(doctorId, hospitalId, startDate, days),
    enabled: !!doctorId && !!startDate && days > 0,
  });
}

export function useCalendarEvents(
  doctorId: string,
  hospitalId: string,
  fromISO: string,
  toISO: string,
  calendarConfig?: DoctorCalendarConfigResponse
) {
  const configFingerprint = useMemo(() => {
    if (!calendarConfig?.shiftInfo) return 'no-config';

    try {
      return JSON.stringify(
        calendarConfig.shiftInfo.map(info => ({
          shiftDate: info.shiftDate,
          details: info.shiftDayDetails.map(detail => ({
            overrideId: detail.overrideId,
            shiftName: detail.shiftName,
            startTime: detail.startTime,
            endTime: detail.endTime,
            slotDurationInMinutes: detail.slotDurationInMinutes,
            recurringDays: detail.recurringDays,
          }))
        }))
      );
    } catch (error) {
      console.warn('Failed to fingerprint calendarConfig.shiftInfo', error);
      return `config-${calendarConfig.shiftInfo.length}`;
    }
  }, [calendarConfig]);

  return useQuery<CalendarEvent[]>({
    queryKey: calendarKeys.events(doctorId, hospitalId, fromISO, toISO, configFingerprint),
    queryFn: async () => {
      const allEvents: CalendarEvent[] = [];

      // Fetch time-off data
      let timeOffData: GetTimeOffResponse | null = null;
      try {
        timeOffData = await timeOffApi.getDoctorTimeOff(doctorId, hospitalId);
      } catch (error) {
        timeOffData = null;
      }

      // Handle new API response structure (shiftInfo array)
      if (calendarConfig?.shiftInfo) {
        calendarConfig.shiftInfo.forEach((shiftInfo, shiftIndex) => {
          shiftInfo.shiftDayDetails.forEach((shiftDetail, detailIndex) => {
            const startTimeStr = shiftDetail.startTime;
            const endTimeStr = shiftDetail.endTime;

            const eventStart = buildShiftDate(shiftInfo.shiftDate, startTimeStr);
            const eventEnd = buildShiftDate(shiftInfo.shiftDate, endTimeStr);

            console.log('DEBUG_CALENDAR:', {
              date: shiftInfo.shiftDate,
              startStr: startTimeStr,
              endStr: endTimeStr,
              startISO: eventStart.toISOString(),
              endISO: eventEnd.toISOString()
            });

            const dataSource = resolveShiftDataSource({
              explicitSource: shiftDetail.dataSource || shiftInfo.dataSource || calendarConfig.dataSource,
              overrideId: shiftDetail.overrideId,
            });
            const colors = getShiftColors(dataSource);
            const shiftBlockEvent: CalendarEvent = {
              id: `shift-${shiftIndex}-${detailIndex}`,
              type: 'shift',
              title: `${shiftDetail.shiftName} Shift`,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              backgroundColor: colors.background,
              borderColor: colors.border,
              extendedProps: {
                shiftName: shiftDetail.shiftName,
                slotDuration: shiftDetail.slotDurationInMinutes,
                overrideId: shiftDetail.overrideId,
                recurringDays: shiftDetail.recurringDays,
                source: dataSource,
                dataSource,
                isOverride: dataSource === 'Override',
                sourceId: shiftDetail.overrideId,
                startTime: shiftDetail.startTime,
                endTime: shiftDetail.endTime
              }
            };

            allEvents.push(shiftBlockEvent);
          });
        });
      }
      // Handle legacy API response structure (days array)
      else if ((calendarConfig as any)?.days) {
        (calendarConfig as any).days.forEach((day: any, dayIndex: number) => {

          if (day.effectiveShifts) {
            day.effectiveShifts.forEach((shift: any, shiftIndex: number) => {
              const eventStart = buildShiftDate(day.date, shift.startTime);
              const eventEnd = buildShiftDate(day.date, shift.endTime);

              const dataSource = resolveShiftDataSource({
                explicitSource: shift.sourceType || shift.source,
                overrideId: shift.sourceId,
              });
              const colors = getShiftColors(dataSource);
              const shiftBlockEvent: CalendarEvent = {
                id: `legacy-shift-${dayIndex}-${shiftIndex}`,
                type: 'shift',
                title: `${shift.shiftName} Shift`,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                backgroundColor: colors.background,
                borderColor: colors.border,
                extendedProps: {
                  shiftName: shift.shiftName,
                  slotDuration: shift.slotDurationMinutes,
                  overrideId: shift.sourceId,
                  recurringDays: [],
                  source: dataSource,
                  dataSource,
                  isOverride: dataSource === 'Override',
                  sourceId: shift.sourceId
                }
              };

              allEvents.push(shiftBlockEvent);
            });
          }
        });
      }

      // Add time-off blocks
      if (timeOffData?.timeOffs) {
        // Helper: format a Date as YYYY-MM-DD in LOCAL timezone (avoids UTC shift for IST etc.)
        const toLocalDateStr = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        timeOffData.timeOffs.forEach((timeOff, index) => {
          const fromDate = new Date(timeOff.startDate || timeOff.fromDate);
          let toDate = new Date(timeOff.endDate || timeOff.toDate);

          // FullCalendar's allDay end is EXCLUSIVE.
          // e.g. fromDate=Mar 6, toDate=Mar 7 means block Mar 6 only.
          // We add 1 day so it correctly includes every intended day.
          toDate = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

          const timeOffEvent: CalendarEvent = {
            id: `timeoff-${timeOff.timeOffId}`,
            type: 'timeoff',
            title: timeOff.reason,
            start: toLocalDateStr(fromDate),
            end: toLocalDateStr(toDate),
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            allDay: true,
            extendedProps: {
              type: 'timeoff',
              timeOffId: timeOff.timeOffId,
              reason: timeOff.reason,
              isUpcoming: timeOff.isUpcoming,
              createdAt: timeOff.createdAt,
              source: 'timeoff'
            }
          };

          allEvents.push(timeOffEvent);
        });
      }

      // Filter events to only include those within the visible date range
      const filteredEvents = allEvents.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const rangeStart = new Date(fromISO);
        const rangeEnd = new Date(toISO);

        // Event should be visible if it overlaps with the date range
        const isVisible = eventStart <= rangeEnd && eventEnd >= rangeStart;

        return isVisible;
      });

      return filteredEvents;
    },
    enabled: !!doctorId && !!hospitalId && !!fromISO && !!toISO && (calendarConfig !== undefined),
  });
}

const SHIFT_COLOR_MAP = {
  Default: { background: '#bfdbfe', border: '#1d4ed8' },
  Override: { background: '#bbf7d0', border: '#15803d' }
} as const;

function getShiftColors(dataSource: 'Default' | 'Override') {
  return SHIFT_COLOR_MAP[dataSource] || SHIFT_COLOR_MAP.Default;
}

function resolveShiftDataSource({
  explicitSource,
  overrideId,
}: {
  explicitSource?: string;
  overrideId?: string | null;
}): 'Default' | 'Override' {
  const normalized = explicitSource?.toLowerCase();
  if (normalized === 'override') return 'Override';
  if (normalized === 'default') return 'Default';
  if (overrideId) return 'Override';
  return 'Default';
}

function buildShiftDate(dateStr: string, timeStr: string) {
  const [hourStr = '0', minuteStr = '0', secondStr = '0'] = timeStr.split(':');
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create date in local time using the constructor with individual components
  // month is 0-indexed in Date constructor
  const date = new Date(year, month - 1, day, Number(hourStr) || 0, Number(minuteStr) || 0, Number(secondStr) || 0, 0);

  return date;
}

// Time-off mutations
export function useCreateTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: timeOffApi.createDoctorTimeOff,
    onSuccess: (data, variables) => {
      // Invalidate time-off queries for the doctor
      queryClient.invalidateQueries({
        queryKey: calendarKeys.timeOff(variables.doctorId)
      });

      // Invalidate calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events', variables.doctorId]
      });
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ doctorId, hospitalId, timeOffId }: { doctorId: string; hospitalId: string; timeOffId: string }) =>
      timeOffApi.deleteDoctorTimeOff(timeOffId),
    onSuccess: (data, variables) => {
      // Invalidate time-off data for this doctor
      queryClient.invalidateQueries({
        queryKey: calendarKeys.timeOff(variables.doctorId)
      });

      // Invalidate all calendar events (partial key match)
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events']
      });
    },
  });
}

// Override mutations
export function useCreateOverride() {
  return useMutation({
    mutationFn: overrideApi.createDoctorOverride,
  });
}

export function useDeleteOverride() {
  return useMutation({
    mutationFn: overrideApi.deleteDoctorOverride,
  });
}


// Export the appointment cancellation hook
export { useAppointmentCancel } from './useAppointmentCancel';
