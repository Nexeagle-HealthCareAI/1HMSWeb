// A doctor's personalized discharge-summary field layout (global per doctor), mirroring
// prescriptionFieldLayoutApi.ts. Backed by GET/PUT discharge-summary/configuration/field-layout/
// doctorId={doctorId} (DischargeSummaryController.cs).
import { ipdApiClient } from '@/services/ipdApiClient';

export type DischargeFieldType = 'builtin' | 'text' | 'paragraph' | 'number' | 'date' | 'boolean' | 'select';

export interface DischargeFieldConfigItem {
    key: string;                    // built-in key (e.g. "courseInHospital") or "cf_*" for custom
    label: string;                  // display label (overrides the default for built-ins)
    type: DischargeFieldType;
    builtIn: boolean;
    showInPad: boolean;             // shown/editable in the Patient Workspace discharge form
    showInPrint: boolean;           // appears on the printed discharge summary
    order: number;
    options?: string[];             // for type = select
}

export interface GetFieldLayoutResponse {
    success: boolean;
    message: string;
    fields: DischargeFieldConfigItem[];
}

export interface UpdateFieldLayoutResponse {
    success: boolean;
    message: string;
}

// Canonical built-in fields with default labels, order, and print visibility — one per existing
// DischargeSummary column, in the current static template's section order. Keys MUST match the
// section keys the discharge form / print use.
export const DEFAULT_DISCHARGE_FIELDS: DischargeFieldConfigItem[] = [
    { key: 'conditionAtDischarge', label: 'Condition at Discharge', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 0 },
    { key: 'admittingDiagnosis', label: 'Admitting Diagnosis', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 1 },
    { key: 'finalDiagnosis', label: 'Final Diagnosis', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 2 },
    { key: 'finalDiagnosisIcd10', label: 'ICD-10 Code', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 3 },
    { key: 'chiefComplaint', label: 'Chief Complaint', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 4 },
    { key: 'historyOfPresentIllness', label: 'History of Present Illness', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 5 },
    { key: 'courseInHospital', label: 'Course in Hospital', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 6 },
    { key: 'proceduresPerformed', label: 'Procedures Performed', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 7 },
    { key: 'dischargeMedications', label: 'Discharge Medications', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 8 },
    { key: 'followUpInstructions', label: 'Follow-up Instructions', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 9 },
    { key: 'followUpDate', label: 'Follow-up Date', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 10 },
    { key: 'dietInstructions', label: 'Diet Instructions', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 11 },
    { key: 'activityRestrictions', label: 'Activity Restrictions', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 12 },
    { key: 'additionalNotes', label: 'Additional Notes', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 13 },
    { key: 'nonPayableAnnexure', label: 'Non-Payable Items Annexure', type: 'builtin', builtIn: true, showInPad: false, showInPrint: true, order: 14 },
];

/**
 * Merge a doctor's saved layout over the built-in defaults. Built-ins always appear (so newly added
 * built-ins show up even for doctors with an older saved layout); saved overrides win; custom fields
 * are appended. Result is sorted by order. Identical merge semantics to
 * prescriptionFieldLayoutApi.mergeFieldsWithDefaults.
 */
export function mergeFieldsWithDefaults(saved: DischargeFieldConfigItem[] | undefined | null): DischargeFieldConfigItem[] {
    const savedList = saved ?? [];
    const savedByKey = new Map(savedList.map(f => [f.key, f]));

    const merged: DischargeFieldConfigItem[] = DEFAULT_DISCHARGE_FIELDS.map(def => {
        const s = savedByKey.get(def.key);
        return s ? { ...def, ...s, key: def.key, builtIn: true, type: 'builtin' as const } : { ...def };
    });

    const knownKeys = new Set(DEFAULT_DISCHARGE_FIELDS.map(d => d.key));
    savedList.filter(f => !knownKeys.has(f.key) && f.key.startsWith('cf_')).forEach(f => merged.push({ ...f, builtIn: false }));

    return merged.sort((a, b) => a.order - b.order);
}

// Scoped per (doctorId, hospitalId) — a doctor's customization at one hospital no longer bleeds
// into another (see alter_doctor_discharge_field_configs_add_hospital.sql).
const fieldLayoutUrl = (doctorId: string, hospitalId: string) =>
    `/discharge-summary/configuration/field-layout/doctorId=${encodeURIComponent(doctorId)}?hospitalId=${encodeURIComponent(hospitalId)}`;

export const dischargeFieldLayoutApi = {
    async getFieldLayout(doctorId: string, hospitalId: string): Promise<GetFieldLayoutResponse> {
        try {
            return await ipdApiClient.get<GetFieldLayoutResponse>(fieldLayoutUrl(doctorId, hospitalId));
        } catch {
            return { success: false, message: 'Failed to load field layout', fields: [] };
        }
    },

    async updateFieldLayout(doctorId: string, hospitalId: string, fields: DischargeFieldConfigItem[]): Promise<UpdateFieldLayoutResponse> {
        return ipdApiClient.put<UpdateFieldLayoutResponse>(fieldLayoutUrl(doctorId, hospitalId), { fields });
    },
};
