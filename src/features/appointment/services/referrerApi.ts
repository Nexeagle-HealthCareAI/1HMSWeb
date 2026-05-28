import { apiClient } from '@/services/axiosClient';

export interface Referrer {
  referrerId: string;
  referrerName: string;
  referrerType: string;            // REFERRER/DOCTOR/STAFF/AGENT/DEPARTMENT
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  pan?: string | null;
  defaultRatePercent: number;
  isActive: boolean;
}

export interface GetReferrersResponse {
  referrers: Referrer[];
}

export interface CreateReferrerRequest {
  referrerName: string;
  referrerType?: string;
  phone?: string;
  email?: string;
  address?: string;
  pan?: string;
  defaultRatePercent: number;
}

export interface CreateReferrerResponse {
  referrerId: string;
  message?: string;
}

export const referrerApi = {
  // List referrers for a hospital (active by default)
  getReferrers: (hospitalId: string, search?: string, activeOnly = true): Promise<GetReferrersResponse> => {
    const params = new URLSearchParams({ hospitalId, activeOnly: String(activeOnly) });
    if (search) params.set('search', search);
    return apiClient.get(`/referrers?${params.toString()}`);
  },

  // Create a new referrer
  createReferrer: (hospitalId: string, request: CreateReferrerRequest): Promise<CreateReferrerResponse> => {
    return apiClient.post(`/referrers?hospitalId=${hospitalId}`, request);
  },
};
