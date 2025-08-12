import { useMutation, useQuery } from '@tanstack/react-query';
import { mediaUploadApi } from '@/features/profile/services/mediaUploadApi';

// Hook for preparing upload
export const usePrepareUpload = () => {
  return useMutation({
    mutationFn: mediaUploadApi.prepareUpload,
    onError: (error) => {
      console.error('Error preparing upload:', error);
    },
  });
};

// Hook for uploading to blob storage
export const useUploadToBlob = () => {
  return useMutation({
    mutationFn: ({ uploadURL, file }: { uploadURL: string; file: File }) =>
      mediaUploadApi.uploadToBlob(uploadURL, file),
    onError: (error) => {
      console.error('Error uploading to blob:', error);
    },
  });
};

// Hook for finalizing upload
export const useFinalizeUpload = () => {
  return useMutation({
    mutationFn: mediaUploadApi.finalizeUpload,
    onError: (error) => {
      console.error('Error finalizing upload:', error);
    },
  });
};

// Hook for getting media URL
export const useGetMediaURL = (scope: string, userId: string) => {
  return useQuery({
    queryKey: ['media', 'url', scope, userId],
    queryFn: () => mediaUploadApi.getMediaURL(scope, userId),
    enabled: !!scope && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
