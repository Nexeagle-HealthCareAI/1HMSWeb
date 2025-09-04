import { useQuery } from '@tanstack/react-query';
import { appointmentApi, AppointmentDetailsResponse } from '../services/appointmentApi';

export const useAppointmentDetails = (
  status: string,
  startDate: string,
  endDate: string,
  hospitalId: string,
  enabled: boolean = true
) => {
  // For current appointments, if no dates are provided, use today's date
  const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];
  const effectiveEndDate = endDate || new Date().toISOString().split('T')[0];
  
  return useQuery<AppointmentDetailsResponse>({
    queryKey: ['appointmentDetails', status, effectiveStartDate, effectiveEndDate, hospitalId],
    queryFn: () => appointmentApi.getAppointmentDetails({
      status,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      hospitalId
    }),
    enabled: enabled && !!hospitalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
