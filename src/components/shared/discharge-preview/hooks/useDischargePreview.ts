import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDischargeTemplateBoundPreview, type DischargeTemplateBoundOptions } from '../services/dischargePreviewRenderer';

import { translationApi } from '@/features/prescription/services/translationApi';

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
                // Collect strings to translate
                const stringsToTranslate: string[] = [];
                const keysMap: { type: 'field' | 'customField' | 'condition' | 'tpaLine'; key: string | number; index: number }[] = [];
                
                // Add built-in fields
                Object.entries(options.payload.fields).forEach(([k, v]) => {
                    if (v && v.trim()) {
                        keysMap.push({ type: 'field', key: k, index: stringsToTranslate.length });
                        stringsToTranslate.push(v);
                    }
                });
                
                // Add custom fields
                Object.entries(options.payload.customFieldValues).forEach(([k, v]) => {
                    if (v && v.trim()) {
                        keysMap.push({ type: 'customField', key: k, index: stringsToTranslate.length });
                        stringsToTranslate.push(v);
                    }
                });
                
                // Add condition at discharge
                if (options.payload.conditionAtDischarge && options.payload.conditionAtDischarge.trim()) {
                    keysMap.push({ type: 'condition', key: 'conditionAtDischarge', index: stringsToTranslate.length });
                    stringsToTranslate.push(options.payload.conditionAtDischarge);
                }
                
                // Add TPA lines
                if (options.payload.tpaSplit?.nonPayableLines) {
                    options.payload.tpaSplit.nonPayableLines.forEach((line, i) => {
                        if (line.displayName && line.displayName.trim()) {
                            keysMap.push({ type: 'tpaLine', key: i, index: stringsToTranslate.length });
                            stringsToTranslate.push(line.displayName);
                        }
                    });
                }
                
                if (stringsToTranslate.length > 0) {
                    const translated = await translationApi.translateMultiple({
                        texts: stringsToTranslate,
                        targetLanguage: targetLanguage
                    });
                    
                    if (translated.success && translated.translations) {
                        const newPayload = { ...options.payload };
                        newPayload.fields = { ...options.payload.fields };
                        newPayload.customFieldValues = { ...options.payload.customFieldValues };
                        
                        if (newPayload.tpaSplit) {
                            newPayload.tpaSplit = { 
                                ...newPayload.tpaSplit, 
                                nonPayableLines: [...newPayload.tpaSplit.nonPayableLines.map(l => ({...l}))] 
                            };
                        }
                        
                        keysMap.forEach(mapItem => {
                            const translatedText = translated.translations[mapItem.index];
                            if (translatedText) {
                                if (mapItem.type === 'field') newPayload.fields[mapItem.key as string] = translatedText;
                                else if (mapItem.type === 'customField') newPayload.customFieldValues[mapItem.key as string] = translatedText;
                                else if (mapItem.type === 'condition') newPayload.conditionAtDischarge = translatedText;
                                else if (mapItem.type === 'tpaLine' && newPayload.tpaSplit) {
                                    newPayload.tpaSplit.nonPayableLines[mapItem.key as number].displayName = translatedText;
                                }
                            }
                        });
                        
                        processedOptions = { ...options, payload: newPayload };
                    }
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
