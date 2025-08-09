import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authApi } from '@/services';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';

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
// Utility hook for invalidating queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAuth: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
    invalidateUser: () => queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
