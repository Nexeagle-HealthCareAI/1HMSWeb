import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { doctorApi, DoctorProfileResponse } from '../services/doctorApi';
import { useAuthStore } from '@/store/authStore';

export const useDoctorProfile = (userId?: string) => {
  const { setDoctorId, setDoctorProfileRestriction } = useAuthStore();

  const query = useQuery<DoctorProfileResponse>({
    queryKey: ['doctor', 'profile', userId],
    queryFn: async () => {

      if (!userId) {
        throw new Error('User ID is required to fetch doctor profile');
      }
      try {
        const response = await doctorApi.getDoctorProfile(userId);
        console.log('Response+useDoctorProfile:', response);
        // Check if response is empty or invalid (e.g. 204 No Content from API)
        const isEmptyResponse = !response || (typeof response === 'object' && Object.keys(response).length === 0);

        if (isEmptyResponse) {
          setDoctorProfileRestriction(true, 'Please complete your doctor profile to unlock calendar and prescription features.');

          // Attach a synthetic 204 response so UI treats this as profile-incomplete instead of a hard error
          const profileError: any = new Error(`Doctor profile not found for user ID: ${userId}`);
          profileError.code = 'DOCTOR_PROFILE_INCOMPLETE';
          profileError.response = { status: 204, statusText: 'No Content', data: null };
          throw profileError;
        }
        setDoctorProfileRestriction(false, null);
        // Verify restriction was cleared
        const authStore = useAuthStore.getState();

        return response;
      } catch (error: any) {

        const status = error?.response?.status;

        // Handle profile-incomplete errors first (explicit code from empty response handling)
        if (error?.code === 'DOCTOR_PROFILE_INCOMPLETE') {
          setDoctorProfileRestriction(true, 'Please complete your doctor profile to unlock calendar and prescription features.');

          const profileError: any = error instanceof Error ? error : new Error(`Doctor profile not found for user ID: ${userId}`);
          if (!profileError.response) {
            profileError.response = error?.response || { status: 204, statusText: 'No Content', data: null };
          }
          if (!profileError.message) {
            profileError.message = `Doctor profile not found for user ID: ${userId}`;
          }
          throw profileError;
        }

        // Handle 204 No Content status - Doctor profile doesn't exist, needs to complete profile
        if (status === 204) {
          setDoctorProfileRestriction(true, 'Please complete your doctor profile to unlock calendar and prescription features.');

          // Preserve the error structure with response for proper handling in UI
          const profileError: any = new Error(`Doctor profile not found for user ID: ${userId}`);
          profileError.response = error.response || { status: 204, statusText: 'No Content', data: null };
          throw profileError;
        }

        // Handle 404 Not Found status - Doctor profile doesn't exist
        if (status === 404) {
          setDoctorProfileRestriction(true, 'Doctor profile not found. Please complete your details to proceed.');

          const authStore = useAuthStore.getState();

          // Preserve the error structure with response for proper handling in UI
          const profileError: any = new Error(`Doctor profile not found for user ID: ${userId}`);
          profileError.response = error.response || { status: 404, statusText: 'Not Found', data: null };
          throw profileError;
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
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Always refetch when component mounts
    gcTime: 0, // Don't cache unused data
    retry: (failureCount, error: any) => {
      // Don't retry on 204, 404, 401, 403 errors
      if (error?.response?.status === 204 ||
        error?.response?.status === 404 ||
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.message?.includes('not found') ||
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
