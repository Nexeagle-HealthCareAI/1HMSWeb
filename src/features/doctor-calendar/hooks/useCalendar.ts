import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeOffApi } from '../api/timeOffApi';
import { overrideApi } from '../api/overrideApi';
import { 
  CalendarEvent,
  GetTimeOffResponse,
  CreateTimeOffRequest,
  CreateOverridePayload,
  DoctorCalendarConfigResponse
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
  return useQuery({
    queryKey: calendarKeys.timeOff(doctorId),
    queryFn: () => timeOffApi.getDoctorTimeOff(doctorId),
    enabled: !!doctorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Doctor calendar configuration hook
export function useDoctorCalendarConfig(doctorId: string, startDate: string, days: number) {
  return useQuery<DoctorCalendarConfigResponse>({
    queryKey: calendarKeys.config(doctorId, startDate, days),
    queryFn: () => timeOffApi.getDoctorCalendarConfig(doctorId, startDate, days),
    enabled: !!doctorId && !!startDate && days > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCalendarEvents(doctorId: string, fromISO: string, toISO: string, calendarConfig?: DoctorCalendarConfigResponse) {
  // Get time-off data
  const { data: timeOffData } = useTimeOff(doctorId);
  
  return useQuery({
    queryKey: calendarKeys.events(doctorId, fromISO, toISO),
    queryFn: async () => {
      const allEvents: CalendarEvent[] = [];
      
      // Create individual shift blocks from calendar config
      if (calendarConfig?.days) {
        console.log('Processing calendar config days:', calendarConfig.days.length);
        
        calendarConfig.days.forEach((day, dayIndex) => {
          console.log(`Processing day ${dayIndex + 1}:`, {
            date: day.date,
            isWorkingDay: day.isWorkingDay,
            shiftsCount: day.effectiveShifts?.length || 0
          });
          
          if (day.isWorkingDay && day.effectiveShifts && day.effectiveShifts.length > 0) {
            day.effectiveShifts.forEach((shift, shiftIndex) => {
              console.log(`Processing shift ${shiftIndex + 1} for ${day.date}:`, {
                shiftName: shift.shiftName,
                startTime: shift.startTime,
                endTime: shift.endTime,
                isActive: shift.isActive,
                sourceType: shift.sourceType,
                sourceId: shift.sourceId
              });
              
              if (shift.isActive && shift.startTime && shift.endTime) {
                // Create individual block for each shift with its specific time range
                const shiftStartDateTime = `${day.date}T${shift.startTime}:00`;
                const shiftEndDateTime = `${day.date}T${shift.endTime}:00`;
                
                // Create unique ID for each shift block
                const uniqueBlockId = `shift-block-${day.date}-${shift.shiftName}-${shift.startTime}-${shift.endTime}-${shift.sourceId}`;
                
                const shiftBlockEvent: CalendarEvent = {
                  id: uniqueBlockId,
                  type: 'block',
                  title: `${shift.shiftName} Shift (${shift.startTime}-${shift.endTime})`,
                  start: shiftStartDateTime,
                  end: shiftEndDateTime,
                                      backgroundColor: shift.sourceType === 'override' ? '#22c55e' : '#3b82f6',
                    borderColor: shift.sourceType === 'override' ? '#16a34a' : '#2563eb',
                  textColor: 'white',
                  display: 'auto',
                  extendedProps: {
                    type: 'block',
                    shiftName: shift.shiftName,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    slotDurationMinutes: shift.slotDurationMinutes,
                    totalSlots: day.slotSummary?.totalSlots || 0,
                    isWorkingShift: true,
                    eventType: 'block',
                    sourceType: shift.sourceType,
                    sourceId: shift.sourceId,
                    isOverride: shift.sourceType === 'override',
                    isShiftBlock: true,
                    date: day.date
                  }
                };
                
                console.log(`✅ Created shift block event:`, {
                  id: shiftBlockEvent.id,
                  title: shiftBlockEvent.title,
                  start: shiftStartDateTime,
                  end: shiftEndDateTime,
                  shiftName: shift.shiftName,
                  timeRange: `${shift.startTime}-${shift.endTime}`,
                  date: day.date,
                  isOverride: shift.sourceType === 'override',
                  backgroundColor: shiftBlockEvent.backgroundColor
                });
                
                allEvents.push(shiftBlockEvent);
              } else {
                console.warn(`❌ Skipping inactive or incomplete shift:`, {
                  shiftName: shift.shiftName,
                  isActive: shift.isActive,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  date: day.date
                });
              }
            });
          } else {
            console.log(`ℹ️  Skipping day ${day.date}:`, {
              isWorkingDay: day.isWorkingDay,
              hasShifts: !!day.effectiveShifts,
              shiftsCount: day.effectiveShifts?.length || 0
            });
          }
        });
      } else {
        console.warn('❌ No calendar config or days found');
      }
      
      console.log(`📊 Total shift blocks created: ${allEvents.length}`);
      
      // Create time-off events (these will appear on top of shift events)
      if (timeOffData?.timeOffs) {
        timeOffData.timeOffs.forEach(timeOff => {
          // Use startDate/endDate from API if available, otherwise fallback to fromDate/toDate
          const startDate = timeOff.startDate || timeOff.fromDate;
          const endDate = timeOff.endDate || timeOff.toDate;
          
          // Convert to ISO format if needed
          const startISO = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
          const endISO = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
          
          const timeOffEvent = {
            id: timeOff.timeOffId,
            type: 'block' as const,
            title: timeOff.reason || 'Time Off',
            start: startISO,
            end: endISO,
            backgroundColor: '#dc2626', // Red background
            borderColor: '#b91c1c',
            extendedProps: {
              type: 'block' as const,
              timeOffId: timeOff.timeOffId,
              reason: timeOff.reason,
              isTimeOff: true
            }
          };
          
          console.log('Created time-off event:', timeOffEvent);
          allEvents.push(timeOffEvent);
        });
      }
      
      // Final summary
      const shiftBlocks = allEvents.filter(event => event.extendedProps?.isShiftBlock);
      const timeOffBlocks = allEvents.filter(event => event.extendedProps?.isTimeOff);
      
      console.log(`🎯 FINAL SUMMARY:`, {
        totalEvents: allEvents.length,
        shiftBlocks: shiftBlocks.length,
        timeOffBlocks: timeOffBlocks.length,
        shiftBlockDetails: shiftBlocks.map(block => ({
          id: block.id,
          title: block.title,
          start: block.start,
          end: block.end,
          shiftName: block.extendedProps?.shiftName,
          isOverride: block.extendedProps?.isOverride
        }))
      });
      
      return allEvents;
    },
    enabled: !!doctorId && !!fromISO && !!toISO && (calendarConfig !== undefined),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: timeOffApi.createDoctorTimeOff,
    onSuccess: (data, variables) => {
      // Invalidate time-off data for the doctor
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
      // Invalidate all time-off data (since we don't know which doctor it belongs to from the response)
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

// Export empty functions for backward compatibility with existing components
export const useDoctors = () => ({ data: [], isLoading: false });
export const useTemplates = () => ({ data: [], isLoading: false });
export const useOverrides = () => ({ data: [], isLoading: false });
export const useBlocks = () => ({ data: [], isLoading: false });
export const useAppointments = () => ({ data: [], isLoading: false });
export const useSaveTemplates = () => ({ mutate: () => {}, isPending: false });
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
