import React, { useEffect, useState } from 'react';
import { IpdDashboard } from '../screens/IpdDashboard';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';
import { bedBoardApi } from '../services/bedBoardApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the IPD dashboard homepage.
 *
 * Renders the real <IpdDashboard> with the admission/bed-board APIs stubbed to mock data and a
 * dummy hospitalId, so the mobile UI can be iterated without a login or a live backend. Routed at
 * /ipd-preview only under import.meta.env.DEV (see AppRoutes). Not part of the shipped app.
 */

const now = new Date();
const iso = (daysAgo: number, h = 10, m = 30) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

const MOCK: ActiveAdmissionItem[] = [
    {
        admissionId: '1', admissionNo: 'ADM-2026-0481', admissionType: 'EMERGENCY', statusCode: 'ADMITTED',
        payerType: 'CASH', admittedAt: iso(0, 8, 15), patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma',
        patientAge: 54, patientSex: 'M', bedCode: 'ICU-04', wardName: 'ICU', payerName: null,
    },
    {
        admissionId: '2', admissionNo: 'ADM-2026-0480', admissionType: 'ELECTIVE', statusCode: 'ADMITTED',
        payerType: 'INSURANCE', admittedAt: iso(0, 9, 45), patientId: 'UHID-100199', patientName: 'Anita Deshpande',
        patientAge: 41, patientSex: 'F', bedCode: 'GW-12', wardName: 'General Ward', payerName: 'Star Health',
    },
    {
        admissionId: '3', admissionNo: 'ADM-2026-0479', admissionType: 'ELECTIVE', statusCode: 'PRE_ADMIT',
        payerType: 'TPA', admittedAt: iso(0, 7, 0), patientId: 'UHID-100777', patientName: 'Mohammed Faiz',
        patientAge: 33, patientSex: 'M', bedCode: null, wardName: null, payerName: 'MediAssist',
    },
    {
        admissionId: '4', admissionNo: 'ADM-2026-0477', admissionType: 'EMERGENCY', statusCode: 'ADMITTED',
        payerType: 'CASH', admittedAt: iso(1, 22, 10), patientId: 'UHID-100051', patientName: 'Sunita Rani',
        patientAge: 67, patientSex: 'F', bedCode: null, wardName: null, payerName: null,
    },
    {
        admissionId: '5', admissionNo: 'ADM-2026-0475', admissionType: 'DAYCARE', statusCode: 'ADMITTED',
        payerType: 'CGHS', admittedAt: iso(1, 11, 30), patientId: 'UHID-100634', patientName: 'Vikram Singh Rathore',
        patientAge: 48, patientSex: 'M', bedCode: 'PVT-03', wardName: 'Private', payerName: 'CGHS Delhi',
    },
    {
        admissionId: '6', admissionNo: 'ADM-2026-0470', admissionType: 'ELECTIVE', statusCode: 'ADMITTED',
        payerType: 'INSURANCE', admittedAt: iso(2, 14, 20), patientId: 'UHID-100888', patientName: 'Priya Nair',
        patientAge: 29, patientSex: 'F', bedCode: 'SEMI-07', wardName: 'Semi-Private', payerName: 'HDFC Ergo',
    },
    {
        admissionId: '7', admissionNo: 'ADM-2026-0466', admissionType: 'ELECTIVE', statusCode: 'DISCHARGED',
        payerType: 'CASH', admittedAt: iso(5, 10, 0), patientId: 'UHID-100234', patientName: 'Gopal Krishna Iyer',
        patientAge: 72, patientSex: 'M', bedCode: 'GW-01', wardName: 'General Ward', payerName: null,
    },
    {
        admissionId: '8', admissionNo: 'ADM-2026-0460', admissionType: 'EMERGENCY', statusCode: 'DISCHARGED',
        payerType: 'TPA', admittedAt: iso(7, 3, 40), patientId: 'UHID-100345', patientName: 'Fatima Begum',
        patientAge: 58, patientSex: 'F', bedCode: 'ICU-01', wardName: 'ICU', payerName: 'Paramount',
    },
];

// Live-mutate the shared exported API objects so the dashboard's internal fetches resolve to mocks.
admissionApi.getActiveAdmissions = async (statusFilter): Promise<ActiveAdmissionItem[]> => {
    await new Promise(r => setTimeout(r, 200));
    if (statusFilter === 'DISCHARGED') return MOCK.filter(m => m.statusCode === 'DISCHARGED');
    if (statusFilter === 'ACTIVE') return MOCK.filter(m => m.statusCode !== 'DISCHARGED');
    return MOCK;
};
bedBoardApi.getBoard = async () => [];

const IpdDashboardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return (
        <IpdDashboard
            onAdmit={() => alert('Admit Patient (preview)')}
            onOpenBedBoard={() => alert('Bed Board (preview)')}
            onOpenCssdBoard={() => alert('CSSD Board (preview)')}
            onOpenKpiDashboard={() => alert('KPI Dashboard (preview)')}
            onOpenConsultantLedger={() => alert('Consultant Ledger (preview)')}
            onOpenReferredAdmissions={() => alert('Referred Admissions (preview)')}
            onOpenWorkspace={(a) => alert(`Open workspace: ${a.patientName}`)}
            refreshSignal={0}
        />
    );
};

export default IpdDashboardPreview;
