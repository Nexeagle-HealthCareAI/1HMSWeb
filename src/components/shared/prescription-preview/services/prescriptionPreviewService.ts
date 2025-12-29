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

export const prescriptionPreviewService = {
  async buildPreviewFromRequest(request: GeneratePrescriptionDetailsRequest): Promise<BuildPreviewResult> {
    const response = await generatePrescriptionDetailsService.fetch(request);

    if (!response.success || !response.data) {
      throw new Error('Unable to fetch prescription preview details.');
    }

    const templateConfig = mapTemplateToPreviewConfig(response.data.template);

    // We assume response.data IS the GeneratePrescriptionDetailsPayload structure
    const payload = response.data;

    const blob = await this.buildPreviewBlob({
      layout: templateConfig.layout,
      typography: templateConfig.typography,
      payload,
      templateUrl: templateConfig.templateUrl,
    });

    return {
      blob,
      templateUrl: templateConfig.templateUrl ?? null,
    };
  },

  async buildPreviewBlob(request: PrescriptionPreviewPayload): Promise<Blob> {
    const templateFile = request.templateFile ?? (await fetchTemplateAsFile(request.templateUrl));

    if (templateFile) {
      return buildTemplateBoundPreview({
        templateFile,
        layout: request.layout,
        typography: request.typography,
        payload: request.payload,
      });
    }
    throw new Error('Template file could not be loaded.');
  },
};
