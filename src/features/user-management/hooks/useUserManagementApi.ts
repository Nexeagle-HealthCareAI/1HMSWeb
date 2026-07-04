import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementApi, RolesResponse, AllUsersResponse, DeactivateUserRequest, DeactivateUserResponse, ReactivateUserRequest, ReactivateUserResponse, QuickAddUserRequest, QuickAddUserResponse, AdminUpdateUserRequest, AdminUpdateUserResponse, ShareCredentialsRequest, ShareCredentialsResponse, ResetCredentialsRequest, ResetCredentialsResponse } from '../services/userManagementApi';
import { useToast } from '@/hooks/use-toast';

// Hook for user management API calls
export const useUserManagementApi = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all roles from the system
  const getAllRoles = () => {
    return useQuery<RolesResponse>({
      queryKey: ['user-management', 'roles'],
      queryFn: userManagementApi.getAllRoles,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Get all users associated with a hospital
  const getAllUsers = (hospitalId: string) => {
    return useQuery<AllUsersResponse>({
      queryKey: ['user-management', 'all-users', hospitalId],
      queryFn: () => userManagementApi.getAllUsers(hospitalId),
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!hospitalId, // Only run query if hospitalId is available
    });
  };

  // Quick-add a team member directly (no invitation link)
  const quickAddUser = useMutation<QuickAddUserResponse, Error, QuickAddUserRequest>({
    mutationFn: userManagementApi.quickAddUser,
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'Team member added', description: data.message || 'They can log in with their mobile number and password.' });
        queryClient.invalidateQueries({ queryKey: ['user-management'] });
      } else {
        toast({ title: 'Could not add the member', description: data.message || 'Please try again.', variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Could not add the member', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
    },
  });

  // Update a team member's details
  const updateUser = useMutation<AdminUpdateUserResponse, Error, AdminUpdateUserRequest>({
    mutationFn: userManagementApi.updateUser,
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'Team member updated', description: data.message || 'The user profile has been updated.' });
        queryClient.invalidateQueries({ queryKey: ['user-management'] });
      } else {
        toast({ title: 'Could not update the member', description: data.message || 'Please try again.', variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: 'Could not update the member', description: error.message || 'Something went wrong. Please try again.', variant: 'destructive' });
    },
  });

  // Send a new member their login details (the form reports the per-channel result itself)
  const shareCredentials = useMutation<ShareCredentialsResponse, Error, ShareCredentialsRequest>({
    mutationFn: userManagementApi.shareCredentials,
  });

  // Reset an existing member's password to a temp one for re-sharing (dialog reports the result)
  const resetCredentials = useMutation<ResetCredentialsResponse, Error, ResetCredentialsRequest>({
    mutationFn: userManagementApi.resetCredentials,
  });

  // Deactivate a user
  const deactivateUser = useMutation<DeactivateUserResponse, Error, DeactivateUserRequest>({
    mutationFn: userManagementApi.deactivateUser,
    onSuccess: (data) => {
      // The backend always returns HTTP 200 even when it rejects the request (e.g. caller
      // isn't an admin, target isn't in this hospital, target is the hospital owner) — must
      // check success explicitly instead of assuming a 200 means it happened.
      if (!data.success) {
        toast({
          title: "Could not deactivate user",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "User Deactivated Successfully!",
        description: data.message || "The user has been deactivated and can no longer access the application.",
      });
      // Invalidate and refetch all users
      queryClient.invalidateQueries({ queryKey: ['user-management', 'all-users'] });
      // A deactivated user may be a doctor — drop the cached doctor lists so the
      // appointment booking screen (and any picker) no longer shows them.
      queryClient.invalidateQueries({ queryKey: ['doctorsByDepartment'] });
      queryClient.invalidateQueries({ queryKey: ['doctorSlots'] });
      queryClient.invalidateQueries({ queryKey: ['bookedSlots'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Deactivate User",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reactivate a previously-deactivated user
  const reactivateUser = useMutation<ReactivateUserResponse, Error, ReactivateUserRequest>({
    mutationFn: userManagementApi.reactivateUser,
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: "Could not reactivate user",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "User Reactivated",
        description: data.message || "The user can now access the application again.",
      });
      queryClient.invalidateQueries({ queryKey: ['user-management', 'all-users'] });
      queryClient.invalidateQueries({ queryKey: ['doctorsByDepartment'] });
      queryClient.invalidateQueries({ queryKey: ['doctorSlots'] });
      queryClient.invalidateQueries({ queryKey: ['bookedSlots'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Reactivate User",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    getAllRoles,
    getAllUsers,
    quickAddUser,
    updateUser,
    shareCredentials,
    resetCredentials,
    deactivateUser,
    reactivateUser,
  };
};
