import React, { useEffect, useState } from 'react';
import { BedBoardScreen } from '../screens/BedBoardScreen';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Bed Board screen.
 *
 * Renders the real <BedBoardScreen> with bedBoardApi.getBoard() stubbed to mock beds across a few
 * wards and a dummy hospitalId, so the mobile UI can be iterated without a login or a live backend.
 * Routed at /bedboard-preview only under import.meta.env.DEV (see AppRoutes). Not part of the app.
 */

let seq = 0;
const bed = (p: Partial<BedBoardItem> & { bedCode: string; effectiveDailyRate: number }): BedBoardItem => ({
    bedId: `bed-${++seq}`,
    isActive: true,
    sortOrder: seq,
    statusCode: 'AVAILABLE',
    ...p,
});

const occ = (bedCode: string, ward: string, rate: number, patientName: string, age: number, sex: string, admissionNo: string, token?: string): BedBoardItem =>
    bed({
        bedCode, wardName: ward, effectiveDailyRate: rate, statusCode: 'OCCUPIED',
        admissionId: `adm-${bedCode}`, bedAssignmentId: `ba-${bedCode}`, admissionNo,
        admissionType: 'IPD', payerType: 'CASH', admissionToken: token ?? null,
        patientId: `UHID-${1000 + seq}`, patientName, patientAge: age, patientSex: sex,
    });

const MOCK: BedBoardItem[] = [
    // ICU
    occ('ICU-01', 'ICU', 12000, 'Rajesh Kumar Sharma', 54, 'M', 'ADM-2026-0481', 'T-07'),
    occ('ICU-02', 'ICU', 12000, 'Fatima Begum', 58, 'F', 'ADM-2026-0460'),
    bed({ bedCode: 'ICU-03', wardName: 'ICU', effectiveDailyRate: 12000, statusCode: 'CLEANING' }),
    bed({ bedCode: 'ICU-04', wardName: 'ICU', effectiveDailyRate: 12000, statusCode: 'AVAILABLE' }),
    // General Ward
    occ('GW-01', 'General Ward', 2500, 'Gopal Krishna Iyer', 72, 'M', 'ADM-2026-0466'),
    occ('GW-02', 'General Ward', 2500, 'Anita Deshpande', 41, 'F', 'ADM-2026-0480'),
    bed({ bedCode: 'GW-03', wardName: 'General Ward', effectiveDailyRate: 2500, statusCode: 'AVAILABLE' }),
    bed({ bedCode: 'GW-04', wardName: 'General Ward', effectiveDailyRate: 2500, statusCode: 'AVAILABLE' }),
    bed({ bedCode: 'GW-05', wardName: 'General Ward', effectiveDailyRate: 2500, statusCode: 'RESERVED' }),
    bed({ bedCode: 'GW-06', wardName: 'General Ward', effectiveDailyRate: 2500, statusCode: 'BLOCKED' }),
    occ('GW-07', 'General Ward', 2500, 'Sunita Rani', 67, 'F', 'ADM-2026-0477', 'T-12'),
    // Private
    occ('PVT-01', 'Private', 6000, 'Vikram Singh Rathore', 48, 'M', 'ADM-2026-0475'),
    bed({ bedCode: 'PVT-02', wardName: 'Private', effectiveDailyRate: 6000, statusCode: 'AVAILABLE' }),
    bed({ bedCode: 'PVT-03', wardName: 'Private', effectiveDailyRate: 6000, statusCode: 'CLEANING' }),
];

bedBoardApi.getBoard = async (): Promise<BedBoardItem[]> => {
    await new Promise(r => setTimeout(r, 200));
    return MOCK;
};

const BedBoardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return <BedBoardScreen onBack={() => alert('Back to dashboard (preview)')} />;
};

export default BedBoardPreview;
