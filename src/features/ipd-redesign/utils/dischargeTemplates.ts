import type { DischargeMedicationItem, SaveDischargeSummaryFields } from '../services/dischargeSummaryApi';

/**
 * Reusable discharge templates: what goes into one when a summary is saved as a template, and how
 * one is laid over another patient's summary. Pure functions, so the rules can be tested directly.
 *
 * A template never carries anything that identifies a patient or a stay: no dates, no condition
 * at discharge, no translations, no ids. The sections that are usually specific to one patient
 * (complaint, history, hospital course, investigations) are left out unless the doctor ticks them.
 */

export type TemplateSectionKey =
    | 'finalDiagnosis' | 'admittingDiagnosis' | 'chiefComplaint' | 'historyOfPresentIllness' | 'courseInHospital'
    | 'proceduresPerformed' | 'keyInvestigations' | 'followUpInstructions' | 'dietInstructions'
    | 'activityRestrictions' | 'warningSigns' | 'additionalNotes';

export interface TemplatePart { key: TemplateSectionKey | 'medications'; label: string; includeByDefault: boolean }

/** In the order they are offered. `includeByDefault` is false for sections that usually describe one patient. */
export const TEMPLATE_PARTS: TemplatePart[] = [
    { key: 'finalDiagnosis', label: 'Final diagnosis (with ICD-10 code)', includeByDefault: true },
    { key: 'proceduresPerformed', label: 'Procedures performed', includeByDefault: true },
    { key: 'medications', label: 'Medicines to take at home', includeByDefault: true },
    { key: 'followUpInstructions', label: 'Follow-up instructions', includeByDefault: true },
    { key: 'dietInstructions', label: 'Diet', includeByDefault: true },
    { key: 'activityRestrictions', label: 'Activity', includeByDefault: true },
    { key: 'warningSigns', label: 'Come back at once if', includeByDefault: true },
    { key: 'additionalNotes', label: 'Additional notes', includeByDefault: true },
    { key: 'admittingDiagnosis', label: 'Admitting diagnosis', includeByDefault: false },
    { key: 'chiefComplaint', label: 'Chief complaint', includeByDefault: false },
    { key: 'historyOfPresentIllness', label: 'History of present illness', includeByDefault: false },
    { key: 'courseInHospital', label: 'Course in hospital', includeByDefault: false },
    { key: 'keyInvestigations', label: 'Key investigations', includeByDefault: false },
];
const SECTION_KEYS = TEMPLATE_PARTS.filter(p => p.key !== 'medications').map(p => p.key as TemplateSectionKey);
export const templatePartLabel = (key: string): string => TEMPLATE_PARTS.find(p => p.key === key)?.label ?? key;

export interface TemplateContent {
    v: 1;
    sections: Partial<Record<TemplateSectionKey, string>>;
    icd10?: { code: string; name: string };
    medications: DischargeMedicationItem[];
}

