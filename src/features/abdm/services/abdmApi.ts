import { apiClient } from '@/services/axiosClient';

// ---- Shared shapes -------------------------------------------------------------------

export interface AbdmOtpTxnResponse {
  success: boolean;
  message?: string;
  txnId?: string;
}

export interface AbdmEnrollResponse {
  success: boolean;
  message?: string;
  txnId?: string;
  abhaNumber?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  mobileVerified?: boolean;
  isNew?: boolean;
  abhaAccountId?: string;
}

export interface AbdmAddressSuggestionsResponse {
  success: boolean;
  message?: string;
  txnId?: string;
  suggestions: string[];
}

export interface AbdmProfileResponse {
  success: boolean;
  message?: string;
  abhaNumber?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
}

export interface SaveAbhaAccountResponse {
  success: boolean;
  message?: string;
  abhaAccountId?: string;
}

export interface AbhaAccountSummary {
  abhaAccountId: string;
  abhaNumber: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  source: string;
  linkedPatientId?: string;
  createdAt: string;
  createdBy?: string;
}

export interface GetAbhaAccountsResponse {
  success: boolean;
  message?: string;
  accounts: AbhaAccountSummary[];
}

// ---- API -------------------------------------------------------------------------------

export const abdmApi = {
  getAccounts: (hospitalId: string) =>
    apiClient.get<GetAbhaAccountsResponse>(`/abdm/accounts?hospitalId=${encodeURIComponent(hospitalId)}`),

  // Create ABHA — Aadhaar OTP
  generateAadhaarOtp: (hospitalId: string, aadhaarNumber: string) =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/aadhaar/generate-otp', { hospitalId, aadhaarNumber }),

  verifyAadhaarOtp: (hospitalId: string, txnId: string, otp: string) =>
    apiClient.post<AbdmEnrollResponse>('/abdm/aadhaar/verify-otp', { hospitalId, txnId, otp }),

  generateMobileOtp: (hospitalId: string, txnId: string, mobile: string) =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/mobile/generate-otp', { hospitalId, txnId, mobile }),

  verifyMobileOtp: (hospitalId: string, txnId: string, otp: string) =>
    apiClient.post<AbdmEnrollResponse>('/abdm/mobile/verify-otp', { hospitalId, txnId, otp }),

  getAbhaAddressSuggestions: (txnId: string) =>
    apiClient.get<AbdmAddressSuggestionsResponse>(`/abdm/abha-address/suggestions?txnId=${encodeURIComponent(txnId)}`),

  createAbhaAddress: (hospitalId: string, txnId: string, abhaAddress: string) =>
    apiClient.post<AbdmEnrollResponse>('/abdm/abha-address', { hospitalId, txnId, abhaAddress }),

  // Link existing ABHA — Mobile/Aadhaar OTP login
  requestLoginOtp: (hospitalId: string, loginId: string, loginHint: 'mobile' | 'aadhaar' | 'abha-number', otpSystem: 'abdm' | 'aadhaar') =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/login/generate-otp', { hospitalId, loginId, loginHint, otpSystem }),

  verifyLoginOtp: (hospitalId: string, txnId: string, otp: string) =>
    apiClient.post<AbdmProfileResponse>('/abdm/login/verify-otp', { hospitalId, txnId, otp }),

  saveLinkedAccount: (hospitalId: string, profile: AbdmProfileResponse) =>
    apiClient.post<SaveAbhaAccountResponse>('/abdm/accounts/link', {
      hospitalId,
      abhaNumber: profile.abhaNumber,
      abhaAddress: profile.abhaAddress,
      fullName: profile.fullName,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      mobile: profile.mobile,
    }),
};
