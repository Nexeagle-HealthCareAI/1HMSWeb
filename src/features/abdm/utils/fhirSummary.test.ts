import { describe, it, expect } from 'vitest';
import { conceptText, narrativeText, resourceLine, summariseFhirBundle } from './fhirSummary';

const bundle = {
  resourceType: 'Bundle',
  entry: [
    { fullUrl: 'urn:uuid:c', resource: {
      resourceType: 'Composition', title: 'Discharge Summary', date: '2026-10-03T05:00:00Z',
      subject: { reference: 'urn:uuid:p' }, author: [{ reference: 'urn:uuid:d' }], custodian: { reference: 'urn:uuid:o', display: 'ignored when the resource is there' },
      section: [
        { title: 'Medications', entry: [{ reference: 'urn:uuid:m' }] },
        { code: { text: 'Medical history' }, text: { div: '<div xmlns="http://www.w3.org/1999/xhtml">History: none<br/>Course: <b>uneventful</b></div>' }, entry: [{ reference: 'urn:uuid:x' }] },
        { title: 'Vital Signs', entry: [{ reference: 'urn:uuid:bp' }, { reference: 'urn:uuid:missing' }] },
        { title: 'Empty', entry: [] },
      ],
    } },
    { fullUrl: 'urn:uuid:p', resource: { resourceType: 'Patient', name: [{ text: 'Asha Rao' }] } },
    { fullUrl: 'urn:uuid:d', resource: { resourceType: 'Practitioner', name: [{ given: ['Meera'], family: 'Iyer', prefix: ['Dr'] }] } },
    { fullUrl: 'urn:uuid:o', resource: { resourceType: 'Organization', name: 'Other Hospital' } },
    { fullUrl: 'urn:uuid:m', resource: { resourceType: 'MedicationRequest', medicationCodeableConcept: { text: 'Paracetamol 500 mg' }, dosageInstruction: [{ text: '1 tablet, three times a day', route: { text: 'Oral' } }] } },
    { fullUrl: 'urn:uuid:x', resource: { resourceType: 'Condition', code: { coding: [{ code: 'K35.80', display: 'Acute appendicitis' }] } } },
    { fullUrl: 'urn:uuid:bp', resource: { resourceType: 'Observation', code: { text: 'Blood pressure' }, component: [
      { code: { text: 'Systolic' }, valueQuantity: { value: 120, unit: 'mm[Hg]' } },
      { code: { text: 'Diastolic' }, valueQuantity: { value: 80, unit: 'mm[Hg]' } },
    ] } },
  ],
};

describe('fhirSummary', () => {
  it('reads the header from the Composition and the resources it points at', () => {
    const s = summariseFhirBundle(bundle);
    expect(s.title).toBe('Discharge Summary');
    expect(s.patient).toBe('Asha Rao');
    expect(s.author).toBe('Dr Meera Iyer');
    expect(s.facility).toBe('Other Hospital');
    expect(s.date).toBe('2026-10-03T05:00:00Z');
  });

  it('turns each section into lines and drops sections with nothing in them', () => {
    const s = summariseFhirBundle(bundle);
    expect(s.sections.map(x => x.title)).toEqual(['Medications', 'Medical history', 'Vital Signs']);
    expect(s.sections[0].lines).toEqual(['Paracetamol 500 mg: 1 tablet, three times a day, Oral']);
    expect(s.sections[1].lines).toEqual(['History: none', 'Course: uneventful', 'Acute appendicitis']);
    expect(s.sections[2].lines).toEqual(['Blood pressure: Systolic 120 mm[Hg], Diastolic 80 mm[Hg]']);
  });

  it('reduces narrative HTML to text and never keeps a tag', () => {
    expect(narrativeText('<div><script>alert(1)</script><p>Line one</p><img src=x onerror=alert(2)>Line &amp; two</div>')).toBe('alert(1)Line one\nLine & two');
    expect(narrativeText('   ')).toBeUndefined();
    expect(narrativeText(42)).toBeUndefined();
  });

  it('copes with anything that is not a bundle', () => {
    for (const bad of [null, undefined, 'text', 7, [], {}, { entry: 'no' }, { entry: [{ resource: { resourceType: 'Patient' } }] }]) {
      expect(summariseFhirBundle(bad)).toEqual({ title: 'Health record', sections: [], attachments: [] });
    }
  });

  it('lists the PDFs and images a record carries, and nothing else', () => {
    const withFiles = {
      resourceType: 'Bundle',
      entry: [
        { fullUrl: 'urn:uuid:c', resource: { resourceType: 'Composition', title: 'Prescription', section: [{ title: 'Prescription record', entry: [{ reference: 'urn:uuid:b' }] }] } },
        { fullUrl: 'urn:uuid:b', resource: { resourceType: 'Binary', contentType: 'application/pdf', data: 'JVBERi0x' } },
        { fullUrl: 'urn:uuid:d', resource: { resourceType: 'DocumentReference', type: { text: 'Scan' }, content: [
          { attachment: { contentType: 'image/png', data: 'iVBORw0K', title: 'X-ray' } },
          { attachment: { contentType: 'text/html', data: 'PHNjcmlwdD4=' } },
        ] } },
      ],
    };
    const s = summariseFhirBundle(withFiles);
    expect(s.attachments).toEqual([
      { title: 'Prescription', contentType: 'application/pdf', data: 'JVBERi0x' },
      { title: 'X-ray', contentType: 'image/png', data: 'iVBORw0K' },
    ]);
    expect(s.sections[0].lines).toEqual(['Attached document']);
  });

  it('describes invoices and vaccines', () => {
    expect(resourceLine({ resourceType: 'Invoice', lineItem: [{}, {}], totalGross: { value: 644.8 } })).toBe('Bill with 2 items, total INR 644.8');
    expect(resourceLine({ resourceType: 'Immunization', vaccineCode: { text: 'BCG' }, occurrenceDateTime: '2025-12-01T00:00:00Z' })).toBe('BCG (2025-12-01)');
  });

  it('describes single resources', () => {
    expect(conceptText({ coding: [{ code: 'X1' }] })).toBe('X1');
    expect(resourceLine({ resourceType: 'DiagnosticReport', code: { text: 'CBC' }, conclusion: 'Normal' })).toBe('CBC: Normal');
    expect(resourceLine({ resourceType: 'Observation', code: { text: 'Pulse' }, valueQuantity: { value: 76, unit: '/min' } })).toBe('Pulse: 76 /min');
    expect(resourceLine({ resourceType: 'CarePlan', title: 'Advice', description: 'Rest' })).toBe('Advice: Rest');
    expect(resourceLine({ resourceType: 'Unknown' })).toBeUndefined();
    expect(resourceLine(undefined)).toBeUndefined();
  });
});
