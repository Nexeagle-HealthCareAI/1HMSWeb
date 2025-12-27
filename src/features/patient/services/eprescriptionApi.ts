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
};
