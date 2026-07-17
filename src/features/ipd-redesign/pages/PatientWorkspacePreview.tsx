import React, { useEffect, useState } from 'react';
import { PatientWorkspace } from '../screens/PatientWorkspace';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem } from '../services/admissionApi';
import { bedBoardApi } from '../services/bedBoardApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Patient Workspace (opened by clicking an admission row on the
 * IPD dashboard). Stubs the admission/bed/doctor lookups PatientWorkspace fetches on mount; the
 * ~18 clinical panels it renders per-section (CPOE, MAR, Vitals, Discharge, ...) each fetch their
 * own data and degrade to an empty/error state when unmocked — fine for reviewing layout/mobile
 * behavior. Routed at /workspace-preview only under import.meta.env.DEV (see AppRoutes).
 */

const MOCK_ADMISSION: ActiveAdmissionItem = {
    admissionId: 'adm-1', admissionNo: 'ADM-2026-0481', admissionToken: 'T-07', admissionType: 'EMERGENCY',
    statusCode: 'ADMITTED', payerType: 'CASH', admittedAt: new Date().toISOString(),
    patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma', patientAge: 54, patientSex: 'M',
    bedCode: 'ICU-04', wardName: 'ICU', primaryDoctorId: 'd1', primaryDoctorName: 'Dr. Meera Kulkarni',
    payerName: null, referralSource: 'DOCTOR', referralName: 'Dr. Kavita Menon (ENT)',
    admissionReason: 'Chest pain, suspected ACS', diagnosis: 'Acute coronary syndrome — under evaluation',
    entitledRoomCategory: 'GENERAL',
};

admissionApi.getActiveAdmissions = async () => { await new Promise(r => setTimeout(r, 150)); return [MOCK_ADMISSION]; };
admissionApi.getHospitalDoctors = async (): Promise<HospitalDoctorItem[]> => ([
    { doctorId: 'd1', fullName: 'Dr. Meera Kulkarni', departmentName: 'Cardiology' } as HospitalDoctorItem,
    { doctorId: 'd2', fullName: 'Dr. Arjun Rao', departmentName: 'Orthopedics' } as HospitalDoctorItem,
]);
admissionApi.getDoctorHistory = async () => ([]);
admissionApi.getReferrerHistory = async () => ([]);
bedBoardApi.getBoard = async () => ([
    { bedId: 'b1', wardName: 'General Ward', wardType: 'GENERAL', bedCode: 'GW-03', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 2500, sortOrder: 1 },
    { bedId: 'b2', wardName: 'ICU', wardType: 'ICU', bedCode: 'ICU-05', statusCode: 'AVAILABLE', isActive: true, effectiveDailyRate: 12000, sortOrder: 2 },
] as any);

const PatientWorkspacePreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return (
        <PatientWorkspace
            admission={MOCK_ADMISSION}
            onBack={() => alert('Back to dashboard (preview)')}
            onChanged={() => {}}
        />
    );
};

export default PatientWorkspacePreview;
