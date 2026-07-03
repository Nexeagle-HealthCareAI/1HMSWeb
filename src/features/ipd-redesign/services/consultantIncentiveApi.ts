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

export type IncentiveLedgerStatus = 'ACCRUED' | 'PAID' | 'CANCELLED';

export interface ConsultantIncentiveDoctorSummary {
    doctorId: string;
    doctorName?: string | null;
    accruedTotal: number;
    paidTotal: number;
    cancelledTotal: number;
}

export interface ConsultantIncentiveLine {
    consultantIncentiveLedgerId: string;
    patientId?: string | null;
    chargeEventId: string;
    chargeDisplayName?: string | null;
    incentiveAmount: number;
    statusCode?: IncentiveLedgerStatus | string | null;
    accruedAt: string;
    paidAt?: string | null;
    payoutRef?: string | null;
    tdsAmount?: number | null;
}

interface GetSummaryResponse {
    success?: boolean;
    message?: string;
    doctors?: ConsultantIncentiveDoctorSummary[];
}

interface GetLedgerResponse {
    success?: boolean;
    message?: string;
    lines?: ConsultantIncentiveLine[];
    accruedTotal?: number;
    paidTotal?: number;
    cancelledTotal?: number;
}

export const consultantIncentiveApi = {
    getSummary: (hospitalId?: string): Promise<ConsultantIncentiveDoctorSummary[]> =>
        ipdApiClient
            .get<GetSummaryResponse>('/consultant-incentive/summary', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.doctors ?? []),

    getLedger: (doctorId: string, statusCode?: IncentiveLedgerStatus, hospitalId?: string): Promise<GetLedgerResponse> =>
        ipdApiClient
            .get<GetLedgerResponse>('/consultant-incentive/ledger', { params: { hospitalId: hospitalIdOrThrow(hospitalId), doctorId, statusCode } })
            .then(r => ({
                lines: r.lines ?? [],
                accruedTotal: r.accruedTotal ?? 0,
                paidTotal: r.paidTotal ?? 0,
                cancelledTotal: r.cancelledTotal ?? 0,
            })),

    settle: async (doctorId: string, ledgerIds: string[] | undefined, payoutRef: string | undefined, tdsAmount: number | undefined, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/consultant-incentive/settle', {
                hospitalId: hospitalIdOrThrow(hospitalId), doctorId, ledgerIds, payoutRef, tdsAmount,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not settle the incentives.'));
        }
    },
};
