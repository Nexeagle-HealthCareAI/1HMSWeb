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
};
