import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/axiosClient';
import type { DischargeTemplateBoundOptions, DischargePrintPayload } from '../services/dischargePreviewRenderer';

vi.mock('@/services/axiosClient', () => ({
  apiClient: { post: vi.fn() },
}));

// Import after the mock so translationApi (used internally) picks up the mocked apiClient.
import { translateDischargeOptions, withBracketedTranslation } from './useDischargePreview';

const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

function basePayload(overrides: Partial<DischargePrintPayload> = {}): DischargePrintPayload {
  return {
    admissionNo: 'ADM-1',
    patientName: 'Test Patient',
    patientId: 'P-1',
    admittedAt: '2026-08-01',
    dischargedAt: '2026-08-05',
    conditionAtDischarge: 'Stable',
    fields: {},
    customFieldValues: {},
    ...overrides,
  };
}

// translateDischargeOptions only ever reads/copies `payload` -- the rest of the options
// object is passed through untouched, so these fields never need to be realistic.
function baseOptions(payload: DischargePrintPayload): DischargeTemplateBoundOptions {
  return {
    templateFile: {} as File,
    margins: {} as DischargeTemplateBoundOptions['margins'],
    overflowStrategy: 'blank',
    typography: {} as DischargeTemplateBoundOptions['typography'],
    payload,
    printFields: [],
  };
}

describe('translateDischargeOptions', () => {
  beforeEach(() => mockedPost.mockReset());

  it('regression guard: reads translateMultiple\'s REAL raw-dictionary response, not a {success, translations} wrapper', async () => {
    // This is exactly the bug: the old code checked `translated.success && translated.translations`
    // against a response that has neither field, so the branch never ran and the discharge
    // preview silently stayed in English no matter what language was selected.
    mockedPost.mockResolvedValueOnce({ field_chiefComplaint: 'सीने में दर्द' });

    const options = baseOptions(basePayload({ fields: { chiefComplaint: 'chest pain' } }));
    const result = await translateDischargeOptions(options, 'Hindi');

    expect(result.payload.fields.chiefComplaint).toBe('सीने में दर्द');
  });

  it('never sends dischargeMedications, the ICD-10 code, or the follow-up date for translation', async () => {
    mockedPost.mockResolvedValueOnce({});

    const options = baseOptions(basePayload({
      fields: {
        chiefComplaint: 'fever',
        dischargeMedications: 'Tab. Metformin 500mg OD, Tab. Atorvastatin 10mg HS',
        finalDiagnosisIcd10: 'E11.9',
        followUpDate: '2026-09-01',
      },
    }));

    await translateDischargeOptions(options, 'Hindi');

    const [, sentBody] = mockedPost.mock.calls[0];
    const sentTexts: Record<string, string> = (sentBody as { texts: Record<string, string> }).texts;
    expect(Object.values(sentTexts)).not.toContain('Tab. Metformin 500mg OD, Tab. Atorvastatin 10mg HS');
    expect(Object.values(sentTexts)).not.toContain('E11.9');
    expect(Object.values(sentTexts)).not.toContain('2026-09-01');
  });

  it('never sends doctor-defined custom field values for translation, and they survive untouched in the result', async () => {
    mockedPost.mockResolvedValueOnce({ field_chiefComplaint: 'बुखार' });

    const options = baseOptions(basePayload({
      fields: { chiefComplaint: 'fever' },
      customFieldValues: { cf_special_instructions: 'Continue insulin as advised' },
    }));

    const result = await translateDischargeOptions(options, 'Hindi');

    const [, sentBody] = mockedPost.mock.calls[0];
    const sentTexts: Record<string, string> = (sentBody as { texts: Record<string, string> }).texts;
    expect(Object.values(sentTexts)).not.toContain('Continue insulin as advised');
    expect(result.payload.customFieldValues.cf_special_instructions).toBe('Continue insulin as advised');
  });

  it('translates conditionAtDischarge and TPA non-payable line labels', async () => {
    mockedPost.mockResolvedValueOnce({
      conditionAtDischarge: 'स्थिर',
      tpaLine_0: 'गैर-देय शुल्क',
    });

    const options = baseOptions(basePayload({
      conditionAtDischarge: 'Stable',
      tpaSplit: {
        payableTotal: 1000,
        nonPayableTotal: 200,
        unclassifiedTotal: 0,
        nonPayableLines: [{ displayName: 'Non-payable charge', netAmount: 200 }],
      },
    }));

    const result = await translateDischargeOptions(options, 'Hindi');

    expect(result.payload.conditionAtDischarge).toBe('स्थिर');
    expect(result.payload.tpaSplit?.nonPayableLines[0].displayName).toBe('गैर-देय शुल्क');
  });

  it('skips the network call entirely when there is nothing translatable', async () => {
    const options = baseOptions(basePayload({ fields: {}, conditionAtDischarge: '' }));

    const result = await translateDischargeOptions(options, 'Hindi');

    expect(mockedPost).not.toHaveBeenCalled();
    expect(result).toBe(options);
  });

  it('falls back to the original value for any field the backend omitted from its response', async () => {
    mockedPost.mockResolvedValueOnce({}); // nothing came back

    const options = baseOptions(basePayload({ fields: { chiefComplaint: 'fever' } }));
    const result = await translateDischargeOptions(options, 'Hindi');

    expect(result.payload.fields.chiefComplaint).toBe('fever');
  });
});

