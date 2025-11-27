import { useQuery } from '@tanstack/react-query';
import { appointmentApi, ApiDoctor } from '../services/appointmentApi';

export const useDoctorsByDepartment = (departmentId: string, hospitalId: string) => {
  return useQuery({
    queryKey: ['doctorsByDepartment', departmentId, hospitalId],
    queryFn: () => appointmentApi.getDoctorsByDepartment(departmentId, hospitalId),
    enabled: !!departmentId && !!hospitalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
