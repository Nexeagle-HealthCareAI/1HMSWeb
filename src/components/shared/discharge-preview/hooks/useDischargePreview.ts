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
    'warningSigns',
    'keyInvestigations',
    'additionalNotes',
] as const;

const LANGUAGE_CODES: Record<string, string> = { Hindi: 'hi', Bengali: 'bn' };

export const TRANSLATION_UNAVAILABLE = 'Could not translate just now — showing English only. Please try again.';

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
/**
 * Builds the options for a preview in English plus `targetLanguage` in brackets. English is never
 * replaced: each translated section is attached as the bracketed second-language line, and wording
 * staff already saved for that language wins over a fresh machine translation.
 *
 * Returns null when nothing came back translated (the server hands back the English on failure),
 * so the caller can say so instead of showing an unchanged page with no explanation.
 */
export async function withBracketedTranslation(
    options: DischargeTemplateBoundOptions,
    targetLanguage: string,
): Promise<DischargeTemplateBoundOptions | null> {
    const translated = await translateDischargeOptions(options, targetLanguage);
    const fields: Record<string, string | undefined> = {};
    for (const key of TRANSLATABLE_DISCHARGE_FIELD_KEYS) {
        const english = options.payload.fields[key]?.trim();
        const other = translated.payload.fields[key]?.trim();
        if (english && other && other !== english) fields[key] = other;
    }
    const saved = options.payload.secondLanguage;
    if (saved && saved.name === targetLanguage) {
        for (const [key, value] of Object.entries(saved.fields)) if (value?.trim()) fields[key] = value;
    }
    if (Object.keys(fields).length === 0) return null;
    return {
        ...options,
        payload: { ...options.payload, secondLanguage: { code: LANGUAGE_CODES[targetLanguage] ?? targetLanguage.toLowerCase().slice(0, 2), name: targetLanguage, fields } },
    };
}

/**
 * `targetLanguage` undefined = English only. With a language, the preview is English with that
 * language in brackets. `translate` false shows only what was already saved on the summary for
 * that language (no network call) — used when the preview first opens.
 */
export const useDischargePreview = (options: DischargeTemplateBoundOptions | null, targetLanguage?: string, translate = true) => {
    const [notice, setNotice] = useState<string | null>(null);
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
            let nextNotice: string | null = null;

            if (!targetLanguage) {
                // English only: leave out any saved translation.
                processedOptions = { ...options, payload: { ...options.payload, secondLanguage: undefined } };
            } else if (translate) {
                // Translation failure must never block the preview — fall back to English and say so.
                try {
                    const bracketed = await withBracketedTranslation(options, targetLanguage);
                    if (bracketed) processedOptions = bracketed;
                    else {
                        nextNotice = TRANSLATION_UNAVAILABLE;
                        processedOptions = { ...options, payload: { ...options.payload, secondLanguage: undefined } };
                    }
                } catch (e) {
                    console.error('Discharge translation failed', e);
                    nextNotice = TRANSLATION_UNAVAILABLE;
                    processedOptions = { ...options, payload: { ...options.payload, secondLanguage: undefined } };
                }
            }
            setNotice(nextNotice);

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
    }, [options, targetLanguage, translate, revokeUrl]);

    useEffect(() => {
        if (!options) {
            setError('Missing preview context.');
            return;
        }
        generatePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, targetLanguage, translate]);

    return { previewUrl, isLoading, error, notice, regeneratePreview: generatePreview };
};
