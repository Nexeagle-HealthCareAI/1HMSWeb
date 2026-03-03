import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type ChargeCategory =
    | 'Consultation'
    | 'Laboratory'
    | 'Radiology'
    | 'Procedures'
    | 'Admission'
    | 'Bed Charges'
    | 'Nursing'
    | 'OT Charges'
    | 'Physiotherapy'
    | 'Vaccination'
    | 'Miscellaneous';


export type VisitType = 'OPD' | 'LAB' | 'PHARMACY' | 'IPD' | 'ER' | 'OTHER';

export type ChargeType = 'Service' | 'Product' | 'Bed' | 'Package' | 'Procedure';

export interface ChargeItemRequest {
    chargeItemId?: string;
    displayName: string;
    visitType: VisitType | string;
    category: ChargeCategory | string;
    chargeType: ChargeType | string;
    defaultQty: number;
    defaultRate: number;
    defaultDiscountPercent: number;
}

export interface ChargeItemResponse {
    success: boolean;
    message: string;
    chargeItemId: string;
}

export interface ChargeItem {
    chargeItemId: string;
    hospitalId: string;
    displayName: string;
    visitType: VisitType | string;
    category: ChargeCategory | string;
    chargeType: ChargeType | string;
    defaultQty: number;
    defaultRate: number;
    defaultDiscountPercent: number;
    updatedAt: string;
    updatedBy: string;
}

export interface GetChargeItemsResponse {
    success: boolean;
    message: string;
    data: ChargeItem[];
}

export interface DeleteChargeItemRequest {
    chargeItemId: string;
    hospitalId: string;
}

export interface DeleteChargeItemResponse {
    success: boolean;
    message: string;
}

export const billingService = {
    createChargeItem: async (chargeData: ChargeItemRequest): Promise<ChargeItemResponse> => {
        const hospitalId = useAuthStore.getState().getHospitalId();
        const url = API_ENDPOINTS.BILLING.CREATE_CHARGE;

        const payload = {
            ...chargeData,
            hospitalId
        };

        if (chargeData.chargeItemId) {
            // Include chargeItemId if present (for updates)
            (payload as any).chargeItemId = chargeData.chargeItemId;
        }

        const response = await apiClient.post<ChargeItemResponse>(url, payload);
        return response;
    },

    getChargeItems: async (): Promise<GetChargeItemsResponse> => {
        const hospitalId = useAuthStore.getState().getHospitalId();
        const url = API_ENDPOINTS.BILLING.GET_CHARGES(hospitalId);

        const response = await apiClient.get<GetChargeItemsResponse>(url);
        return response;
    },

    deleteChargeItem: async (chargeItemId: string): Promise<DeleteChargeItemResponse> => {
        const hospitalId = useAuthStore.getState().getHospitalId();
        const url = API_ENDPOINTS.BILLING.DELETE_CHARGE;

        const requestBody: DeleteChargeItemRequest = {
            chargeItemId,
            hospitalId
        };

        // Pass data in the config object for DELETE request
        const response = await apiClient.delete<DeleteChargeItemResponse>(url, { data: requestBody });
        return response;
    }
};
