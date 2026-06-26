
import axios from 'axios';
import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS, API_BASE_URL } from '@/app/api';

export interface UploadAttachmentParams {
    fileName: string;
    reportType: string;
    notes?: string;
    hospitalId: string;
    doctorId: string;
    patientId: string;
    appointmentId: string;
}

export interface GetAttachmentsParams {
    appointmentId: string;
    hospitalId: string;
    doctorId: string;
    patientId: string;
}

export interface AttachmentResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface AttachmentItem {
    attachmentId: string;
    fileName: string;
    storageUrl: string;
    reportType: string;
    uploadedBy: string;
    uploadedAt: string;
    notes?: string;
}

export interface GetAttachmentsResponse {
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    attachmentCount: number;
    attachments: AttachmentItem[];
    success: boolean;
    message: string;
}

export const labApi = {
    uploadAttachment: async (params: UploadAttachmentParams, file: File): Promise<AttachmentResponse> => {
        const formData = new FormData();
        formData.append('File', file);

        const queryParams = new URLSearchParams({
            FileName: params.fileName,
            ReportType: params.reportType,
            Notes: params.notes || 'NA',
            HospitalId: params.hospitalId,
            DoctorId: params.doctorId,
            PatientId: params.patientId,
            AppointmentId: params.appointmentId,
            LoggedInUserId: params.doctorId, // Assuming doctor is logged in
        }).toString();

        const endpoint = `${API_ENDPOINTS.ATTACHMENTS.UPLOAD}?${queryParams}`;

        // axiosClient handles global headers, but for FormData we need to let browser set boundary.
        // However, apiClient might set Content-Type: application/json by default.
        // We'll rely on axios to handle multipart/form-data content-type when data is FormData.
        return apiClient.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getAttachments: async (params: GetAttachmentsParams): Promise<GetAttachmentsResponse> => {
        const endpoint = API_ENDPOINTS.ATTACHMENTS.LIST(
            params.appointmentId,
            params.hospitalId,
            params.doctorId,
            params.patientId
        );
        return apiClient.get(endpoint);
    },
    deleteAttachment: async (attachmentId: string): Promise<{ success: boolean; message: string }> => {
        const endpoint = API_ENDPOINTS.ATTACHMENTS.DELETE(attachmentId);
        return apiClient.delete(endpoint);
    },
    viewAttachment: async (url: string): Promise<string> => {
        try {
            let blob: Blob;

            // Check if URL is relative or matches our API base URL (internal)
            const isRelative = url && !url.startsWith('http');
            const isInternal = isRelative || (url && url.startsWith(API_BASE_URL));

            if (isInternal) {
                // Internal API: Use apiClient to include Auth headers
                // apiClient.get returns response.data which is the blob when responseType is blob
                // Note: apiClient automatically handles baseURL for relative paths
                blob = await apiClient.get<Blob>(url, {
                    responseType: 'blob'
                });
                return window.URL.createObjectURL(blob);
            } else {
                // External presigned URL (S3/MinIO):
                // Do NOT fetch via axios/XHR to avoid CORS issues if the storage doesn't allow the origin.
                // Just use the direct URL which works effectively in <img> tags or window.open
                return url;
            }
        } catch (error) {
            console.error("View attachment failed", error);
            throw error;
        }
    },
};

