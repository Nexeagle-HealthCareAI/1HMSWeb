import React, { useEffect, useState } from 'react';
import { ReferredAdmissionBoard } from '../screens/ReferredAdmissionBoard';
import { admissionReferralApi, type AdmissionReferralItem } from '../services/admissionReferralApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Referred Admissions board.
 *
 * Stubs admissionReferralApi.list/getComments with mock referrals so the mobile layout can be
 * reviewed without a login or a live backend. Routed at /referrals-preview under import.meta.env.DEV.
 */

const iso = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };
const future = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };

const REFERRALS: AdmissionReferralItem[] = [
    { referralId: 'r1', patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma', patientMobile: '98200 11223', referringDoctorId: 'd1', referringDoctorName: 'Dr. Meera Kulkarni', procedureName: 'Coronary Angioplasty', otPlanName: 'Cath Lab — 90 min', probableAdmissionDate: future(2), caseType: 'URGENT', statusCode: 'PENDING', createdAt: iso(1), commentCount: 2 },
    { referralId: 'r2', patientId: 'UHID-100199', patientName: 'Anita Deshpande', patientMobile: '98200 44556', referringDoctorId: 'd2', referringDoctorName: 'Dr. Arjun Rao', procedureName: 'Total Knee Replacement', probableAdmissionDate: future(5), caseType: 'PLANNED', statusCode: 'PENDING', createdAt: iso(2), commentCount: 0 },
    { referralId: 'r3', patientId: 'UHID-100777', patientName: 'Mohammed Faiz', patientMobile: '98200 77889', referringDoctorId: 'd3', referringDoctorName: 'Dr. Sneha Pillai', procedureName: 'Appendectomy', caseType: 'EMERGENCY', statusCode: 'CONVERTED', convertedAdmissionId: 'adm-9', admittedAt: iso(1), createdAt: iso(3), commentCount: 1 },
    { referralId: 'r4', patientId: 'UHID-100051', patientName: 'Sunita Rani', patientMobile: '98200 12345', referringDoctorId: 'd1', referringDoctorName: 'Dr. Meera Kulkarni', procedureName: 'Cataract Surgery', probableAdmissionDate: future(9), caseType: 'PLANNED', statusCode: 'FOLLOW_UP', followUpDate: future(3), followUpNotes: 'Will confirm after discussing with family.', createdAt: iso(6), commentCount: 3 },
    { referralId: 'r5', patientId: 'UHID-100888', patientName: 'Priya Nair', patientMobile: '98200 99001', referringDoctorId: 'd2', referringDoctorName: 'Dr. Arjun Rao', procedureName: 'Gallbladder Removal', caseType: 'PLANNED', statusCode: 'NOT_ADMITTED', notAdmittedReason: 'Patient opted for another hospital closer to home.', createdAt: iso(8), commentCount: 0 },
];

const countBy = (status: string) => REFERRALS.filter(r => r.statusCode === status).length;

admissionReferralApi.list = async (filters: any = {}) => {
    await new Promise(r => setTimeout(r, 180));
    let items = REFERRALS;
    if (filters.statusCode) items = items.filter(r => r.statusCode === filters.statusCode);
    if (filters.caseType) items = items.filter(r => r.caseType === filters.caseType);
    return {
        success: true,
        referrals: items,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 5,
        totalCount: items.length,
        statusCounts: [
            { statusCode: 'PENDING' as const, count: countBy('PENDING') },
            { statusCode: 'CONVERTED' as const, count: countBy('CONVERTED') },
            { statusCode: 'NOT_ADMITTED' as const, count: countBy('NOT_ADMITTED') },
            { statusCode: 'FOLLOW_UP' as const, count: countBy('FOLLOW_UP') },
        ],
    };
};
admissionReferralApi.getComments = async (referralId: string) => ({
    success: true,
    comments: referralId === 'r1'
        ? [
            { commentId: 'c1', commentText: 'Pre-auth initiated with insurer.', createdBy: 'Front desk', createdAt: iso(1) },
            { commentId: 'c2', commentText: 'Patient confirmed for Thursday.', createdBy: 'Dr. Meera Kulkarni', createdAt: iso(0) },
        ]
        : [],
} as any);

const ReferredAdmissionsPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return <ReferredAdmissionBoard onBack={() => alert('Back (preview)')} onAdmitReferral={(r) => alert(`Admit: ${r.patientName}`)} />;
};

export default ReferredAdmissionsPreview;
