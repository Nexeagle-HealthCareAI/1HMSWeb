import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPreviewFromRequest } from '../services/prescriptionPreviewService';
import { type GeneratePrescriptionDetailsRequest } from '../services/generatePrescriptionDetailsService';
import { useToast } from '@/hooks/use-toast';

export interface UsePrescriptionPreviewOptions {
  request: GeneratePrescriptionDetailsRequest | null;
  auto?: boolean;
  targetLanguage?: string;
}

export const usePrescriptionPreview = ({
  request,
  auto = true,
  targetLanguage,
}: UsePrescriptionPreviewOptions) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  const revokeUrl = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => revokeUrl(lastObjectUrlRef.current), [revokeUrl]);

  const generatePreview = useCallback(async () => {
    if (!request) {
      setError('Missing preview context.');
      setTemplateUrl(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      setTemplateUrl(null);
      const { blob, templateUrl: sourceTemplateUrl, fallbackReason } = await buildPreviewFromRequest(request, targetLanguage);
      const nextUrl = URL.createObjectURL(blob);
      revokeUrl(lastObjectUrlRef.current);
      lastObjectUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      setTemplateUrl(sourceTemplateUrl);
      // 'no-template' is the normal/expected case for a doctor who hasn't uploaded one yet —
      // only 'template-fetch-failed' means THEIR OWN letterhead silently didn't apply, which is
      // worth a visible notice instead of a silent swap to the default.
      if (fallbackReason === 'template-fetch-failed') {
        toast({
          title: 'Could not load your letterhead',
          description: "We couldn't load your uploaded letterhead just now, so the default layout was used instead. Your prescription content is unaffected — try again, or re-upload your letterhead in settings.",
          variant: 'destructive',
        });
      }
      return nextUrl;
    } catch (err) {
      //console.error('generatePreview failed', err);
      setError(err instanceof Error ? err.message : 'Unable to build prescription preview.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [request, targetLanguage, revokeUrl, toast]);

  const resetPreview = useCallback(() => {
    revokeUrl(lastObjectUrlRef.current);
    lastObjectUrlRef.current = null;
    setPreviewUrl(null);
    setTemplateUrl(null);
  }, [revokeUrl]);

  useEffect(() => {
    if (!auto) return;
    if (!request) {
      setError('Missing preview context.');
      resetPreview();
      return;
    }
    generatePreview();
  }, [auto, request, targetLanguage, generatePreview, resetPreview]);

  return {
    previewUrl,
    templateUrl,
    isLoading,
    error,
    regeneratePreview: generatePreview,
    resetPreview,
  };
};
