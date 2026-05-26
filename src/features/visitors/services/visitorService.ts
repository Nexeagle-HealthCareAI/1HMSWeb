import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type VisitorStatus = 'ACTIVE' | 'CHECKED_OUT';
export type VisitorPurpose = 'VISIT' | 'ATTENDANT' | 'DELIVERY' | 'OTHER';
export type VisitorIdProof = 'AADHAAR' | 'VOTER_ID' | 'PAN' | 'DL' | 'PASSPORT' | 'OTHER';

export interface VisitorPassListItem {
    visitorPassId: string;
    passNumber: string;
    visitorName: string;
    visitorMobile?: string;
    relationship?: string;
    purpose: VisitorPurpose | string;
    patientName?: string;
    admissionId?: string;
    ward?: string;
    bedNo?: string;
    issuedAt: string;
    issuedBy: string;
    expectedExitAt?: string;
    checkedOutAt?: string;
    status: VisitorStatus | string;
    insideMinutes: number;
    overstayed: boolean;
}

export interface VisitorPassDetail {
    visitorPassId: string;
    passNumber: string;
    visitorName: string;
    visitorMobile?: string;
    visitorIdProofType?: string;
    visitorIdProofNumber?: string;
    relationship?: string;
    purpose: VisitorPurpose | string;
    patientId?: string;
    admissionId?: string;
    patientName?: string;
    ward?: string;
    bedNo?: string;
    issuedAt: string;
    issuedBy: string;
    expectedExitAt?: string;
    checkedOutAt?: string;
    checkedOutBy?: string;
    status: VisitorStatus | string;
    notes?: string;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface IssueVisitorPassRequest {
    hospitalId?: string;
    visitorName: string;
    visitorMobile?: string;
    visitorIdProofType?: VisitorIdProof | string;
    visitorIdProofNumber?: string;
    relationship?: string;
    purpose?: VisitorPurpose | string;
    patientId?: string;
    admissionId?: string;
    patientName?: string;
    ward?: string;
    bedNo?: string;
    expectedExitAt?: string;
    notes?: string;
}

export interface IssueVisitorPassResponse {
    success: boolean;
    message?: string;
    visitorPassId?: string;
    passNumber?: string;
}

export interface CheckOutVisitorRequest {
    hospitalId?: string;
    visitorPassId: string;
    notes?: string;
}

export interface VisitorActionResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface GetVisitorPassesResponse {
    success: boolean;
    message?: string;
    items: VisitorPassListItem[];
}

export interface GetVisitorPassByIdResponse {
    success: boolean;
    message?: string;
    record?: VisitorPassDetail;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const visitorService = {
    issue: (req: IssueVisitorPassRequest): Promise<IssueVisitorPassResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.VISITORS.ISSUE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    checkOut: (req: CheckOutVisitorRequest): Promise<VisitorActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.VISITORS.CHECK_OUT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (opts?: { status?: string; admissionId?: string; search?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetVisitorPassesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.VISITORS.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    getById: (id: string, hospitalId?: string): Promise<GetVisitorPassByIdResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.VISITORS.GET_BY_ID(id, hospitalIdOrThrow(hospitalId))),
};
