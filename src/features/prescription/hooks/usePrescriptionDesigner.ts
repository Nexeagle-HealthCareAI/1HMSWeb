import { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { usePrescriptionStore } from '@/store/prescription';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { prescriptionFieldConfigApi } from '@/features/doctor/services/prescriptionFieldConfigApi';
import { usePrescriptionLayoutSettings } from '@/features/prescription/hooks/usePrescriptionFieldConfig';
import { resolveTemplateFetchUrl } from '@/features/prescription/utils/templateFetch';

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TemplateMetadata {
  fileName: string;
  fileSizeKb: number;
  pageSize: { width: number; height: number; unit: 'mm' };
  orientationHint: 'portrait' | 'landscape';
  recommendedMargins: MarginConfig;
  trimBox?: MarginConfig;
  cropBox?: MarginConfig;
  analyzedAt: string;
  wasConverted?: boolean;
  originalPageSize?: { width: number; height: number; unit: 'mm' };
}

export interface TypographySettings {
  family: 'Helvetica' | 'Times' | 'Courier' | 'Arial' | 'Georgia';
  size: number;
  weight: 'regular' | 'medium' | 'bold';
  color: string;
}

export interface PrescriptionMedicine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface PrescriptionDesignerData {
  patient: {
    name: string;
    id: string;
    age: string;
    gender: string;
    phone: string;
    details?: { label: string; value: string }[];
  };
  doctor: {
    name: string;
    registration: string;
    specialization: string;
    clinic: string;
  };
  visit: {
    date: string;
    location: string;
    followUp: string;
  };
  vitals: {
    bloodPressure: string;
    pulse: string;
    temperature: string;
    spo2: string;
    height?: string;
    weight?: string;
    bmi?: string;
  };
  chiefComplaints: string[];
  comorbidities: string[];
  investigations: string[];
  medicines: PrescriptionMedicine[];
  advice: string[];
  notes: string;
}

const defaultMargins: MarginConfig = { top: 20, right: 20, bottom: 20, left: 20 };

const defaultDesignerData: PrescriptionDesignerData = {
  patient: {
    name: 'John Doe',
    id: 'PT-000458',
    age: '38',
    gender: 'Male',
    phone: '+1 999 123 4567',
    details: [
      { label: 'Patient ID', value: 'PT-000458' },
      { label: 'Age', value: '38' },
      { label: 'Gender', value: 'Male' },
      { label: 'Phone', value: '+1 999 123 4567' },
    ],
  },
  doctor: {
    name: 'Dr. Maya Desai',
    registration: 'REG/TS/2025/0093',
    specialization: 'Cardiologist',
    clinic: 'EasyHMS Cardio Center',
  },
  visit: {
    date: new Date().toISOString(),
    location: 'Hyderabad, IN',
    followUp: '2 weeks or earlier if symptoms worsen',
  },
  vitals: {
    bloodPressure: '120/80 mmHg',
    pulse: '74 bpm',
    temperature: '98.4 F',
    spo2: '99%',
    height: '178 cm',
    weight: '74 kg',
    bmi: '23.4',
  },
  chiefComplaints: ['Intermittent chest discomfort', 'Shortness of breath on exertion'],
  comorbidities: ['Type 2 Diabetes Mellitus', 'Essential Hypertension'],
  investigations: ['ECG (resting)', 'Lipid profile', 'HbA1c', 'Chest X-ray'],
  medicines: [
    {
      name: 'Atorvastatin 20 mg',
      dose: '1 tablet',
      frequency: 'Once daily',
      duration: '30 days',
      notes: 'Preferably at bedtime',
    },
    {
      name: 'Metoprolol 25 mg',
      dose: '1 tablet',
      frequency: 'Twice daily',
      duration: '30 days',
      notes: 'Monitor pulse before dose',
    },
  ],
  advice: ['Continue moderate exercise (30 mins/day)', 'Maintain DASH diet plan', 'Review logs for blood sugar & BP'],
  notes: 'Discussed red-flag symptoms. Patient instructed to visit ER for persistent pain.',
};

const jsPdfFontMap: Record<TypographySettings['family'], string> = {
  Helvetica: 'helvetica',
  Times: 'times',
  Courier: 'courier',
  Arial: 'helvetica',
  Georgia: 'times',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const POINTS_TO_MM_RATIO = 25.4 / 72;

const pointsToMm = (value: number) => value * POINTS_TO_MM_RATIO;
const formatMm = (value: number) => Number(pointsToMm(value).toFixed(1));
const appendSuffixToFileName = (fileName: string, suffix: string) => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return `${fileName}${suffix}`;
  const base = fileName.slice(0, dotIndex);
  const extension = fileName.slice(dotIndex);
  return `${base}${suffix}${extension}`;
};

const isApproximately = (actual: number, expected: number, tolerance: number) => Math.abs(actual - expected) <= tolerance;
const isA4Size = (widthPt: number, heightPt: number) => {
  const shorter = Math.min(formatMm(widthPt), formatMm(heightPt));
  const longer = Math.max(formatMm(widthPt), formatMm(heightPt));
  return isApproximately(shorter, 210, 3) && isApproximately(longer, 297, 3);
};

const resolvePositiveNumber = (value: number | null | undefined, fallback: number) => (typeof value === 'number' && value > 0 ? value : fallback);
const isValidFontFamily = (value: string | null | undefined): value is TypographySettings['family'] => {
  if (!value) return false;
  return ['Helvetica', 'Times', 'Courier', 'Arial', 'Georgia'].includes(value);
};
const resolveFontWeight = (value: string | null | undefined, fallback: TypographySettings['weight']): TypographySettings['weight'] => {
  if (!value) return fallback;
  const normalized = value.toLowerCase();
  if (normalized === 'bold') return 'bold';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'regular') return 'regular';
  return fallback;
};

