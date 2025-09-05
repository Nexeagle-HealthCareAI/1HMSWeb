import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '../services/doctorApi';
import type { Doctor } from '../services/doctorApi';

export const useDoctorProfile = (userId?: string) => {
  
  return useQuery<Doctor>({
    queryKey: ['doctor', 'profile', userId],
    queryFn: async () => {
            
      if (!userId) {
        throw new Error('User ID is required to fetch doctor profile');
      }      
      try {       
        const response = await doctorApi.getById(userId);        
        
        if (!response) {
          throw new Error('getById returned null/undefined response');
        }
        
        return response;
      } catch (error: any) {
        console.error('❌ getById() failed:', {
          error: error,
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          config: error?.config,
          url: error?.config?.url,
          method: error?.config?.method
        });
        
        // Provide more specific error messages
        if (error?.response?.status === 404) {
          throw new Error(`Doctor profile not found for user ID: ${userId}`);
        } else if (error?.response?.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (error?.response?.status === 403) {
          throw new Error('Access denied. You do not have permission to view this profile.');
        } else if (error?.response?.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error?.code === 'NETWORK_ERROR') {
          throw new Error('Network error. Please check your connection.');
        }
        
        throw new Error(`Failed to fetch doctor profile: ${error?.message || 'Unknown error'}`);
      }
    },
    enabled: !!userId, // Only enabled when userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404, 401, 403 errors
      if (error?.message?.includes('not found') || 
          error?.message?.includes('Authentication required') ||
          error?.message?.includes('Access denied')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
