import { useCallback, useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { usePrescriptionStore } from '@/store/prescription';
import { useToast } from '@/hooks/use-toast';

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

  const [templateMeta, setTemplateMeta] = useState<TemplateMetadata | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [overflowStrategy, setOverflowStrategy] = useState<'reuse-template' | 'blank'>('reuse-template');
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const layoutMargins: MarginConfig = settings.page?.margin ?? defaultMargins;
  const orientation: 'portrait' | 'landscape' = settings.page?.orientation ?? 'portrait';

  const typography: TypographySettings = {
    family: (settings.font?.family as TypographySettings['family']) ?? 'Helvetica',
    size: settings.font?.size ?? 12,
    weight: (settings.font?.weight as TypographySettings['weight']) ?? 'regular',
    color: settings.font?.color ?? '#111827',
  };

  const previewData: PrescriptionDesignerData = defaultDesignerData;

  const applyRecommendedMargins = useCallback(() => {
    if (!templateMeta) return;
    update({
      page: {
        ...settings.page,
        margin: templateMeta.recommendedMargins,
      },
      pdf: {
        ...settings.pdf,
        margin: templateMeta.recommendedMargins,
      },
    });
    toast({
      title: 'Margins applied',
      description: 'Template-derived margins copied to layout controls.',
    });
  }, [settings.page, settings.pdf, templateMeta, toast, update]);

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


  const revokePreviewUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl, revokePreviewUrl]);
  useEffect(() => () => {
    if (templatePreviewUrl) {
      URL.revokeObjectURL(templatePreviewUrl);
    }
  }, [templatePreviewUrl]);

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

      const templateDisplayUrl = URL.createObjectURL(compatibleFile);
      setTemplatePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return templateDisplayUrl;
      });

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
  }, [ensureA4Compatibility, layoutMargins, previewUrl, revokePreviewUrl, toast]);

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

  return {
    templateMeta,
    templateError,
    isAnalyzingTemplate,
    handleTemplateUpload,
    applyRecommendedMargins,
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
    templatePreviewUrl,
    templateFile,
  };
};
