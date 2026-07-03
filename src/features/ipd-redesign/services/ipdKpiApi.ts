import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export interface BorTrendPoint {
    day: string;
    borPercent: number;
}

export interface AlosTrendPoint {
    weekStart: string;
    avgDays: number;
}

export interface IpdKpiDashboard {
    currentBorPercent: number;
    borTrend: BorTrendPoint[];
    alosDays: number;
    alosTrend: AlosTrendPoint[];
    avgBedTurnaroundHours: number;
    avgDischargeTatHours: number;
    dischargeTatSampleSize: number;
    readmissionRatePercent: number;
    readmittedCount: number;
    totalIndexDischarges: number;
}

export const ipdKpiApi = {
    getDashboard: (fromDate: string, toDate: string, hospitalId?: string): Promise<IpdKpiDashboard> =>
        ipdApiClient.get<IpdKpiDashboard>('/ipd-kpi/dashboard', { params: { hospitalId: hospitalIdOrThrow(hospitalId), fromDate, toDate } }),
};
