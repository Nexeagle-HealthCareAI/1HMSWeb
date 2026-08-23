import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDischargeTemplateBoundPreview, type DischargeTemplateBoundOptions } from '../services/dischargePreviewRenderer';

import { translationApi } from '@/features/prescription/services/translationApi';

/**
 * Only these built-in field keys get sent for translation -- an explicit ALLOWLIST of
 * free-form prose, mirroring translatePrescriptionPayload's equally explicit, conservative
 * field list (which never touches drug names either). Deliberately excludes:
 * `dischargeMedications` (a free-text drug list -- unlike prescription's structured table,
 * there's no separate drugName field to keep out of the translator, so the whole field stays
 * untranslated rather than risk a transliterated/altered drug name on a printed letterhead),
 * `finalDiagnosisIcd10` (a code, not prose -- translating it would corrupt it),
 * `followUpDate` (a date, not prose), and `nonPayableAnnexure` (derived/computed, not
 * doctor-authored free text; also never editable in the pad -- see DEFAULT_DISCHARGE_FIELDS's
 * showInPad: false for that key).
 */
const TRANSLATABLE_DISCHARGE_FIELD_KEYS = [
    'admittingDiagnosis',
    'finalDiagnosis',
    'chiefComplaint',
    'historyOfPresentIllness',
    'courseInHospital',
    'proceduresPerformed',
    'followUpInstructions',
    'dietInstructions',
    'activityRestrictions',
    'additionalNotes',
] as const;

/**
 * Translates one discharge preview's payload. Deliberately does NOT translate
 * customFieldValues at all -- same precedent as translatePrescriptionPayload, which only
 * ever sends its own explicitly-named, vetted fields and never a generic "whatever the user
 * typed into a dynamically-added field" loop. A doctor-defined custom field has no known
 * shape, so there's no safe way to rule out it containing a drug name or a code the way the
 * allowlist above does for the fixed built-ins.
 *
 * Uses translationApi.translateMultiple's REAL contract -- a Record<string,string> request,
 * a bare Record<string,string> response (no {success,translations} wrapper; see
 * TranslationController.cs's `return Ok(result)` where result is Dictionary<string,string>).
 */
export async function translateDischargeOptions(
    options: DischargeTemplateBoundOptions,
    targetLanguage: string,
): Promise<DischargeTemplateBoundOptions> {
    const texts: Record<string, string> = {};

    for (const key of TRANSLATABLE_DISCHARGE_FIELD_KEYS) {
        const value = options.payload.fields[key];
        if (value && value.trim()) texts[`field_${key}`] = value;
    }

    if (options.payload.conditionAtDischarge?.trim()) {
        texts['conditionAtDischarge'] = options.payload.conditionAtDischarge;
    }

    (options.payload.tpaSplit?.nonPayableLines ?? []).forEach((line, i) => {
        if (line.displayName?.trim()) texts[`tpaLine_${i}`] = line.displayName;
    });

    if (Object.keys(texts).length === 0) return options;

    const translated = await translationApi.translateMultiple({ texts, targetLanguage });

    const newFields = { ...options.payload.fields };
    for (const key of TRANSLATABLE_DISCHARGE_FIELD_KEYS) {
        const translatedValue = translated[`field_${key}`];
        if (translatedValue) newFields[key] = translatedValue;
    }

    const newPayload = {
        ...options.payload,
        fields: newFields,
        conditionAtDischarge: translated['conditionAtDischarge'] ?? options.payload.conditionAtDischarge,
    };

    if (newPayload.tpaSplit) {
        newPayload.tpaSplit = {
            ...newPayload.tpaSplit,
            nonPayableLines: newPayload.tpaSplit.nonPayableLines.map((line, i) => ({
                ...line,
                displayName: translated[`tpaLine_${i}`] ?? line.displayName,
            })),
        };
    }

    return { ...options, payload: newPayload };
}

/** Mirrors usePrescriptionPreview.ts — builds the pdf-lib letterhead-bound discharge PDF and
 * exposes it as a blob: URL for an iframe/embed. */
export const useDischargePreview = (options: DischargeTemplateBoundOptions | null, targetLanguage?: string) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastObjectUrlRef = useRef<string | null>(null);

    const revokeUrl = useCallback((url: string | null) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }, []);

    useEffect(() => () => revokeUrl(lastObjectUrlRef.current), [revokeUrl]);

    const generatePreview = useCallback(async () => {
        if (!options) {
            setError('Missing preview context.');
            return null;
        }
        setIsLoading(true);
        setError(null);
        try {
            let processedOptions = options;

            if (targetLanguage) {
                // Translation failure must never block the preview -- mirrors
                // prescriptionPreviewService.buildPreviewFromRequest's identical try/catch,
                // falling through to the original (untranslated) options on any error.
                try {
                    processedOptions = await translateDischargeOptions(options, targetLanguage);
                } catch (e) {
                    console.error('Discharge translation failed', e);
                }
            }

            const bytes = await buildDischargeTemplateBoundPreview(processedOptions);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const nextUrl = URL.createObjectURL(blob);
            revokeUrl(lastObjectUrlRef.current);
            lastObjectUrlRef.current = nextUrl;
            setPreviewUrl(nextUrl);
            return nextUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to build discharge summary preview.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [options, targetLanguage, revokeUrl]);

    useEffect(() => {
        if (!options) {
            setError('Missing preview context.');
            return;
        }
        generatePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, targetLanguage]);

    return { previewUrl, isLoading, error, regeneratePreview: generatePreview };
};
