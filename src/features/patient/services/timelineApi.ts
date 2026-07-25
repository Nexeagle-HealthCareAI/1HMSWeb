import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

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
    systemicExamination?: string;
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
        // apiClient already has baseURL configured (API_REQUEST_BASE_URL, see axiosClient.ts) —
        // pass the relative endpoint straight through, same as every other call in this codebase.
        // Manually prepending the base URL here (as this used to) bypasses that baseURL entirely
        // once it's absolute, which broke in dev (mixed-content: page is HTTPS, the real API host
        // is plain HTTP — see app/api.ts's API_REQUEST_BASE_URL comment).
        const endpoint = API_ENDPOINTS.TIMELINE.GET_EVENTS(patientId, doctorId, hospitalId);
        const response = await apiClient.get<TimelineApiResponse>(endpoint);
        return response;
    }
};
