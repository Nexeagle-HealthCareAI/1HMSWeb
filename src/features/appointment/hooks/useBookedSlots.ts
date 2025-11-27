import { useQuery } from '@tanstack/react-query';
import { appointmentApi, BookedSlotsResponse } from '../services/appointmentApi';

export const useBookedSlots = (doctorId: string, hospitalId: string, date: string) => {
  return useQuery<BookedSlotsResponse>({
    queryKey: ['bookedSlots', doctorId, hospitalId, date],
    queryFn: () => appointmentApi.getBookedSlots(doctorId, hospitalId, date),
    enabled: !!doctorId && !!hospitalId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
