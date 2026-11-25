import { describe, expect, it } from 'vitest';
import type { SaveDischargeSummaryFields } from '../services/dischargeSummaryApi';
import { applyTemplate, buildTemplateContent, defaultPartsToSave, describeTemplate, parseTemplateContent, partsWithContent } from './dischargeTemplates';

const written: SaveDischargeSummaryFields = {
    finalDiagnosis: 'Dengue fever without warning signs', finalDiagnosisIcd10Code: 'A97.0', finalDiagnosisIcd10Name: 'Dengue without warning signs',
    chiefComplaint: 'Fever for 4 days', courseInHospital: 'Mr Sharma was given IV fluids; platelets rose to 1.1 lakh.',
    dietInstructions: 'Plenty of fluids, ORS.', warningSigns: 'Bleeding, severe abdominal pain, vomiting.',
    followUpInstructions: 'Review with CBC in 3 days.', followUpDate: '2026-11-28', conditionAtDischarge: 'STABLE',
    patientAdviceTranslationsJson: '{"hi":{"dietInstructions":"x"}}',
    medications: [
        { medicineName: 'Tab. Paracetamol 650 mg', dosage: '650 mg', frequency: '1-1-1', durations: '3 days', instructions: 'For fever' },
        { medicineName: '  ' },
    ],
};

describe('saving a summary as a template', () => {
    it('offers only the parts that have something in them', () => {
        expect(partsWithContent(written).map(p => p.key)).toEqual(['finalDiagnosis', 'medications', 'followUpInstructions', 'dietInstructions', 'warningSigns', 'chiefComplaint', 'courseInHospital']);
    });
    it('leaves the patient-specific sections unticked by default', () => {
        expect(defaultPartsToSave(written)).toEqual(['finalDiagnosis', 'medications', 'followUpInstructions', 'dietInstructions', 'warningSigns']);
    });
    it('keeps only what was ticked, with the ICD-10 code and without blank medicine rows', () => {
        const content = buildTemplateContent(written, defaultPartsToSave(written))!;
        expect(Object.keys(content.sections)).toEqual(['finalDiagnosis', 'followUpInstructions', 'dietInstructions', 'warningSigns']);
        expect(content.icd10).toEqual({ code: 'A97.0', name: 'Dengue without warning signs' });
        expect(content.medications).toHaveLength(1);
        expect(content.medications[0].medicineName).toBe('Tab. Paracetamol 650 mg');
    });
    it('never stores dates, the condition at discharge, translations or anything not ticked', () => {
        const json = JSON.stringify(buildTemplateContent(written, defaultPartsToSave(written)));
        for (const leak of ['2026-11-28', 'STABLE', 'Mr Sharma', 'Fever for 4 days', 'patientAdvice', '"hi"']) expect(json).not.toContain(leak);
    });
    it('does not carry the ICD-10 code when the diagnosis itself is not included', () => {
        expect(buildTemplateContent(written, ['dietInstructions'])!.icd10).toBeUndefined();
    });
    it('returns nothing when the ticked parts are empty', () => {
        expect(buildTemplateContent(written, ['additionalNotes'])).toBeNull();
        expect(buildTemplateContent({}, ['finalDiagnosis', 'medications'])).toBeNull();
    });
    it('describes what a template holds', () => {
        expect(describeTemplate(buildTemplateContent(written, defaultPartsToSave(written))!)).toBe('Diagnosis · 1 medicine · 3 advice sections');
    });
});

describe('reading a stored template', () => {
    it('round-trips', () => {
        const content = buildTemplateContent(written, defaultPartsToSave(written))!;
        expect(parseTemplateContent(JSON.stringify(content))).toEqual(content);
    });
    it('drops anything unexpected instead of trusting it', () => {
        const parsed = parseTemplateContent('{"sections":{"dietInstructions":"Soft","followUpDate":"2026-01-01","evil":"x","warningSigns":5},"medications":[{"dosage":"1"},{"medicineName":"A"}],"icd10":{"code":""}}');
        expect(parsed.sections).toEqual({ dietInstructions: 'Soft' });
        expect(parsed.medications).toEqual([{ medicineName: 'A' }]);
        expect(parsed.icd10).toBeUndefined();
        expect(parseTemplateContent('nope').sections).toEqual({});
        expect(parseTemplateContent(null).medications).toEqual([]);
    });
});

describe('using a template on another patient', () => {
    const template = buildTemplateContent(written, defaultPartsToSave(written))!;
    const other: SaveDischargeSummaryFields = {
        finalDiagnosis: 'Dengue with warning signs', finalDiagnosisIcd10Code: 'A97.1', finalDiagnosisIcd10Name: 'Dengue with warning signs',
        courseInHospital: 'Her own course.', followUpDate: '2026-12-05',
        medications: [{ medicineName: 'tab. paracetamol  650 mg', dosage: '500 mg' }, { medicineName: 'Tab. Pantoprazole 40 mg' }],
    };

    it('fill: writes only into empty sections and never touches what is written', () => {
        const r = applyTemplate(other, template, 'fill');
        expect(r.form.finalDiagnosis).toBe('Dengue with warning signs');
        expect(r.form.finalDiagnosisIcd10Code).toBe('A97.1');
        expect(r.form.dietInstructions).toBe('Plenty of fluids, ORS.');
        expect(r.form.warningSigns).toContain('Bleeding');
        expect(r.form.courseInHospital).toBe('Her own course.');
        expect(r.form.followUpDate).toBe('2026-12-05');
        expect(r.applied).toEqual(['followUpInstructions', 'dietInstructions', 'warningSigns']);
        expect(r.kept).toEqual(['finalDiagnosis', 'medications']);
    });
    it('fill: adds only medicines that are not already in the list, matching names loosely', () => {
        const r = applyTemplate(other, template, 'fill');
        expect(r.medicinesAdded).toBe(0);
        expect(r.form.medications!.map(m => m.dosage)).toEqual(['500 mg', undefined]);
        const fresh = applyTemplate({ medications: [{ medicineName: 'Tab. Pantoprazole 40 mg' }] }, template, 'fill');
        expect(fresh.medicinesAdded).toBe(1);
        expect(fresh.form.medications!.map(m => m.medicineName)).toEqual(['Tab. Pantoprazole 40 mg', 'Tab. Paracetamol 650 mg']);
    });
    it('replace: overwrites the sections the template has, with the matching ICD-10 code, and the medicine list', () => {
        const r = applyTemplate(other, template, 'replace');
        expect(r.form.finalDiagnosis).toBe('Dengue fever without warning signs');
        expect(r.form.finalDiagnosisIcd10Code).toBe('A97.0');
        expect(r.form.medications!.map(m => m.medicineName)).toEqual(['Tab. Paracetamol 650 mg']);
        // Sections the template does not have are still left alone.
        expect(r.form.courseInHospital).toBe('Her own course.');
        expect(r.form.followUpDate).toBe('2026-12-05');
        expect(r.kept).toEqual([]);
    });
    it('replace: a template diagnosis without a code clears the old code rather than leaving a wrong one', () => {
        const noCode = buildTemplateContent({ finalDiagnosis: 'Viral fever' }, ['finalDiagnosis'])!;
        expect(applyTemplate(other, noCode, 'replace').form.finalDiagnosisIcd10Code).toBe('');
    });
    it('does not change the summary it was given', () => {
        const before = JSON.stringify(other);
        applyTemplate(other, template, 'replace');
        expect(JSON.stringify(other)).toBe(before);
    });
});
