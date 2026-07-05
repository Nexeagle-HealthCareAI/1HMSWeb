import { apiClient } from '@/services/axiosClient';
import axios from 'axios';
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

  // Get all available plans (hits a separate microservice, hence direct axios call using the endpoint URL).
  // CMSAPI's GetPlans() returns every plan for every product (1Rad + EasyHMS) and does not filter
  // inactive rows server-side, so both filters below are required here, not optional.
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await axios.get(API_ENDPOINTS.SUBSCRIPTION.GET_PLANS_URL);
    return response.data
      .filter((p: any) => p.applicationName === 'EasyHMS' && p.isActive !== false)
      .map((p: any) => ({
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
