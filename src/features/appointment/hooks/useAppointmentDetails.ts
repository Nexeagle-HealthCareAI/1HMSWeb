import { useQuery } from '@tanstack/react-query';
import { appointmentApi, AppointmentDetailsResponse } from '../services/appointmentApi';

export const useAppointmentDetails = (
  status: string,
  startDate: string,
  endDate: string,
  hospitalId: string,
  enabled: boolean = true
) => {
  return useQuery<AppointmentDetailsResponse>({
    queryKey: ['appointmentDetails', status, startDate, endDate, hospitalId],
    queryFn: () => appointmentApi.getAppointmentDetails({
      status,
      startDate,
      endDate,
      hospitalId
    }),
    enabled: enabled && !!hospitalId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
