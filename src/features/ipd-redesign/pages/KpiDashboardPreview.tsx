import React, { useEffect, useState } from 'react';
import { IpdKpiDashboardScreen } from '../screens/IpdKpiDashboardScreen';
import { ipdKpiApi, type IpdKpiDashboard } from '../services/ipdKpiApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the IPD KPI dashboard.
 *
 * Renders the real <IpdKpiDashboardScreen> with ipdKpiApi.getDashboard() stubbed to mock metrics +
 * trend series and a dummy hospitalId, so the mobile UI can be iterated without a login or a live
 * backend. Routed at /kpi-preview only under import.meta.env.DEV (see AppRoutes).
 */

const dayKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const borTrend = Array.from({ length: 30 }, (_, i) => ({
    day: dayKey(29 - i),
    borPercent: Math.round(62 + 18 * Math.sin(i / 4) + (i % 5)),
}));
const alosTrend = Array.from({ length: 8 }, (_, i) => ({
    weekStart: dayKey((7 - i) * 7),
    avgDays: Math.round((4.2 + Math.sin(i / 2) * 1.1) * 10) / 10,
}));

const MOCK: IpdKpiDashboard = {
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

ipdKpiApi.getDashboard = async (): Promise<IpdKpiDashboard> => {
    await new Promise(r => setTimeout(r, 200));
    return MOCK;
};

const KpiDashboardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return <IpdKpiDashboardScreen onBack={() => alert('Back to dashboard (preview)')} />;
};

export default KpiDashboardPreview;
