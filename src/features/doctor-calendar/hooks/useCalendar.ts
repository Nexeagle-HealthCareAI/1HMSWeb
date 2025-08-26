import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeOffApi } from '../api/timeOffApi';
import { overrideApi } from '../api/overrideApi';
import { 
  CalendarEvent,
  GetTimeOffResponse,
  CreateTimeOffRequest,
  CreateOverridePayload,
  DoctorCalendarConfigResponse,
  LegacyDoctorCalendarConfigResponse
} from '../api/types';

// Query keys
export const calendarKeys = {
  all: ['doctor-calendar'] as const,
  events: (doctorId: string, fromISO: string, toISO: string) => 
    [...calendarKeys.all, 'events', doctorId, fromISO, toISO] as const,
  timeOff: (doctorId: string) => [...calendarKeys.all, 'timeOff', doctorId] as const,
  config: (doctorId: string, startDate: string, days: number) => 
    [...calendarKeys.all, 'config', doctorId, startDate, days] as const,
};

// Time-off hooks
export function useTimeOff(doctorId: string) {
  return useQuery<GetTimeOffResponse>({
    queryKey: calendarKeys.timeOff(doctorId),
    queryFn: () => timeOffApi.getDoctorTimeOff(doctorId),
    enabled: !!doctorId,
  });
}

// Doctor calendar configuration hook
export function useDoctorCalendarConfig(doctorId: string, startDate: string, days: number) {
  return useQuery<DoctorCalendarConfigResponse>({
    queryKey: calendarKeys.config(doctorId, startDate, days),
    queryFn: async () => {
      console.log('🔍 useDoctorCalendarConfig - Calling API with:', {
        doctorId,
        startDate,
        days
      });
      
      const result = await timeOffApi.getDoctorCalendarConfig(doctorId, startDate, days);
      console.log('🔍 useDoctorCalendarConfig - API response:', result);
      return result;
    },
    enabled: !!doctorId && !!startDate && days > 0,
  });
}

