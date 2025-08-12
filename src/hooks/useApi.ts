import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authApi } from '@/services';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { departmentApi } from '@/features/hospital/services/departmentApi';
import { specializationApi } from '@/features/hospital/services/specializationApi';
import { doctorProfileApi } from '@/features/doctor/services/doctorProfileApi';
import { mediaUploadApi } from '@/features/profile/services/mediaUploadApi';

// Generic API hook factory
export const createApiHook = <TData, TError = Error>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
};

// Generic mutation hook factory
export const createMutationHook = <TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) => {
  return useMutation({
    mutationFn,
    ...options,
  });
};

// Auth API hooks - Complete implementation
export const useAuthApi = {
  // Login
  login: () => createMutationHook(authApi.login),
  
  // Register
  register: () => createMutationHook(authApi.register),
  
  // Onboarding Register
  onboardingRegister: () => createMutationHook(authApi.onboardingRegister),
  
  // Send OTP
  sendOTP: () => createMutationHook(authApi.sendOTP),
  
  // Verify OTP
  verifyOTP: () => createMutationHook(authApi.verifyOTP),
  
  // Set password (for registration)
  setPassword: () => createMutationHook(authApi.setPassword),
  
  // Reset password with userId (for forgot password)
  resetPasswordWithUserId: () => createMutationHook(authApi.resetPasswordWithUserId),
  getUserPermissions: () => createMutationHook(authApi.getUserPermissions),
};

// Hospital API hooks
export const useHospitalApi = {
  // Get hospital-user mapping by userId
  getHospitalUserByUserId: (userId?: string) => createApiHook(
    ['hospitalUserByUserId', userId || ''],
    () => hospitalApi.getHospitalUserByUserId(userId!),
    { enabled: !!userId, staleTime: 5 * 60 * 1000 }
  ),
  // Register hospital
  registerHospital: () => createMutationHook(hospitalApi.registerHospital),
  // Update hospital
  updateHospital: (hospitalId: string) =>
    createMutationHook((data: Parameters<typeof hospitalApi.updateHospital>[1]) =>
      hospitalApi.updateHospital(hospitalId, data)
    ),
  // Get hospital by ID
  getHospitalById: (hospitalId: string) => createApiHook(
    ['hospital', hospitalId],
    () => hospitalApi.getHospitalById(hospitalId),
    {
      enabled: !!hospitalId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  ),
};

// Department API hooks
export const useDepartmentApi = {
  // Get global departments
  getGlobalDepartments: () => createApiHook(
    ['departments', 'global'],
    () => departmentApi.getGlobalDepartments(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  ),
};

// Specialization API hooks
export const useSpecializationApi = {
  getSpecializationsByDepartment: (departmentId: string, hospitalId: string, includeGlobal: boolean = true) => createApiHook(
    ['specializations', 'department', departmentId, hospitalId, includeGlobal.toString()],
    () => specializationApi.getSpecializationsByDepartment(departmentId, hospitalId, includeGlobal),
    { 
      enabled: !!departmentId && !!hospitalId,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  ),
};

// Doctor API hooks
export const useDoctorApi = {
  // Get doctor profile
  getDoctorProfile: (doctorId: string) => createApiHook(
    ['doctor', 'profile', doctorId],
    () => doctorProfileApi.getDoctorProfile(doctorId),
    {
      enabled: !!doctorId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors (doctor profile doesn't exist)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2; // Retry up to 2 times for other errors
      },
    }
  ),
  
  // Create doctor profile
  createDoctorProfile: () => createMutationHook(doctorProfileApi.createDoctorProfile),
  
  // Update doctor profile
  updateDoctorProfile: (doctorId: string) =>
    createMutationHook((data: Parameters<typeof doctorProfileApi.updateDoctorProfile>[1]) =>
      doctorProfileApi.updateDoctorProfile(doctorId, data)
    ),
};

// Media Upload API hooks
export const useMediaApi = {
  prepareUpload: () => useMutation({
    mutationFn: mediaUploadApi.prepareUpload,
    onError: (error) => {
      console.error('Error preparing upload:', error);
    },
  }),

  uploadToBlob: () => useMutation({
    mutationFn: ({ uploadURL, file }: { uploadURL: string; file: File }) =>
      mediaUploadApi.uploadToBlob(uploadURL, file),
    onError: (error) => {
      console.error('Error uploading to blob:', error);
    },
  }),

  finalizeUpload: () => useMutation({
    mutationFn: mediaUploadApi.finalizeUpload,
    onError: (error) => {
      console.error('Error finalizing upload:', error);
    },
  }),

  getMediaURL: (scope: string, userId: string) => useQuery({
    queryKey: ['media', 'url', scope, userId],
    queryFn: () => mediaUploadApi.getMediaURL(scope, userId),
    enabled: !!scope && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  }),
};

// Utility hook for invalidating queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAuth: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
    invalidateUser: () => queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
