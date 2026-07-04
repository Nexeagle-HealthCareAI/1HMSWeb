import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type CreditApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreditApprovalItem {
    creditApprovalId: string;
    encounterId: string;
    patientId?: string;
    paymentType: 'ADVANCE' | 'REFUND' | string;
    requestedAmount: number;
    paymentMode?: string;
    resultingCreditBalance: number;
    reason?: string;
    requestedBy?: string;
    requestedAt: string;
    status: CreditApprovalStatus | string;
    decidedAt?: string;
    decidedBy?: string;
    decisionNote?: string;
}

export interface GetCreditApprovalsResponse {
    success: boolean;
    message?: string;
    items: CreditApprovalItem[];
}

export interface DecideCreditApprovalRequest {
    hospitalId?: string;
    creditApprovalId: string;
    decision: 'APPROVED' | 'REJECTED';
    decisionNote?: string;
}

export interface DecideCreditApprovalResponse {
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

export const creditApprovalService = {
    list: (opts?: { status?: string; encounterId?: string; patientId?: string; take?: number; hospitalId?: string }): Promise<GetCreditApprovalsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.CREDIT_APPROVAL.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    decide: (req: DecideCreditApprovalRequest): Promise<DecideCreditApprovalResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.CREDIT_APPROVAL.DECIDE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
