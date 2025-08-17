import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listDoctors, 
  getTemplates, 
  getOverrides, 
  getBlocks, 
  getAppointments,
  getCalendarEvents,
  saveTemplates,
  createOrUpdateOverride,
  createBlock,
  deleteOverride,
  deleteBlock
} from '../api/mock';
import { 
  Doctor, 
  ShiftTemplate, 
  ShiftOverride, 
  Block, 
  AppointmentEvent,
  CalendarEvent,
  CreateOverridePayload,
  CreateBlockPayload,
  SaveTemplatesPayload
} from '../api/types';

// Query keys
export const calendarKeys = {
  all: ['doctor-calendar'] as const,
  doctors: () => [...calendarKeys.all, 'doctors'] as const,
  templates: (doctorId: string) => [...calendarKeys.all, 'templates', doctorId] as const,
  overrides: (doctorId: string, fromISO: string, toISO: string) => 
    [...calendarKeys.all, 'overrides', doctorId, fromISO, toISO] as const,
  blocks: (doctorId: string, fromISO: string, toISO: string) => 
    [...calendarKeys.all, 'blocks', doctorId, fromISO, toISO] as const,
  appointments: (doctorId: string, fromISO: string, toISO: string) => 
    [...calendarKeys.all, 'appointments', doctorId, fromISO, toISO] as const,
  events: (doctorId: string, fromISO: string, toISO: string) => 
    [...calendarKeys.all, 'events', doctorId, fromISO, toISO] as const,
};

// Hooks
export function useDoctors() {
  return useQuery({
    queryKey: calendarKeys.doctors(),
    queryFn: listDoctors,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTemplates(doctorId: string) {
  return useQuery({
    queryKey: calendarKeys.templates(doctorId),
    queryFn: () => getTemplates(doctorId),
    enabled: !!doctorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useOverrides(doctorId: string, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: calendarKeys.overrides(doctorId, fromISO, toISO),
    queryFn: () => getOverrides(doctorId, fromISO, toISO),
    enabled: !!doctorId && !!fromISO && !!toISO,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useBlocks(doctorId: string, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: calendarKeys.blocks(doctorId, fromISO, toISO),
    queryFn: () => getBlocks(doctorId, fromISO, toISO),
    enabled: !!doctorId && !!fromISO && !!toISO,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useAppointments(doctorId: string, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: calendarKeys.appointments(doctorId, fromISO, toISO),
    queryFn: () => getAppointments(doctorId, fromISO, toISO),
    enabled: !!doctorId && !!fromISO && !!toISO,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCalendarEvents(doctorId: string, fromISO: string, toISO: string) {
  return useQuery({
    queryKey: calendarKeys.events(doctorId, fromISO, toISO),
    queryFn: () => getCalendarEvents(doctorId, fromISO, toISO),
    enabled: !!doctorId && !!fromISO && !!toISO,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Mutations
export function useSaveTemplates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveTemplates,
    onSuccess: (data, variables) => {
      // Invalidate templates for the doctor
      queryClient.invalidateQueries({
        queryKey: calendarKeys.templates(variables.doctorId)
      });
      
      // Invalidate all calendar events for the doctor
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events', variables.doctorId]
      });
    },
  });
}

export function useCreateOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createOrUpdateOverride,
    onSuccess: (data) => {
      // Invalidate overrides for the affected date range
      const fromISO = `${data.shiftDate}T00:00:00`;
      const toISO = `${data.shiftDate}T23:59:59`;
      
      queryClient.invalidateQueries({
        queryKey: calendarKeys.overrides(data.doctorId, fromISO, toISO)
      });
      
      // Invalidate calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events', data.doctorId]
      });
    },
  });
}

export function useDeleteOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteOverride,
    onSuccess: (_, overrideId) => {
      // Invalidate all overrides and events (since we don't know the exact range)
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'overrides']
      });
      
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events']
      });
    },
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBlock,
    onSuccess: (data) => {
      // Invalidate blocks for the affected date range
      const fromISO = data.startDateTime.split('T')[0] + 'T00:00:00';
      const toISO = data.endDateTime.split('T')[0] + 'T23:59:59';
      
      queryClient.invalidateQueries({
        queryKey: calendarKeys.blocks(data.doctorId, fromISO, toISO)
      });
      
      // Invalidate calendar events
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events', data.doctorId]
      });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteBlock,
    onSuccess: (_, blockId) => {
      // Invalidate all blocks and events (since we don't know the exact range)
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'blocks']
      });
      
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'events']
      });
    },
  });
}
