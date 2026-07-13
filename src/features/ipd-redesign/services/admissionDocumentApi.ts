import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

export interface AdmissionDocumentItem {
    documentId: string;
    documentName: string;
    contentType?: string | null;
    fileSizeBytes?: number | null;
    storageUrl: string;
    uploadedAt: string;
    uploadedBy?: string | null;
}

export interface UploadAdmissionDocumentResponse {
    success: boolean;
    message?: string;
    documentId?: string;
    fileUrl?: string;
}

export interface GetAdmissionDocumentsResponse {
    success: boolean;
    message?: string;
    documentCount: number;
    documents: AdmissionDocumentItem[];
}

export interface DeleteAdmissionDocumentResponse {
    success: boolean;
    message?: string;
}

// Client-side pre-check so the user gets instant feedback instead of a round trip — the backend
// re-validates the same constraints regardless (never trust the client alone).
export const validateDocumentFile = (file: File): string | null => {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) return 'File is too large. Maximum allowed size is 20 MB.';
    const dot = file.name.lastIndexOf('.');
    const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) return 'Unsupported file type. Allowed types: PDF, JPG, PNG, DOC, DOCX.';
    return null;
};

export const admissionDocumentApi = {
    upload: async (admissionId: string, file: File, hospitalId?: string): Promise<UploadAdmissionDocumentResponse> => {
        try {
            const formData = new FormData();
            formData.append('HospitalId', hospitalIdOrThrow(hospitalId));
            formData.append('AdmissionId', admissionId);
            formData.append('File', file);
            return await ipdApiClient.post<UploadAdmissionDocumentResponse>('/admission/document/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not upload the document.'));
        }
    },

    list: (admissionId: string, hospitalId?: string): Promise<GetAdmissionDocumentsResponse> =>
        ipdApiClient.get<GetAdmissionDocumentsResponse>('/admission/document/list', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId },
        }),

    delete: async (documentId: string, admissionId: string, hospitalId?: string): Promise<DeleteAdmissionDocumentResponse> => {
        try {
            return await ipdApiClient.delete<DeleteAdmissionDocumentResponse>('/admission/document/delete', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, documentId },
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not delete the document.'));
        }
    },
};
