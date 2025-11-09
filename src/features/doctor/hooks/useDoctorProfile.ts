import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { doctorApi } from '../services/doctorApi';
import type { Doctor } from '../services/doctorApi';
import { useAuthStore } from '@/store/authStore';

export const useDoctorProfile = (userId?: string) => {
  const { setDoctorId, setDoctorProfileRestriction } = useAuthStore();
  
  const query = useQuery<Doctor>({
    queryKey: ['doctor', 'profile', userId],
    queryFn: async () => {
      console.log('🔍 [useDoctorProfile] Starting doctor profile fetch:', { userId });
            
      if (!userId) {
        console.error('❌ [useDoctorProfile] User ID is missing');
        throw new Error('User ID is required to fetch doctor profile');
      }      
      try {
        console.log('🔍 [useDoctorProfile] Calling doctorApi.getById(userId)...');
        const response = await doctorApi.getById(userId);
        console.log('🔍 [useDoctorProfile] API Response received:', response);

        // 🔍 DEBUG LOGGING: Log the response to debug profile lock issue
        console.log('🔍 [useDoctorProfile] API Response received:', {
          response,
          responseType: typeof response,
          isNull: response === null,
          isUndefined: response === undefined,
          isObject: typeof response === 'object',
          keys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
          keysLength: response && typeof response === 'object' ? Object.keys(response).length : 0,
          responseStringified: JSON.stringify(response, null, 2),
          userId,
        });

        // Check if response is empty or invalid
        const isEmptyResponse = !response || (typeof response === 'object' && Object.keys(response).length === 0);
        
        console.log('🔍 [useDoctorProfile] Response validation check:', {
          isEmptyResponse,
          check1: !response,
          check2: typeof response === 'object',
          check3: response && typeof response === 'object' ? Object.keys(response).length === 0 : false,
        });

        if (isEmptyResponse) {
          console.warn('⚠️ [useDoctorProfile] Empty/invalid response detected - Setting profile restriction');
          console.log('🔍 [useDoctorProfile] Calling setDoctorProfileRestriction(true, message)');
          
          setDoctorProfileRestriction(true, 'Please complete your doctor profile to unlock calendar and prescription features.');
          
          // Verify restriction was set
          const authStore = useAuthStore.getState();
          console.log('🔍 [useDoctorProfile] Auth store after setting restriction:', {
            doctorProfileRestricted: authStore.doctorProfileRestricted,
            doctorProfileMessage: authStore.doctorProfileMessage,
          });
          
          const error = new Error(`Doctor profile is incomplete for user ID: ${userId}`);
          (error as any).code = 'DOCTOR_PROFILE_INCOMPLETE';
          throw error;
        }

        console.log('✅ [useDoctorProfile] Valid response - Clearing profile restriction');
        setDoctorProfileRestriction(false, null);
        
        // Verify restriction was cleared
        const authStore = useAuthStore.getState();
        console.log('🔍 [useDoctorProfile] Auth store after clearing restriction:', {
          doctorProfileRestricted: authStore.doctorProfileRestricted,
          doctorProfileMessage: authStore.doctorProfileMessage,
          doctorId: response?.doctorId,
        });

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
        const status = error?.response?.status;

        console.log('🔍 [useDoctorProfile] Error status code:', {
          status,
          statusText: error?.response?.statusText,
          errorMessage: error?.message,
          errorCode: error?.code,
          userId,
        });

        if (status === 204) {
          console.warn('⚠️ [useDoctorProfile] 204 No Content - Setting profile restriction');
          setDoctorProfileRestriction(true, 'Doctor profile not found. Please complete your details to proceed.');
          
          // Verify restriction was set
          const authStore = useAuthStore.getState();
          console.log('🔍 [useDoctorProfile] Auth store after 204 restriction:', {
            doctorProfileRestricted: authStore.doctorProfileRestricted,
            doctorProfileMessage: authStore.doctorProfileMessage,
          });
          
          throw new Error(`Doctor profile not found for user ID: ${userId}`);
        }

        if (status === 404) {
          console.warn('⚠️ [useDoctorProfile] 404 Not Found - Setting profile restriction');
          setDoctorProfileRestriction(true, 'Doctor profile not found. Please complete your details to proceed.');
          
          // Verify restriction was set
          const authStore = useAuthStore.getState();
          console.log('🔍 [useDoctorProfile] Auth store after 404 restriction:', {
            doctorProfileRestricted: authStore.doctorProfileRestricted,
            doctorProfileMessage: authStore.doctorProfileMessage,
          });
          
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
        
        if (error?.code === 'DOCTOR_PROFILE_INCOMPLETE') {
          console.warn('⚠️ [useDoctorProfile] DOCTOR_PROFILE_INCOMPLETE error code - Setting profile restriction');
          setDoctorProfileRestriction(true, 'Please complete your doctor profile to unlock calendar and prescription features.');
          
          // Verify restriction was set
          const authStore = useAuthStore.getState();
          console.log('🔍 [useDoctorProfile] Auth store after DOCTOR_PROFILE_INCOMPLETE restriction:', {
            doctorProfileRestricted: authStore.doctorProfileRestricted,
            doctorProfileMessage: authStore.doctorProfileMessage,
          });
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

  // Store doctor ID in auth store when successfully fetched
  useEffect(() => {
    if (query.data && query.data.doctorId) {
      console.log('Storing doctor ID in auth store:', query.data.doctorId);
      setDoctorId(query.data.doctorId);
    }
  }, [query.data, setDoctorId]);

  return query;
};
