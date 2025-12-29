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
  mobile?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  insuranceId?: string;
}

export interface PrescriptionPatientData {
  patientDetails: PrescriptionPatientDetail[];
  vitals: PrescriptionVitals;
}

export interface PrescriptionMedication {
  drugName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  saltName: string;
}

export interface PrescriptionNonPharmacologicalAdvice {
  advice: string;
  duration: string;
  notes: string;
}

export interface PrescriptionCertificate {
  type: string;
  content: string;
  issuedDate: string;
  fromDate: string;
  toDate: string;
  fitnessStatus: string;
  remarks: string;
  category: string;
}

export interface PrescriptionReferral {
  referredTo: {
    specialty: string;
    doctorName: string;
  };
  clinicalSummary: string;
}

export interface PrescriptionFollowUp {
  followUpOn: string;
  reason: string;
  patientInstructions: string;
  referralEnabled: boolean;
  referral?: PrescriptionReferral;
}

export interface PrescriptionImmunization {
  name: string;
  status: string;
  date: string;
  nextDueDate: string;
  doseNumber: number;
  remarks: string;
}

export interface PrescriptionOrders {
  investigations: string[];
  procedures: string[];
}

export interface GeneratePrescriptionDetailsPayload {
  template: PrescriptionTemplateDescriptor;
  patientData: PrescriptionPatientData;
  chiefComplaint: string;
  history: string;
  comorbidity: string;
  examination: string;
  diagnosis: string;
  orders: PrescriptionOrders;
  medications: PrescriptionMedication[];
  nonPharmacologicalAdvice: PrescriptionNonPharmacologicalAdvice[];
  privateNotes: string;
  certificates: PrescriptionCertificate;
  followUp: PrescriptionFollowUp;
  immunizations: PrescriptionImmunization[];
}

export interface GeneratePrescriptionDetailsResponse {
  success: boolean;
  message: string;
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
