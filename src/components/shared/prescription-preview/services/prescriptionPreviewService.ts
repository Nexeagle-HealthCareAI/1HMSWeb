import { TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { fetchTemplateAsFile } from '../utils/templateFile';
import { buildTemplateBoundPreview, TemplateBoundLayoutConfig, type PrintFieldConfig } from './previewRenderer';
import {
  generatePrescriptionDetailsService,
  type GeneratePrescriptionDetailsRequest,
  type GeneratePrescriptionDetailsPayload
} from './generatePrescriptionDetailsService';
import { mapTemplateToPreviewConfig } from '../utils/prescriptionDetailsMapper';
import { prescriptionFieldLayoutApi, mergeFieldsWithDefaults } from '@/features/prescription/services/prescriptionFieldLayoutApi';
import { drawingApi } from '@/features/patient/services/drawingApi';
import { eprescriptionApi } from '@/features/patient/services/eprescriptionApi';
import { generateDefaultLetterheadTemplate } from '../utils/defaultLetterhead';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { doctorApi } from '@/features/doctor/services/doctorApi';

export interface PrescriptionPreviewPayload {
  layout: TemplateBoundLayoutConfig;
  typography: TypographySettings;
  payload: GeneratePrescriptionDetailsPayload;
  templateFile?: File | null;
  templateUrl?: string | null;
  templateBackgroundDataUrl?: string | null;
  printFields?: PrintFieldConfig[];
  appointmentDate?: string;
  // Only used to build the default letterhead fallback below — not needed on the happy path
  // where the doctor's own uploaded template loads fine.
  hospitalId?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  // When true, always render the system-generated default regardless of templateFile/templateUrl
  // — a deliberate choice made on the config page, not an accident of nothing being uploaded.
  useSystemDefaultLetterhead?: boolean;
}

// 'no-template' — the doctor simply hasn't uploaded one yet (expected/common).
// 'template-fetch-failed' — a template WAS configured but couldn't be loaded (network/CORS/etc);
// this is the case worth surfacing to the doctor, since their real letterhead silently didn't print.
// 'system-default-chosen' — the doctor deliberately picked the system default on the config page;
// same rendering as 'no-template' but distinct so a caller can tell "chose it" from "forgot to upload".
export type LetterheadFallbackReason = 'no-template' | 'template-fetch-failed' | 'system-default-chosen';

export interface BuildPreviewBlobResult {
  blob: Blob;
  usedFallbackLetterhead: boolean;
  fallbackReason?: LetterheadFallbackReason;
}

export interface BuildPreviewResult {
  blob: Blob;
  templateUrl: string | null;
  usedFallbackLetterhead: boolean;
  fallbackReason?: LetterheadFallbackReason;
}

export const buildPreviewFromRequest = async (
  request: GeneratePrescriptionDetailsRequest,
  targetLanguage?: string
): Promise<BuildPreviewResult> => {
  const response = await generatePrescriptionDetailsService.fetch(request);

  if (!response.success || !response.data) {
    throw new Error('Unable to fetch prescription preview details.');
  }

  const templateConfig = mapTemplateToPreviewConfig(response.data.template);

  let payload = response.data;
  
  if (targetLanguage) {
    try {
      const { translatePrescriptionPayload } = await import('@/features/prescription/services/translationApi');
      payload = await translatePrescriptionPayload(payload, targetLanguage);
    } catch (e) {
      console.error('Translation failed', e);
    }
  }

  // The doctor's personalized field layout is the SOLE driver of print order / labels / visibility.
  // Always resolved against defaults (mergeFieldsWithDefaults) so it's never empty — even on a
  // fetch error we use the same default arrangement, never a separate fixed print order.
  // Drawings are fetched alongside it — a fetch failure here must never block the rest of the
  // preview, it just means no drawing pages get appended this time.
  const [layoutFields, drawings] = await Promise.all([
    prescriptionFieldLayoutApi.getFieldLayout(request.doctorId)
      .then(resp => resp.fields)
      .catch(() => [] as Awaited<ReturnType<typeof prescriptionFieldLayoutApi.getFieldLayout>>['fields']),
    drawingApi.getDrawings({
      appointmentId: request.appointmentId,
      patientId: request.patientId,
      hospitalId: request.hospitalId,
      doctorId: request.doctorId,
    })
      .then(resp => (resp?.drawings ?? []).map(d => ({ url: d.storageUrl, label: d.label })))
      .catch(() => [] as { url: string; label?: string }[]),
  ]);
  const printFields: PrintFieldConfig[] = mergeFieldsWithDefaults(layoutFields).map(f => ({
    key: f.key,
    label: f.label,
    showInPrint: f.showInPrint,
  }));

  const { blob, usedFallbackLetterhead, fallbackReason } = await buildPreviewBlob({
    layout: templateConfig.layout,
    typography: templateConfig.typography,
    useSystemDefaultLetterhead: templateConfig.useSystemDefaultLetterhead,
    payload: {
      ...payload,
      // Backend-rendered QR (NexEagle logo centered), encoding the WhatsApp-delivery link --
      // never fatal to the rest of the preview if it fails (matches discharge's own posture).
      qrImageBytes: await eprescriptionApi.getVisitSummaryQrCode(response.appointmentId).catch(() => undefined),
      validUptoDate: response.validUptoDate,
      drawings,
    },
    templateUrl: templateConfig.templateUrl,
    printFields,
    appointmentDate: request.appointmentDate,
    hospitalId: request.hospitalId,
    doctorId: request.doctorId,
    doctorName: request.doctorName,
  });

  return {
    blob,
    templateUrl: templateConfig.templateUrl ?? null,
    usedFallbackLetterhead,
    fallbackReason,
  };
};

export const buildPreviewBlob = async (request: PrescriptionPreviewPayload): Promise<BuildPreviewBlobResult> => {
  let templateFile = request.useSystemDefaultLetterhead ? null : request.templateFile;
  let usedFallbackLetterhead = false;
  let fallbackReason: LetterheadFallbackReason | undefined;

  if (!templateFile) {
    if (request.useSystemDefaultLetterhead) {
      fallbackReason = 'system-default-chosen';
    } else if (request.templateUrl) {
      try {
        templateFile = await fetchTemplateAsFile(request.templateUrl);
      } catch (error) {
        console.warn("Failed to fetch the doctor's uploaded letterhead, falling back to the default.", error);
        fallbackReason = 'template-fetch-failed';
      }
    } else {
      fallbackReason = 'no-template';
    }

    // No template configured, the configured one couldn't be loaded, or the system default was
    // deliberately chosen — use a branded default instead of a bare blank page (defaultLetterhead.ts).
    if (!templateFile) {
      usedFallbackLetterhead = true;
      const [hospital, doctorProfile] = await Promise.all([
        request.hospitalId ? hospitalApi.getHospitalById(request.hospitalId).catch(() => null) : Promise.resolve(null),
        request.doctorId ? doctorApi.getDoctorProfile(request.doctorId).catch(() => null) : Promise.resolve(null),
      ]);

      templateFile = await generateDefaultLetterheadTemplate({
        layout: request.layout,
        hospital: hospital && {
          name: hospital.name,
          location: hospital.location,
          city: hospital.city,
          state: hospital.state,
          contact: hospital.contact,
          email: hospital.email,
          registrationNumber: hospital.registrationNumber,
        },
        doctor: {
          name: request.doctorName ?? null,
          qualification: doctorProfile?.qualifications?.length ? doctorProfile.qualifications.join(', ') : null,
          specialization: doctorProfile?.primaryMedicalSpecialityName ?? null,
          registration: doctorProfile?.licenseNumber ?? null,
        },
      });
    }
  }

  if (templateFile) {
    const blob = await buildTemplateBoundPreview({
      templateFile,
      layout: request.layout,
      typography: request.typography,
      payload: request.payload,
      printFields: request.printFields,
      appointmentDate: request.appointmentDate,
    });
    return { blob, usedFallbackLetterhead, fallbackReason };
  }
  throw new Error('Template file could not be loaded.');
};

export const prescriptionPreviewService = {
  buildPreviewFromRequest,
  buildPreviewBlob
};
