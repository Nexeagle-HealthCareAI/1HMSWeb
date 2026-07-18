import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface SubscriptionStatusResponse {
  status: string;
  daysLeft?: number;
  paymentAmount?: number;
  paymentReference?: string | null;
  paymentMode?: string | null;
  paymentDate?: string;
  planId?: string;
  // Set by a CMS admin when a submitted payment is rejected (status === 'Rejected').
  rejectionReason?: string | null;
  rejectedAt?: string | null;
}

export const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cheque', 'Card', 'Cash'] as const;
export type PaymentMode = typeof PAYMENT_MODES[number];

export type BillingCycle = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export const CYCLE_DAYS: Record<BillingCycle, number> = {
  Monthly: 30,
  Quarterly: 90,
  'Half-Yearly': 182,
  Yearly: 365,
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  Monthly: 'month',
  Quarterly: 'quarter',
  'Half-Yearly': '6 months',
  Yearly: 'year',
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  basePrice: number;
  discountedPrice: number;
  billingCycle: BillingCycle;
  features: string[];
  // null = unlimited (used for the Enterprise tier).
  maxDoctors: number | null;
  maxBeds: number | null;
  isEnterprise: boolean;
}

// Backend stores Features as a raw JSON string, not an array.
const parseFeatures = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export interface PaymentHistoryEntry {
  paymentId: string;
  planId: string | null;
  planName: string | null;
  amount: number;
  reference: string;
  paymentMode: string | null;
  status: string; // PendingApproval, Approved, Rejected
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface SelectPlanRequest {
  hospitalId: string;
  planId: string;
}

export interface SubmitPaymentRequest {
  hospitalId: string;
  amount: number;
  reference: string;
  paymentMode: string;
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
      features: parseFeatures(p.features),
      maxDoctors: p.maxDoctors ?? null,
      maxBeds: p.maxBeds ?? null,
      isEnterprise: !!p.isEnterprise
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
      reference: data.reference,
      paymentMode: data.paymentMode
    });
  },

  // Every past payment submission (PendingApproval/Approved/Rejected), newest first.
  getPaymentHistory: async (hospitalId: string): Promise<PaymentHistoryEntry[]> => {
    const response = await apiClient.get<any[]>(API_ENDPOINTS.SUBSCRIPTION.GET_PAYMENT_HISTORY(hospitalId));
    return (response ?? []).map((p: any) => ({
      paymentId: p.paymentId,
      planId: p.planId ?? null,
      planName: p.planName ?? null,
      amount: p.amount,
      reference: p.reference,
      paymentMode: p.paymentMode ?? null,
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt ?? null,
      rejectionReason: p.rejectionReason ?? null
    }));
  }
};