type A4CompatibilityResult = {
  file: File;
  wasConverted: boolean;
  pageSizeMm: { width: number; height: number };
  orientation: 'portrait' | 'landscape';
  originalPageSizeMm?: { width: number; height: number };
};

export const usePrescriptionDesigner = () => {
  const { settings, update } = usePrescriptionStore();
  const { toast } = useToast();
  const doctorId = useAuthStore((state) => state.doctorId);
  const hospitalId = useAuthStore((state) => state.hospitalId);
  const userId = useAuthStore((state) => state.userId);
  const { layoutSettings, refetchLayoutSettings } = usePrescriptionLayoutSettings();

  const [templateMeta, setTemplateMeta] = useState<TemplateMetadata | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [overflowStrategy, setOverflowStrategy] = useState<'reuse-template' | 'blank'>('reuse-template');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUploadSuccessOpen, setTemplateUploadSuccessOpen] = useState(false);
  const [templateUploadSuccessMessage, setTemplateUploadSuccessMessage] = useState('Template uploaded successfully.');
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutSaveSuccessOpen, setLayoutSaveSuccessOpen] = useState(false);
  const [layoutSaveSuccessMessage, setLayoutSaveSuccessMessage] = useState('Layout settings saved successfully.');
  const lastServerTemplateUriRef = useRef<string | null>(null);
  const lastAppliedLayoutSettingsRef = useRef<string | null>(null);

  const layoutMargins: MarginConfig = settings.page?.margin ?? defaultMargins;
  const orientation: 'portrait' | 'landscape' = settings.page?.orientation ?? 'portrait';

  const typography: TypographySettings = {
    family: (settings.font?.family as TypographySettings['family']) ?? 'Helvetica',
    size: settings.font?.size ?? 12,
    weight: (settings.font?.weight as TypographySettings['weight']) ?? 'regular',
    color: settings.font?.color ?? '#111827',
  };

  const previewData: PrescriptionDesignerData = defaultDesignerData;

  const updateMargins = useCallback((margins: MarginConfig) => {
    update({
      page: {
        ...settings.page,
        margin: margins,
      },
      pdf: {
        ...settings.pdf,
        margin: margins,
      },
    });
  }, [settings.page, settings.pdf, update]);

  const updateTypography = useCallback((next: Partial<TypographySettings>) => {
    update({
      font: {
        ...typography,
        ...next,
      },
    });
  }, [typography, update]);

  const layoutSettingsSignature = layoutSettings
    ? JSON.stringify({
        headerHeight: layoutSettings.headerHeight ?? null,
        footerHeight: layoutSettings.footerHeight ?? null,
        contentLeftMargin: layoutSettings.contentLeftMargin ?? null,
        contentRightMargin: layoutSettings.contentRightMargin ?? null,
        overFlowPage: layoutSettings.overFlowPage ?? null,
        fontFamily: layoutSettings.fontFamily ?? null,
        fontSize: layoutSettings.fontSize ?? null,
        fontWeight: layoutSettings.fontWeight ?? null,
        textColour: layoutSettings.textColour ?? null,
      })
    : null;

  useEffect(() => {
    if (!layoutSettings || !layoutSettingsSignature) return;
    if (lastAppliedLayoutSettingsRef.current === layoutSettingsSignature) return;

    lastAppliedLayoutSettingsRef.current = layoutSettingsSignature;

    const nextMargins: MarginConfig = {
      top: resolvePositiveNumber(layoutSettings.headerHeight, defaultMargins.top),
      bottom: resolvePositiveNumber(layoutSettings.footerHeight, defaultMargins.bottom),
      left: resolvePositiveNumber(layoutSettings.contentLeftMargin, defaultMargins.left),
      right: resolvePositiveNumber(layoutSettings.contentRightMargin, defaultMargins.right),
    };

    updateMargins(nextMargins);

    const nextOverflow = layoutSettings.overFlowPage ? 'reuse-template' : 'blank';
    setOverflowStrategy(nextOverflow);

    const resolvedFamily = isValidFontFamily(layoutSettings.fontFamily) ? layoutSettings.fontFamily : typography.family;
    const resolvedSize = resolvePositiveNumber(layoutSettings.fontSize, typography.size);
    const resolvedWeight = resolveFontWeight(layoutSettings.fontWeight, typography.weight);
    const resolvedColor = layoutSettings.textColour && layoutSettings.textColour.trim().length > 0 ? layoutSettings.textColour : typography.color;

    updateTypography({
      family: resolvedFamily,
      size: resolvedSize,
      weight: resolvedWeight,
      color: resolvedColor,
    });
  }, [layoutSettings, layoutSettingsSignature, typography, updateMargins, setOverflowStrategy, updateTypography]);

  const ensureA4Compatibility = useCallback(async (file: File): Promise<A4CompatibilityResult> => {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
      throw new Error('Uploaded PDF does not contain any pages.');
    }

    const firstPage = pages[0];
    const firstWidthPt = firstPage.getWidth();
    const firstHeightPt = firstPage.getHeight();
    const originalOrientation: 'portrait' | 'landscape' = firstWidthPt > firstHeightPt ? 'landscape' : 'portrait';
    const originalSizeMm = {
      width: formatMm(firstWidthPt),
      height: formatMm(firstHeightPt),
    };

    const isAlreadyA4 = pages.every((page) => isA4Size(page.getWidth(), page.getHeight()));

    if (isAlreadyA4) {
      toast({
        title: 'A4 compatible',
        description: 'Uploaded PDF already matches A4 dimensions.',
      });

      return {
        file,
        wasConverted: false,
        pageSizeMm: originalSizeMm,
        orientation: originalOrientation,
      };
    }

    const targetDoc = await PDFDocument.create();
    const embeddedPages = await targetDoc.embedPdf(buffer, pages.map((_, index) => index));

    embeddedPages.forEach((embeddedPage, index) => {
      const sourceWidthPt = pages[index].getWidth();
      const sourceHeightPt = pages[index].getHeight();
      const sourceOrientation: 'portrait' | 'landscape' = sourceWidthPt > sourceHeightPt ? 'landscape' : 'portrait';
      const targetWidthPt = sourceOrientation === 'landscape' ? A4_HEIGHT_PT : A4_WIDTH_PT;
      const targetHeightPt = sourceOrientation === 'landscape' ? A4_WIDTH_PT : A4_HEIGHT_PT;
      const newPage = targetDoc.addPage([targetWidthPt, targetHeightPt]);

      const scale = Math.min(targetWidthPt / sourceWidthPt, targetHeightPt / sourceHeightPt);
      const scaledWidth = sourceWidthPt * scale;
      const scaledHeight = sourceHeightPt * scale;
      const x = (targetWidthPt - scaledWidth) / 2;
      const y = (targetHeightPt - scaledHeight) / 2;

      newPage.drawPage(embeddedPage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    });

    const convertedBytes = await targetDoc.save();
    const convertedBuffer = new ArrayBuffer(convertedBytes.byteLength);
    new Uint8Array(convertedBuffer).set(convertedBytes);
    const convertedFile = new File([convertedBuffer], appendSuffixToFileName(file.name, '-a4'), {
      type: 'application/pdf',
    });

    toast({
      title: 'Converted to A4',
      description: 'We created an A4-safe copy automatically for preview.',
    });

    const finalOrientation: 'portrait' | 'landscape' = originalOrientation;
    const widthMm = finalOrientation === 'landscape' ? 297 : 210;
    const heightMm = finalOrientation === 'landscape' ? 210 : 297;

    return {
      file: convertedFile,
      wasConverted: true,
      pageSizeMm: { width: widthMm, height: heightMm },
      orientation: finalOrientation,
      originalPageSizeMm: originalSizeMm,
    };
  }, [toast]);

  const uploadTemplateToServer = useCallback(async (originalFile: File) => {
    if (!doctorId || !userId) {
      toast({
        title: 'Missing information',
        description: 'Doctor or user details are unavailable. Please reload and try again.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await prescriptionFieldConfigApi.uploadTemplate({
        file: originalFile,
        doctorId,
        hospitalId: hospitalId ?? undefined,
        loggedInUserId: userId,
      });
      return true;
    } catch (error) {
      console.error('Template upload failed', error);
      toast({
        title: 'Upload failed',
        description: 'We could not upload this template to the server. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [doctorId, hospitalId, toast, userId]);


  const revokePreviewUrl = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl, revokePreviewUrl]);

  useEffect(() => {
    const uri = layoutSettings?.uri;
    if (!uri) return;

    setPreviewUrl((currentUrl) => {
      if (currentUrl === uri) {
        return currentUrl;
      }
      revokePreviewUrl(currentUrl);
      return uri;
    });

    if (uri === lastServerTemplateUriRef.current) return;

    const fetchUrl = resolveTemplateFetchUrl(uri);
    if (!fetchUrl) return;

    let isCancelled = false;

    const hydrateTemplateFromServer = async () => {
      try {
        const response = await fetch(fetchUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.status}`);
        }
        const blob = await response.blob();
        if (isCancelled) return;

        const arrayBuffer = await blob.arrayBuffer();
        if (isCancelled) return;

        const pdfDoc = await PDFDocument.load(arrayBuffer);
        if (isCancelled) return;

        const firstPage = pdfDoc.getPages()[0];
        const widthPt = firstPage?.getWidth() ?? A4_WIDTH_PT;
        const heightPt = firstPage?.getHeight() ?? A4_HEIGHT_PT;
        const orientationHint: 'portrait' | 'landscape' = widthPt > heightPt ? 'landscape' : 'portrait';

        const deriveMargin = () => ({
          top: resolvePositiveNumber(layoutSettings?.headerHeight, defaultMargins.top),
          bottom: resolvePositiveNumber(layoutSettings?.footerHeight, defaultMargins.bottom),
          left: resolvePositiveNumber(layoutSettings?.contentLeftMargin, defaultMargins.left),
          right: resolvePositiveNumber(layoutSettings?.contentRightMargin, defaultMargins.right),
        });

        const normalizedMargins = deriveMargin();
        const fileNameCandidate = uri.split('?')[0]?.split('/')?.pop() || 'prescription-template.pdf';
        let sanitizedFileName = fileNameCandidate;
        try {
          sanitizedFileName = decodeURIComponent(fileNameCandidate);
        } catch (decodeError) {
          console.warn('Unable to decode template filename from URI', decodeError);
        }
        const mimeType = blob.type && blob.type.length > 0 ? blob.type : 'application/pdf';
        const serverFile = new File([arrayBuffer], sanitizedFileName, { type: mimeType });

        setTemplateFile(serverFile);
        setTemplateMeta({
          fileName: sanitizedFileName,
          fileSizeKb: Math.max(1, Math.round(serverFile.size / 1024)),
          pageSize: {
            width: Number(formatMm(widthPt)),
            height: Number(formatMm(heightPt)),
            unit: 'mm',
          },
          orientationHint,
          recommendedMargins: normalizedMargins,
          trimBox: normalizedMargins,
          cropBox: normalizedMargins,
          analyzedAt: new Date().toISOString(),
          wasConverted: false,
          originalPageSize: undefined,
        });
        lastServerTemplateUriRef.current = uri;
      } catch (error) {
        console.error('Failed to hydrate template from layout settings', error);
      }
    };

    hydrateTemplateFromServer();

    return () => {
      isCancelled = true;
    };
  }, [layoutSettings?.uri, layoutSettings?.headerHeight, layoutSettings?.footerHeight, layoutSettings?.contentLeftMargin, layoutSettings?.contentRightMargin, revokePreviewUrl]);

  useEffect(() => {
    if (!layoutSettings) return;
    const normalizedMargins = {
      top: resolvePositiveNumber(layoutSettings.headerHeight, defaultMargins.top),
      bottom: resolvePositiveNumber(layoutSettings.footerHeight, defaultMargins.bottom),
      left: resolvePositiveNumber(layoutSettings.contentLeftMargin, defaultMargins.left),
      right: resolvePositiveNumber(layoutSettings.contentRightMargin, defaultMargins.right),
    };

    setTemplateMeta((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        recommendedMargins: normalizedMargins,
        trimBox: normalizedMargins,
        cropBox: normalizedMargins,
      };
    });
  }, [layoutSettings?.headerHeight, layoutSettings?.footerHeight, layoutSettings?.contentLeftMargin, layoutSettings?.contentRightMargin]);
  const handleTemplateUpload = useCallback(async (file: File) => {
    setIsAnalyzingTemplate(true);
    setTemplateError(null);

    try {
      toast({
        title: 'Validating template',
        description: 'Ensuring the uploaded PDF is A4 ready...',
      });

      const { file: compatibleFile, wasConverted, pageSizeMm, orientation: derivedOrientation, originalPageSizeMm } = await ensureA4Compatibility(file);

      const metaPageSize = {
        width: Number(pageSizeMm.width.toFixed(1)),
        height: Number(pageSizeMm.height.toFixed(1)),
        unit: 'mm' as const,
      };

      const meta: TemplateMetadata = {
        fileName: compatibleFile.name,
        fileSizeKb: Math.round(compatibleFile.size / 1024),
        pageSize: metaPageSize,
        orientationHint: derivedOrientation,
        recommendedMargins: {
          top: clamp(layoutMargins.top, 10, 40),
          right: clamp(layoutMargins.right, 10, 40),
          bottom: clamp(layoutMargins.bottom, 10, 40),
          left: clamp(layoutMargins.left, 10, 40),
        },
        trimBox: layoutMargins,
        cropBox: layoutMargins,
        analyzedAt: new Date().toISOString(),
        wasConverted,
        originalPageSize: originalPageSizeMm
          ? { width: Number(originalPageSizeMm.width.toFixed(1)), height: Number(originalPageSizeMm.height.toFixed(1)), unit: 'mm' }
          : undefined,
      };
      setTemplateMeta(meta);
      setTemplateFile(compatibleFile);

      const objectUrl = URL.createObjectURL(compatibleFile);
      revokePreviewUrl(previewUrl);
      setPreviewUrl(objectUrl);

      const didUpload = await uploadTemplateToServer(compatibleFile);
      if (didUpload) {
        setTemplateUploadSuccessMessage('Template uploaded successfully.');
        setTemplateUploadSuccessOpen(true);
        refetchLayoutSettings();
      }

      toast({
        title: wasConverted ? 'Converted template ready' : 'Template ready',
        description: wasConverted
          ? 'We converted your file to an A4-safe version before previewing.'
          : 'PDF uploaded. Apply recommended margins to align content.',
      });
    } catch (error) {
      console.error('Template analysis failed', error);
      setTemplateError('Unable to analyze PDF template. Please try another file.');
    } finally {
      setIsAnalyzingTemplate(false);
    }
  }, [ensureA4Compatibility, layoutMargins, previewUrl, refetchLayoutSettings, revokePreviewUrl, toast, uploadTemplateToServer]);

  const generatePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    try {
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });

      const fontStyle = typography.weight === 'bold' ? 'bold' : typography.weight === 'medium' ? 'bold' : 'normal';
      doc.setFont(jsPdfFontMap[typography.family] ?? 'helvetica', fontStyle);
      doc.setFontSize(typography.size);

      const startX = layoutMargins.left;
      let cursorY = layoutMargins.top;

      const line = (label: string, value: string) => {
        doc.text(`${label}: ${value}`, startX, cursorY);
        cursorY += 6;
      };

      line('Patient', `${previewData.patient.name} (${previewData.patient.age}/${previewData.patient.gender})`);
      line('Visit date', new Date(previewData.visit.date).toLocaleDateString());
      line('Doctor', `${previewData.doctor.name} - ${previewData.doctor.specialization}`);

      cursorY += 4;
      doc.text(`Vitals: BP ${previewData.vitals.bloodPressure} | Pulse ${previewData.vitals.pulse} | Temp ${previewData.vitals.temperature} | SpO2 ${previewData.vitals.spo2}`, startX, cursorY);
      cursorY += 8;

      doc.text('Chief complaints:', startX, cursorY, { maxWidth: 170 });
      cursorY += 6;
      previewData.chiefComplaints.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${item}`, startX + 4, cursorY, { maxWidth: 170 });
        cursorY += 6;
      });

      cursorY += 4;
      doc.text('Medicines:', startX, cursorY);
      cursorY += 6;
      previewData.medicines.forEach((med, idx) => {
        doc.text(`${idx + 1}. ${med.name} - ${med.dose} - ${med.frequency} - ${med.duration}`, startX + 4, cursorY, { maxWidth: 170 });
        cursorY += 6;
        if (med.notes) {
          doc.setFontSize(typography.size - 2);
          doc.text(`=> ${med.notes}`, startX + 8, cursorY, { maxWidth: 170 });
          doc.setFontSize(typography.size);
          cursorY += 6;
        }
      });

      cursorY += 4;
      doc.text('Advice:', startX, cursorY);
      cursorY += 6;
      previewData.advice.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${item}`, startX + 4, cursorY, { maxWidth: 170 });
        cursorY += 6;
      });

      cursorY += 4;
      doc.text(`Notes: ${previewData.notes}`, startX, cursorY, { maxWidth: 170 });
      cursorY += 6;

      const blob = doc.output('blob');
      const nextUrl = URL.createObjectURL(blob);
      revokePreviewUrl(previewUrl);
      setPreviewUrl(nextUrl);

      toast({
        title: 'Preview generated',
        description: 'A lightweight prescription preview is ready.',
      });
    } catch (error) {
      console.error('Failed to generate preview', error);
      toast({
        title: 'Preview failed',
        description: 'Unable to generate the prescription preview. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [layoutMargins.left, layoutMargins.top, orientation, previewUrl, revokePreviewUrl, toast, typography.family, typography.size, typography.weight]);

  const openPreviewInNewTab = useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener');
  }, [previewUrl]);

  const saveLayoutSettings = useCallback(async () => {
    if (!doctorId || !userId) {
      toast({
        title: 'Missing information',
        description: 'Doctor or user details are unavailable. Please reload and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingLayout(true);
    try {
      await prescriptionFieldConfigApi.updatePrescriptionSettings({
        hospitalId: hospitalId ?? undefined,
        doctorId,
        headerHeight: layoutMargins.top,
        footerHeight: layoutMargins.bottom,
        contentLeftMargin: layoutMargins.left,
        contentRightMargin: layoutMargins.right,
        overFlowPage: overflowStrategy === 'reuse-template',
        fontFamily: typography.family,
        fontSize: typography.size,
        fontWeight: typography.weight,
        textColour: typography.color,
        loggedInUserId: userId,
      });

      toast({
        title: 'Layout saved',
        description: 'Prescription layout settings updated successfully.',
      });

      setLayoutSaveSuccessMessage('Prescription layout settings updated successfully.');
      setLayoutSaveSuccessOpen(true);

      await refetchLayoutSettings();
    } catch (error) {
      console.error('Failed to save layout settings', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save layout settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLayout(false);
    }
  }, [doctorId, hospitalId, layoutMargins.bottom, layoutMargins.left, layoutMargins.right, layoutMargins.top, overflowStrategy, refetchLayoutSettings, toast, typography.color, typography.family, typography.size, typography.weight, userId]);

  const serverTemplateUri = layoutSettings?.uri ?? null;

  return {
    templateMeta,
    templateError,
    isAnalyzingTemplate,
    handleTemplateUpload,
    layoutMargins,
    updateMargins,
    typography,
    updateTypography,
    generatePreview,
    previewUrl,
    isGeneratingPreview,
    zoom,
    setZoom,
    openPreviewInNewTab,
    overflowStrategy,
    setOverflowStrategy,
    templateFile,
    templateUploadSuccessOpen,
    setTemplateUploadSuccessOpen,
    templateUploadSuccessMessage,
    layoutSaveSuccessOpen,
    setLayoutSaveSuccessOpen,
    layoutSaveSuccessMessage,
    refetchLayoutSettings,
    serverTemplateUri,
    serverLayoutSettings: layoutSettings,
    saveLayoutSettings,
    isSavingLayout,
  };
};
