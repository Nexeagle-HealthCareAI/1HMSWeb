import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/axiosClient';
import type { GeneratePrescriptionDetailsPayload, PrescriptionMedication } from '@/components/shared/prescription-preview/services/generatePrescriptionDetailsService';

vi.mock('@/services/axiosClient', () => ({
  apiClient: { post: vi.fn() },
}));

// Import after the mock so translationApi picks up the mocked apiClient.
import { translationApi, translatePrescriptionPayload } from './translationApi';

const mockedPost = apiClient.post as unknown as ReturnType<typeof vi.fn>;

describe('translationApi.translateMultiple', () => {
  beforeEach(() => mockedPost.mockReset());

  it('returns the raw dictionary the backend sends -- no {success, translations} wrapper', async () => {
    // Regression guard: TranslationController.cs's POST /translate-multiple returns a bare
    // Dictionary<string,string> (`return Ok(result)`), and apiClient.post already unwraps
    // response.data -- there has never been a {success, translations} envelope in the real
    // contract. useDischargePreview.ts once assumed one anyway and silently no-op'd as a
    // result; this test exists so that regression can't come back unnoticed.
    mockedPost.mockResolvedValueOnce({ chiefComplaint: 'सिरदर्द' });

    const result = await translationApi.translateMultiple({
      texts: { chiefComplaint: 'headache' },
      targetLanguage: 'Hindi',
    });

    expect(result).toEqual({ chiefComplaint: 'सिरदर्द' });
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/translation/translate-multiple', {
      texts: { chiefComplaint: 'headache' },
      targetLanguage: 'Hindi',
    });
  });
});

describe('translatePrescriptionPayload', () => {
  beforeEach(() => mockedPost.mockReset());

  function basePayload(overrides: Partial<GeneratePrescriptionDetailsPayload> = {}): GeneratePrescriptionDetailsPayload {
    return {
      chiefComplaint: 'headache',
      medications: [{ drugName: 'Paracetamol', instructions: 'after food', dose: '500mg', frequency: 'BD' } as PrescriptionMedication],
      ...overrides,
    } as GeneratePrescriptionDetailsPayload;
  }

  it('never sends drug names for translation, only dosing/instruction text', async () => {
    mockedPost.mockResolvedValueOnce({
      chiefComplaint: 'सिरदर्द',
      med_0_inst: 'खाने के बाद',
      med_0_dose: '500 मिलीग्राम',
      med_0_freq: 'दिन में दो बार',
    });

    await translatePrescriptionPayload(basePayload(), 'Hindi');

    const [, sentBody] = mockedPost.mock.calls[0];
    const sentTexts = Object.values((sentBody as { texts: Record<string, string> }).texts);
    expect(sentTexts).not.toContain('Paracetamol');
  });

  it('applies translated values back onto the matching fields, keyed correctly', async () => {
    mockedPost.mockResolvedValueOnce({
      chiefComplaint: 'सिरदर्द',
      med_0_inst: 'खाने के बाद',
      med_0_dose: '500 मिलीग्राम',
      med_0_freq: 'दिन में दो बार',
    });

    const result = await translatePrescriptionPayload(basePayload(), 'Hindi');

    expect(result.chiefComplaint).toBe('सिरदर्द');
    expect(result.medications?.[0].instructions).toBe('खाने के बाद');
    expect(result.medications?.[0].drugName).toBe('Paracetamol'); // untouched
  });

  it('falls back to the original value for any field the backend omitted from its response', async () => {
    // GroqTranslationService.cs backfills a dropped key with the original text server-side,
    // but this is the client-side half of the same safety net -- never render `undefined`.
    mockedPost.mockResolvedValueOnce({}); // backend returned nothing useful

    const result = await translatePrescriptionPayload(basePayload(), 'Hindi');

    expect(result.chiefComplaint).toBe('headache');
    expect(result.medications?.[0].instructions).toBe('after food');
  });

  it('skips the network call entirely when there is nothing translatable', async () => {
    const emptyPayload = { medications: [] } as unknown as GeneratePrescriptionDetailsPayload;

    const result = await translatePrescriptionPayload(emptyPayload, 'Hindi');

    expect(mockedPost).not.toHaveBeenCalled();
    expect(result).toBe(emptyPayload);
  });
});
