import { API_ENDPOINTS } from '@/app/api';
import { axiosInstance } from '@/services/axiosClient';

export type UploadInitResponse = {
  uploadUrl?: string; // if using pre-signed
  objectKey: string;
};

export type FinalizeResponse = {
  success: boolean;
  message?: string;
  urls: {
    thumb: string;
    medium: string;
    full: string;
  };
};

export const profilePhotoService = {
  upload: async (file: Blob, signal?: AbortSignal, onProgress?: (p: number) => void): Promise<UploadInitResponse> => {
    const form = new FormData();
    form.append('file', file, 'profile.jpg');
    const res = await axiosInstance.post(API_ENDPOINTS.USER.PROFILE_PHOTO.UPLOAD, form, {
      signal,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as UploadInitResponse;
  },

  finalize: async (objectKey: string): Promise<FinalizeResponse> => {
    const res = await axiosInstance.post(API_ENDPOINTS.USER.PROFILE_PHOTO.FINALIZE, { objectKey });
    return res.data as FinalizeResponse;
  },

  remove: async (): Promise<{ success: boolean }> => {
    const res = await axiosInstance.delete(API_ENDPOINTS.USER.PROFILE_PHOTO.DELETE);
    return res.data as { success: boolean };
  },
};


