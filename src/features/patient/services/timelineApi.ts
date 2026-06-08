import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS, API_BASE_URL } from '@/app/api';

// --- Interfaces based on the provided JSON response ---

export interface TimelineStatusHistory {
    status: string;
    timestamp: string;
}

export interface TimelineVitals {
    bp: {
        sys: number;
        dia: number;
    };
    pulse: number;
    tempC: number;
    spo2: number;
    heightCm: number;
    weightKg: number;
    bmi: number;
}

export interface TimelineOrders {
    investigations: string[];
    procedures: string[];
}

export interface TimelineMedication {
    drugName: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
    instructions: string;
    saltName: string;
}

export interface TimelineAdvice {
    advice: string;
    duration: string;
    notes: string;
}

export interface TimelineCertificate {
    type: string;
    content: string;
    issuedDate: string;
    fromDate: string;
    toDate: string;
    fitnessStatus: string;
    remarks: string;
    category: string;
}

export interface TimelineReferral {
    referredTo: {
        specialty: string;
        doctorName: string;
    };
    clinicalSummary: string;
}

export interface TimelineFollowUp {
    followUpOn: string;
    reason: string;
    patientInstructions: string;
    referralEnabled: boolean;
    referral: TimelineReferral;
}

export interface TimelineImmunization {
    name: string;
    status: string;
    date: string;
    nextDueDate: string;
    doseNumber: number;
    remarks: string;
}

export interface TimelineAttachment {
    attachmentId: string;
    reportType: string;
    fileName: string;
    storageUrl: string;
    notes: string;
    uploadedAt: string;
    uploadedBy: string;
}

export interface TimelineEventData {
    apptID: string;
    appDate: string;
    status: string;
    doctorId?: string;
    doctorName?: string;
    statusJsonHistory: TimelineStatusHistory[];
    vitalsJson: TimelineVitals;
    chiefComplaint: string;
    history: string;
    comorbidity: string;
    examination: string;
    diagnosis: string;
    orders: TimelineOrders;
    medications: TimelineMedication[];
    nonPharmacologicalAdvice: TimelineAdvice[];
    privateNotes: string;
    certificates: TimelineCertificate;
    followUp: TimelineFollowUp;
    immunizations: TimelineImmunization[];
    attachments: TimelineAttachment[];
    customFields?: { key: string; label?: string; value?: string }[];
}

export interface PatientTimelineRecord {
    patientID: string;
    hospitalId: string;
    doctorId: string;
    timelineData: TimelineEventData[];
}

export interface TimelineApiResponse {
    success: boolean;
    message: string;
    data: PatientTimelineRecord[];
}

// --- Service ---

export const timelineApi = {
    getEvents: async (patientId: string, doctorId: string, hospitalId: string): Promise<TimelineApiResponse> => {
        // Construct the URL using the helper from API_ENDPOINTS
        const endpoint = API_ENDPOINTS.TIMELINE.GET_EVENTS(patientId, doctorId, hospitalId);
        // Combine base URL and endpoint (assuming API_BASE_URL doesn't end with slash and endpoint doesn't start with one, or handled by helper)
        // Note: API_ENDPOINTS usually return relative paths.
        // If apiClient handles baseURL, we just pass the relative path.
        // If not, we might need `${API_BASE_URL}/${endpoint}`. 
        // Checking previous code, it used `${API_BASE_URL}/${API_ENDPOINTS...}`.
        // Let's assume standard practice.

        // However, looking at api.ts, API_ENDPOINTS returns the path starting with e-prescription/...
        // Let's try passing the relative URL if apiClient has baseURL configured, or construct full URL.
        // Safest based on typical patterns in this codebase:
        const url = `${API_BASE_URL}/${endpoint}`;

        const response = await apiClient.get<TimelineApiResponse>(url);
        return response;
    }
};
