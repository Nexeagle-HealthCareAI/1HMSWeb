import { useQuery } from '@tanstack/react-query';
import { appointmentApi, Department } from '../services/appointmentApi';

export const useDepartments = (hospitalId: string) => {
  console.log('🔍 Debug - useDepartments called with hospitalId:', hospitalId);
  
  return useQuery({
    queryKey: ['departments', hospitalId],
    queryFn: () => {
      console.log('🔍 Debug - Executing departments API call for hospitalId:', hospitalId);
      return appointmentApi.getDepartments(hospitalId);
    },
    enabled: !!hospitalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
