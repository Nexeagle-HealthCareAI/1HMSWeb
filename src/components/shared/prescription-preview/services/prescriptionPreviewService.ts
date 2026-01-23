import { PDFDocument } from 'pdf-lib';
import { TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { fetchTemplateAsFile } from '../utils/templateFile';
import { buildTemplateBoundPreview, TemplateBoundLayoutConfig } from './previewRenderer';
import {
  generatePrescriptionDetailsService,
  type GeneratePrescriptionDetailsRequest,
  type GeneratePrescriptionDetailsPayload
} from './generatePrescriptionDetailsService';
import { mapTemplateToPreviewConfig } from '../utils/prescriptionDetailsMapper';

export interface PrescriptionPreviewPayload {
  layout: TemplateBoundLayoutConfig;
  typography: TypographySettings;
  payload: GeneratePrescriptionDetailsPayload;
  templateFile?: File | null;
  templateUrl?: string | null;
  templateBackgroundDataUrl?: string | null;
}

export interface BuildPreviewResult {
  blob: Blob;
  templateUrl: string | null;
}

export const buildPreviewFromRequest = async (request: GeneratePrescriptionDetailsRequest): Promise<BuildPreviewResult> => {
  const response = await generatePrescriptionDetailsService.fetch(request);

  if (!response.success || !response.data) {
    throw new Error('Unable to fetch prescription preview details.');
  }

  const templateConfig = mapTemplateToPreviewConfig(response.data.template);

  // We assume response.data IS the GeneratePrescriptionDetailsPayload structure
  const payload = response.data;

  const blob = await buildPreviewBlob({
    layout: templateConfig.layout,
    typography: templateConfig.typography,
    payload: {
      ...payload,
      qrCodeData: `${import.meta.env.VITE_APP_URL || window.location.origin}/verify/${response.appointmentId}`,
      validUptoDate: response.validUptoDate
    },
    templateUrl: templateConfig.templateUrl,
  });

  return {
    blob,
    templateUrl: templateConfig.templateUrl ?? null,
  };
};

export const buildPreviewBlob = async (request: PrescriptionPreviewPayload): Promise<Blob> => {
  let templateFile = request.templateFile;

  if (!templateFile) {
    if (request.templateUrl) {
      try {
        templateFile = await fetchTemplateAsFile(request.templateUrl);
      } catch (error) {
        console.warn("Failed to fetch template, falling back to blank.", error);
      }
    }

    // Fallback if no URL or fetch failed
    if (!templateFile) {
      const doc = await PDFDocument.create();
      doc.addPage([595.28, 841.89]); // A4 Points
      const pdfBytes = await doc.save();
      templateFile = new File([pdfBytes as any], 'blank.pdf', { type: 'application/pdf' });
    }
  }

  if (templateFile) {
    return buildTemplateBoundPreview({
      templateFile,
      layout: request.layout,
      typography: request.typography,
      payload: request.payload,
    });
  }
  throw new Error('Template file could not be loaded.');
};

export const prescriptionPreviewService = {
  buildPreviewFromRequest,
  buildPreviewBlob
};
