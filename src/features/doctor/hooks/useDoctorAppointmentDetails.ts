import { useQuery } from '@tanstack/react-query';
import { doctorApi, DoctorAppointmentDetail } from '../services/doctorApi';
import { ApiResponse } from '@/services/axiosClient';

interface UseDoctorAppointmentDetailsParams {
  status: string;
  startDate?: string;
  endDate?: string;
  hospitalId?: string;
  doctorId?: string;
  enabled?: boolean;
}

export const useDoctorAppointmentDetails = ({
  status,
  startDate,
  endDate,
  hospitalId,
  doctorId,
  enabled = true
}: UseDoctorAppointmentDetailsParams) => {

  return useQuery<{ items: DoctorAppointmentDetail[] }>({
    queryKey: ['doctorAppointmentDetails', status, startDate, endDate, hospitalId, doctorId],
    queryFn: () => {

      if (!hospitalId || !doctorId) {
        throw new Error('Hospital ID and Doctor ID are required');
      }

      const request = {
        status,
        startDate: startDate || '',
        endDate: endDate || '',
        hospitalId,
        doctorId
      };

      return doctorApi.getAppointmentDetails(request);
    },
    enabled: enabled && !!hospitalId && !!doctorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent loops
  });
};
