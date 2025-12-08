import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface GeneratePrescriptionDetailsRequest {
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
}

export interface PrescriptionTemplateDescriptor {
  prescriptionSettingsId: string | null;
  hospitalId: string | null;
  doctorId: string | null;
  headerHeight: number;
  footerHeight: number;
  contentLeftMargin: number;
  contentRightMargin: number;
  overFlowPage: boolean;
  fontFamily: string | null;
  fontSize: number;
  fontWeight: string | null;
  textColour: string | null;
  uri: string | null;
  createdBy: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface PrescriptionVitalsBp {
  sys: number;
  dia: number;
}

export interface PrescriptionVitals {
  bp: PrescriptionVitalsBp;
  pulse: number;
  tempC: number;
  spo2: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
}

export interface PrescriptionPatientDetail {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  address: string;
  contact: string;
}

export interface PrescriptionPatientData {
  patientDetails: PrescriptionPatientDetail[];
  vitals: PrescriptionVitals;
}

export interface GeneratePrescriptionDetailsPayload {
  template: PrescriptionTemplateDescriptor;
  patientData: PrescriptionPatientData;
}

export interface GeneratePrescriptionDetailsResponse {
  success: boolean;
  appointmentId: string;
  data: GeneratePrescriptionDetailsPayload;
}

export const generatePrescriptionDetailsService = {
  async fetch(payload: GeneratePrescriptionDetailsRequest): Promise<GeneratePrescriptionDetailsResponse> {
    const response = await apiClient.post<GeneratePrescriptionDetailsResponse>(
      API_ENDPOINTS.PRESCRIPTION.GENERATE_DETAILS,
      payload
    );
    return response;
  },
};
