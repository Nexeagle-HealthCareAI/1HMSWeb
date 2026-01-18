import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS, API_BASE_URL } from '@/app/api';

export interface PatientVitalsResponse {
  bp?: { sys?: number; dia?: number };
  pulse?: number;
  tempC?: number;
  spo2?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  respiratoryRate?: number;
}

export interface SaveVitalsRequest {
  appointmentId: string;
  patientId: string;
  vitalsJson: {
    bp: { sys: number; dia: number };
    pulse: number;
    tempC: number;
    spo2: number;
    heightCm: number;
    weightKg: number;
    bmi: number;
    respiratoryRate: number;
  };
  recordedBy: string;
}

export const vitalsApi = {
  async fetchVitals(patientId: string, appointmentId: string): Promise<PatientVitalsResponse> {
    const url = `${API_BASE_URL}${API_ENDPOINTS.E_PRESCRIPTION.GET_PATIENT_VITALS(patientId, appointmentId)}`;
    const response = await apiClient.get<PatientVitalsResponse>(url, {
      params: { patientId, appointmentId },
    });
    return response;
  },

  async saveVitals(payload: SaveVitalsRequest) {
    const url = `${API_BASE_URL}/${API_ENDPOINTS.APPOINTMENTS.SAVE_VITALS}`;
    return apiClient.post(url, payload);
  },
};
