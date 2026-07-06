import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface SubscriptionStatusResponse {
  status: string;
  daysLeft?: number;
  paymentAmount?: number;
  paymentDate?: string;
  planId?: string;
}

export type BillingCycle = 'Monthly' | 'Yearly';

export interface SubscriptionPlan {
  id: string;
  name: string;
  basePrice: number;
  discountedPrice: number;
  billingCycle: BillingCycle;
  features: string[];
}

export interface SelectPlanRequest {
  hospitalId: string;
  planId: string;
}

export interface SubmitPaymentRequest {
  hospitalId: string;
  amount: number;
  reference: string;
}

export const subscriptionApi = {
  // Get current subscription status
  getStatus: async (hospitalId: string): Promise<SubscriptionStatusResponse> => {
    return apiClient.get(API_ENDPOINTS.SUBSCRIPTION.GET_STATUS(hospitalId));
  },

  // Get all available plans. Proxied through easyHMSAPI's GET api/v1/Subscription/plans
  // (server-to-server to CMSAPI with a shared service key) — the browser has no CMS credential,
  // and CMSAPI's plan endpoints require CMS auth, so this can no longer hit CMS directly.
  // The EasyHMS + active-only filtering happens server-side in CMSAPI's service endpoint now.
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get<any[]>(API_ENDPOINTS.SUBSCRIPTION.GET_PLANS);
    return (response ?? []).map((p: any) => ({
      id: p.planId,
      name: p.name,
      basePrice: p.basePrice,
      discountedPrice: p.discountPrice,
      billingCycle: p.billingCycle,
      features: ['Appointment', 'Auto billing', 'IPD', 'Prescription writing', 'Advance analytics', 'Training', '24*7 Support']
    }));
  },

  // Select a plan
  selectPlan: async (data: SelectPlanRequest): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.SUBSCRIPTION.SELECT_PLAN(data.hospitalId), { planId: data.planId });
  },

  // Submit payment reference
  submitPayment: async (data: SubmitPaymentRequest): Promise<any> => {
    return apiClient.post(API_ENDPOINTS.SUBSCRIPTION.SUBMIT_PAYMENT(data.hospitalId), {
      amount: data.amount,
      reference: data.reference
    });
  }
};
