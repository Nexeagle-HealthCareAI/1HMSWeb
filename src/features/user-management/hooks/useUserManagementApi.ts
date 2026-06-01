import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementApi, RolesResponse, InviteUserRequest, InviteUserResponse, InvitedUser, OnboardedUser, ManageInvitationRequest, ManageInvitationResponse, AllUsersResponse, DeactivateUserRequest, DeactivateUserResponse, UpdateInvitedUserRequest, UpdateInvitedUserResponse } from '../services/userManagementApi';
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

  // Get invited users with scope filtering
  const getInvitedUsers = (hospitalId: string, scope: 'Pending' | 'Accepted' | 'Revoked' | 'ALL' = 'ALL') => {
    return useQuery<{ success: boolean; message: string; invitations: InvitedUser[] }>({
      queryKey: ['user-management', 'invited-users', hospitalId, scope],
      queryFn: () => userManagementApi.getInvitedUsers(hospitalId, scope),
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!hospitalId, // Only run query if hospitalId is available
    });
  };

  // Get onboarded users
  const getOnboardedUsers = () => {
    return useQuery<OnboardedUser[]>({
      queryKey: ['user-management', 'onboarded-users'],
      queryFn: userManagementApi.getOnboardedUsers,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
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

  // Invite a new user
  const inviteUser = useMutation<InviteUserResponse, Error, InviteUserRequest>({
    mutationFn: userManagementApi.inviteUser,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Invitation Sent Successfully!",
          description: data.message || "The user has been invited. They will receive an email with registration instructions.",
        });
        queryClient.invalidateQueries({ queryKey: ['user-management', 'invited-users'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Manage invitation (resend or revoke)
  const manageInvitation = useMutation<ManageInvitationResponse, Error, ManageInvitationRequest>({
    mutationFn: userManagementApi.manageInvitation,
    onSuccess: (data, variables) => {
      const action = variables.scope === 'resend' ? 'resent' : 'revoked';
      toast({
        title: `Invitation ${action.charAt(0).toUpperCase() + action.slice(1)} Successfully!`,
        description: data.message || `The invitation has been ${action}.`,
      });
      // Invalidate and refetch invited users
      queryClient.invalidateQueries({ queryKey: ['user-management', 'invited-users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Manage Invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deactivate a user
  const deactivateUser = useMutation<DeactivateUserResponse, Error, DeactivateUserRequest>({
    mutationFn: userManagementApi.deactivateUser,
    onSuccess: (data) => {
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

  // Update invited user after OTP verification
  const updateInvitedUser = useMutation<UpdateInvitedUserResponse, Error, UpdateInvitedUserRequest>({
    mutationFn: userManagementApi.updateInvitedUser,
    onSuccess: (data) => {
      toast({
        title: "User Updated Successfully!",
        description: data.message || "User invitation status has been updated successfully.",
      });
      // Invalidate and refetch invited users
      queryClient.invalidateQueries({ queryKey: ['user-management', 'invited-users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update User",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    getAllRoles,
    getInvitedUsers,
    getOnboardedUsers,
    getAllUsers,
    inviteUser,
    manageInvitation,
    deactivateUser,
    updateInvitedUser,
  };
};
