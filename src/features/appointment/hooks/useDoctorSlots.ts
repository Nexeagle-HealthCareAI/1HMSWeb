import { useQuery } from '@tanstack/react-query';
import { appointmentApi } from '../services/appointmentApi';

export const useDoctorSlots = (doctorId: string, hospitalId: string, date: string) => {
  return useQuery({
    queryKey: ['doctorSlots', doctorId, hospitalId, date],
    queryFn: () => appointmentApi.getDoctorSlots(doctorId, hospitalId, date),
    enabled: !!doctorId && !!hospitalId && !!date,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
