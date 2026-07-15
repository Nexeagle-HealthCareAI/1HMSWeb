import React, { useEffect, useState } from 'react';
import { AdmitPatientSheet } from '../screens/AdmitPatientSheet';
import { admissionApi } from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { consentApi } from '../services/consentApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Admit Patient sheet.
 *
 * Renders <AdmitPatientSheet> open, with the heaviest on-open lookups stubbed so the wizard renders
 * cleanly without a login or a live backend. Routed at /admit-preview only under import.meta.env.DEV
 * (see AppRoutes). The screen's own calls all .catch to empty state, so unmocked ones degrade quietly.
 */

const freeBeds: BedBoardItem[] = [
    { bedId: 'b1', wardName: 'General Ward', wardType: 'GENERAL', bedCode: 'GW-03', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 2500, sortOrder: 1 },
    { bedId: 'b2', wardName: 'Private', wardType: 'PRIVATE', bedCode: 'PVT-02', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 6000, sortOrder: 2 },
    { bedId: 'b3', wardName: 'ICU', wardType: 'ICU', bedCode: 'ICU-04', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 12000, sortOrder: 3 },
];

bedBoardApi.getBoard = async () => freeBeds;
admissionApi.getHospitalDoctors = async () => ([
    { doctorId: 'd1', doctorName: 'Dr. Meera Kulkarni', departmentName: 'Cardiology' },
    { doctorId: 'd2', doctorName: 'Dr. Arjun Rao', departmentName: 'Orthopedics' },
] as any);
consentApi.getTemplates = async () => [];

const AdmitPatientPreview: React.FC = () => {
    const [open, setOpen] = useState(true);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setOpen(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            {!open && (
                <button onClick={() => setOpen(true)} className="h-11 px-6 rounded-xl bg-brand-600 text-white font-bold">
                    Open Admit Patient
                </button>
            )}
            <AdmitPatientSheet
                open={open}
                onOpenChange={setOpen}
                onAdmitted={() => alert('Admitted (preview)')}
            />
        </div>
    );
};

export default AdmitPatientPreview;
