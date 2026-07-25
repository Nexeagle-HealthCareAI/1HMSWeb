import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

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
    // apiClient already has baseURL configured (API_REQUEST_BASE_URL) — pass the relative
    // endpoint straight through. Manually prepending API_BASE_URL here bypassed that baseURL
    // once absolute, which broke in dev (mixed-content: page is HTTPS, the real API host is
    // plain HTTP — see app/api.ts's API_REQUEST_BASE_URL comment).
    const endpoint = API_ENDPOINTS.E_PRESCRIPTION.GET_PATIENT_VITALS(patientId, appointmentId);
    const response = await apiClient.get<PatientVitalsResponse>(endpoint, {
      params: { patientId, appointmentId },
    });
    return response;
  },

  async saveVitals(payload: SaveVitalsRequest) {
    return apiClient.post(API_ENDPOINTS.APPOINTMENTS.SAVE_VITALS, payload);
  },
};
