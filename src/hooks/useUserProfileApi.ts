import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileApi, UserProfileUpdateRequest } from '@/features/profile/services/userProfileApi';
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
    mutationFn: (data: UserProfileUpdateRequest) => userProfileApi.updateUserDetails(data),
    onSuccess: (response, variables) => {
      // Invalidate and refetch user details
      queryClient.invalidateQueries({ queryKey: ['user', 'details', variables.userId] });
      
      // Show success message
      toast({
        title: "Profile Updated Successfully! 🎉",
        description: response.message || "Your profile has been updated.",
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
