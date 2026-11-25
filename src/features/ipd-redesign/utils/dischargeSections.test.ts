import { describe, expect, it } from 'vitest';
import {
    applyMedicationSuggestion, applyProposal, buildSignChecks, emptyAiSections, followUpDateFromDays, markEdited,
    parseSources, parseTranslations, sectionStatus, staleTranslations, usefulProposals, describeSuggestion,
    bracketed, hasTranslation, translationLanguage,
} from './dischargeSections';

describe('section sources', () => {
    it('parses only known sources and ignores bad JSON', () => {
        expect(parseSources('{"courseInHospital":"AI","x":"MAGIC"}')).toEqual({ courseInHospital: 'AI' });
        expect(parseSources('nope')).toEqual({});
        expect(parseSources(null)).toEqual({});
    });

    it('status: empty beats source; unknown source means doctor', () => {
        const sources = { courseInHospital: 'RECORDS' as const, warningSigns: 'AI' as const };
        expect(sectionStatus({ courseInHospital: 'x' }, 'courseInHospital', sources)).toBe('records');
        expect(sectionStatus({ warningSigns: 'x' }, 'warningSigns', sources)).toBe('ai');
        expect(sectionStatus({ dietInstructions: 'x' }, 'dietInstructions', sources)).toBe('doctor');
        expect(sectionStatus({ courseInHospital: '  ' }, 'courseInHospital', sources)).toBe('empty');
        expect(sectionStatus({ medications: [{ medicineName: 'Aspirin' }] }, 'dischargeMedications', {})).toBe('doctor');
    });

    it('editing takes a section over for the doctor', () => {
        expect(markEdited({ courseInHospital: 'AI' }, 'courseInHospital')).toEqual({ courseInHospital: 'DOCTOR' });
    });
});

describe('AI proposals', () => {
    it('drops proposals identical to current text', () => {
        expect(usefulProposals({ courseInHospital: 'Stable' }, { courseInHospital: 'Stable', warningSigns: 'Chest pain' })).toEqual({ warningSigns: 'Chest pain' });
    });

    it('replace and append', () => {
        expect(applyProposal({ dietInstructions: 'Low salt' }, 'dietInstructions', 'No ghee', 'append').dietInstructions).toBe('Low salt\nNo ghee');
        expect(applyProposal({ dietInstructions: 'Low salt' }, 'dietInstructions', 'No ghee', 'replace').dietInstructions).toBe('No ghee');
        expect(applyProposal({}, 'dietInstructions', 'No ghee', 'append').dietInstructions).toBe('No ghee');
    });

    it('asks AI only for empty, visible sections', () => {
        const keys = emptyAiSections({ courseInHospital: 'done' }, k => k !== 'chiefComplaint');
        expect(keys).not.toContain('courseInHospital');
        expect(keys).not.toContain('chiefComplaint');
        expect(keys).toContain('warningSigns');
    });
});

describe('medicine suggestions', () => {
    const meds = [{ medicineName: 'Inj. Ceftriaxone 1 g' }, { medicineName: 'Tab. Metoprolol 25 mg', dosage: '25 mg' }];

    it('stop removes, change sets dose, add appends once', () => {
        expect(applyMedicationSuggestion(meds, { medicineName: 'Ceftriaxone', action: 'STOP', matchesMedicine: 'Inj. Ceftriaxone 1 g' }).map(m => m.medicineName))
            .toEqual(['Tab. Metoprolol 25 mg']);
        expect(applyMedicationSuggestion(meds, { medicineName: 'Metoprolol', action: 'CHANGE', newDose: '50 mg' })[1].dosage).toBe('50 mg');
        const added = applyMedicationSuggestion(meds, { medicineName: 'Pantoprazole 40 mg', action: 'ADD', newDose: '40 mg OD' });
        expect(added).toHaveLength(3);
        expect(applyMedicationSuggestion(added, { medicineName: 'Pantoprazole', action: 'ADD' })).toHaveLength(3);
    });

    it('unknown medicine is left alone', () => {
        expect(applyMedicationSuggestion(meds, { medicineName: 'Warfarin', action: 'STOP' })).toBe(meds);
    });

    it('describes in plain words', () => {
        expect(describeSuggestion({ medicineName: 'Ceftriaxone', action: 'STOP', matchesMedicine: 'Inj. Ceftriaxone 1 g' })).toBe('Stop Inj. Ceftriaxone 1 g');
        expect(describeSuggestion({ medicineName: 'Pantoprazole', action: 'ADD', newDose: '40 mg OD' })).toBe('Add Pantoprazole — 40 mg OD');
    });
});

describe('follow-up date', () => {
    it('adds days in local time, across month end', () => {
        expect(followUpDateFromDays(7, new Date(2026, 10, 25))).toBe('2026-12-02');
        expect(followUpDateFromDays(3, new Date(2026, 11, 30))).toBe('2027-01-02');
    });
});

