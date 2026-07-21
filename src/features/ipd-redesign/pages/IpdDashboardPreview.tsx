import React, { useEffect, useState } from 'react';
import { IpdDashboard } from '../screens/IpdDashboard';
import { BedBoardScreen } from '../screens/BedBoardScreen';
import { IpdKpiDashboardScreen } from '../screens/IpdKpiDashboardScreen';
import { ConsultantLedgerScreen } from '../screens/ConsultantLedgerScreen';
import { ReferredAdmissionBoard } from '../screens/ReferredAdmissionBoard';
import { PatientWorkspace } from '../screens/PatientWorkspace';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { ipdKpiApi, type IpdKpiDashboard } from '../services/ipdKpiApi';
import { admissionReferralApi, type AdmissionReferralItem } from '../services/admissionReferralApi';
import { consultantIncentiveApi, type ConsultantIncentiveDoctorSummary } from '../services/consultantIncentiveApi';
import { useAuthStore } from '@/store/authStore';

// Mock active admissions list
const now = new Date();
const iso = (daysAgo: number, h = 10, m = 30) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

const MOCK_ADMISSIONS: ActiveAdmissionItem[] = [
    {
        admissionId: '1', admissionNo: 'ADM-2026-0481', admissionType: 'EMERGENCY', statusCode: 'ADMITTED',
        payerType: 'CASH', admittedAt: iso(0, 8, 15), patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma',
        patientAge: 54, patientSex: 'M', bedCode: 'ICU-04', wardName: 'ICU', payerName: null,
        primaryDoctorId: 'd1', primaryDoctorName: 'Dr. Meera Kulkarni'
    },
    {
        admissionId: '2', admissionNo: 'ADM-2026-0480', admissionType: 'ELECTIVE', statusCode: 'ADMITTED',
        payerType: 'INSURANCE', admittedAt: iso(0, 9, 45), patientId: 'UHID-100199', patientName: 'Anita Deshpande',
        patientAge: 41, patientSex: 'F', bedCode: 'GW-12', wardName: 'General Ward', payerName: 'Star Health',
        primaryDoctorId: 'd2', primaryDoctorName: 'Dr. Arjun Rao'
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
];

// Stub Admissions API
admissionApi.getActiveAdmissions = async (statusFilter): Promise<ActiveAdmissionItem[]> => {
    await new Promise(r => setTimeout(r, 100));
    if (statusFilter === 'DISCHARGED') return MOCK_ADMISSIONS.filter(m => m.statusCode === 'DISCHARGED');
    if (statusFilter === 'ACTIVE') return MOCK_ADMISSIONS.filter(m => m.statusCode !== 'DISCHARGED');
    return MOCK_ADMISSIONS;
};
admissionApi.getHospitalDoctors = async (): Promise<HospitalDoctorItem[]> => ([
    { doctorId: 'd1', fullName: 'Dr. Meera Kulkarni', departmentName: 'Cardiology' } as HospitalDoctorItem,
    { doctorId: 'd2', fullName: 'Dr. Arjun Rao', departmentName: 'Orthopedics' } as HospitalDoctorItem,
]);
admissionApi.getDoctorHistory = async () => ([]);
admissionApi.getReferrerHistory = async () => ([]);

// Stub Bed Board API
const MOCK_BEDS: BedBoardItem[] = [
    { bedId: 'b1', wardName: 'General Ward', wardType: 'GENERAL', bedCode: 'GW-12', statusCode: 'OCCUPIED', isActive: true, effectiveDailyRate: 2500, sortOrder: 1, admissionId: '2', patientName: 'Anita Deshpande', patientAge: 41, patientSex: 'F' },
    { bedId: 'b2', wardName: 'General Ward', wardType: 'GENERAL', bedCode: 'GW-13', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 2500, sortOrder: 2 },
    { bedId: 'b3', wardName: 'ICU', wardType: 'ICU', bedCode: 'ICU-04', statusCode: 'OCCUPIED', isActive: true, effectiveDailyRate: 12000, sortOrder: 3, admissionId: '1', patientName: 'Rajesh Kumar Sharma', patientAge: 54, patientSex: 'M' },
    { bedId: 'b4', wardName: 'ICU', wardType: 'ICU', bedCode: 'ICU-05', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 12000, sortOrder: 4 },
    { bedId: 'b5', wardName: 'Private', wardType: 'PRIVATE', bedCode: 'PVT-03', statusCode: 'OCCUPIED', isActive: true, effectiveDailyRate: 6500, sortOrder: 5, admissionId: '5', patientName: 'Vikram Singh Rathore', patientAge: 48, patientSex: 'M' },
];
bedBoardApi.getBoard = async () => MOCK_BEDS;

// Stub KPI Dashboard API
const dayKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const borTrend = Array.from({ length: 30 }, (_, i) => ({
    day: dayKey(29 - i),
    borPercent: Math.round(62 + 18 * Math.sin(i / 4) + (i % 5)),
}));
const alosTrend = Array.from({ length: 8 }, (_, i) => ({
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
ipdKpiApi.getDashboard = async () => MOCK_KPI;

// Stub Referred Admissions API
const MOCK_REFERRALS: AdmissionReferralItem[] = [
    { referralId: 'r1', patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma', patientMobile: '98200 11223', referringDoctorId: 'd1', referringDoctorName: 'Dr. Meera Kulkarni', procedureName: 'Coronary Angioplasty', otPlanName: 'Cath Lab — 90 min', probableAdmissionDate: iso(0), caseType: 'URGENT', statusCode: 'PENDING', createdAt: iso(1), commentCount: 2 },
    { referralId: 'r2', patientId: 'UHID-100199', patientName: 'Anita Deshpande', patientMobile: '98200 44556', referringDoctorId: 'd2', referringDoctorName: 'Dr. Arjun Rao', procedureName: 'Total Knee Replacement', probableAdmissionDate: iso(-3), caseType: 'PLANNED', statusCode: 'PENDING', createdAt: iso(2), commentCount: 0 },
];
admissionReferralApi.list = async (filters: any = {}) => {
    let items = MOCK_REFERRALS;
    if (filters.statusCode) items = items.filter(r => r.statusCode === filters.statusCode);
    if (filters.caseType) items = items.filter(r => r.caseType === filters.caseType);
    return {
        success: true,
        referrals: items,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 5,
        totalCount: items.length,
        statusCounts: [
            { statusCode: 'PENDING' as const, count: items.filter(r => r.statusCode === 'PENDING').length },
            { statusCode: 'CONVERTED' as const, count: 0 },
            { statusCode: 'NOT_ADMITTED' as const, count: 0 },
            { statusCode: 'FOLLOW_UP' as const, count: 0 },
        ],
    };
};
admissionReferralApi.getComments = async () => ({ success: true, comments: [] });

// Stub Consultant Ledger API
const DOCTORS: ConsultantIncentiveDoctorSummary[] = [
    { doctorId: 'd1', doctorName: 'Dr. Meera Kulkarni', accruedTotal: 48500, paidTotal: 132000, cancelledTotal: 2500 },
    { doctorId: 'd2', doctorName: 'Dr. Arjun Rao', accruedTotal: 21000, paidTotal: 76000, cancelledTotal: 0 },
];
consultantIncentiveApi.getSummary = async () => DOCTORS;
consultantIncentiveApi.getLedger = async (doctorId: string) => {
    return { lines: [], accruedTotal: 0, paidTotal: 0, cancelledTotal: 0 };
};

type ViewState =
    | { name: 'dashboard' }
    | { name: 'bedboard' }
    | { name: 'kpidashboard' }
    | { name: 'consultantledger' }
    | { name: 'referredadmissions' }
    | { name: 'workspace'; admission: ActiveAdmissionItem };

const IpdDashboardPreview: React.FC = () => {
    const [view, setView] = useState<ViewState>({ name: 'dashboard' });
    const [, setTick] = useState(0);

    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    const backToDashboard = () => setView({ name: 'dashboard' });

    if (view.name === 'bedboard') {
        return (
            <BedBoardScreen 
                onBack={backToDashboard} 
                onOpenDashboard={backToDashboard}
                onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
                onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
            />
        );
    }
    if (view.name === 'kpidashboard') {
        return <IpdKpiDashboardScreen onBack={backToDashboard} />;
    }
    if (view.name === 'consultantledger') {
        return (
            <ConsultantLedgerScreen 
                onBack={backToDashboard} 
                onOpenDashboard={backToDashboard}
                onOpenBedBoard={() => setView({ name: 'bedboard' })}
                onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
            />
        );
    }
    if (view.name === 'referredadmissions') {
        return (
            <ReferredAdmissionBoard 
                onBack={backToDashboard} 
                onAdmitReferral={() => {}} 
                onOpenDashboard={backToDashboard}
                onOpenBedBoard={() => setView({ name: 'bedboard' })}
                onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
            />
        );
    }
    if (view.name === 'workspace') {
        return <PatientWorkspace admission={view.admission} onBack={backToDashboard} />;
    }

    return (
        <IpdDashboard
            onAdmit={() => alert('Admit Patient (preview)')}
            onOpenBedBoard={() => setView({ name: 'bedboard' })}
            onOpenCssdBoard={() => alert('CSSD Board (preview)')}
            onOpenKpiDashboard={() => setView({ name: 'kpidashboard' })}
            onOpenConsultantLedger={() => setView({ name: 'consultantledger' })}
            onOpenReferredAdmissions={() => setView({ name: 'referredadmissions' })}
            onOpenWorkspace={(a) => setView({ name: 'workspace', admission: a })}
            refreshSignal={0}
        />
    );
};

export default IpdDashboardPreview;
