// src/components/shared/prescription-preview/utils/prescriptionModel.ts

/**
 * Unified model for prescription data used throughout the prescription preview module.
 */

export interface PrescriptionPatient {
  id: string;
  name: string;
  age: string;
  ageUnit?: string;
  gender: string;
  phone: string;
  address?: string;
  contact?: string;
  cityId: string;
  state?: string;
  country?: string;
  pincode?: string;
  guardianName?: string;
  guardianRelation?: string;
  referrerName?: string;
  referrerRelation?: string;
  referrerType?: string;
}

export interface PrescriptionVitals {
  bloodPressure: string;
  pulse: string;
  temperature: string;
  spo2: string;
  height: string;
  weight: string;
  bmi: string;
}

export interface PrescriptionData {
  patient: PrescriptionPatient;
  vitals: PrescriptionVitals;
  // Add more fields as needed for medications, doctor, etc.
}
