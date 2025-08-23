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
        console.log('🌐 API URL will be:', `/doctors/${userId}`);
        
        const response = await doctorApi.getById(userId);
        console.log('✅ getById() successful:', response);
        console.log('📊 Response structure:', {
          hasResponse: !!response,
          hasData: !!response?.data,
          responseType: typeof response,
          dataType: typeof response?.data,
          responseKeys: response ? Object.keys(response) : 'no response',
          dataKeys: response?.data ? Object.keys(response.data) : 'no data'
        });
        
        if (!response) {
          throw new Error('getById returned null/undefined response');
        }
        
        if (!response.data) {
          console.warn('⚠️ Response has no data property:', response);
          // Check if the response itself is the data (some APIs return data directly)
          const responseAny = response as any;
          if (responseAny.doctorId || responseAny.userId || responseAny.name) {
            console.log('✅ Response appears to be the doctor data directly');
            return responseAny as Doctor;
          }
          throw new Error('getById returned empty data');
        }
        
        return response.data;
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
    // Add fallback data for when doctor profile doesn't exist
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      
      // Return a basic doctor structure if no previous data
      return {
        doctorId: userId || '',
        userId: userId || '',
        licenseNumber: '',
        qualifications: [],
        experienceYears: 0,
        medicalCouncil: '',
        registrationYear: new Date().getFullYear(),
        bio: '',
        primaryDepartmentID: '',
        primaryDepartmentName: '',
        profileCompletionPercentage: 0,
        createdAt: new Date().toISOString(),
        doctorDepartments: [],
        doctorSpecializations: [],
        name: 'Doctor',
        email: '',
        phone: '',
        specialization: '',
        department: '',
        license_number: '',
        experience_years: 0,
        education: [],
        certifications: [],
        is_available: true,
        working_hours: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '09:00', end: '17:00', available: true },
          sunday: { start: '09:00', end: '17:00', available: true },
        },
        consultation_fee: 0,
        avatar: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Doctor;
    },
  });
};
