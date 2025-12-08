import { useCallback, useEffect, useRef, useState } from 'react';
import { prescriptionPreviewService } from '../services/prescriptionPreviewService';
import { type GeneratePrescriptionDetailsRequest } from '../services/generatePrescriptionDetailsService';

export interface UsePrescriptionPreviewOptions {
  request: GeneratePrescriptionDetailsRequest | null;
  auto?: boolean;
}

export const usePrescriptionPreview = ({
  request,
  auto = true,
}: UsePrescriptionPreviewOptions) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

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
      const { blob, templateUrl: sourceTemplateUrl } = await prescriptionPreviewService.buildPreviewFromRequest(request);
      const nextUrl = URL.createObjectURL(blob);
      revokeUrl(lastObjectUrlRef.current);
      lastObjectUrlRef.current = nextUrl;
      setPreviewUrl(nextUrl);
      setTemplateUrl(sourceTemplateUrl);
      return nextUrl;
    } catch (err) {
      //console.error('generatePreview failed', err);
      setError(err instanceof Error ? err.message : 'Unable to build prescription preview.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [request, revokeUrl]);

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
  }, [auto, request, generatePreview, resetPreview]);

  return {
    previewUrl,
    templateUrl,
    isLoading,
    error,
    regeneratePreview: generatePreview,
    resetPreview,
  };
};