const text = (form: SaveDischargeSummaryFields, key: TemplateSectionKey): string => (form[key] ?? '').trim();
const namedMedicines = (meds?: DischargeMedicationItem[]): DischargeMedicationItem[] => (meds ?? []).filter(m => m.medicineName?.trim());
const medicineKey = (m: DischargeMedicationItem): string => (m.medicineName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The parts of this summary that have something in them — the only ones worth offering to save. */
export const partsWithContent = (form: SaveDischargeSummaryFields): TemplatePart[] =>
    TEMPLATE_PARTS.filter(p => (p.key === 'medications' ? namedMedicines(form.medications).length > 0 : text(form, p.key) !== ''));

export const defaultPartsToSave = (form: SaveDischargeSummaryFields): string[] =>
    partsWithContent(form).filter(p => p.includeByDefault).map(p => p.key);

/** Builds the template from the ticked parts. Returns null when nothing ticked has any content. */
export const buildTemplateContent = (form: SaveDischargeSummaryFields, include: string[]): TemplateContent | null => {
    const content: TemplateContent = { v: 1, sections: {}, medications: [] };
    for (const key of SECTION_KEYS) {
        if (include.includes(key) && text(form, key)) content.sections[key] = text(form, key);
    }
    if (content.sections.finalDiagnosis && form.finalDiagnosisIcd10Code?.trim()) {
        content.icd10 = { code: form.finalDiagnosisIcd10Code.trim(), name: (form.finalDiagnosisIcd10Name ?? '').trim() };
    }
    if (include.includes('medications')) {
        content.medications = namedMedicines(form.medications).map((m, i) => ({
            medicineName: m.medicineName!.trim(), dosage: m.dosage, route: m.route, frequency: m.frequency,
            durations: m.durations, instructions: m.instructions, saltName: m.saltName, displayOrder: i,
        }));
    }
    return Object.keys(content.sections).length === 0 && content.medications.length === 0 ? null : content;
};

/** Reads a stored template; anything unexpected is dropped rather than trusted. */
export const parseTemplateContent = (json?: string | null): TemplateContent => {
    const empty: TemplateContent = { v: 1, sections: {}, medications: [] };
    if (!json) return empty;
    try {
        const raw = JSON.parse(json) as Partial<TemplateContent> | null;
        if (!raw || typeof raw !== 'object') return empty;
        const sections: TemplateContent['sections'] = {};
        for (const key of SECTION_KEYS) {
            const value = (raw.sections as Record<string, unknown> | undefined)?.[key];
            if (typeof value === 'string' && value.trim()) sections[key] = value;
        }
        const medications = Array.isArray(raw.medications)
            ? raw.medications.filter(m => m && typeof m.medicineName === 'string' && m.medicineName.trim())
            : [];
        const icd10 = raw.icd10 && typeof raw.icd10.code === 'string' && raw.icd10.code.trim()
            ? { code: raw.icd10.code, name: typeof raw.icd10.name === 'string' ? raw.icd10.name : '' }
            : undefined;
        return { v: 1, sections, medications, ...(icd10 ? { icd10 } : {}) };
    } catch {
        return empty;
    }
};

/** One line saying what a template holds, for the list. */
export const describeTemplate = (content: TemplateContent): string => {
    const parts: string[] = [];
    if (content.sections.finalDiagnosis) parts.push('Diagnosis');
    if (content.medications.length) parts.push(`${content.medications.length} medicine${content.medications.length === 1 ? '' : 's'}`);
    const advice = (['followUpInstructions', 'dietInstructions', 'activityRestrictions', 'warningSigns'] as const).filter(k => content.sections[k]).length;
    if (advice) parts.push(advice === 4 ? 'All advice' : `${advice} advice section${advice === 1 ? '' : 's'}`);
    const other = Object.keys(content.sections).length - (content.sections.finalDiagnosis ? 1 : 0) - advice;
    if (other > 0) parts.push(`${other} more section${other === 1 ? '' : 's'}`);
    return parts.join(' · ') || 'Empty';
};

export type ApplyMode = 'fill' | 'replace';
export interface ApplyResult {
    form: SaveDischargeSummaryFields;
    /** Parts the template wrote into. */
    applied: string[];
    /** Parts left alone because the summary already had text there (fill mode only). */
    kept: string[];
    medicinesAdded: number;
}

/**
 * Lays a template over a summary.
 *  - 'fill'    writes only into empty sections, and adds the template's medicines that are not
 *              already in the list. Nothing the doctor has written is touched.
 *  - 'replace' overwrites every section the template has, and replaces the medicine list.
 * Sections the template does not have are never changed in either mode.
 */
export const applyTemplate = (form: SaveDischargeSummaryFields, content: TemplateContent, mode: ApplyMode): ApplyResult => {
    const next: SaveDischargeSummaryFields = { ...form };
    const applied: string[] = [];
    const kept: string[] = [];

    for (const key of SECTION_KEYS) {
        const value = content.sections[key];
        if (!value) continue;
        if (mode === 'fill' && text(form, key)) { kept.push(key); continue; }
        next[key] = value;
        applied.push(key);
        if (key === 'finalDiagnosis') {
            // The code belongs to the diagnosis text: it travels with it, and an old code never
            // stays behind under a new diagnosis.
            next.finalDiagnosisIcd10Code = content.icd10?.code ?? '';
            next.finalDiagnosisIcd10Name = content.icd10?.name ?? '';
        }
    }

    let medicinesAdded = 0;
    if (content.medications.length > 0) {
        const existing = namedMedicines(form.medications);
        if (mode === 'replace') {
            next.medications = content.medications.map((m, i) => ({ ...m, displayOrder: i }));
            medicinesAdded = content.medications.length;
        } else {
            const have = new Set(existing.map(medicineKey));
            const extra = content.medications.filter(m => !have.has(medicineKey(m)));
            medicinesAdded = extra.length;
            next.medications = [...existing, ...extra].map((m, i) => ({ ...m, displayOrder: i }));
            if (extra.length < content.medications.length) kept.push('medications');
        }
        if (medicinesAdded > 0) applied.push('medications');
    }

    return { form: next, applied, kept, medicinesAdded };
};