export function useCalendarEvents(doctorId: string, fromISO: string, toISO: string, calendarConfig?: DoctorCalendarConfigResponse) {
  return useQuery<CalendarEvent[]>({
    queryKey: calendarKeys.events(doctorId, fromISO, toISO),
    queryFn: async () => {
      const allEvents: CalendarEvent[] = [];

      // Fetch time-off data
      let timeOffData: GetTimeOffResponse | null = null;
      try {
        timeOffData = await timeOffApi.getDoctorTimeOff(doctorId);
        console.log('📅 Time-off data fetched:', timeOffData);
      } catch (error) {
        console.error('❌ Error fetching time-off data:', error);
      }

      console.log('🔍 useCalendarEvents - Input data:', {
        doctorId,
        fromISO,
        toISO,
        calendarConfig: calendarConfig ? 'present' : 'undefined',
        shiftInfoCount: calendarConfig?.shiftInfo?.length || 0,
        dateRange: {
          from: new Date(fromISO).toISOString(),
          to: new Date(toISO).toISOString()
        }
      });

      // Log the entire calendarConfig structure for debugging
      if (calendarConfig) {
        console.log('🔍 Full calendarConfig structure:', JSON.stringify(calendarConfig, null, 2));
      }

      // Handle new API response structure (shiftInfo array)
      if (calendarConfig?.shiftInfo) {
        console.log('📅 Processing NEW API structure - shiftInfo array:', calendarConfig.shiftInfo.length);

        calendarConfig.shiftInfo.forEach((shiftInfo, shiftIndex) => {
          console.log(`📅 Processing shiftInfo[${shiftIndex}]:`, {
            shiftDate: shiftInfo.shiftDate,
            shiftDayDetailsCount: shiftInfo.shiftDayDetails.length
          });

          shiftInfo.shiftDayDetails.forEach((shiftDetail, detailIndex) => {
            console.log(`📅 Processing shiftDetail[${detailIndex}]:`, {
              shiftName: shiftDetail.shiftName,
              startTime: shiftDetail.startTime,
              endTime: shiftDetail.endTime,
              slotDurationInMinutes: shiftDetail.slotDurationInMinutes
            });

            // Parse date from string format "2025-08-26"
            const shiftDate = new Date(shiftInfo.shiftDate);
            
            // Parse time strings (format: "14:00:00")
            const startTimeStr = shiftDetail.startTime;
            const endTimeStr = shiftDetail.endTime;
            
            const [startHour, startMinute, startSecond = 0] = startTimeStr.split(':').map(Number);
            const [endHour, endMinute, endSecond = 0] = endTimeStr.split(':').map(Number);

            // Create event start and end times
            const eventStart = new Date(shiftDate);
            eventStart.setHours(startHour, startMinute, startSecond);
            
            const eventEnd = new Date(shiftDate);
            eventEnd.setHours(endHour, endMinute, endSecond);

            console.log(`📅 Date calculation for event:`, {
              shiftDate: shiftInfo.shiftDate,
              startTimeStr,
              endTimeStr,
              eventStart: eventStart.toISOString(),
              eventEnd: eventEnd.toISOString()
            });

            const shiftBlockEvent: CalendarEvent = {
              id: `shift-${shiftIndex}-${detailIndex}`,
              type: 'shift',
              title: `${shiftDetail.shiftName} Shift`,
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              backgroundColor: getShiftColor(shiftDetail.shiftName),
              borderColor: getShiftColor(shiftDetail.shiftName),
              extendedProps: {
                shiftName: shiftDetail.shiftName,
                slotDuration: shiftDetail.slotDurationInMinutes,
                overrideId: shiftDetail.overrideId,
                recurringDays: shiftDetail.recurringDays,
                source: 'override',
                isOverride: true,
                sourceId: shiftDetail.overrideId,
                startTime: shiftDetail.startTime,
                endTime: shiftDetail.endTime
              }
            };

            console.log(`📅 Created event:`, {
              id: shiftBlockEvent.id,
              title: shiftBlockEvent.title,
              start: shiftBlockEvent.start,
              end: shiftBlockEvent.end,
              backgroundColor: shiftBlockEvent.backgroundColor
            });

            allEvents.push(shiftBlockEvent);
          });
        });
      } 
      // Handle legacy API response structure (days array)
      else if ((calendarConfig as any)?.days) {
        console.log('📅 Processing LEGACY API structure - days array:', (calendarConfig as any).days.length);

        (calendarConfig as any).days.forEach((day: any, dayIndex: number) => {
          console.log(`📅 Processing day[${dayIndex}]:`, {
            date: day.date,
            effectiveShiftsCount: day.effectiveShifts?.length || 0
          });

          if (day.effectiveShifts) {
            day.effectiveShifts.forEach((shift: any, shiftIndex: number) => {
              console.log(`📅 Processing legacy shift[${shiftIndex}]:`, {
                shiftName: shift.shiftName,
                startTime: shift.startTime,
                endTime: shift.endTime,
                slotDurationMinutes: shift.slotDurationMinutes
              });

              // Parse date from day.date
              const shiftDate = new Date(day.date);
              
              // Parse time strings (assuming format like "09:00")
              const [startHour, startMinute] = shift.startTime.split(':').map(Number);
              const [endHour, endMinute] = shift.endTime.split(':').map(Number);

              // Create event start and end times
              const eventStart = new Date(shiftDate);
              eventStart.setHours(startHour, startMinute, 0);
              
              const eventEnd = new Date(shiftDate);
              eventEnd.setHours(endHour, endMinute, 0);

              const shiftBlockEvent: CalendarEvent = {
                id: `legacy-shift-${dayIndex}-${shiftIndex}`,
                type: 'shift',
                title: `${shift.shiftName} Shift`,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                backgroundColor: getShiftColor(shift.shiftName),
                borderColor: getShiftColor(shift.shiftName),
                extendedProps: {
                  shiftName: shift.shiftName,
                  slotDuration: shift.slotDurationMinutes,
                  overrideId: shift.sourceId,
                  recurringDays: [],
                  source: 'override',
                  isOverride: true,
                  sourceId: shift.sourceId
                }
              };

              console.log(`📅 Created legacy event:`, {
                id: shiftBlockEvent.id,
                title: shiftBlockEvent.title,
                start: shiftBlockEvent.start,
                end: shiftBlockEvent.end,
                backgroundColor: shiftBlockEvent.backgroundColor
              });

              allEvents.push(shiftBlockEvent);
            });
          }
        });
      } else {
        console.log('⚠️ No shiftInfo or days found in calendarConfig');
        console.log('⚠️ calendarConfig structure:', calendarConfig);
      }

      // Add time-off blocks
      if (timeOffData?.timeOffs) {
        console.log('📅 Processing time-off data:', timeOffData.timeOffs.length, 'entries');
        
        timeOffData.timeOffs.forEach((timeOff, index) => {
          console.log(`📅 Processing timeOff[${index}]:`, {
            timeOffId: timeOff.timeOffId,
            fromDate: timeOff.fromDate,
            toDate: timeOff.toDate,
            reason: timeOff.reason,
            isUpcoming: timeOff.isUpcoming
          });

          // Parse dates
          const fromDate = new Date(timeOff.fromDate);
          const toDate = new Date(timeOff.toDate);
          
          // Create time-off event
          const timeOffEvent: CalendarEvent = {
            id: `timeoff-${timeOff.timeOffId}`,
            type: 'timeoff',
            title: timeOff.reason,
            start: fromDate.toISOString(),
            end: toDate.toISOString(),
            backgroundColor: '#ef4444', // Red color for time-off
            borderColor: '#dc2626',
            allDay: true, // Time-off events are typically all-day
            extendedProps: {
              type: 'timeoff', // Add type to extendedProps as backup
              timeOffId: timeOff.timeOffId,
              reason: timeOff.reason,
              isUpcoming: timeOff.isUpcoming,
              createdAt: timeOff.createdAt,
              source: 'timeoff'
            }
          };

          console.log(`📅 Created time-off event:`, {
            id: timeOffEvent.id,
            title: timeOffEvent.title,
            start: timeOffEvent.start,
            end: timeOffEvent.end,
            allDay: timeOffEvent.allDay
          });

          allEvents.push(timeOffEvent);
        });
      } else {
        console.log('📅 No time-off data available');
      }

      // Filter events to only include those within the visible date range
      const filteredEvents = allEvents.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const rangeStart = new Date(fromISO);
        const rangeEnd = new Date(toISO);
        
        // Event should be visible if it overlaps with the date range
        const isVisible = eventStart <= rangeEnd && eventEnd >= rangeStart;
        
        if (!isVisible) {
          console.log(`📅 Filtered out event outside range:`, {
            id: event.id,
            title: event.title,
            eventStart: eventStart.toISOString(),
            eventEnd: eventEnd.toISOString(),
            rangeStart: rangeStart.toISOString(),
            rangeEnd: rangeEnd.toISOString(),
            isTimeOff: event.type === 'timeoff' || event.id?.startsWith('timeoff-')
          });
        }
        
        return isVisible;
      });

      console.log('📅 Final generated events:', filteredEvents.length, 'out of', allEvents.length, 'total events');
      
      // Log time-off events specifically
      const timeOffEvents = filteredEvents.filter(event => event.type === 'timeoff' || event.id?.startsWith('timeoff-'));
      console.log('📅 Time-off events in final result:', timeOffEvents.length);
      timeOffEvents.forEach((event, index) => {
        console.log(`📅 Time-off event ${index + 1}:`, {
          id: event.id,
          type: event.type,
          title: event.title,
          start: event.start,
          end: event.end,
          extendedProps: event.extendedProps
        });
      });
      
      return filteredEvents;
    },
    enabled: !!doctorId && !!fromISO && !!toISO && (calendarConfig !== undefined),
  });
}

