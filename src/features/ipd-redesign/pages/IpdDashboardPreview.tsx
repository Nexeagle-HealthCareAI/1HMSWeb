import React, { useEffect, useState } from 'react';
import { IpdDashboard } from '../screens/IpdDashboard';
import { BedBoardScreen } from '../screens/BedBoardScreen';
import { IpdKpiDashboardScreen } from '../screens/IpdKpiDashboardScreen';
import { ReferredAdmissionBoard } from '../screens/ReferredAdmissionBoard';
import { PatientWorkspace, type Section } from '../screens/PatientWorkspace';
import type { IpdTab } from '../components/IpdSectionHeader';
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

const DOCTORS_M = ['Dr. Meera Kulkarni', 'Dr. Arjun Rao', 'Dr. Sana Iqbal', 'Dr. Vivek Menon'];
const NAMES = ['Rajesh Kumar Sharma', 'Anita Deshpande', 'Mohammed Faiz', 'Sunita Rani', 'Vikram Singh Rathore', 'Lakshmi Narayanan', 'Harpreet Kaur', 'Joseph D\'Souza', 'Farida Begum', 'Nikhil Joshi', 'Padma Iyer', 'Gurmeet Singh', 'Rekha Yadav', 'Thomas Mathew', 'Shabnam Khan', 'Deepak Verma', 'Kavita Nair', 'Imran Sheikh', 'Bhavna Patel', 'Suresh Reddy', 'Meenakshi Pillai', 'Arvind Chauhan', 'Zainab Ali', 'Rohit Bansal', 'Uma Shankar', 'Naveen Gowda', 'Pooja Saxena', 'Kiran Bedi'];
const DX = ['Inferior wall STEMI', 'Right total knee replacement', 'Acute appendicitis', 'Community-acquired pneumonia', 'Laparoscopic cholecystectomy', 'Dengue fever with warning signs', 'Type 2 diabetes — DKA', 'Fracture neck of femur', 'COPD exacerbation', 'LSCS — term pregnancy'];
const WARDS: [string, string][] = [['ICU', 'ICU'], ['General Ward', 'GW'], ['Private', 'PVT'], ['Maternity', 'MAT']];
const PAYERS: [string, string | null][] = [['CASH', null], ['INSURANCE', 'Star Health'], ['TPA', 'MediAssist'], ['CASH', null], ['CGHS', 'CGHS Delhi']];
const TYPES = ['EMERGENCY', 'ELECTIVE', 'ELECTIVE', 'DAYCARE'];

const MOCK_ADMISSIONS: ActiveAdmissionItem[] = NAMES.map((name, i) => {
    const [wardName, prefix] = WARDS[i % WARDS.length];
    const [payerType, payerName] = PAYERS[i % PAYERS.length];
    const daysIn = i % 7;
    const statusCode = i === 2 ? 'PRE_ADMIT' : i % 9 === 5 ? 'DISCHARGE_INITIATED' : i % 11 === 7 ? 'DISCHARGE_BILLED' : 'ADMITTED';
    const noBed = i === 2 || i === 3;
    const expectedOffset = i % 5 === 0 ? null : (i % 5) - 2;   // -1 (overdue), 0 (today), 1, 2
    return {
        admissionId: String(i + 1), admissionNo: `ADM-2026-0${481 - i}`, admissionType: TYPES[i % TYPES.length], statusCode,
        payerType, payerName, admittedAt: iso(daysIn, 8 + (i % 10), 15), patientId: `UHID-${100482 - i * 37}`, patientName: name,
        patientAge: 24 + ((i * 7) % 55), patientSex: i % 2 === 0 ? 'M' : 'F',
        bedCode: noBed ? null : `${prefix}-${String(1 + Math.floor(i / WARDS.length)).padStart(2, '0')}`, wardName: noBed ? null : wardName,
        primaryDoctorId: `d${i % 4}`, primaryDoctorName: DOCTORS_M[i % DOCTORS_M.length], diagnosis: DX[i % DX.length],
        admissionToken: `T-${i + 1}`,
        expectedDischargeAt: expectedOffset == null ? null : iso(-expectedOffset, 11, 0),
    };
});

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
    | { name: 'referredadmissions' }
    | { name: 'workspace'; admission: ActiveAdmissionItem; section?: Section };

const IpdDashboardPreview: React.FC = () => {
    const [view, setView] = useState<ViewState>({ name: 'dashboard' });
    const [, setTick] = useState(0);

    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    const backToDashboard = () => setView({ name: 'dashboard' });
    const admit = () => alert('Admit Patient (preview)');
    const navigate = (tab: IpdTab) => {
        if (tab === 'cssd') { alert('CSSD Board (preview)'); return; }
        const name = tab === 'roster' ? 'dashboard' : tab === 'bedboard' ? 'bedboard' : tab === 'referred' ? 'referredadmissions' : 'kpidashboard';
        setView({ name } as ViewState);
    };

    if (view.name === 'bedboard') {
        return <BedBoardScreen onBack={backToDashboard} onNavigate={navigate} onAdmit={admit} />;
    }
    if (view.name === 'kpidashboard') {
        return <IpdKpiDashboardScreen onBack={backToDashboard} />;
    }
    if (view.name === 'referredadmissions') {
        return <ReferredAdmissionBoard onBack={backToDashboard} onAdmitReferral={() => {}} onNavigate={navigate} onAdmit={admit} />;
    }
    if (view.name === 'workspace') {
        return <PatientWorkspace admission={view.admission} initialSection={view.section} onBack={backToDashboard} onChanged={() => {}} />;
    }

    return (
        <IpdDashboard
            onAdmit={admit}
            onNavigate={navigate}
            onOpenWorkspace={(a, section) => setView({ name: 'workspace', admission: a, section })}
            refreshSignal={0}
        />
    );
};

export default IpdDashboardPreview;
