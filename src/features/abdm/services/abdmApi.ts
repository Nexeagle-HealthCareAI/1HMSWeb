import { apiClient, axiosInstance } from '@/services/axiosClient';

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
  // Authenticated session handle from a just-completed OTP verification — pass to the
  // profile-update calls below while it's still live (~20 min).
  txnId?: string;
  abhaNumber?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  // Only populated by getProfile() (§9 Get Profile) — base64 JPEG.
  profilePhoto?: string;
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
  email?: string;
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

export interface AbdmUpdateResponse {
  success: boolean;
  message?: string;
  mobile?: string;
  email?: string;
}

export interface AbdmFindAbhaCandidate {
  index: number;
  abhaNumber: string;
  name?: string;
  gender?: string;
}

export interface AbdmFindAbhaSearchResponse {
  success: boolean;
  message?: string;
  txnId?: string;
  candidates: AbdmFindAbhaCandidate[];
}

// ---- API -------------------------------------------------------------------------------

export const abdmApi = {
  getAccounts: (hospitalId: string) =>
    apiClient.get<GetAbhaAccountsResponse>(`/abdm/accounts?hospitalId=${encodeURIComponent(hospitalId)}`),

  // Create ABHA — Aadhaar OTP
  generateAadhaarOtp: (hospitalId: string, aadhaarNumber: string) =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/aadhaar/generate-otp', { hospitalId, aadhaarNumber }),

  // mobile is mandatory on ABDM's side even when it matches the Aadhaar-linked number.
  verifyAadhaarOtp: (hospitalId: string, txnId: string, otp: string, mobile: string) =>
    apiClient.post<AbdmEnrollResponse>('/abdm/aadhaar/verify-otp', { hospitalId, txnId, otp, mobile }),

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

  // Edit profile — re-verify via OTP (requestLoginOtp/verifyLoginOtp above) to get a live
  // sessionTxnId, then update mobile (OTP-gated) or email (direct) using it.
  requestUpdateMobileOtp: (hospitalId: string, sessionTxnId: string, newMobile: string) =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/profile/mobile/generate-otp', { hospitalId, sessionTxnId, newMobile }),

  verifyUpdateMobileOtp: (hospitalId: string, abhaNumber: string, sessionTxnId: string, updateTxnId: string, otp: string) =>
    apiClient.post<AbdmUpdateResponse>('/abdm/profile/mobile/verify-otp', { hospitalId, abhaNumber, sessionTxnId, updateTxnId, otp }),

  updateEmail: (hospitalId: string, abhaNumber: string, sessionTxnId: string, newEmail: string) =>
    apiClient.post<AbdmUpdateResponse>('/abdm/profile/email', { hospitalId, abhaNumber, sessionTxnId, newEmail }),

  // Read-only ABDM-side artifacts — same live sessionTxnId as the profile-update calls above.
  getProfile: (hospitalId: string, sessionTxnId: string) =>
    apiClient.get<AbdmProfileResponse>(`/abdm/profile?hospitalId=${encodeURIComponent(hospitalId)}&sessionTxnId=${encodeURIComponent(sessionTxnId)}`),

  // QR code / ABHA card are binary (image or PDF) — fetched as a blob rather than through the
  // JSON-only apiClient wrapper, with the object URL left for the caller to revoke.
  getQrCodeBlobUrl: async (hospitalId: string, sessionTxnId: string): Promise<string> => {
    const response = await axiosInstance.get(
      `/abdm/profile/qr-code?hospitalId=${encodeURIComponent(hospitalId)}&sessionTxnId=${encodeURIComponent(sessionTxnId)}`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data as Blob);
  },

  downloadAbhaCard: async (hospitalId: string, sessionTxnId: string, abhaNumber: string): Promise<void> => {
    const response = await axiosInstance.get(
      `/abdm/profile/abha-card?hospitalId=${encodeURIComponent(hospitalId)}&sessionTxnId=${encodeURIComponent(sessionTxnId)}`,
      { responseType: 'blob' }
    );
    const blob = response.data as Blob;
    const extension = blob.type === 'application/pdf' ? 'pdf' : blob.type.startsWith('image/') ? blob.type.split('/')[1] : 'bin';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ABHA-Card-${abhaNumber}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // §7.6 Find ABHA — for a holder who has a mobile/Aadhaar but doesn't remember their ABHA
  // number/address. Step 3 (verify) reuses verifyLoginOtp above — same endpoint/response shape.
  findAbhaSearch: (hospitalId: string, value: string, searchBy: 'mobile' | 'aadhaar') =>
    apiClient.post<AbdmFindAbhaSearchResponse>('/abdm/find/search', { hospitalId, value, searchBy }),

  findAbhaGenerateOtp: (hospitalId: string, txnId: string, index: number, searchBy: 'mobile' | 'aadhaar') =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/find/generate-otp', { hospitalId, txnId, index, searchBy }),

  // §8.4/§8.5 Deactivate / Re-activate ABHA
  requestDeactivateOtp: (hospitalId: string, sessionTxnId: string, abhaNumber: string, otpSystem: 'abdm' | 'aadhaar') =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/profile/deactivate/generate-otp', { hospitalId, sessionTxnId, abhaNumber, otpSystem }),

  verifyDeactivateOtp: (hospitalId: string, sessionTxnId: string, deactivateTxnId: string, otp: string, reason: string) =>
    apiClient.post<AbdmUpdateResponse>('/abdm/profile/deactivate/verify-otp', { hospitalId, sessionTxnId, deactivateTxnId, otp, reason }),

  requestReactivateOtp: (hospitalId: string, abhaNumber: string) =>
    apiClient.post<AbdmOtpTxnResponse>('/abdm/profile/reactivate/generate-otp', { hospitalId, abhaNumber }),

  verifyReactivateOtp: (hospitalId: string, txnId: string, otp: string) =>
    apiClient.post<AbdmProfileResponse>('/abdm/profile/reactivate/verify-otp', { hospitalId, txnId, otp }),
};
