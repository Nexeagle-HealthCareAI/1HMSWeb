import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Interfaces for media upload API
export interface PrepareUploadRequest {
  scope: string;
  userId: string;
}

export interface PrepareUploadResponse {
  uploadURL: string;
  objectKey: string;
}

export interface FinalizeUploadRequest {
  objectKey: string;
  scope: string;
  userId: string;
}

export interface FinalizeUploadResponse {
  cdnURL: string;
  message: string;
}

export interface GetMediaURLRequest {
  scope: string;
  userId: string;
}

export interface GetMediaURLResponse {
  cdnURL: string;
}

export const mediaUploadApi = {
  // Prepare upload - get Azure Blob URL
  prepareUpload: async (data: PrepareUploadRequest): Promise<PrepareUploadResponse> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.MEDIA.PREPARE_UPLOAD, data);
      console.log('Prepare Upload Response:', response);
      return response as PrepareUploadResponse;
    } catch (error) {
      console.error('Error preparing upload:', error);
      throw error;
    }
  },

  // Upload file to Azure Blob storage
  uploadToBlob: async (uploadURL: string, file: File): Promise<void> => {
    try {
      const response = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob',
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      console.log('File uploaded to blob storage successfully');
    } catch (error) {
      console.error('Error uploading to blob:', error);
      throw error;
    }
  },

  // Finalize upload - get CDN URL
  finalizeUpload: async (data: FinalizeUploadRequest): Promise<FinalizeUploadResponse> => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.MEDIA.FINALIZE_UPLOAD, data);
      console.log('Finalize Upload Response:', response);
      return response as FinalizeUploadResponse;
    } catch (error) {
      console.error('Error finalizing upload:', error);
      throw error;
    }
  },

  // Get media URL
  getMediaURL: async (scope: string, userId: string): Promise<GetMediaURLResponse> => {
    try {
      const params = new URLSearchParams({
        scope,
        userId,
      });
      
      const response = await apiClient.get(`${API_ENDPOINTS.MEDIA.GET_URL}?${params}`);
      console.log('Get Media URL Response:', response);
      return response as GetMediaURLResponse;
    } catch (error) {
      console.error('Error getting media URL:', error);
      throw error;
    }
  },
};
