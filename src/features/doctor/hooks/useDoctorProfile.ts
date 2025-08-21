import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../services/doctorApi';
import type { Doctor } from '../services/doctorApi';

export const useDoctorProfile = (userId?: string) => {
  return useQuery<Doctor>({
    queryKey: ['doctor', 'profile', userId],
    queryFn: async () => {
      console.log('🔍 Starting doctor profile fetch...', { userId });
      
      if (!userId) {
        throw new Error('User ID is required to fetch doctor profile');
      }
      
      try {
        console.log('📞 Attempting getById() API call with userId:', userId);
        const response = await doctorApi.getById(userId);
        console.log('✅ getById() successful:', response);
        
        if (!response || !response.data) {
          throw new Error('getById returned empty response');
        }
        
        return response.data;
      } catch (error: any) {
        console.error('❌ getById() failed:', {
          error: error,
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data
        });
        
        throw new Error(`Failed to fetch doctor profile: ${error?.message}`);
      }
    },
    enabled: !!userId, // Only enabled when userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
