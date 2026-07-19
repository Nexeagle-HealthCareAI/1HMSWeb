import React, { useEffect, useState } from 'react';
import { PatientProfilePage } from './PatientProfilePage';
import { patientProfileApi, type PatientProfileData } from '../services/patientProfileApi';
import { timelineApi, type TimelineApiResponse } from '../services/timelineApi';
import { vitalsApi, type PatientVitalsResponse } from '../services/vitalsApi';
import { eprescriptionApi, type EPrescriptionDraftReq, type LookupDetailsResponse } from '../services/eprescriptionApi';
import { prescriptionFieldConfigApi } from '@/features/doctor/services/prescriptionFieldConfigApi';
import {
  prescriptionFieldLayoutApi,
  DEFAULT_PRESCRIPTION_FIELDS,
  type PrescriptionFieldConfigItem,
  type GetFieldLayoutResponse,
  type UpdateFieldLayoutResponse,
} from '@/features/prescription/services/prescriptionFieldLayoutApi';
import { personalizedDataApi, type PersonalizedDataResponse } from '@/features/prescription/services/personalizedDataApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the "write a prescription" flow (PatientProfilePage, opened when a
 * doctor clicks a UHID/patient ID from Doc Board). Mocks the read endpoints hit on initial mount:
 * patientProfileApi.getPatientProfile, eprescriptionApi.getDraft/getLookupDetails,
 * timelineApi.getEvents, vitalsApi.fetchVitals, prescriptionFieldConfigApi.getFieldPreferences.
 * Also mocks prescriptionFieldLayoutApi.getFieldLayout/updateFieldLayout with an in-memory store so
 * the "Prescription Fields" sheet's Save button actually persists within the session. Other write
 * actions (save/submit draft, personalized-data upsert) are not mocked — this is otherwise a
 * read-only visual check. Routed at /rx-preview?patientId=UHID-1001&appointmentId=apt-1 only under
 * import.meta.env.DEV (see AppRoutes).
 */

const MOCK_PROFILE: PatientProfileData = {
  registrationId: 'reg-1',
  hospitalId: 'PREVIEW-HOSPITAL',
  patientId: 'UHID-1001',
  fullName: 'Rajesh Kumar Sharma',
  mobile: '98200 11223',
  ageYears: 45,
  sex: 'Male',
  addressLine1: '12 MG Road',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  pincode: '411001',
  insuranceId: null,
  paymentMode: 'CASH',
  registeredAt: new Date().toISOString(),
  registeredBy: 'PREVIEW-USER',
  bloodGroup: 'O+',
  allergies: 'Penicillin, Dust',
  email: 'rajesh.sharma@example.com',
};

patientProfileApi.getPatientProfile = async (): Promise<PatientProfileData> => {
  await new Promise(r => setTimeout(r, 150));
  return MOCK_PROFILE;
};

timelineApi.getEvents = async (): Promise<TimelineApiResponse> => {
  await new Promise(r => setTimeout(r, 100));
  return { success: true, message: 'ok', data: [] };
};

vitalsApi.fetchVitals = async (): Promise<PatientVitalsResponse> => {
  await new Promise(r => setTimeout(r, 100));
  return { bp: { sys: 120, dia: 80 }, pulse: 76, tempC: 36.8, spo2: 98, heightCm: 170, weightKg: 72, bmi: 24.9, respiratoryRate: 16 };
};

const MOCK_DRAFT: EPrescriptionDraftReq = {
  prescriptionId: null,
  appointmentId: 'apt-1',
  patientId: 'UHID-1001',
  doctorId: 'PREVIEW-USER',
  hospitalId: 'PREVIEW-HOSPITAL',
  chiefComplaint: 'Fever and cough for 3 days',
  diagnosis: 'Acute viral upper respiratory infection',
  medications: [
    { drugName: 'Paracetamol', dose: '650mg', route: 'Oral', frequency: 'TID', duration: '3 days', instructions: 'After food', saltName: 'Paracetamol', displayOrder: 0 },
  ],
  immunizations: [
    { name: 'Influenza', status: 'given', date: new Date().toISOString().slice(0, 10), nextDueDate: '', doseNumber: 1, remarks: '' },
  ],
  certificates: [{ type: 'FITNESS', content: '', issuedDate: new Date().toISOString().slice(0, 10) }],
  loggedInUserName: 'Dr. Preview',
};

eprescriptionApi.getDraft = async () => {
  await new Promise(r => setTimeout(r, 150));
  return { success: true, message: 'ok', data: MOCK_DRAFT };
};

eprescriptionApi.getLookupDetails = async (): Promise<LookupDetailsResponse> => {
  await new Promise(r => setTimeout(r, 100));
  return { hospitalId: 'PREVIEW-HOSPITAL', doctorId: 'PREVIEW-USER', lookupType: 'all', totalTypes: 0, items: [], success: true, message: 'ok' };
};

prescriptionFieldConfigApi.getFieldPreferences = async () => {
  await new Promise(r => setTimeout(r, 100));
  return {
    success: true,
    message: 'ok',
    preference: {
      doctorId: 'PREVIEW-USER',
      vitals: true,
      chiefComplaint: true,
      history: true,
      comorbidity: true,
      examination: true,
      diagnosis: true,
      investigations: true,
      procedures: true,
      medications: true,
      privateNotes: true,
      certificatesAndNotes: true,
      immunizations: true,
      followUpAndReferral: true,
      nonPharmacologicalAdvice: true,
      attachments: true,
    },
  };
};

// In-memory store so Settings → Fields "Save" (opened via the "Prescription Fields" sheet from
// within the pad) actually persists across re-fetches within the preview session, and the pad's
// own field order/labels (also read via usePrescriptionFieldLayout) update reactively through the
// shared react-query cache — proves the update round-trip works end to end in the preview.
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

// The "Prescription Fields" sheet mounts the same PrescriptionCustomizePanel used for the
// Library/personalized tab, which fetches personalizedDataApi.list on mount regardless of which
// sub-tab is active — mock it too so the sheet doesn't show a "Load failed" toast.
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

const PatientProfilePagePreview: React.FC = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL', userId: 'PREVIEW-USER', doctorId: 'PREVIEW-USER', userRole: 'Doctor' });
    if (!window.location.search.includes('patientId')) {
      const url = new URL(window.location.href);
      url.searchParams.set('patientId', 'UHID-1001');
      url.searchParams.set('appointmentId', 'apt-1');
      window.history.replaceState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setTick(t => t + 1);
  }, []);

  return <PatientProfilePage />;
};

export default PatientProfilePagePreview;
