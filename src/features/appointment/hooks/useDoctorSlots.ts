import { useQuery } from '@tanstack/react-query';
import { appointmentApi, DoctorSlotsResponse } from '../services/appointmentApi';

export const useDoctorSlots = (doctorId: string, date: string) => {
  return useQuery({
    queryKey: ['doctorSlots', doctorId, date],
    queryFn: () => appointmentApi.getDoctorSlots(doctorId, date),
    enabled: !!doctorId && !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
