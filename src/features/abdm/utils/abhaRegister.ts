// Registering a patient from a verified ABHA (ABDM M1: VRFY_ABHA_101, 201, 306, 308, CRT_ABHA_116
// and the one-ABHA-per-patient tagging case). Pure, so it is easy to test. The server enforces the
// same rules: name, date of birth and gender always come from the ABHA.

import type { AbhaPatientSummary } from '../services/abdmApi';

export interface AbhaVerifiedProfile {
  abhaNumber?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  address?: string;
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
  profilePhoto?: string;
  kycVerified?: boolean;
}

// The fields staff may change on a form filled from an ABHA.
export interface AbhaEditableForm {
  mobile: string;
  email: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

export const digits = (v?: string | null): string => (v ?? '').replace(/\D/g, '');

const lastTen = (v?: string | null): string => {
  const d = digits(v);
  return d.length > 10 ? d.slice(-10) : d;
};

export const sameMobile = (a?: string | null, b?: string | null): boolean => {
  const x = lastTen(a);
  return x.length === 10 && x === lastTen(b);
};

// "******1234": a mobile is never shown in full beside the form.
export const maskMobile = (v?: string | null): string => {
  const d = digits(v);
  if (d.length < 4) return v ?? '';
  return `******${d.slice(-4)}`;
};

export const genderLabel = (g?: string | null): string => {
  const v = (g ?? '').trim().toLowerCase();
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'f' || v === 'female') return 'Female';
  if (!v) return '';
  return v === 'o' || v === 'other' ? 'Other' : g ?? '';
};

// The form a new registration starts from: what the ABHA holds. Linking an existing patient starts
// from that patient's own record, falling back to the ABHA where the record is empty.
export const initialForm = (abha: AbhaVerifiedProfile, patient?: AbhaPatientSummary | null): AbhaEditableForm => {
  const pick = (own?: string | null, fromAbha?: string | null) => ((own ?? '').trim() || (fromAbha ?? '').trim());
  return {
    mobile: lastTen(pick(patient?.mobile, abha.mobile)),
    email: pick(patient?.email, abha.email),
    addressLine: pick(patient?.addressLine, abha.address),
    city: pick(patient?.city, abha.city),
    district: pick(patient?.district, abha.district),
    state: pick(patient?.state, abha.state),
    pincode: pick(patient?.pincode, abha.pincode),
  };
};

export interface CompareRow {
  label: string;
  abha: string;
  hmis: string;
  differs: boolean;
}

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');

// The comparison screen of VRFY_ABHA_308: the ABHA's details beside what the patient record holds.
export const compareRows = (abha: AbhaVerifiedProfile, patient: AbhaPatientSummary): CompareRow[] => {
  const age = patient.age != null ? `${patient.age} ${patient.ageUnit === 'M' ? 'months' : patient.ageUnit === 'D' ? 'days' : 'years'}` : '';
  const rows: Array<[string, string, string]> = [
    ['Name', abha.fullName ?? '', patient.fullName ?? ''],
    ['Date of birth / age', abha.dateOfBirth ?? '', patient.dateOfBirth || age],
    ['Gender', genderLabel(abha.gender), genderLabel(patient.sex)],
    ['Mobile', maskMobile(abha.mobile), maskMobile(patient.mobile)],
    ['Address', abha.address ?? '', patient.addressLine ?? ''],
    ['District', abha.district ?? '', patient.district ?? ''],
    ['State', abha.state ?? '', patient.state ?? ''],
    ['ABHA number', abha.abhaNumber ?? '', patient.abhaId ?? ''],
  ];
  return rows.map(([label, a, h]) => ({
    label, abha: a, hmis: h,
    differs: label === 'Mobile' ? !sameMobile(abha.mobile, patient.mobile) : norm(a) !== norm(h),
  }));
};

// A patient already holding a different ABHA cannot take this one (one ABHA per patient).
export const holdsOtherAbha = (patient: AbhaPatientSummary, abhaNumber?: string): boolean => {
  const own = digits(patient.abhaId);
  return own.length === 14 && own !== digits(abhaNumber);
};
