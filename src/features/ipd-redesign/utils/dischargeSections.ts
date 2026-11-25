// Pure helpers for the discharge summary screen: where each section's text came from, the
// "before you sign" checks, quick follow-up dates, the second-language patient advice, and
// applying AI proposals. No React, no network — unit-tested in dischargeSections.test.ts.
import type { AiSectionKey, DischargeMedicationItem, MedicationSuggestion, SaveDischargeSummaryFields } from '../services/dischargeSummaryApi';

export type SectionSource = 'RECORDS' | 'AI' | 'DOCTOR';
export type SectionStatus = 'records' | 'ai' | 'doctor' | 'empty';
export type SourceMap = Record<string, SectionSource>;

/** Sections AI may draft or rewrite (mirrors the server's DischargeAiRules.DraftableSections). */
export const AI_SECTIONS: AiSectionKey[] = [
    'chiefComplaint', 'historyOfPresentIllness', 'courseInHospital', 'keyInvestigations', 'proceduresPerformed',
    'followUpInstructions', 'dietInstructions', 'activityRestrictions', 'warningSigns',
];

/** Advice printed for the patient (and in the hospital's second language when it has one). */
export const PATIENT_ADVICE_SECTIONS = ['followUpInstructions', 'dietInstructions', 'activityRestrictions', 'warningSigns'] as const;
export type PatientAdviceKey = typeof PATIENT_ADVICE_SECTIONS[number];

export const isAiSection = (key: string): key is AiSectionKey => (AI_SECTIONS as string[]).includes(key);

type TextKey = keyof Pick<SaveDischargeSummaryFields,
    'admittingDiagnosis' | 'finalDiagnosis' | 'chiefComplaint' | 'historyOfPresentIllness' | 'courseInHospital' | 'proceduresPerformed'
    | 'keyInvestigations' | 'followUpInstructions' | 'dietInstructions' | 'activityRestrictions' | 'warningSigns' | 'additionalNotes'>;

