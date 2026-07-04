import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Types
export interface HospitalRegistrationRequest {
  userId: string;
  name: string;
  type: string;
  registrationNumber: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
}

export interface HospitalRegistrationResponse {
  success: boolean;
  message: string;
  hospitalId: string;
  hospitalUserId: string;
}

export interface HospitalUpdateRequest {
  name: string;
  type: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  registrationNumber: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
}

export interface HospitalUpdateResponse {
  success: boolean;
  message: string;
  hospitalId: string;
}

export interface HospitalProfileStatus {
  isBasicInfoComplete: boolean;
  isContactInfoComplete: boolean;
  isLocationInfoComplete: boolean;
  profileCompletionPercent: number;
  lastUpdatedAt: string;
}

export interface HospitalData {
  hospitalId: string;
  name: string;
  type: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  registrationNumber: string;
  timeZone: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
  isActive: boolean;
  createdAt: string;
  lastUpdatedAt: string;
  profileStatus: HospitalProfileStatus;
}

// ─── Multi-hospital chaining ────────────────────────────────────────────────
export interface MyHospitalItem {
  hospitalId: string;
  name: string;
  city?: string | null;
  isPrimary?: boolean;
  employeeId?: string | null;
  chainId?: string | null;
  chainName?: string | null;
  isChainOwner?: boolean;
}

export interface MyChainResponse {
  success?: boolean;
  message?: string;
  chainId?: string | null;
  chainName?: string | null;
  hospitals: Array<{ hospitalId: string; name: string; city?: string | null; state?: string | null; isActive?: boolean }>;
}

export interface ChainDoctorItem {
  doctorId: string;
  userId: string;
  fullName?: string | null;
  hospitals: Array<{ hospitalId: string; name: string }>;
}

export interface AddDoctorToHospitalPayload {
  doctorId: string;
  targetHospitalId: string;
  departmentId: string;
  consultFee?: number;
}

// API Functions
export const hospitalApi = {
  /** All hospitals the signed-in user belongs to (for the switcher). */
  getMyHospitals: async (): Promise<MyHospitalItem[]> => {
    const res = await apiClient.get<{ success?: boolean; hospitals?: MyHospitalItem[] }>(API_ENDPOINTS.HOSPITALS.MINE);
    return res?.hospitals ?? [];
  },

  /** Create a chain owned by the caller (links their existing hospital(s)). */
  createChain: async (name: string): Promise<{ success?: boolean; message?: string; chainId?: string; hospitalsLinked?: number }> => {
    return apiClient.post(API_ENDPOINTS.CHAINS.CREATE, { name });
  },

  /** The chain the caller owns (if any) + its member hospitals. */
  getMyChain: async (): Promise<MyChainResponse> => {
    return apiClient.get(API_ENDPOINTS.CHAINS.MINE);
  },

  /** Onboard a new hospital into a chain (reuses the hospital-registration payload). */
  onboardHospitalToChain: async (chainId: string, data: HospitalRegistrationRequest): Promise<HospitalRegistrationResponse> => {
    return apiClient.post(API_ENDPOINTS.CHAINS.ONBOARD_HOSPITAL(chainId), data);
  },

  /** Doctors across the caller's chain + the hospitals each works at. */
  getChainDoctors: async (): Promise<ChainDoctorItem[]> => {
    const res = await apiClient.get<{ success?: boolean; doctors?: ChainDoctorItem[] }>(API_ENDPOINTS.CHAINS.MINE_DOCTORS);
    return res?.doctors ?? [];
  },

  /** Add an existing doctor to another hospital in the chain. */
  addDoctorToHospital: async (chainId: string, payload: AddDoctorToHospitalPayload): Promise<{ success?: boolean; message?: string; alreadyMember?: boolean }> => {
    return apiClient.post(API_ENDPOINTS.CHAINS.ADD_DOCTOR(chainId), payload);
  },

  /**
   * Get hospital-user record by userId
   */
  getHospitalUserByUserId: async (
    userId: string
  ): Promise<{ hospitalUserId: string; hospitalId: string; userId: string; employeeID: string; isPrimary: string; createdAt: string }> => {
    return apiClient.get(API_ENDPOINTS.HOSPITALS.GET_BY_USER_ID(userId));
  },
  /**
   * Register a new hospital
   */
  registerHospital: async (data: HospitalRegistrationRequest): Promise<HospitalRegistrationResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.HOSPITALS.REGISTER, data);
    return response;
  },

  /**
   * Get hospital by ID
   */
  getHospitalById: async (hospitalId: string): Promise<HospitalData> => {
    const response = await apiClient.get(API_ENDPOINTS.HOSPITALS.GET_BY_ID(hospitalId));
    return response;
  },

  /**
   * Update an existing hospital
   */
  updateHospital: async (
    hospitalId: string,
    data: HospitalUpdateRequest
  ): Promise<HospitalUpdateResponse> => {
    const response = await apiClient.put(API_ENDPOINTS.HOSPITALS.GET_BY_ID(hospitalId), data);
    return response;
  },

  /**
   * Deactivate a hospital/chain branch
   */
  deactivateHospital: async (
    hospitalId: string
  ): Promise<{ success: boolean; message?: string; hospitalId: string }> => {
    const response = await apiClient.patch(API_ENDPOINTS.HOSPITALS.DEACTIVATE(hospitalId), {});
    return response;
  },
};
