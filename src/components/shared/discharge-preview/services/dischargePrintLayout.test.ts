import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildDischargeSummaryA4 } from '@/printTemplates/dischargeSummaryA4';
import { buildDischargeTemplateBoundPreview } from '@/components/shared/discharge-preview/services/dischargePreviewRenderer';

const meds = [
  { name: 'Tab. Aspirin 75 mg', dose: '75 mg', route: 'Oral', frequency: '0 - 1 - 0', duration: 'Lifelong', instructions: 'After food' },
  { name: 'Tab. Ticagrelor 90 mg', dose: '90 mg', route: 'Oral', frequency: '1 - 0 - 1', duration: '12 months', instructions: 'Do not stop without asking the doctor' },
  { name: 'Tab. Atorvastatin 40 mg', dose: '40 mg', route: 'Oral', frequency: '0 - 0 - 1', duration: 'Lifelong', instructions: 'At bedtime' },
];
const text = {
  admittingDiagnosis: 'Chest pain, suspected acute coronary syndrome', finalDiagnosis: 'Acute inferior wall ST-elevation myocardial infarction',
  chiefComplaint: 'Sudden central chest pain for 3 hours with sweating and breathlessness.',
  historyOfPresentIllness: 'Known hypertension for 8 years, on irregular treatment. No previous heart disease.',
  courseInHospital: 'ECG showed ST elevation in the inferior leads. Taken for primary angioplasty within 70 minutes of arrival; one stent placed in the right coronary artery. Monitored in ICU for 48 hours, no arrhythmia. Walking without pain at discharge.',
  proceduresPerformed: 'Primary angioplasty with one drug-eluting stent to RCA (21 Nov 2026)',
  keyInvestigations: 'Troponin I: 8.4 ng/mL on admission, 1.2 ng/mL on 24 Nov\nEcho (22 Nov): EF 45%, inferior wall hypokinesia\nCreatinine: 0.9 mg/dL',
  followUpInstructions: 'Dr. Meera Kulkarni, Cardiology OPD, 10:30 am. Bring this summary and the ECG.',
  dietInstructions: 'Low salt, low oil. No tobacco or alcohol.', activityRestrictions: 'Walk 15 minutes twice a day. No heavy lifting for 6 weeks.',
  warningSigns: 'Chest pain, breathlessness, fainting, or bleeding that does not stop.',
};
const hi = { code: 'hi', name: 'Hindi', fields: { followUpInstructions: 'कार्डियोलॉजी ओपीडी में दिखाएं।', warningSigns: 'सीने में दर्द या सांस फूलने पर तुरंत आएं।', dietInstructions: 'कम नमक, कम तेल।' } };

it('lays out both printouts from the same data: patient box, diagnosis first, medicine table, advice boxes', async () => {
  const html = buildDischargeSummaryA4({
    admissionNo: 'ADM-2026-0481', patientName: 'Rajesh Kumar Sharma', patientId: 'UHID-100482', ageGender: '54M', mobile: '98XXXXX210',
    admittedAt: '2026-11-21T08:15:00', dischargedAt: '2026-11-25T11:30:00', conditionAtDischarge: 'STABLE', ...text,
    finalDiagnosisIcd10Code: 'I21.1', finalDiagnosisIcd10Name: 'Acute transmural MI of inferior wall', followUpDate: '2026-12-02',
    medications: meds, consultant: 'Dr. Meera Kulkarni', wardBed: 'General Ward · GW-04', payer: 'Star Health (INSURANCE)', hospitalPhone: '011-4000 1234',
    secondLanguage: hi, signedByDoctorName: 'Dr. Meera Kulkarni', signedAt: '2026-11-25T11:05:00',
  }, { hospitalName: 'GLISAN Hospital', address: '12 MG Road, New Delhi', phone: '011-4000 1234', email: 'care@glisan.example', website: '' });
  expect(html).toContain('Medicines to take at home');
  expect(html).toContain('<b>Tab. Ticagrelor 90 mg</b>');
  expect(html).toContain('Next visit');
  expect(html).toContain('Wed, 02 Dec 2026');
  expect(html).toContain('(सीने में दर्द या सांस फूलने पर तुरंत आएं।)');
  expect(html).toContain('Hospital: 011-4000 1234');
  expect(html).toContain('4 days');
  // Diagnosis comes before the narrative sections.
  expect(html.indexOf('Final diagnosis')).toBeLessThan(html.indexOf('Chief Complaint'));
  // Text typed by staff is escaped, never injected as markup.
  expect(buildDischargeSummaryA4({ admissionNo: 'A', patientName: '<b>x</b>', patientId: 'P', ageGender: '', mobile: '', admittedAt: '2026-11-21T08:15:00', dischargedAt: '2026-11-21T18:00:00', conditionAtDischarge: 'STABLE', courseInHospital: '<script>1</script>' },
    { hospitalName: 'H', address: '', phone: '', email: '', website: '' })).not.toContain('<script>1</script>');

  const tpl = await PDFDocument.create(); tpl.addPage([595.28, 841.89]);
  const file = { arrayBuffer: async () => (await tpl.save()).buffer } as unknown as File;
  const keys = ['conditionAtDischarge', 'admittingDiagnosis', 'finalDiagnosis', 'finalDiagnosisIcd10', 'chiefComplaint', 'historyOfPresentIllness', 'courseInHospital', 'proceduresPerformed', 'keyInvestigations', 'dischargeMedications', 'followUpInstructions', 'followUpDate', 'dietInstructions', 'activityRestrictions', 'warningSigns', 'additionalNotes'];
  const label: Record<string, string> = { chiefComplaint: 'Chief Complaint', historyOfPresentIllness: 'History of Present Illness', courseInHospital: 'Course in Hospital', proceduresPerformed: 'Procedures Performed', keyInvestigations: 'Key Investigations', dischargeMedications: 'Discharge Medications', dietInstructions: 'Diet Instructions', activityRestrictions: 'Activity Restrictions', warningSigns: 'Come Back at Once If' };
  const bytes = await buildDischargeTemplateBoundPreview({
    templateFile: file, margins: { top: 35, bottom: 18, left: 16, right: 16 } as never, overflowStrategy: 'reuse-template',
    typography: { family: 'Helvetica', size: 10, color: '#111827' } as never,
    printFields: keys.map(k => ({ key: k, label: label[k] ?? k, showInPrint: true })),
    payload: {
      admissionNo: 'ADM-2026-0481', patientName: 'Rajesh Kumar Sharma', patientId: 'UHID-100482', patientAge: 54, patientSex: 'Male', mobile: '98XXXXX210',
      assignedDoctorName: 'Dr. Meera Kulkarni', admittedAt: '2026-11-21T08:15:00', dischargedAt: '2026-11-25T11:30:00', conditionAtDischarge: 'Stable',
      signedByDoctorName: 'Dr. Meera Kulkarni', signedAt: '2026-11-25T11:05:00',
      fields: { ...text, finalDiagnosisIcd10: 'I21.1 — Acute transmural MI of inferior wall', followUpDate: '02 Dec 2026' }, customFieldValues: {},
      medications: meds, wardBed: 'General Ward · GW-04', payer: 'Star Health (INSURANCE)', hospitalPhone: '011-4000 1234', secondLanguage: hi,
    },
  });
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  expect(pdf.getPageCount()).toBeLessThanOrEqual(2);
});
