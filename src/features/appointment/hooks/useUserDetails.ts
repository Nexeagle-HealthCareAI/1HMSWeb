import { useQuery } from '@tanstack/react-query';
import { appointmentApi, UserDetails } from '../services/appointmentApi';

export const useUserDetails = (userId: string) => {
  return useQuery({
    queryKey: ['userDetails', userId],
    queryFn: () => appointmentApi.getUserDetails(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
