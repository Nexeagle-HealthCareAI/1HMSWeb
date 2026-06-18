import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// Structured prescription fields parsed from a voice dictation (mirrors the backend).
export interface VoiceRxFields {
  chiefComplaint?: string;
  history?: string;
  examination?: string;          // general examination
  systemicExamination?: string;
  diagnosis?: string;
  investigations?: string[];
  procedures?: string[];
  medications?: { name?: string; dose?: string; frequency?: string; duration?: string; instructions?: string }[];
  advice?: { advice?: string; duration?: string; notes?: string }[];
  followUp?: { followUpOn?: string; reason?: string };
}

export interface ParseVoiceRxResponse {
  success: boolean;
  message: string;
  transcript: string;
  fields: VoiceRxFields;
}

export interface ParseVoiceRxParams {
  audio: Blob;
  fileName: string;
  hospitalId: string;
  doctorId: string;
  patientId?: string;
  language?: string;   // "en", "hi", or omit for auto-detect
  mode?: 'dictation' | 'ambient';   // ambient = recorded doctor-patient consultation
}

export const voiceRxApi = {
  async parse(params: ParseVoiceRxParams): Promise<ParseVoiceRxResponse> {
    const form = new FormData();
    form.append('Audio', params.audio, params.fileName);
    form.append('HospitalId', params.hospitalId);
    form.append('DoctorId', params.doctorId);
    if (params.patientId) form.append('PatientId', params.patientId);
    if (params.language) form.append('Language', params.language);
    if (params.mode) form.append('Mode', params.mode);
    return apiClient.post<ParseVoiceRxResponse>(API_ENDPOINTS.E_PRESCRIPTION.VOICE_PARSE, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
