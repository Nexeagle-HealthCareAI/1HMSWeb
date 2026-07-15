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
  // Upload profile picture. hospitalId is only set for an admin uploading on behalf of a doctor
  // other than themselves (Public Directory tile editor) — triggers the backend's hospital-
  // membership + doctor-belongs-to-hospital ownership guard. Self-service uploads omit it.
  uploadProfilePicture: async (userId: string, file: File, hospitalId?: string): Promise<ProfilePictureResponse> => {
    try {
      const formData = new FormData();
      formData.append('UserId', userId);
      formData.append('File', file);
      if (hospitalId) {
        formData.append('HospitalId', hospitalId);
      }
      const response = await apiClient.put(API_ENDPOINTS.USER.UPLOAD_PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response as ProfilePictureResponse;
    } catch (error) {
      throw error;
    }
  },

  // Get profile picture URL
  getProfilePicture: async (userId: string): Promise<ProfilePictureResponse> => {
    try {
      const url = API_ENDPOINTS.USER.GET_PROFILE_PICTURE(userId);
      const response = await apiClient.get(url);     
      return response as ProfilePictureResponse;
    } catch (error) {      
      throw error;
    }
  },

  // Remove profile picture
  removeProfilePicture: async (userId: string): Promise<ProfilePictureResponse> => {
    try {  

      const response = await apiClient.delete(API_ENDPOINTS.USER.REMOVE_PROFILE_PICTURE, {
        data: { userId },
      });    
      return response as ProfilePictureResponse;
    } catch (error) {      
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
      const response = await apiClient.post(API_ENDPOINTS.PRESCRIPTION.UPLOAD_ASSET, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response as UploadResponse;
    } catch (error) {     
      throw error;
    }
  },

  // Get prescription assets
  getPrescriptionAssets: async (doctorId: string): Promise<PrescriptionAssetsResponse> => {
    try {
      const url = API_ENDPOINTS.PRESCRIPTION.GET_ASSETS(doctorId);     

      const response = await apiClient.get(url);
     
      return response as PrescriptionAssetsResponse;
    } catch (error) {      
      throw error;
    }
  },

  // Delete prescription asset
  deletePrescriptionAsset: async (deleteRequest: DeleteAssetRequest): Promise<DeleteAssetResponse> => {
    try {    

      const response = await apiClient.delete(API_ENDPOINTS.PRESCRIPTION.DELETE_ASSET, {
        data: deleteRequest,
      });     
      return response as DeleteAssetResponse;
    } catch (error) {
      
      throw error;
    }
  }
};
 