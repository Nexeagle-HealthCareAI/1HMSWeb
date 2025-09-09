export interface Vitals {
  bloodPressure: string;
  temperature: string;
  heartRate: string;
  weight: string;
  height: string;
  bmi: string;
  oxygenSaturation: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Orders {
  investigations: string[];
  procedures: string[];
}

export interface FollowUp {
  date: string;
  referral: string;
  notes: string;
}

export interface EPrescription {
  id: string;
  doctorId: string;
  patientId: string;
  prescriptionNumber: string;
  prescriptionDate: string;
  vitals: Vitals;
  chiefComplaint: string;
  history: string;
  comorbidity: string;
  examination: string;
  diagnosis: string;
  orders: Orders;
  medications: Medication[];
  privateNotes: string;
  certificates: string;
  immunizations: string;
  followUp: FollowUp;
  nonPharmacologicalAdvice: string;
  attachments: string[];
  status: 'draft' | 'completed' | 'printed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface FieldConfig {
  id: string;
  label: string;
  enabled: boolean;
  required: boolean;
  category: 'basic' | 'clinical' | 'treatment' | 'administrative';
}

export interface DoctorFieldConfiguration {
  id: string;
  doctorId: string;
  fieldConfigs: FieldConfig[];
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types
export interface CreateEPrescriptionRequest {
  patientId: string;
  vitals?: Partial<Vitals>;
  chiefComplaint?: string;
  history?: string;
  comorbidity?: string;
  examination?: string;
  diagnosis?: string;
  orders?: Partial<Orders>;
  medications?: Omit<Medication, 'id'>[];
  privateNotes?: string;
  certificates?: string;
  immunizations?: string;
  followUp?: Partial<FollowUp>;
  nonPharmacologicalAdvice?: string;
  attachments?: string[];
}

export interface UpdateEPrescriptionRequest extends Partial<CreateEPrescriptionRequest> {
  status?: 'draft' | 'completed' | 'printed' | 'cancelled';
}

export interface EPrescriptionResponse {
  success: boolean;
  data: EPrescription;
  message: string;
}

export interface EPrescriptionsListResponse {
  success: boolean;
  data: {
    prescriptions: EPrescription[];
    total: number;
    page: number;
    limit: number;
  };
  message: string;
}

export interface FieldConfigurationResponse {
  success: boolean;
  data: DoctorFieldConfiguration;
  message: string;
}

export interface UpdateFieldConfigurationRequest {
  fieldConfigs: FieldConfig[];
}
