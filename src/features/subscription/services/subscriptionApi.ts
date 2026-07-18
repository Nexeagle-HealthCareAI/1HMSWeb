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
  // Exact cutoff timestamp — used for a live countdown as it nears expiry, not just the
  // whole-days daysLeft above.
  subscriptionEndDate?: string | null;
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
  status: string; // PendingApproval, Approved, Rejected, Superseded
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  // Set when this submission was a mid-cycle plan switch — Amount above already has the credit
  // for the previous plan's unused days applied.
  isProratedSwitch: boolean;
  previousPlanName: string | null;
  proratedCreditAmount: number | null;
}

export interface SubscriptionUsage {
  // null = unlimited (Enterprise tier, or no subscription row yet).
  maxDoctors: number | null;
  currentDoctors: number;
  maxBeds: number | null;
  currentBeds: number;
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
  // Present when this submission is a mid-cycle switch from an already-Active plan — carries the
  // proration breakdown through so CMS can see/verify it before approving.
  previousPlanId?: string;
  previousPlanName?: string;
  proratedCreditAmount?: number;
  isProratedSwitch?: boolean;
}

export interface SwitchQuote {
  isProrated: boolean;
  previousPlanId: string | null;
  previousPlanName: string | null;
  daysRemaining: number;
  totalCycleDays: number;
  creditAmount: number;
  newPlanPrice: number;
  amountDue: number;
}

// Mid-cycle plan switch pricing: the hospital is only charged for the new plan minus a credit for
// the unused days left on their current plan, prorated off what they actually paid for it (not
// the plan's list price). Only applies when switching away from an already-Active, paid plan —
// first-time subscribers and trial hospitals always pay the new plan's full price. The credit can
// never exceed what was actually paid, and amountDue never goes below ₹0 (no refunds are issued
// anywhere in this manual-payment system, so any leftover credit beyond the new plan's price is
// forfeited rather than carried forward).
export const computeSwitchQuote = (
  status: SubscriptionStatusResponse | undefined,
  previousPlan: SubscriptionPlan | undefined | null,
  newPlan: SubscriptionPlan
): SwitchQuote => {
  const newPlanPrice = newPlan.discountedPrice;
  const flatQuote: SwitchQuote = {
    isProrated: false,
    previousPlanId: null,
    previousPlanName: null,
    daysRemaining: 0,
    totalCycleDays: 0,
    creditAmount: 0,
    newPlanPrice,
    amountDue: newPlanPrice,
  };

  if (!status || status.status !== 'Active' || !previousPlan || previousPlan.id === newPlan.id) {
    return flatQuote;
  }
  if (!status.paymentAmount || status.daysLeft == null) return flatQuote;

  const totalCycleDays = CYCLE_DAYS[previousPlan.billingCycle];
  const daysRemaining = Math.max(0, Math.min(status.daysLeft, totalCycleDays));
  if (daysRemaining <= 0) return flatQuote;

  const rawCredit = Math.round((status.paymentAmount * daysRemaining) / totalCycleDays);
  const creditAmount = Math.min(rawCredit, status.paymentAmount);
  const amountDue = Math.max(0, newPlanPrice - creditAmount);

  return {
    isProrated: true,
    previousPlanId: previousPlan.id,
    previousPlanName: previousPlan.name,
    daysRemaining,
    totalCycleDays,
    creditAmount,
    newPlanPrice,
    amountDue,
  };
};

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
      paymentMode: data.paymentMode,
      previousPlanId: data.previousPlanId,
      previousPlanName: data.previousPlanName,
      proratedCreditAmount: data.proratedCreditAmount,
      isProratedSwitch: data.isProratedSwitch
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
      rejectionReason: p.rejectionReason ?? null,
      isProratedSwitch: !!p.isProratedSwitch,
      previousPlanName: p.previousPlanName ?? null,
      proratedCreditAmount: p.proratedCreditAmount ?? null
    }));
  },

  // Current doctor/bed usage against the hospital's plan limits — powers the "X of Y used"
  // banners in Bed Management and User Management so admins can see headroom before hitting it.
  getUsage: async (hospitalId: string): Promise<SubscriptionUsage> => {
    const response = await apiClient.get<any>(API_ENDPOINTS.SUBSCRIPTION.GET_USAGE(hospitalId));
    return {
      maxDoctors: response?.maxDoctors ?? null,
      currentDoctors: response?.currentDoctors ?? 0,
      maxBeds: response?.maxBeds ?? null,
      currentBeds: response?.currentBeds ?? 0
    };
  }
};
