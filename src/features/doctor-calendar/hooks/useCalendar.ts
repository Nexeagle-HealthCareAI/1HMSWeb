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
      
      // Create shift events from calendar config
      if (calendarConfig?.days) {
        calendarConfig.days.forEach(day => {
          if (day.isWorkingDay && day.effectiveShifts) {
            day.effectiveShifts.forEach(shift => {
              if (shift.isActive) {
                // Create shift event
                const shiftStartTime = `${day.date}T${shift.startTime}:00`;
                const shiftEndTime = `${day.date}T${shift.endTime}:00`;
                
                const shiftEvent: CalendarEvent = {
                  id: `shift-${day.date}-${shift.shiftName}`,
                  type: 'shift',
                  title: `${shift.shiftName} Shift`,
                  start: shiftStartTime,
                  end: shiftEndTime,
                  backgroundColor: '#3b82f6', // Light blue background
                  borderColor: '#2563eb',
                  display: 'background', // Show as background event
                  extendedProps: {
                    type: 'shift',
                    shiftName: shift.shiftName,
                    slotDurationMinutes: shift.slotDurationMinutes,
                    totalSlots: day.slotSummary?.totalSlots || 0,
                    isWorkingShift: true,
                    eventType: 'shift', // Add this for CSS targeting
                    sourceType: shift.sourceType,
                    sourceId: shift.sourceId,
                    isOverride: shift.sourceType === 'override'
                  }
                };
                
                // Debug logging for override events
                if (shift.sourceType === 'override') {
                  console.log('Created override event:', {
                    id: shiftEvent.id,
                    sourceId: shift.sourceId,
                    shiftName: shift.shiftName,
                    isOverride: shiftEvent.extendedProps.isOverride
                  });
                }
                
                allEvents.push(shiftEvent);
              }
            });
          }
        });
      }
      
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
