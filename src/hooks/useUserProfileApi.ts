import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileApi, UserProfileUpdateRequest } from '@/features/profile/services/userProfileApi';
import { offlineMutation } from '@/offline/offlineMutation';
import { toast } from '@/hooks/use-toast';

// Hook for getting user details
export const useUserDetails = (userId: string) => {
  return useQuery({
    queryKey: ['user', 'details', userId],
    queryFn: () => userProfileApi.getUserDetails(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

// Hook for updating user details
export const useUpdateUserDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserProfileUpdateRequest) => {
      return offlineMutation({
        entity: 'profile',
        opType: 'update',
        client: 'api',
        method: 'PUT',
        url: `/patient-profile/v1/users/${data.userId}`, // Assuming this is the URL format, we'll let userProfileApi.updateUserDetails do the actual call online
        data: data.profileData,
        run: () => userProfileApi.updateUserDetails(data),
        optimistic: () => {
          queryClient.setQueryData(['user', 'details', data.userId], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              profile: {
                ...old.profile,
                ...data.profileData
              }
            };
          });
        },
        synthetic: () => ({ success: true, message: "Profile updated offline (queued)" })
      });
    },
    onSuccess: (response, variables) => {
      // Invalidate and refetch user details if we are online (queued will be false if online, true if offline)
      if (!response.queued) {
         queryClient.invalidateQueries({ queryKey: ['user', 'details', variables.userId] });
      }
      
      // Show success message
      toast({
        title: "Profile Updated Successfully! 🎉",
        description: response.data?.message || response.message || "Your profile has been updated.",
      });
    },
    onError: (error: any) => {
      // Show error message
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });
};
