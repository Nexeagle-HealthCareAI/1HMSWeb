import React, { useEffect, useState } from 'react';
import { AdminDashboard } from '../components/AdminDashboard';
import { apiClient } from '@/services/axiosClient';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import type { AnalyticsResponse } from '../services/analyticsApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Admin Dashboard (/admin). `fetchAnalyticsData` is a bare
 * function (not an object method), so it can't be monkey-patched directly — instead this
 * intercepts `apiClient.get` for the analytics URL specifically and passes everything else
 * through. `hospitalApi.getHospitalById` is mocked directly (it IS an object method) to a
 * 100%-complete profile so the registration popup doesn't block the preview.
 * Routed at /admin-preview only under import.meta.env.DEV (see AppRoutes).
 */

const MOCK_ANALYTICS: AnalyticsResponse['data'] = {
    kpis: {
        totalVisits: { overall: 18420, byBucket: { today: 62, yesterday: 58, last7Days: 410, thisMonth: 1680, thisYear: 18420, prevYear: 15200 } },
        uniquePatients: { overall: 9210, byBucket: { today: 41, yesterday: 39, last7Days: 260, thisMonth: 980, thisYear: 9210, prevYear: 8100 } },
        newVsReturningPatients: { new: { count: 3200, percent: 35 }, returning: { count: 6010, percent: 65 } },
    },
    breakdowns: {
        byDoctor: [
            { doctorId: 'd1', doctorName: 'Dr. Meera Kulkarni', specialty: 'Cardiology', overallVisits: 3200, uniquePatients: 1800, newPatients: { day: 4, week: 22, month: 88, year: 640 }, returningPatients: 2560, firstVisits: 640, noShow: 42, sharePercent: 22 },
            { doctorId: 'd2', doctorName: 'Dr. Arjun Rao', specialty: 'Orthopedics', overallVisits: 2850, uniquePatients: 1500, newPatients: { day: 3, week: 18, month: 70, year: 520 }, returningPatients: 2330, firstVisits: 520, noShow: 120, sharePercent: 19 },
            { doctorId: 'd3', doctorName: 'Dr. Sneha Pillai', specialty: 'General Surgery', overallVisits: 2400, uniquePatients: 1350, newPatients: { day: 2, week: 15, month: 55, year: 410 }, returningPatients: 1990, firstVisits: 410, noShow: 30, sharePercent: 16 },
            { doctorId: 'd4', doctorName: 'Dr. Kavita Menon', specialty: 'ENT', overallVisits: 1980, uniquePatients: 1100, newPatients: { day: 2, week: 12, month: 44, year: 330 }, returningPatients: 1650, firstVisits: 330, noShow: 18, sharePercent: 13 },
            { doctorId: 'd5', doctorName: 'Dr. Vikram Singh', specialty: 'Pediatrics', overallVisits: 1750, uniquePatients: 980, newPatients: { day: 2, week: 10, month: 38, year: 290 }, returningPatients: 1460, firstVisits: 290, noShow: 55, sharePercent: 11 },
        ],
        bySpecialty: [
            { specialtyName: 'Cardiology', overallVisits: 3200, uniquePatients: 1800, sharePercent: 22, trendVsPreviousPeriod: { percent: 8, direction: 'UP' } },
            { specialtyName: 'Orthopedics', overallVisits: 2850, uniquePatients: 1500, sharePercent: 19, trendVsPreviousPeriod: { percent: 3, direction: 'DOWN' } },
            { specialtyName: 'General Surgery', overallVisits: 2400, uniquePatients: 1350, sharePercent: 16 },
            { specialtyName: 'ENT', overallVisits: 1980, uniquePatients: 1100, sharePercent: 13, trendVsPreviousPeriod: { percent: 5, direction: 'UP' } },
        ],
    },
    overall: {
        ageDistribution: { '0-18': 1200, '19-35': 4200, '36-50': 5100, '51-65': 4800, '65+': 3120 },
        noShow: 265,
        cancelled: 140,
        top5City: { Mumbai: 3200, Pune: 2100, Nagpur: 1400, Nashik: 950, Aurangabad: 600 },
        uniqueCities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    },
    genderWise: [
        { gender: 'Male', overallVisits: 9800, noShow: 140, cancelled: 75, ageDistribution: { '0-18': 620, '19-35': 2200, '36-50': 2700, '51-65': 2500, '65+': 1780 } },
        { gender: 'Female', overallVisits: 8620, noShow: 125, cancelled: 65, ageDistribution: { '0-18': 580, '19-35': 2000, '36-50': 2400, '51-65': 2300, '65+': 1340 } },
    ],
};

const realGet = apiClient.get.bind(apiClient);
apiClient.get = (async (url: string, config?: any) => {
    if (typeof url === 'string' && url.includes('hospitals/analysis/')) {
        await new Promise(r => setTimeout(r, 200));
        return { success: true, message: 'ok', data: MOCK_ANALYTICS } as any;
    }
    return realGet(url, config);
}) as typeof apiClient.get;

hospitalApi.getHospitalById = async () => ({
    hospitalId: 'PREVIEW-HOSPITAL',
    name: 'Star Hospital',
    gstin: '27ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    nabhNumber: 'NABH-2026-001',
    profileStatus: {
        profileCompletionPercent: 100,
        isBasicInfoComplete: true,
        isLocationInfoComplete: true,
        isContactInfoComplete: true,
    },
} as any);

const AdminDashboardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL', userRole: 'Admin' });
        setTick(t => t + 1);
    }, []);

    return <AdminDashboard />;
};

export default AdminDashboardPreview;
