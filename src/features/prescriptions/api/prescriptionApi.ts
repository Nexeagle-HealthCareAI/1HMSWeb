import { apiClient } from '@/services/axiosClient';

export interface PrescriptionTemplate {
  id?: string;
  elements: any[];
  canvasBackground: string;
  backgroundImage?: string | null;
  backgroundSize: number;
  backgroundBlur: number;
  timestamp: string;
}

export interface Prescription {
  id?: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnoses: string[];
  medicines: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    timing: {
      morning: boolean;
      afternoon: boolean;
      night: boolean;
    };
    beforeFood?: boolean;
  }[];
  labTests: string[];
  advice: string;
  followUpDate?: string;
  signature: string;
}

export const prescriptionApi = {
  // Save prescription template
  saveTemplate: (template: PrescriptionTemplate): Promise<any> => {
    return apiClient.post('/prescriptions/templates', template);
  },

  // Get latest prescription template
  getLatestTemplate: (): Promise<any> => {
    return apiClient.get('/prescriptions/templates/latest');
  },

  // Save prescription
  savePrescription: (prescription: Prescription): Promise<any> => {
    return apiClient.post('/prescriptions', prescription);
  },

  // Get prescription by ID
  getPrescription: (id: string): Promise<any> => {
    return apiClient.get(`/prescriptions/${id}`);
  },

  // Get prescriptions by patient ID
  getPatientPrescriptions: (patientId: string): Promise<any> => {
    return apiClient.get(`/prescriptions/patient/${patientId}`);
  },

  // Get prescriptions by doctor ID
  getDoctorPrescriptions: (doctorId: string): Promise<any> => {
    return apiClient.get(`/prescriptions/doctor/${doctorId}`);
  },

  // Send prescription to patient
  sendToPatient: (prescriptionId: string): Promise<any> => {
    return apiClient.post(`/prescriptions/${prescriptionId}/send`);
  },

  // Delete prescription
  deletePrescription: (id: string): Promise<any> => {
    return apiClient.delete(`/prescriptions/${id}`);
  }
};
