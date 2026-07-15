import React, { useEffect, useState } from 'react';
import { ConsultantLedgerScreen } from '../screens/ConsultantLedgerScreen';
import { consultantIncentiveApi, type ConsultantIncentiveDoctorSummary, type ConsultantIncentiveLine } from '../services/consultantIncentiveApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Consultant Incentive Ledger.
 *
 * Stubs consultantIncentiveApi.getSummary/getLedger with mock doctors + lines so the mobile drill-in
 * layout can be reviewed without a login or a live backend. Routed at /ledger-preview under
 * import.meta.env.DEV (see AppRoutes).
 */

const iso = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };

const DOCTORS: ConsultantIncentiveDoctorSummary[] = [
    { doctorId: 'd1', doctorName: 'Dr. Meera Kulkarni', accruedTotal: 48500, paidTotal: 132000, cancelledTotal: 2500 },
    { doctorId: 'd2', doctorName: 'Dr. Arjun Rao', accruedTotal: 21000, paidTotal: 76000, cancelledTotal: 0 },
    { doctorId: 'd3', doctorName: 'Dr. Sneha Pillai', accruedTotal: 0, paidTotal: 94500, cancelledTotal: 1200 },
];

const LINES: Record<string, ConsultantIncentiveLine[]> = {
    d1: [
        { consultantIncentiveLedgerId: 'l1', patientId: 'UHID-100482', chargeEventId: 'c1', chargeDisplayName: 'Coronary Angiography — treating fee', incentiveAmount: 12500, statusCode: 'ACCRUED', accruedAt: iso(1) },
        { consultantIncentiveLedgerId: 'l2', patientId: 'UHID-100199', chargeEventId: 'c2', chargeDisplayName: 'ICU daily consultant round', incentiveAmount: 8000, statusCode: 'ACCRUED', accruedAt: iso(2) },
        { consultantIncentiveLedgerId: 'l3', patientId: 'UHID-100051', chargeEventId: 'c3', chargeDisplayName: 'Echocardiography review', incentiveAmount: 28000, statusCode: 'ACCRUED', accruedAt: iso(3) },
        { consultantIncentiveLedgerId: 'l4', patientId: 'UHID-100634', chargeEventId: 'c4', chargeDisplayName: 'Angioplasty — treating fee', incentiveAmount: 132000, statusCode: 'PAID', accruedAt: iso(20), paidAt: iso(6), payoutRef: 'VCH-2026-0044' },
        { consultantIncentiveLedgerId: 'l5', patientId: 'UHID-100777', chargeEventId: 'c5', chargeDisplayName: 'Cancelled admission adjustment', incentiveAmount: 2500, statusCode: 'CANCELLED', accruedAt: iso(9) },
    ],
    d2: [
        { consultantIncentiveLedgerId: 'l6', patientId: 'UHID-100888', chargeEventId: 'c6', chargeDisplayName: 'Knee replacement — treating fee', incentiveAmount: 21000, statusCode: 'ACCRUED', accruedAt: iso(1) },
        { consultantIncentiveLedgerId: 'l7', patientId: 'UHID-100234', chargeEventId: 'c7', chargeDisplayName: 'Fracture reduction', incentiveAmount: 76000, statusCode: 'PAID', accruedAt: iso(15), paidAt: iso(4), payoutRef: 'VCH-2026-0039' },
    ],
    d3: [
        { consultantIncentiveLedgerId: 'l8', patientId: 'UHID-100345', chargeEventId: 'c8', chargeDisplayName: 'Cataract surgery — treating fee', incentiveAmount: 94500, statusCode: 'PAID', accruedAt: iso(30), paidAt: iso(10), payoutRef: 'VCH-2026-0031' },
    ],
};

const sum = (lines: ConsultantIncentiveLine[], status: string) =>
    lines.filter(l => l.statusCode === status).reduce((s, l) => s + l.incentiveAmount, 0);

consultantIncentiveApi.getSummary = async () => { await new Promise(r => setTimeout(r, 150)); return DOCTORS; };
consultantIncentiveApi.getLedger = async (doctorId: string, statusCode?: string) => {
    await new Promise(r => setTimeout(r, 150));
    const all = LINES[doctorId] ?? [];
    const lines = statusCode ? all.filter(l => l.statusCode === statusCode) : all;
    return { lines, accruedTotal: sum(all, 'ACCRUED'), paidTotal: sum(all, 'PAID'), cancelledTotal: sum(all, 'CANCELLED') };
};

const ConsultantLedgerPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return <ConsultantLedgerScreen onBack={() => alert('Back to dashboard (preview)')} />;
};

export default ConsultantLedgerPreview;
