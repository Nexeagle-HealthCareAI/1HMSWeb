import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

import { GeneratePrescriptionDetailsPayload } from '@/components/shared/prescription-preview/services/generatePrescriptionDetailsService';

export interface TranslateRequest {
    text: string;
    targetLanguage: string;
}

export interface TranslateMultipleRequest {
    texts: Record<string, string>;
    targetLanguage: string;
}

export interface TranslateResponse {
    translatedText: string;
}

// Note: apiClient.post<T> already returns T (response.data is unwrapped internally)
export const translationApi = {
    translateText: async (data: TranslateRequest): Promise<TranslateResponse> => {
        const result = await apiClient.post<TranslateResponse>('/api/v1/translation/translate', data);
        console.log('[TranslationApi] translateText result:', result);
        return result;
    },

    translateMultiple: async (data: TranslateMultipleRequest): Promise<Record<string, string>> => {
        const result = await apiClient.post<Record<string, string>>('/api/v1/translation/translate-multiple', data);
        console.log('[TranslationApi] translateMultiple result:', result);
        return result;
    }
};

export const translatePrescriptionPayload = async (
  payload: GeneratePrescriptionDetailsPayload,
  targetLanguage: string
): Promise<GeneratePrescriptionDetailsPayload> => {
  const texts: Record<string, string> = {};
  
  if (payload.chiefComplaint) texts['chiefComplaint'] = payload.chiefComplaint;
  if (payload.history) texts['history'] = payload.history;
  if (payload.comorbidity) texts['comorbidity'] = payload.comorbidity;
  if (payload.examination) texts['examination'] = payload.examination;
  if (payload.systemicExamination) texts['systemicExamination'] = payload.systemicExamination;
  if (payload.diagnosis) texts['diagnosis'] = payload.diagnosis;
  if (payload.privateNotes) texts['privateNotes'] = payload.privateNotes;
  
  (payload.medications || []).forEach((m, i) => {
    if (m.instructions) texts[`med_${i}_inst`] = m.instructions;
    if (m.dose) texts[`med_${i}_dose`] = m.dose;
    if (m.frequency) texts[`med_${i}_freq`] = m.frequency;
  });

  (payload.nonPharmacologicalAdvice || []).forEach((a, i) => {
    if (a.advice) texts[`adv_${i}_adv`] = a.advice;
    if (a.notes) texts[`adv_${i}_notes`] = a.notes;
  });

  if (payload.followUp?.reason) texts['follow_reason'] = payload.followUp.reason;
  if (payload.followUp?.patientInstructions) texts['follow_inst'] = payload.followUp.patientInstructions;

  if (Object.keys(texts).length === 0) return payload;

  const translated = await translationApi.translateMultiple({ texts, targetLanguage });

  const newPayload = { ...payload };
  newPayload.chiefComplaint = translated['chiefComplaint'] ?? payload.chiefComplaint;
  newPayload.history = translated['history'] ?? payload.history;
  newPayload.comorbidity = translated['comorbidity'] ?? payload.comorbidity;
  newPayload.examination = translated['examination'] ?? payload.examination;
  newPayload.systemicExamination = translated['systemicExamination'] ?? payload.systemicExamination;
  newPayload.diagnosis = translated['diagnosis'] ?? payload.diagnosis;
  newPayload.privateNotes = translated['privateNotes'] ?? payload.privateNotes;

  if (payload.medications) {
    newPayload.medications = payload.medications.map((m, i) => ({
      ...m,
      instructions: translated[`med_${i}_inst`] ?? m.instructions,
      dose: translated[`med_${i}_dose`] ?? m.dose,
      frequency: translated[`med_${i}_freq`] ?? m.frequency,
    }));
  }

  if (payload.nonPharmacologicalAdvice) {
    newPayload.nonPharmacologicalAdvice = payload.nonPharmacologicalAdvice.map((a, i) => ({
      ...a,
      advice: translated[`adv_${i}_adv`] ?? a.advice,
      notes: translated[`adv_${i}_notes`] ?? a.notes,
    }));
  }

  if (payload.followUp) {
    newPayload.followUp = {
      ...payload.followUp,
      reason: translated['follow_reason'] ?? payload.followUp.reason,
      patientInstructions: translated['follow_inst'] ?? payload.followUp.patientInstructions,
    };
  }

  return newPayload;
};
