import { useQuery } from '@tanstack/react-query';
import { appointmentApi, BookedSlotsResponse } from '../services/appointmentApi';

// excludeAppointmentId: pass the appointment currently being edited/confirmed, if any — otherwise
// that appointment's own (still-uncommitted) StartAt shows up as "booked" against itself. See
// DoctorBookedSlotsHandler.cs.
export const useBookedSlots = (doctorId: string, hospitalId: string, date: string, excludeAppointmentId?: string) => {
  return useQuery<BookedSlotsResponse>({
    queryKey: ['bookedSlots', doctorId, hospitalId, date, excludeAppointmentId],
    queryFn: () => appointmentApi.getBookedSlots(doctorId, hospitalId, date, excludeAppointmentId),
    enabled: !!doctorId && !!hospitalId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
