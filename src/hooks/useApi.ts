import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authApi } from '@/services';
import { doctorApi } from '@/features/doctor/services/doctorApi';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { departmentApi } from '@/features/hospital/services/departmentApi';
import { specializationApi } from '@/features/hospital/services/specializationApi';
import { medicalSpecialityApi } from '@/features/doctor/services/medicalSpecialityApi';

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

  // Send OTP
  sendOTP: () => createMutationHook(authApi.sendOTP),

  // Verify OTP
  verifyOTP: () => createMutationHook(authApi.verifyOTP),

  // Set password (for registration)
  setPassword: () => createMutationHook(authApi.setPassword),

  // Reset password with userId (for forgot password)
  resetPasswordWithUserId: () => createMutationHook(authApi.resetPasswordWithUserId),
  // Change password from an authenticated session (My Profile)
  changePassword: () => createMutationHook(authApi.changePassword),
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
  updateHospital: (hospitalId: string) => {
    const queryClient = useQueryClient();
    return createMutationHook(
      (data: Parameters<typeof hospitalApi.updateHospital>[1]) => hospitalApi.updateHospital(hospitalId, data),
      {
        onMutate: async (newData) => {
          // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
          await queryClient.cancelQueries({ queryKey: ['hospital', hospitalId] });
          
          // Snapshot the previous value
          const previousData = queryClient.getQueryData(['hospital', hospitalId]);
          
          // Optimistically update to the new value
          queryClient.setQueryData(['hospital', hospitalId], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              ...newData
            };
          });
          
          // Return a context object with the snapshotted value
          return { previousData };
        },
        // If the mutation fails, use the context returned from onMutate to roll back
        onError: (err, newData, context: any) => {
          if (context?.previousData) {
            queryClient.setQueryData(['hospital', hospitalId], context.previousData);
          }
        },
        // Always refetch after error or success to ensure server sync
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ['hospital', hospitalId] });
        },
      }
    );
  },
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

  // Get departments by hospital ID
  getDepartmentsByHospitalId: (hospitalId: string) => createApiHook(
    ['departments', 'hospital', hospitalId],
    () => departmentApi.getDepartmentsByHospitalId(hospitalId),
    {
      enabled: !!hospitalId,
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

// Medical speciality (NMC qualification-ladder catalog) API hooks
export const useMedicalSpecialityApi = {
  getAll: () => createApiHook(
    ['medicalSpecialities', 'all'],
    () => medicalSpecialityApi.getAll(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes — small, rarely-changing global reference list
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

  // Get doctors by department and hospital
  getDoctorsByDepartment: (departmentId: string, hospitalId: string) => createApiHook(
    ['doctors', 'department', departmentId, hospitalId],
    () => doctorApi.getDoctorsByDepartment(departmentId, hospitalId),
    {
      enabled: !!departmentId && !!hospitalId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  ),
};

// Media Upload API hooks
export const useMediaUploadApi = {
  // Upload profile picture. hospitalId is only set for an admin uploading on behalf of a
  // doctor other than themselves (Public Directory tile editor).
  uploadProfilePicture: () => useMutation({
    mutationFn: ({ userId, file, hospitalId }: { userId: string; file: File; hospitalId?: string }) =>
      mediaUploadApi.uploadProfilePicture(userId, file, hospitalId),
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