describe('translations', () => {
    it('parses safely and finds missing or stale ones', () => {
        const t = parseTranslations('{"hi":{"dietInstructions":"कम नमक"}}');
        const form = { dietInstructions: 'Low salt', warningSigns: 'Chest pain' };
        expect(staleTranslations(form, t, 'hi', { dietInstructions: 'Low salt' })).toEqual(['warningSigns']);
        expect(staleTranslations(form, t, 'hi', { dietInstructions: 'Less salt' })).toEqual(['dietInstructions', 'warningSigns']);
        expect(parseTranslations('[1]')).toEqual({});
    });
});

describe('before you sign', () => {
    it('flags the important gaps and unaccepted AI text', () => {
        const checks = buildSignChecks({
            form: { courseInHospital: 'AI text', medications: [{ medicineName: 'Aspirin' }] },
            sources: { courseInHospital: 'AI' },
            pending: ['warningSigns'],
        });
        const text = checks.map(c => c.text).join(' | ');
        expect(text).toContain('Final diagnosis is empty');
        expect(text).toContain('Condition at discharge is not chosen');
        expect(text).toContain('No follow-up date set');
        expect(text).toContain('suggestion you haven');
        expect(text).toContain('written by AI');
        expect(text).toContain('Aspirin has no dose');
        expect(checks.every(c => c.level === 'warn')).toBe(true);
    });

    it('all good', () => {
        const checks = buildSignChecks({
            form: {
                finalDiagnosis: 'MI', courseInHospital: 'x', keyInvestigations: 'x', followUpInstructions: 'x', warningSigns: 'x',
                conditionAtDischarge: 'IMPROVED', followUpDate: '2026-12-02', medications: [{ medicineName: 'Aspirin', dosage: '75 mg' }],
            },
            sources: { courseInHospital: 'DOCTOR' },
            pending: [],
        });
        expect(checks).toEqual([{ level: 'ok', text: 'Everything important is filled in.' }]);
    });

    it('skips sections hidden in the layout', () => {
        const checks = buildSignChecks({ form: {}, sources: {}, pending: [], visible: k => k !== 'keyInvestigations' && k !== 'followUpDate' });
        const text = checks.map(c => c.text).join(' | ');
        expect(text).not.toContain('Key investigations');
        expect(text).not.toContain('follow-up date');
    });
});

describe('translation is optional — English by default', () => {
    const form = { finalDiagnosis: 'Pneumonia', courseInHospital: 'Improved', medications: [{ medicineName: 'A' }], followUpInstructions: 'Review in 7 days', dietInstructions: 'Soft diet' };
    const base = { form, sources: {}, pending: [], visible: () => true };
    const mentionsTranslation = (checks: { text: string }[]) => checks.some(c => /translat/i.test(c.text));

    it('does not ask for a translation when none was added', () => {
        expect(mentionsTranslation(buildSignChecks({ ...base, secondLanguage: 'hi', translations: {} }))).toBe(false);
        expect(mentionsTranslation(buildSignChecks({ ...base, secondLanguage: 'hi', translations: { hi: { followUpInstructions: '  ' } } }))).toBe(false);
    });
    it('points out a half-done translation once one was added', () => {
        expect(mentionsTranslation(buildSignChecks({ ...base, secondLanguage: 'hi', translations: { hi: { followUpInstructions: '7 दिन बाद दिखाएं' } } }))).toBe(true);
    });
    it('is quiet when every advice section is translated', () => {
        expect(mentionsTranslation(buildSignChecks({ ...base, secondLanguage: 'hi', translations: { hi: { followUpInstructions: '7 दिन बाद दिखाएं', dietInstructions: 'नरम भोजन' } } }))).toBe(false);
    });
    it('knows whether a summary has a translation', () => {
        expect(hasTranslation({}, 'hi')).toBe(false);
        expect(hasTranslation({ hi: { dietInstructions: ' ' } }, 'hi')).toBe(false);
        expect(hasTranslation({ hi: { dietInstructions: 'नरम भोजन' } }, 'hi')).toBe(true);
    });
    it('offers the hospital language, or the first available, and keeps the language already used', () => {
        expect(translationLanguage(null, {}, [{ code: 'hi' }])).toBe('hi');
        expect(translationLanguage('mr', {}, [{ code: 'hi' }, { code: 'mr' }])).toBe('mr');
        expect(translationLanguage('mr', { hi: { dietInstructions: 'नरम भोजन' } }, [{ code: 'hi' }, { code: 'mr' }])).toBe('hi');
        expect(translationLanguage(undefined, {}, [])).toBe('hi');
    });
    it('prints the translation in brackets, once', () => {
        expect(bracketed('नरम भोजन')).toBe('(नरम भोजन)');
        expect(bracketed(' (नरम भोजन) ')).toBe('(नरम भोजन)');
        expect(bracketed('  ')).toBe('');
        expect(bracketed('line one\nline two')).toBe('(line one\nline two)');
    });
});
