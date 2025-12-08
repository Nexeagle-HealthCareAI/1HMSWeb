import { PrescriptionDesignerData, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { fetchTemplateAsFile } from '../utils/templateFile';
import { buildTemplateBoundPreview, TemplateBoundLayoutConfig } from './previewRenderer';
import {
  generatePrescriptionDetailsService,
  type GeneratePrescriptionDetailsRequest,
} from './generatePrescriptionDetailsService';
import { buildPrescriptionDataFromResponse, mapTemplateToPreviewConfig } from '../utils/prescriptionDetailsMapper';

export interface PrescriptionPreviewPayload {
  layout: TemplateBoundLayoutConfig;
  typography: TypographySettings;
  prescription: PrescriptionDesignerData;
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
    console.log("TemplateConfif",templateConfig)
    const prescription = buildPrescriptionDataFromResponse(response.data);

    const blob = await this.buildPreviewBlob({
      layout: templateConfig.layout,
      typography: templateConfig.typography,
      prescription,
      templateUrl: templateConfig.templateUrl,
    });

    return {
      blob,
      templateUrl: templateConfig.templateUrl ?? null,
    };
  },

  async buildPreviewBlob(payload: PrescriptionPreviewPayload): Promise<Blob> {
    const templateFile = payload.templateFile ?? (await fetchTemplateAsFile(payload.templateUrl));
     console.log("buildPreviewBlob",payload.templateUrl)
    if (templateFile) {
      return buildTemplateBoundPreview({
        templateFile,
        layout: payload.layout,
        typography: payload.typography,
        prescription: payload.prescription,
      });
    }
  },
};
