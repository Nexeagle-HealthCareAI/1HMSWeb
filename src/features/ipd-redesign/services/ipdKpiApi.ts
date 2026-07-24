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

const dayKey = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

const borTrend: BorTrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
    day: dayKey(29 - i),
    borPercent: Math.round(62 + 18 * Math.sin(i / 4) + (i % 5)),
}));

const alosTrend: AlosTrendPoint[] = Array.from({ length: 8 }, (_, i) => ({
    weekStart: dayKey((7 - i) * 7),
    avgDays: Math.round((4.2 + Math.sin(i / 2) * 1.1) * 10) / 10,
}));

const MOCK_KPI: IpdKpiDashboard = {
    currentBorPercent: 78,
    borTrend,
    alosDays: 4.6,
    alosTrend,
    avgBedTurnaroundHours: 6.4,
    avgDischargeTatHours: 3.1,
    dischargeTatSampleSize: 42,
    readmissionRatePercent: 5.8,
    readmittedCount: 7,
    totalIndexDischarges: 121,
};

export const ipdKpiApi = {
    getDashboard: (fromDate: string, toDate: string, hospitalId?: string): Promise<IpdKpiDashboard> => {
        const id = hospitalIdOrThrow(hospitalId);
        if (id === 'PREVIEW-HOSPITAL') {
            return Promise.resolve(MOCK_KPI);
        }
        return ipdApiClient.get<IpdKpiDashboard>('/ipd-kpi/dashboard', { params: { hospitalId: id, fromDate, toDate } });
    },
};
