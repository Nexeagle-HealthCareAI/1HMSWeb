import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface UploadDrawingParams {
    fileName: string;
    label?: string;
    hospitalId: string;
    doctorId: string;
    patientId: string;
    appointmentId: string;
}

export interface GetDrawingsParams {
    appointmentId: string;
    hospitalId: string;
    doctorId: string;
    patientId: string;
}

export interface UploadDrawingResponse {
    success: boolean;
    message?: string;
    drawingId?: string;
    fileUrl?: string;
    sequenceNo: number;
}

export interface DrawingItem {
    drawingId: string;
    fileName: string;
    storageUrl: string;
    label?: string;
    sequenceNo: number;
    uploadedBy: string;
    uploadedAt: string;
}

export interface GetDrawingsResponse {
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    drawingCount: number;
    drawings: DrawingItem[];
    success: boolean;
    message: string;
}

export const drawingApi = {
    uploadDrawing: async (params: UploadDrawingParams, file: File): Promise<UploadDrawingResponse> => {
        const formData = new FormData();
        formData.append('File', file);

        const queryParams = new URLSearchParams({
            FileName: params.fileName,
            Label: params.label || '',
            HospitalId: params.hospitalId,
            DoctorId: params.doctorId,
            PatientId: params.patientId,
            AppointmentId: params.appointmentId,
        }).toString();

        const endpoint = `${API_ENDPOINTS.DRAWINGS.UPLOAD}?${queryParams}`;

        return apiClient.post(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getDrawings: async (params: GetDrawingsParams): Promise<GetDrawingsResponse> => {
        const endpoint = API_ENDPOINTS.DRAWINGS.LIST(
            params.appointmentId,
            params.hospitalId,
            params.doctorId,
            params.patientId
        );
        return apiClient.get(endpoint);
    },

    deleteDrawing: async (drawingId: string): Promise<{ success: boolean; message: string }> => {
        const endpoint = API_ENDPOINTS.DRAWINGS.DELETE(drawingId);
        return apiClient.delete(endpoint);
    },
};
