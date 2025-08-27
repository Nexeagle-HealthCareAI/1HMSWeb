import { useQuery } from '@tanstack/react-query';
import { appointmentApi, HospitalUser } from '../services/appointmentApi';

export const useHospitalUser = (userId: string) => {
  console.log('🔍 Debug - useHospitalUser called with userId:', userId);
  
  return useQuery({
    queryKey: ['hospitalUser', userId],
    queryFn: () => {
      console.log('🔍 Debug - Executing hospital user API call for userId:', userId);
      return appointmentApi.getHospitalUser(userId);
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