describe('withBracketedTranslation', () => {
  beforeEach(() => mockedPost.mockReset());

  it('keeps the English and attaches the translation as the bracketed second language', async () => {
    mockedPost.mockResolvedValueOnce({ field_dietInstructions: 'नरम भोजन', field_courseInHospital: 'सुधार हुआ' });
    const options = baseOptions(basePayload({ fields: { dietInstructions: 'Soft diet', courseInHospital: 'Improved' } }));

    const result = await withBracketedTranslation(options, 'Hindi');

    expect(result!.payload.fields).toEqual({ dietInstructions: 'Soft diet', courseInHospital: 'Improved' });
    expect(result!.payload.secondLanguage).toEqual({ code: 'hi', name: 'Hindi', fields: { dietInstructions: 'नरम भोजन', courseInHospital: 'सुधार हुआ' } });
  });

  it('uses the Bengali code for Bengali', async () => {
    mockedPost.mockResolvedValueOnce({ field_dietInstructions: 'নরম খাবার' });
    const result = await withBracketedTranslation(baseOptions(basePayload({ fields: { dietInstructions: 'Soft diet' } })), 'Bengali');
    expect(result!.payload.secondLanguage!.code).toBe('bn');
  });

  it('returns null when the server hands the English back unchanged, so the screen can say translation failed', async () => {
    mockedPost.mockResolvedValueOnce({ field_dietInstructions: 'Soft diet' });
    expect(await withBracketedTranslation(baseOptions(basePayload({ fields: { dietInstructions: 'Soft diet' } })), 'Hindi')).toBeNull();
  });

  it('wording staff saved for that language wins over the fresh translation', async () => {
    mockedPost.mockResolvedValueOnce({ field_dietInstructions: 'machine', field_courseInHospital: 'सुधार हुआ' });
    const options = baseOptions(basePayload({
      fields: { dietInstructions: 'Soft diet', courseInHospital: 'Improved' },
      secondLanguage: { code: 'hi', name: 'Hindi', fields: { dietInstructions: 'हल्का खाना' } },
    }));
    const result = await withBracketedTranslation(options, 'Hindi');
    expect(result!.payload.secondLanguage!.fields).toEqual({ dietInstructions: 'हल्का खाना', courseInHospital: 'सुधार हुआ' });
  });

  it('does not carry saved Hindi wording into a Bengali preview', async () => {
    mockedPost.mockResolvedValueOnce({ field_dietInstructions: 'নরম খাবার' });
    const options = baseOptions(basePayload({
      fields: { dietInstructions: 'Soft diet' },
      secondLanguage: { code: 'hi', name: 'Hindi', fields: { dietInstructions: 'हल्का खाना' } },
    }));
    const result = await withBracketedTranslation(options, 'Bengali');
    expect(result!.payload.secondLanguage!.fields).toEqual({ dietInstructions: 'নরম খাবার' });
  });
});
