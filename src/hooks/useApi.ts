import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authApi } from '@/services';
import { doctorApi } from '@/features/doctor/services/doctorApi';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { departmentApi } from '@/features/hospital/services/departmentApi';
import { specializationApi } from '@/features/hospital/services/specializationApi';

import { mediaUploadApi } from '@/services/mediaUploadApi';

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

  // Validate onboarding token
  validateToken: () => createMutationHook(authApi.validateToken),
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
    () => doctorApi.getDoctorProfile(doctorId),
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

};

// Media Upload API hooks
export const useMediaUploadApi = {
  // Upload profile picture
  uploadProfilePicture: () => useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      mediaUploadApi.uploadProfilePicture(userId, file),
  }),

  // Remove profile picture
  removeProfilePicture: () => useMutation({
    mutationFn: (userId: string) =>
      mediaUploadApi.removeProfilePicture(userId),
  }),

  // Get profile picture
  getProfilePicture: (userId: string) => createApiHook(
    ['profile-picture', userId],
    () => mediaUploadApi.getProfilePicture(userId),
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors (no profile picture)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2; // Retry up to 2 times for other errors
      },
    }
  ),

  // Upload prescription asset
  uploadPrescriptionAsset: () => useMutation({
    mutationFn: ({
      doctorId,
      file,
      assetType,
      prescriptionSettingId
    }: {
      doctorId: string;
      file: File;
      assetType: 'header_image' | 'footer_image' | 'signature_image';
      prescriptionSettingId: string;
    }) =>
      mediaUploadApi.uploadPrescriptionAsset(doctorId, file, assetType, prescriptionSettingId),
  }),

  // Get prescription assets
  getPrescriptionAssets: (doctorId: string) => createApiHook(
    ['prescription-assets', doctorId],
    () => mediaUploadApi.getPrescriptionAssets(doctorId),
    {
      enabled: !!doctorId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 404 errors (no assets found)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2; // Retry up to 2 times for other errors
      },
    }
  ),

  // Delete prescription asset
  deletePrescriptionAsset: () => useMutation({
    mutationFn: (deleteRequest: { prescriptionAssestId: string; blobAssetId: string }) =>
      mediaUploadApi.deletePrescriptionAsset(deleteRequest),
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
