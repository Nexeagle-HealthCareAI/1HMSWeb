import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type DiscountApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DiscountApprovalItem {
    discountApprovalId: string;
    chargeEventId: string;
    encounterId: string;
    patientId?: string;
    chargeDisplayName?: string;
    grossAmount: number;
    requestedDiscountPercent: number;
    requestedDiscountAmount: number;
    capPercent: number;
    overByPercent: number;
    reason?: string;
    requestedBy?: string;
    requestedAt: string;
    status: DiscountApprovalStatus | string;
    decidedAt?: string;
    decidedBy?: string;
    decisionNote?: string;
}

export interface GetDiscountApprovalsResponse {
    success: boolean;
    message?: string;
    items: DiscountApprovalItem[];
}

export interface DecideDiscountApprovalRequest {
    hospitalId?: string;
    discountApprovalId: string;
    decision: 'APPROVED' | 'REJECTED';
    decisionNote?: string;
}

export interface DecideDiscountApprovalResponse {
    success: boolean;
    message?: string;
    status?: string;
    decidedAt?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const discountApprovalService = {
    list: (opts?: { status?: string; encounterId?: string; patientId?: string; take?: number; hospitalId?: string }): Promise<GetDiscountApprovalsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.DISCOUNT_APPROVAL.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    decide: (req: DecideDiscountApprovalRequest): Promise<DecideDiscountApprovalResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.DISCOUNT_APPROVAL.DECIDE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