export const textOf = (form: SaveDischargeSummaryFields, key: string): string => {
    const v = (form as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : '';
};

export const hasText = (form: SaveDischargeSummaryFields, key: string) => textOf(form, key).trim().length > 0;

// ── Section sources ─────────────────────────────────────────────────────────────────────────

export const parseSources = (json?: string | null): SourceMap => {
    if (!json) return {};
    try {
        const raw = JSON.parse(json) as Record<string, unknown>;
        const out: SourceMap = {};
        Object.entries(raw ?? {}).forEach(([k, v]) => {
            if (v === 'RECORDS' || v === 'AI' || v === 'DOCTOR') out[k] = v;
        });
        return out;
    } catch {
        return {};
    }
};

export const serializeSources = (map: SourceMap): string => JSON.stringify(map);

/** Status chip for a section: empty beats everything; otherwise its recorded source (doctor by default). */
export const sectionStatus = (form: SaveDischargeSummaryFields, key: string, sources: SourceMap): SectionStatus => {
    const filled = key === 'dischargeMedications'
        ? (form.medications ?? []).some(m => m.medicineName?.trim())
        : hasText(form, key);
    if (!filled) return 'empty';
    const s = sources[key];
    if (s === 'RECORDS') return 'records';
    if (s === 'AI') return 'ai';
    return 'doctor';
};

/** A doctor typing in a section takes it over: RECORDS/AI become DOCTOR. */
export const markEdited = (sources: SourceMap, key: string): SourceMap =>
    sources[key] === 'DOCTOR' ? sources : { ...sources, [key]: 'DOCTOR' };

// ── AI proposals ────────────────────────────────────────────────────────────────────────────

export type Proposals = Partial<Record<AiSectionKey, string>>;

/** Keeps only proposals that differ from what is already in the section. */
export const usefulProposals = (form: SaveDischargeSummaryFields, incoming: Proposals): Proposals => {
    const out: Proposals = {};
    (Object.keys(incoming) as AiSectionKey[]).forEach(k => {
        const v = incoming[k]?.trim();
        if (v && v !== textOf(form, k).trim()) out[k] = v;
    });
    return out;
};

/** Accepting a proposal: "replace" swaps the text, "append" adds it under what is there. */
export const applyProposal = (form: SaveDischargeSummaryFields, key: AiSectionKey, text: string, mode: 'replace' | 'append'): SaveDischargeSummaryFields => {
    const current = textOf(form, key).trim();
    const next = mode === 'append' && current ? `${current}\n${text.trim()}` : text.trim();
    return { ...form, [key as TextKey]: next };
};

/** Sections a fresh "Draft with AI" should ask for: the AI-draftable ones that are still empty. */
export const emptyAiSections = (form: SaveDischargeSummaryFields, visible: (key: string) => boolean = () => true): AiSectionKey[] =>
    AI_SECTIONS.filter(k => visible(k) && !hasText(form, k));

// ── Medicines from dictation ────────────────────────────────────────────────────────────────

const medKey = (name?: string) => (name ?? '').trim().replace(/^(tab|tablet|cap|capsule|inj|injection|syp|syrup|susp|drops?|oint|cream|gel|neb|inh|sachet)\.?\s+/i, '')
    .split(/[\s\-(,/]+/)[0]?.toLowerCase() ?? '';

/** Applies one dictated medicine change to the discharge list. STOP removes the medicine (the list
 * is what the patient takes home); CHANGE updates the dose; ADD appends a new row. */
export const applyMedicationSuggestion = (meds: DischargeMedicationItem[], s: MedicationSuggestion): DischargeMedicationItem[] => {
    const target = medKey(s.matchesMedicine ?? s.medicineName);
    const idx = meds.findIndex(m => target.length >= 3 && medKey(m.medicineName) === target);
    if (s.action === 'ADD') {
        if (idx >= 0) return meds;
        return [...meds, { medicineName: s.medicineName, dosage: s.newDose ?? undefined, instructions: s.note ?? undefined, displayOrder: meds.length }];
    }
    if (idx < 0) return meds;
    if (s.action === 'STOP') return meds.filter((_, i) => i !== idx).map((m, i) => ({ ...m, displayOrder: i }));
    if (s.action === 'CHANGE' && s.newDose) return meds.map((m, i) => (i === idx ? { ...m, dosage: s.newDose ?? m.dosage } : m));
    return meds;
};

export const describeSuggestion = (s: MedicationSuggestion): string => {
    const name = s.matchesMedicine || s.medicineName;
    switch (s.action) {
        case 'STOP': return `Stop ${name}`;
        case 'ADD': return `Add ${s.medicineName}${s.newDose ? ` — ${s.newDose}` : ''}`;
        case 'CHANGE': return `Change ${name}${s.newDose ? ` to ${s.newDose}` : ''}`;
        default: return `Continue ${name}`;
    }
};

// ── Follow-up ───────────────────────────────────────────────────────────────────────────────

export const FOLLOW_UP_QUICK = [
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
];

/** yyyy-MM-dd for today + days, in local time (what <input type="date"> expects). */
export const followUpDateFromDays = (days: number, today: Date = new Date()): string => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

// ── Second-language patient advice ──────────────────────────────────────────────────────────

export type Translations = Record<string, Partial<Record<PatientAdviceKey, string>>>;

export const parseTranslations = (json?: string | null): Translations => {
    if (!json) return {};
    try {
        const raw = JSON.parse(json);
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Translations : {};
    } catch {
        return {};
    }
};

export const serializeTranslations = (t: Translations): string => JSON.stringify(t);

/** Advice sections whose translation is missing, or older than the English (the English changed after translating). */
export const staleTranslations = (form: SaveDischargeSummaryFields, t: Translations, lang: string, translatedFrom: Record<string, string>): PatientAdviceKey[] =>
    PATIENT_ADVICE_SECTIONS.filter(k => {
        const en = textOf(form, k).trim();
        if (!en) return false;
        const tr = t[lang]?.[k]?.trim();
        if (!tr) return true;
        return translatedFrom[k] !== undefined && translatedFrom[k] !== en;
    });

// ── Before you sign ─────────────────────────────────────────────────────────────────────────

export interface SignCheck { level: 'warn' | 'ok'; text: string; section?: string }

const LABELS: Record<string, string> = {
    finalDiagnosis: 'Final diagnosis', courseInHospital: 'Course in hospital', keyInvestigations: 'Key investigations',
    followUpInstructions: 'Follow-up instructions', warningSigns: '"Come back at once if"', chiefComplaint: 'Chief complaint',
    historyOfPresentIllness: 'History', proceduresPerformed: 'Procedures', dietInstructions: 'Diet advice', activityRestrictions: 'Activity advice',
};
export const sectionLabel = (key: string) => LABELS[key] ?? key;

/**
 * Things to look at before signing. These only point things out — signing is never blocked by them.
 * `pending` = sections with an AI proposal not yet accepted or discarded; `visible` = the doctor's
 * layout (hidden sections aren't checked).
 */
export const buildSignChecks = (opts: {
    form: SaveDischargeSummaryFields;
    sources: SourceMap;
    pending: string[];
    visible?: (key: string) => boolean;
    secondLanguage?: string | null;
    translations?: Translations;
    translatedFrom?: Record<string, string>;
}): SignCheck[] => {
    const { form, sources, pending, secondLanguage, translations = {}, translatedFrom = {} } = opts;
    const visible = opts.visible ?? (() => true);
    const checks: SignCheck[] = [];

    (['finalDiagnosis', 'courseInHospital', 'keyInvestigations', 'followUpInstructions', 'warningSigns'] as const)
        .filter(visible)
        .forEach(k => { if (!hasText(form, k) && !pending.includes(k)) checks.push({ level: 'warn', text: `${sectionLabel(k)} is empty.`, section: k }); });

    if (!form.conditionAtDischarge) checks.push({ level: 'warn', text: 'Condition at discharge is not chosen.', section: 'conditionAtDischarge' });
    if (visible('followUpDate') && !form.followUpDate) checks.push({ level: 'warn', text: 'No follow-up date set.', section: 'followUpDate' });

    pending.forEach(k => checks.push({ level: 'warn', text: `${sectionLabel(k)} has an AI suggestion you haven't accepted or discarded.`, section: k }));

    Object.entries(sources).forEach(([k, v]) => {
        if (v === 'AI' && hasText(form, k)) checks.push({ level: 'warn', text: `${sectionLabel(k)} was written by AI — read it once more.`, section: k });
    });

    const meds = form.medications ?? [];
    if (visible('dischargeMedications')) {
        if (meds.length === 0) checks.push({ level: 'warn', text: 'No discharge medicines listed. Fine if none are needed.', section: 'dischargeMedications' });
        meds.forEach(m => {
            if (m.medicineName?.trim() && !m.dosage?.trim() && !m.frequency?.trim())
                checks.push({ level: 'warn', text: `${m.medicineName} has no dose or frequency.`, section: 'dischargeMedications' });
        });
    }

    if (secondLanguage) {
        const stale = staleTranslations(form, translations, secondLanguage, translatedFrom);
        if (stale.length) checks.push({ level: 'warn', text: `The translated advice is missing or out of date for ${stale.length} section(s).`, section: 'patientAdvice' });
    }

    if (checks.length === 0) checks.push({ level: 'ok', text: 'Everything important is filled in.' });
    return checks;
};
