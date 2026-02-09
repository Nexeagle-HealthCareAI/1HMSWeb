import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface LookupData {
    lookupId?: string; // For master lookup
    personalId?: string; // For personal lookup
    code: string;
    name: string;
    nameLower: string;
    shortDesc?: string;
    usageCount: number;
}

export interface LookupSearchResponse {
    hospitalId: string;
    doctorId: string;
    lookupType: string;
    lookupTypeId: number;
    personalLookupData: LookupData[];
    masterLookupData: LookupData[];
    success: boolean;
    message: string;
}

export interface PersonalLookupItem {
    personalId: string;
    code: string;
    name: string;
    nameLower: string;
    shortDesc?: string;
    usageCount: number;
}

export interface LookupGroup {
    lookupTypeId: number;
    lookupType: string;
    count: number;
    personalData: PersonalLookupItem[];
    generatedAtUtc: string;
}

export interface LookupDetailsResponse {
    hospitalId: string;
    doctorId: string;
    lookupType: string;
    totalTypes: number;
    items: LookupGroup[];
    success: boolean;
    message: string;
}


export interface MedicineSearchItem {
    id?: string;
    medicineName: string;
    brandName: string;
    genericName: string;
    manufacturer: string;
    dosageForm: string;
    strength: string;
    usageDescription: string;
    sideEffects: string;
    price: number;
    notes?: string;
    isActive?: boolean;
    usageCount?: number;
    lastModifiedAt?: string;
}

export interface MedicineSearchResponse {
    hospitalId: string;
    doctorId: string;
    personalMedicine: MedicineSearchItem[];
    masterMedicine: MedicineSearchItem[];
    success: boolean;
    message: string;
}

export interface UploadVisitSummaryResponse {
    success: boolean;
    message: string;
    url: string | null;
}

export interface EPrescriptionDraftReq {
    prescriptionId: string | null;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    hospitalId: string;
    vitalsJson?: {
        bp: { sys: number; dia: number };
        pulse: number;
        tempC: number;
        spo2: number;
        heightCm: number;
        weightKg: number;
        bmi: number;
        respiratoryRate: number;
    };
    chiefComplaint?: string;
    history?: string;
    comorbidity?: string;
    examination?: string;
    diagnosis?: string;
    orders?: {
        investigations: string[];
        procedures: string[];
    };
    medications?: {
        drugName: string;
        dose: string;
        route: string;
        frequency: string;
        duration: string;
        instructions: string;
        saltName: string;
        displayOrder: number | null;
    }[];
    nonPharmacologicalAdvice?: {
        advice: string;
        duration: string;
        notes: string;
    }[];
    privateNotes?: string;
    certificates?: any;
    followUp?: {
        followUpOn: string;
        reason: {
            reason: string;
            patientInstructions: string;
        };
        referral: {
            referredTo: {
                specialty: string;
                doctorName: string;
                referralEnabled: boolean;
            };
            clinicalSummary: string;
        };
    };
    immunizations?: {
        name: string;
        status: string;
        date: string;
        nextDueDate: string;
        doseNumber: number;
        remarks: string;
    }[];
    loggedInUserName: string;
}

export interface DoctorPreferenceReq {
    preferrredId: number | null;
    doctorId: string;
    hospitalId: string;
    source: string;
    medicine: {
        medicineName: string;
        manufacturer: string;
        genericName: string;
        brandName: string;
        dosageForm: string;
        strength: string;
    };
}

export const eprescriptionApi = {
    searchLookupParams: async (
        lookupType: string,
        hospitalId: string,
        doctorId: string,
        searchText: string
    ): Promise<LookupSearchResponse> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.LOOKUP_SEARCH(
            lookupType,
            hospitalId,
            doctorId,
            searchText
        );
        return apiClient.get<LookupSearchResponse>(endpoint);
    },

    uploadVisitSummary: async (appointmentId: string, file: File): Promise<UploadVisitSummaryResponse> => {
        const formData = new FormData();
        formData.append('File', file);

        const response = await apiClient.post<UploadVisitSummaryResponse>(
            API_ENDPOINTS.E_PRESCRIPTION.UPLOAD_VISIT_SUMMARY,
            formData,
            {
                params: { AppointmentId: appointmentId },
                headers: {
                    'Content-Type': undefined,
                } as any // Cast to allow undefined override
            }
        );
        return response;
    },
    getLookupDetails: async (
        hospitalId: string,
        doctorId: string
    ): Promise<LookupDetailsResponse> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.LOOKUP_DETAILS(hospitalId, doctorId);
        return apiClient.get<LookupDetailsResponse>(endpoint);
    },
    searchMedicines: async (
        hospitalId: string,
        doctorId: string,
        searchText: string
    ): Promise<MedicineSearchResponse> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_SEARCH(hospitalId, doctorId, searchText);
        return apiClient.get<MedicineSearchResponse>(endpoint);
    },
    saveDoctorPreference: async (data: DoctorPreferenceReq): Promise<{ success: boolean; message: string }> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE(data.source);
        return apiClient.put<{ success: boolean; message: string }>(endpoint, data);
    },
    saveDraft: async (data: EPrescriptionDraftReq): Promise<{ success: boolean; message: string }> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.SAVE_DRAFT('draft');
        return apiClient.post<{ success: boolean; message: string }>(endpoint, data);
    },
    saveSubmit: async (data: EPrescriptionDraftReq): Promise<{ success: boolean; message: string }> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.SAVE_DRAFT('submit');
        return apiClient.post<{ success: boolean; message: string }>(endpoint, data);
    },
    getDraft: async (
        appointmentId: string,
        patientId: string,
        doctorId: string,
        hospitalId: string
    ): Promise<{ success: boolean; message: string; data: EPrescriptionDraftReq }> => {
        const endpoint = API_ENDPOINTS.E_PRESCRIPTION.GET_DRAFT(appointmentId, patientId, doctorId, hospitalId);
        return apiClient.get<{ success: boolean; message: string; data: EPrescriptionDraftReq }>(endpoint);
    },
};
