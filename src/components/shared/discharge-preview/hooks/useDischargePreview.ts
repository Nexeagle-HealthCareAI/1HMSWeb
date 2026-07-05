import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDischargeTemplateBoundPreview, type DischargeTemplateBoundOptions } from '../services/dischargePreviewRenderer';

/** Mirrors usePrescriptionPreview.ts — builds the pdf-lib letterhead-bound discharge PDF and
 * exposes it as a blob: URL for an iframe/embed. */
export const useDischargePreview = (options: DischargeTemplateBoundOptions | null) => {
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
            const bytes = await buildDischargeTemplateBoundPreview(options);
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
    }, [options, revokeUrl]);

    useEffect(() => {
        if (!options) {
            setError('Missing preview context.');
            return;
        }
        generatePreview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options]);

    return { previewUrl, isLoading, error, regeneratePreview: generatePreview };
};