// Helper function to get shift colors
function getShiftColor(shiftName: string): string {
  switch (shiftName.toLowerCase()) {
    case 'morning':
      return '#4ade80'; // green
    case 'afternoon':
      return '#fbbf24'; // yellow
    case 'evening':
      return '#f97316'; // orange
    case 'night':
      return '#6366f1'; // indigo
    default:
      return '#6b7280'; // gray
  }
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
    mutationFn: timeOffApi.deleteDoctorTimeOff,
    onSuccess: (data) => {
      // Invalidate all time-off queries
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'timeOff']
      });
      
      // Invalidate all calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events']
      });
    },
  });
}

// Override mutations
export function useCreateOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: overrideApi.createDoctorOverride,
    onSuccess: (data, variables) => {
      // Invalidate calendar config for the doctor
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'config', variables.doctorId]
      });
      
      // Invalidate calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events', variables.doctorId]
      });
    },
  });
}

export function useDeleteOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: overrideApi.deleteDoctorOverride,
    onSuccess: (data) => {
      // Invalidate all calendar config queries
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'config']
      });
      
      // Invalidate all calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events']
      });
    },
  });
}

export const useCreateBlock = () => ({ mutate: () => {}, isPending: false });
export const useDeleteBlock = () => ({ mutate: () => {}, isPending: false });
export const useSaveTemplates = () => ({ mutate: () => {}, isPending: false });
export const useTemplates = () => ({ data: [], isLoading: false });
export const useOverrides = () => ({ data: [], isLoading: false });
export const useBlocks = () => ({ data: [], isLoading: false });
export const useAppointments = () => ({ data: [], isLoading: false });
export const useDoctors = () => ({ data: [], isLoading: false });

// Export the appointment cancellation hook
export { useAppointmentCancel } from './useAppointmentCancel';
