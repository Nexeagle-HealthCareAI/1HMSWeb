import { axiosInstance as api } from '@/services/axiosClient';

export interface PharmacyCartItem {
  inventoryItemId: string;
  batchId?: string;
  qty: number;
  rate: number;
  discountPercent: number;
}

export type PharmacySettlementMode = 'DIRECT_CASH' | 'POST_TO_ADMISSION_DAY_BILL';

export interface PharmacyRetailCheckoutRequest {
  storeId: string;
  patientId?: string;
  walkInName?: string;
  walkInContact?: string;
  prescribingDoctorId?: string;
  items: PharmacyCartItem[];
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  paymentMode?: string;
  settlementMode?: PharmacySettlementMode;
}

export interface AllocatedBatchLine {
  inventoryItemId: string;
  batchId: string;
  batchNumber?: string;
  expiryDate?: string;
  mrp?: number;
  allocatedQty: number;
}

export interface PharmacyRetailCheckoutResponse {
  success: boolean;
  message?: string;
  encounterId: string;
  chargeEventId: string;
  invoiceId: string;
  invoiceNo: string;
  allocatedBatches: AllocatedBatchLine[];
}

export const pharmacyApi = {
  checkout: async (hospitalId: string, request: PharmacyRetailCheckoutRequest): Promise<PharmacyRetailCheckoutResponse> => {
    const response = await api.post<PharmacyRetailCheckoutResponse>(`/v1/PharmacyRetail/${hospitalId}/checkout`, request);
    return response.data;
  }
};
