import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface TpaSplitLine {
    displayName?: string | null;
    categoryCode?: string | null;
    netAmount: number;
    isIRDAIPayable?: boolean | null;   // null = unclassified
}

export interface TpaSplit {
    payerType?: string | null;
    payableTotal: number;
    nonPayableTotal: number;
    unclassifiedTotal: number;
    lines: TpaSplitLine[];
}

export type IrdaiMilestoneKey = 'DISCHARGE_DECISION' | 'PHYSICAL_DISCHARGE' | 'CLAIM_SUBMITTED' | 'INSURER_APPROVAL';

export interface IrdaiMilestone {
    key: IrdaiMilestoneKey;
    label: string;
    at?: string | null;
    durationFromPreviousMinutes?: number | null;
}

export interface IrdaiClocks {
    payerType?: string | null;
    message?: string | null;
    milestones: IrdaiMilestone[];
}

interface GetDischargeTpaSplitResponse {
    success?: boolean;
    message?: string;
    payerType?: string | null;
    payableTotal?: number;
    nonPayableTotal?: number;
    unclassifiedTotal?: number;
    lines?: TpaSplitLine[];
}

interface GetIrdaiDischargeClocksResponse {
    success?: boolean;
    message?: string;
    payerType?: string | null;
    milestones?: IrdaiMilestone[];
}

export interface CoverageUtilization {
    payerType?: string | null;
    sanctionedAmount?: number | null;
    effectiveSanctionedAmount: number;
    runningTotal: number;
    utilizationPercent?: number | null;
    isApproachingLimit: boolean;
    enhancementRequestedAt?: string | null;
    enhancementRequestedBy?: string | null;
    enhancedSanctionedAmount?: number | null;
    enhancementApprovedAt?: string | null;
    enhancementApprovedBy?: string | null;
}

interface GetCoverageUtilizationResponse {
    success?: boolean;
    message?: string;
    payerType?: string | null;
    sanctionedAmount?: number | null;
    effectiveSanctionedAmount?: number;
    runningTotal?: number;
    utilizationPercent?: number | null;
    isApproachingLimit?: boolean;
    enhancementRequestedAt?: string | null;
    enhancementRequestedBy?: string | null;
    enhancedSanctionedAmount?: number | null;
    enhancementApprovedAt?: string | null;
    enhancementApprovedBy?: string | null;
}

export const irdaiDischargeApi = {
    getTpaSplit: (admissionId: string, hospitalId?: string): Promise<TpaSplit> =>
        ipdApiClient
            .get<GetDischargeTpaSplitResponse>('/irdai-discharge/tpa-split', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => ({
                payerType: r.payerType,
                payableTotal: r.payableTotal ?? 0,
                nonPayableTotal: r.nonPayableTotal ?? 0,
                unclassifiedTotal: r.unclassifiedTotal ?? 0,
                lines: r.lines ?? [],
            })),

    getClocks: (admissionId: string, hospitalId?: string): Promise<IrdaiClocks> =>
        ipdApiClient
            .get<GetIrdaiDischargeClocksResponse>('/irdai-discharge/clocks', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => ({ payerType: r.payerType, message: r.message, milestones: r.milestones ?? [] })),

    stampMilestone: async (admissionId: string, milestoneKey: 'CLAIM_SUBMITTED' | 'INSURER_APPROVAL', at?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/irdai-discharge/stamp-milestone', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, milestoneKey, at });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the milestone.'));
        }
    },

    getCoverageUtilization: (admissionId: string, hospitalId?: string): Promise<CoverageUtilization> =>
        ipdApiClient
            .get<GetCoverageUtilizationResponse>('/irdai-discharge/coverage-utilization', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => ({
                payerType: r.payerType,
                sanctionedAmount: r.sanctionedAmount,
                effectiveSanctionedAmount: r.effectiveSanctionedAmount ?? 0,
                runningTotal: r.runningTotal ?? 0,
                utilizationPercent: r.utilizationPercent,
                isApproachingLimit: r.isApproachingLimit ?? false,
                enhancementRequestedAt: r.enhancementRequestedAt,
                enhancementRequestedBy: r.enhancementRequestedBy,
                enhancedSanctionedAmount: r.enhancedSanctionedAmount,
                enhancementApprovedAt: r.enhancementApprovedAt,
                enhancementApprovedBy: r.enhancementApprovedBy,
            })),

    requestEnhancement: async (admissionId: string, requestedSanctionedAmount: number, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/irdai-discharge/enhancement-request', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, requestedSanctionedAmount });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the enhancement request.'));
        }
    },

    approveEnhancement: async (admissionId: string, approvedSanctionedAmount?: number, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/irdai-discharge/enhancement-approval', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, approvedSanctionedAmount });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the enhancement approval.'));
        }
    },
};
