import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userManagementApi, RolesResponse, InviteUserRequest, InviteUserResponse, InvitedUser, OnboardedUser } from '../services/userManagementApi';
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

  // Get invited users
  const getInvitedUsers = () => {
    return useQuery<InvitedUser[]>({
      queryKey: ['user-management', 'invited-users'],
      queryFn: userManagementApi.getInvitedUsers,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
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

  // Invite a new user
  const inviteUser = useMutation<InviteUserResponse, Error, InviteUserRequest>({
    mutationFn: userManagementApi.inviteUser,
    onSuccess: (data) => {
      toast({
        title: "Invitation Sent Successfully!",
        description: "The user has been invited. They will receive an email with registration instructions.",
      });
      // Invalidate and refetch invited users
      queryClient.invalidateQueries({ queryKey: ['user-management', 'invited-users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    getAllRoles,
    getInvitedUsers,
    getOnboardedUsers,
    inviteUser,
  };
};
