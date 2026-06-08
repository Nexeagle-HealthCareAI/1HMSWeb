import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

// A doctor's personalized prescription field layout (global per doctor).
export type PrescriptionFieldType = 'builtin' | 'text' | 'paragraph' | 'number' | 'date' | 'boolean' | 'select';

export interface PrescriptionFieldConfigItem {
  key: string;                    // built-in key (e.g. "chiefComplaint") or "cf_*" for custom
  label: string;                  // display label (overrides the default for built-ins)
  type: PrescriptionFieldType;
  builtIn: boolean;
  showInPad: boolean;             // fill during the consult
  showInPrint: boolean;           // appears on the printed prescription
  order: number;
  options?: string[];             // for type = select
}

export interface GetFieldLayoutResponse {
  success: boolean;
  message: string;
  fields: PrescriptionFieldConfigItem[];
}

export interface UpdateFieldLayoutResponse {
  success: boolean;
  message: string;
}

// Canonical built-in fields with default labels, order, and print visibility.
// Keys MUST match the section keys the prescription pad / print use.
export const DEFAULT_PRESCRIPTION_FIELDS: PrescriptionFieldConfigItem[] = [
  { key: 'vitals', label: 'Vitals', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 0 },
  { key: 'chiefComplaint', label: 'Chief Complaint', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 1 },
  { key: 'history', label: 'History', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 2 },
  { key: 'comorbidity', label: 'Comorbidity', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 3 },
  { key: 'examination', label: 'Examination', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 4 },
  { key: 'diagnosis', label: 'Diagnosis', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 5 },
  { key: 'orders', label: 'Orders: Investigations / Procedures', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 6 },
  { key: 'medications', label: 'Medications', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 7 },
  { key: 'nonPharmacologicalAdvice', label: 'Non-pharmacological Advice', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 8 },
  { key: 'privateNotes', label: 'Private Notes', type: 'builtin', builtIn: true, showInPad: true, showInPrint: false, order: 9 },
  { key: 'certificates', label: 'Certificates & Notes', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 10 },
  { key: 'immunizations', label: 'Immunizations', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 11 },
  { key: 'followUp', label: 'Follow-up & Referral', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 12 },
  { key: 'attachments', label: 'Attachments', type: 'builtin', builtIn: true, showInPad: true, showInPrint: false, order: 13 },
];

/**
 * Merge a doctor's saved layout over the built-in defaults. Built-ins always appear (so newly added
 * built-ins show up even for doctors with an older saved layout); saved overrides win; custom fields
 * are appended. Result is sorted by order.
 */
export function mergeFieldsWithDefaults(saved: PrescriptionFieldConfigItem[] | undefined | null): PrescriptionFieldConfigItem[] {
  const savedList = saved ?? [];
  const savedByKey = new Map(savedList.map(f => [f.key, f]));

  const merged: PrescriptionFieldConfigItem[] = DEFAULT_PRESCRIPTION_FIELDS.map(def => {
    const s = savedByKey.get(def.key);
    return s ? { ...def, ...s, key: def.key, builtIn: true, type: 'builtin' as const } : { ...def };
  });

  // Custom fields the doctor added (not part of the built-in set).
  const knownKeys = new Set(DEFAULT_PRESCRIPTION_FIELDS.map(d => d.key));
  savedList.filter(f => !knownKeys.has(f.key)).forEach(f => merged.push({ ...f, builtIn: false }));

  return merged.sort((a, b) => a.order - b.order);
}

export const prescriptionFieldLayoutApi = {
  async getFieldLayout(doctorId: string): Promise<GetFieldLayoutResponse> {
    try {
      return await apiClient.get<GetFieldLayoutResponse>(API_ENDPOINTS.E_PRESCRIPTION.GET_FIELD_LAYOUT(doctorId));
    } catch {
      return { success: false, message: 'Failed to load field layout', fields: [] };
    }
  },

  async updateFieldLayout(doctorId: string, fields: PrescriptionFieldConfigItem[]): Promise<UpdateFieldLayoutResponse> {
    return apiClient.put<UpdateFieldLayoutResponse>(
      API_ENDPOINTS.E_PRESCRIPTION.UPDATE_FIELD_LAYOUT(doctorId),
      { fields }
    );
  },
};
