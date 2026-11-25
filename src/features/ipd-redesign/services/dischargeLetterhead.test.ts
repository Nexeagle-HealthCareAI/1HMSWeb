import { describe, expect, it } from 'vitest';
import { pickEffectiveLetterhead, isHospitalLetterhead, HOSPITAL_LETTERHEAD_ID } from './dischargeSettingsApi';
import { needsUnicodeRendering } from '@/components/shared/discharge-preview/services/dischargePreviewRenderer';
import { buildDischargeSummaryA4 } from '@/printTemplates/dischargeSummaryA4';

const base = { hospitalId: 'h', doctorId: 'd' };

describe('which letterhead a discharge prints on', () => {
    it("doctor's own upload wins", () => {
        expect(pickEffectiveLetterhead({ ...base, uri: 'own.pdf' }, { ...base, doctorId: '', uri: 'hosp.pdf' })?.uri).toBe('own.pdf');
    });
    it("a doctor's deliberate system-default choice also wins", () => {
        expect(pickEffectiveLetterhead({ ...base, useSystemDefaultLetterhead: true }, { ...base, uri: 'hosp.pdf' })?.useSystemDefaultLetterhead).toBe(true);
    });
    it('falls back to the hospital letterhead', () => {
        expect(pickEffectiveLetterhead({ ...base, headerHeight: 30 }, { ...base, uri: 'hosp.pdf' })?.uri).toBe('hosp.pdf');
        expect(pickEffectiveLetterhead(null, { ...base, uri: 'hosp.pdf' })?.uri).toBe('hosp.pdf');
    });
    it('neither: keeps the doctor settings (margins) or null', () => {
        expect(pickEffectiveLetterhead({ ...base, headerHeight: 30 }, null)?.headerHeight).toBe(30);
        expect(pickEffectiveLetterhead(null, null)).toBeNull();
    });
    it('hospital sentinel', () => {
        expect(isHospitalLetterhead(HOSPITAL_LETTERHEAD_ID)).toBe(true);
        expect(isHospitalLetterhead('some-doctor')).toBe(false);
    });
});

describe('printout', () => {
    it('knows which text the PDF fonts cannot draw', () => {
        expect(needsUnicodeRendering('Low salt — no ghee')).toBe(false);
        expect(needsUnicodeRendering('कम नमक')).toBe(true);
        expect(needsUnicodeRendering('₹ 500')).toBe(true);
    });

    it('prints the new sections and the Hindi advice under the English', () => {
        const html = buildDischargeSummaryA4({
            admissionNo: 'ADM-1', patientName: 'P', patientId: 'PT1', ageGender: '58M', mobile: '', admittedAt: '2026-11-22T08:00:00Z',
            dischargedAt: '2026-11-25T08:00:00Z', conditionAtDischarge: 'IMPROVED',
            keyInvestigations: '- Troponin 2.1 <high>', dietInstructions: 'Low salt', warningSigns: 'Chest pain',
            secondLanguage: { code: 'hi', name: 'Hindi', fields: { dietInstructions: 'कम नमक', warningSigns: 'सीने में दर्द' } },
        }, { hospitalName: 'GLISAN Hospital', address: 'Purnia' } as any);
        expect(html).toContain('Key Investigations');
        expect(html).toContain('&lt;high&gt;');
        expect(html).toContain('Come back at once if');
        expect(html).toContain('lang="hi"');
        expect(html).toContain('कम नमक');
        expect(html.indexOf('Low salt')).toBeLessThan(html.indexOf('कम नमक'));
    });
});
