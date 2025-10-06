import { apiClient } from './axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types for image upload
export interface UploadResponse {
  success: boolean;
  assestUrl?: string;
  message: string;
}

export interface ProfilePictureResponse {
  success: boolean;
  message: string;
  profilePictureUrl?: string;
}

export interface PrescriptionAsset {
  prescriptionAssestId: string;
  assetType: 'header_image' | 'footer_image' | 'signature_image';
  blobAssetId: string;
  blobUrl: string;
}

export interface PrescriptionAssetsResponse {
  prescriptionAssestId: string;
  doctorId: string;
  assets: PrescriptionAsset[];
  success: boolean;
  message: string;
}

export interface DeleteAssetRequest {
  prescriptionAssestId: string;
  blobAssetId: string;
}

export interface DeleteAssetResponse {
  success: boolean;
  message: string;
}

// Media Upload API service
export const mediaUploadApi = {
  // Upload profile picture
  uploadProfilePicture: async (userId: string, file: File): Promise<ProfilePictureResponse> => {
    try {
      const formData = new FormData();
      formData.append('UserId', userId);
      formData.append('File', file);

      console.log('Upload Profile Picture API Call:');
      console.log('- User ID:', userId);
      console.log('- File name:', file.name);
      console.log('- File size:', file.size);
      console.log('- File type:', file.type);
      console.log('- URL:', API_ENDPOINTS.USER.UPLOAD_PROFILE_PICTURE);

      const response = await apiClient.put(API_ENDPOINTS.USER.UPLOAD_PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload Profile Picture Response:', response);
      return response as ProfilePictureResponse;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  // Get profile picture URL
  getProfilePicture: async (userId: string): Promise<ProfilePictureResponse> => {
    try {
      const url = API_ENDPOINTS.USER.GET_PROFILE_PICTURE(userId);
      console.log('Get Profile Picture API Call:');
      console.log('- User ID:', userId);
      console.log('- URL:', url);

      const response = await apiClient.get(url);
      console.log('Get Profile Picture Response:', response);
      return response as ProfilePictureResponse;
    } catch (error) {
      console.error('Error getting profile picture:', error);
      throw error;
    }
  },

  // Remove profile picture
  removeProfilePicture: async (userId: string): Promise<ProfilePictureResponse> => {
    try {
      console.log('Remove Profile Picture API Call:');
      console.log('- User ID:', userId);
      console.log('- URL:', API_ENDPOINTS.USER.REMOVE_PROFILE_PICTURE);

      const response = await apiClient.delete(API_ENDPOINTS.USER.REMOVE_PROFILE_PICTURE, {
        data: { userId },
      });

      console.log('Remove Profile Picture Response:', response);
      return response as ProfilePictureResponse;
    } catch (error) {
      console.error('Error removing profile picture:', error);
      throw error;
    }
  },

  // Upload prescription asset (header, footer, signature)
  uploadPrescriptionAsset: async (
    doctorId: string, 
    file: File, 
    assetType: 'header_image' | 'footer_image' | 'signature_image',
    prescriptionSettingId: string
  ): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('DoctorId', doctorId);
      formData.append('File', file);
      formData.append('AssetType', assetType);
      formData.append('PrescriptionSettingId', prescriptionSettingId);

      console.log('Upload Prescription Asset API Call:');
      console.log('- Doctor ID:', doctorId);
      console.log('- File name:', file.name);
      console.log('- File size:', file.size);
      console.log('- File type:', file.type);
      console.log('- Asset Type:', assetType);
      console.log('- Prescription Setting ID:', prescriptionSettingId);
      console.log('- URL:', API_ENDPOINTS.PRESCRIPTION.UPLOAD_ASSET);

      const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTION.UPLOAD_ASSET, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload Prescription Asset Response:', response);
      return response as UploadResponse;
    } catch (error) {
      console.error('Error uploading prescription asset:', error);
      throw error;
    }
  },

  // Get prescription assets
  getPrescriptionAssets: async (doctorId: string): Promise<PrescriptionAssetsResponse> => {
    try {
      const url = API_ENDPOINTS.PRESCRIPTION.GET_ASSETS(doctorId);
      console.log('Get Prescription Assets API Call:');
      console.log('- Doctor ID:', doctorId);
      console.log('- URL:', url);

      const response = await apiClient.get(url);
      console.log('Get Prescription Assets Response:', response);
      return response as PrescriptionAssetsResponse;
    } catch (error) {
      console.error('Error getting prescription assets:', error);
      throw error;
    }
  },

  // Delete prescription asset
  deletePrescriptionAsset: async (deleteRequest: DeleteAssetRequest): Promise<DeleteAssetResponse> => {
    try {
      console.log('Delete Prescription Asset API Call:');
      console.log('- Prescription Asset ID:', deleteRequest.prescriptionAssestId);
      console.log('- Blob Asset ID:', deleteRequest.blobAssetId);
      console.log('- URL:', API_ENDPOINTS.PRESCRIPTION.DELETE_ASSET);

      const response = await apiClient.delete(API_ENDPOINTS.PRESCRIPTION.DELETE_ASSET, {
        data: deleteRequest,
      });

      console.log('Delete Prescription Asset Response:', response);
      return response as DeleteAssetResponse;
    } catch (error) {
      console.error('Error deleting prescription asset:', error);
      throw error;
    }
  },

  // Generic file upload (for future use)
  uploadFile: async (file: File, folder?: string): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) {
        formData.append('folder', folder);
      }

      console.log('Upload File API Call:');
      console.log('- File name:', file.name);
      console.log('- File size:', file.size);
      console.log('- File type:', file.type);
      console.log('- Folder:', folder);

      // Using a generic upload endpoint (you may need to adjust this)
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload File Response:', response);
      return response as UploadResponse;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
};
 