import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authApi } from '@/services';
import { appointmentApi } from '@/features/appointment/services/appointmentApi';

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
};
// Utility hook for invalidating queries
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAuth: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
    invalidateUser: () => queryClient.invalidateQueries({ queryKey: ['auth', 'user'] }),
    invalidateAppointments: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
    invalidateTimeSlots: () => queryClient.invalidateQueries({ queryKey: ['timeSlots'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};
