import { axiosInstance as api } from '@/services/axiosClient';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
  const id = override ?? useAuthStore.getState().getHospitalId();
  if (!id) throw new Error('Hospital ID is not available on the current user session.');
  return id;
};

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
  // Required — must resolve to a real PatientRegistration (searched or quick-registered).
  // Enforced both client-side (Pay button disabled) and server-side (handler rejects a blank one).
  patientId: string;
  prescribingDoctorId?: string;
  // Required whenever the cart contains a scheduled drug (H/H1/X) — a doctor name/reg number,
  // enforced server-side by the same regulated-drug guard narcotics/H1 dispensing already uses.
  prescriberRef?: string;
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

export interface PharmacyPrintSettings {
  configured: boolean;
  tradeName?: string;
  dl20BNumber?: string;
  dl21BNumber?: string;
  fssaiNumber?: string;
  pharmacistName?: string;
  pharmacistRegNo?: string;
  returnPolicyText?: string;
  showVerificationQr: boolean;
  hospitalGstin?: string;
}

export interface UpsertPharmacyPrintSettingsInput {
  tradeName?: string;
  dl20BNumber?: string;
  dl21BNumber?: string;
  fssaiNumber?: string;
  pharmacistName?: string;
  pharmacistRegNo?: string;
  returnPolicyText?: string;
  showVerificationQr: boolean;
}

export interface PharmacyBillRow {
  invoiceId: string;
  invoiceNo?: string;
  invoiceDate: string;
  patientId?: string;
  patientName?: string;
  sourceModule: string;
  itemCount: number;
  totalQty: number;
  // Original gross amount charged — unaffected by any later return.
  netAmount: number;
  // Sum of any processed returns against this invoice. Was previously invisible: a returned sale
  // showed its full original netAmount with no indication anything had been refunded.
  returnedAmount: number;
  paymentMode?: string;
  processedBy?: string;
  statusCode?: string;
}

export interface PharmacyBillingHistoryResponse {
  bills: PharmacyBillRow[];
  totalAmount: number;
  totalReturnedAmount: number;
  // totalAmount - totalReturnedAmount — what was actually retained after returns.
  netSalesAmount: number;
  totalBills: number;
}

export const pharmacyApi = {
  checkout: async (hospitalId: string, request: PharmacyRetailCheckoutRequest): Promise<PharmacyRetailCheckoutResponse> => {
    const response = await api.post<PharmacyRetailCheckoutResponse>(`/api/v1/PharmacyRetail/${hospitalId}/checkout`, request);
    return response.data;
  },

  getPrintSettings: (hospitalId?: string): Promise<PharmacyPrintSettings> =>
    ipdApiClient.get<PharmacyPrintSettings>('/pharmacy-settings/print', {
      params: { hospitalId: hospitalIdOrThrow(hospitalId) },
    }),

  upsertPrintSettings: (input: UpsertPharmacyPrintSettingsInput, hospitalId?: string) =>
    ipdApiClient.put('/pharmacy-settings/print', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

  // fromDate/toDate omitted entirely => unbounded "all time" list.
  getBillingHistory: (fromDate?: Date, toDate?: Date, hospitalId?: string): Promise<PharmacyBillingHistoryResponse> =>
    ipdApiClient.get<PharmacyBillingHistoryResponse>('/pharmacy-billing/history', {
      params: {
        hospitalId: hospitalIdOrThrow(hospitalId),
        fromDate: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
        toDate: toDate ? toDate.toISOString().slice(0, 10) : undefined,
      },
    }),
};
