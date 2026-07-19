import React, { useEffect, useState } from 'react';
import { ClinicalDashboard } from '../components/DocBoard';
import { doctorApi, type DoctorProfileResponse, type DoctorAppointmentDetail } from '../services/doctorApi';
import { admissionReferralApi } from '@/features/ipd-redesign/services/admissionReferralApi';
import { useAuthStore } from '@/store/authStore';
import {
  prescriptionFieldLayoutApi,
  DEFAULT_PRESCRIPTION_FIELDS,
  type PrescriptionFieldConfigItem,
  type GetFieldLayoutResponse,
  type UpdateFieldLayoutResponse,
} from '@/features/prescription/services/prescriptionFieldLayoutApi';
import { personalizedDataApi, type PersonalizedDataResponse } from '@/features/prescription/services/personalizedDataApi';

/**
 * DEV-ONLY preview harness for the doctor's Clinical Dashboard (DocBoard.tsx, exported as
 * ClinicalDashboard). Stubs the two `doctorApi` reads (getDoctorProfile, getAppointmentDetails —
 * both used via useDoctorProfile/useDoctorAppointmentDetails, which are react-query hooks wrapping
 * these object methods) with mock data, plus admissionReferralApi.list (called directly on mount).
 * Routed at /docboard-preview only under import.meta.env.DEV (see AppRoutes).
 */

const iso = (h: number, m = 0, dayOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

doctorApi.getDoctorProfile = async (): Promise<DoctorProfileResponse> => {
    await new Promise(r => setTimeout(r, 150));
    return {
        doctorId: 'd1',
        userId: 'PREVIEW-USER',
        licenseNumber: 'MH-12345',
        qualifications: ['MBBS', 'MD (Cardiology)'],
        experienceYears: 12,
        medicalCouncil: 'Maharashtra Medical Council',
        registrationYear: 2013,
        bio: 'Senior consultant cardiologist.',
        primaryDepartmentID: 'dept1',
        primaryDepartmentName: 'Cardiology',
        profileCompletionPercentage: 100,
        createdAt: iso(9, 0, -400),
        doctorDepartments: [],
        doctorSpecializations: [],
    };
};

let tokenSeq = 100;
const appt = (p: Partial<DoctorAppointmentDetail> & { patientFullName: string; startAt: string; finalStatusCode: string }): DoctorAppointmentDetail => ({
    patientId: `UHID-${1000 + tokenSeq}`,
    patientMobile: '98200 11223',
    patientSex: 'M',
    patientAgeYears: 45,
    appointmentId: `apt-${tokenSeq}`,
    appointmentDate: p.startAt.slice(0, 10),
    endAt: p.startAt,
    reason: 'General consultation',
    insuranceId: null,
    paymentMode: 'CASH',
    lastStatusAt: p.startAt,
    createdAt: p.startAt,
    tokenDetails: { tokenId: `tok-${tokenSeq}`, tokenNumber: tokenSeq++, createdAt: p.startAt },
    ...p,
});

const MOCK_APPOINTMENTS: DoctorAppointmentDetail[] = [
    appt({ patientFullName: 'Rajesh Kumar Sharma', startAt: iso(9, 0), finalStatusCode: 'READY' }),
    appt({ patientFullName: 'Anita Deshpande', startAt: iso(9, 30), finalStatusCode: 'VITALS_REQUIRED' }),
    appt({ patientFullName: 'Mohammed Faiz', startAt: iso(10, 0), finalStatusCode: 'UNDER_CONSULT' }),
    appt({ patientFullName: 'Sunita Rani', startAt: iso(10, 30), finalStatusCode: 'LAB_REQUIRED' }),
    appt({ patientFullName: 'Vikram Singh Rathore', startAt: iso(8, 0, -1), finalStatusCode: 'COMPLETED' }),
    appt({ patientFullName: 'Priya Nair', startAt: iso(11, 0, -1), finalStatusCode: 'COMPLETED' }),
    appt({ patientFullName: 'Gopal Krishna Iyer', startAt: iso(9, 0, 1), finalStatusCode: 'READY' }),
    appt({ patientFullName: 'Fatima Begum', startAt: iso(9, 30, 1), finalStatusCode: 'READY' }),
];

doctorApi.getAppointmentDetails = async (): Promise<{ items: DoctorAppointmentDetail[] }> => {
    await new Promise(r => setTimeout(r, 150));
    return { items: MOCK_APPOINTMENTS };
};

admissionReferralApi.list = async () => ({
    success: true,
    referrals: [],
    page: 1,
    pageSize: 5,
    totalCount: 0,
    statusCounts: [],
});

// In-memory store so Settings → Fields "Save" actually persists across re-fetches within the
// preview session (proves the update round-trip works; real persistence needs the real backend).
let mockFieldLayout: PrescriptionFieldConfigItem[] = DEFAULT_PRESCRIPTION_FIELDS.map(f => ({ ...f }));

prescriptionFieldLayoutApi.getFieldLayout = async (): Promise<GetFieldLayoutResponse> => {
    await new Promise(r => setTimeout(r, 150));
    return { success: true, message: 'ok', fields: mockFieldLayout.map(f => ({ ...f })) };
};

prescriptionFieldLayoutApi.updateFieldLayout = async (_doctorId: string, fields: PrescriptionFieldConfigItem[]): Promise<UpdateFieldLayoutResponse> => {
    await new Promise(r => setTimeout(r, 150));
    mockFieldLayout = fields.map(f => ({ ...f }));
    return { success: true, message: 'Saved' };
};

const mockPersonalizedData: Record<string, PersonalizedDataResponse[]> = {};

personalizedDataApi.list = async (_doctorId: string, _hospitalId: string, lookupType: string) => {
    await new Promise(r => setTimeout(r, 100));
    return mockPersonalizedData[lookupType] || [];
};

personalizedDataApi.upsert = async (_doctorId: string, _hospitalId: string, lookupType: string, payload: any) => {
    await new Promise(r => setTimeout(r, 100));
    const list = mockPersonalizedData[lookupType] || [];
    const id = payload.personalId || `personal-${Date.now().toString(36)}`;
    const next = { id, personalId: id, name: payload.name, code: payload.code, shortDesc: payload.shortDesc, synonyms: payload.synonyms, usageCount: 0 };
    mockPersonalizedData[lookupType] = payload.personalId
        ? list.map(item => (item.personalId === payload.personalId ? next : item))
        : [...list, next];
    return { success: true, message: 'ok' };
};

personalizedDataApi.remove = async (_doctorId: string, _hospitalId: string, personalId: string) => {
    await new Promise(r => setTimeout(r, 100));
    Object.keys(mockPersonalizedData).forEach(key => {
        mockPersonalizedData[key] = mockPersonalizedData[key].filter(item => item.personalId !== personalId);
    });
    return { success: true, message: 'ok' };
};

const DocBoardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL', userId: 'PREVIEW-USER', userRole: 'Doctor' });
        setTick(t => t + 1);
    }, []);

    return <ClinicalDashboard />;
};

export default DocBoardPreview;
