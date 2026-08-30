import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { pathologyService, PathologyReportTemplate, PathologyLetterheadMode } from '../services/pathologyService';
import { resolveTemplateFetchUrl } from '@/features/prescription/utils/templateFetch';
import { generatePathologyReportPdf } from '../utils/generatePathologyReportPdf';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TypographySettings {
  family: 'Helvetica' | 'Times' | 'Courier' | 'Arial' | 'Georgia';
  size: number;
  weight: 'regular' | 'medium' | 'bold';
  color: string;
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

const defaultMargins: MarginConfig = { top: 20, right: 20, bottom: 20, left: 20 };

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

export const useReportDesigner = (templateId?: string, hospitalId?: string) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const userId = useAuthStore(state => state.userId);

  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [reportTemplate, setReportTemplate] = useState<PathologyReportTemplate | null>(null);

  const [layoutMargins, setLayoutMargins] = useState<MarginConfig>(defaultMargins);
  const [typography, setTypography] = useState<TypographySettings>({
    family: 'Helvetica',
    size: 10,
    weight: 'regular',
    color: '#000000',
  });
  
  const [overflowStrategy, setOverflowStrategy] = useState<'reuse-template' | 'blank'>('reuse-template');

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateMeta, setTemplateMeta] = useState<TemplateMetadata | null>(null);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  
  const [templateUploadSuccessOpen, setTemplateUploadSuccessOpen] = useState(false);
  const [templateUploadSuccessMessage, setTemplateUploadSuccessMessage] = useState('');
  const [layoutSaveSuccessOpen, setLayoutSaveSuccessOpen] = useState(false);
  const [layoutSaveSuccessMessage, setLayoutSaveSuccessMessage] = useState('');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  const lastServerTemplateUriRef = useRef<string | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Fetch the template details from the API
  const refetchTemplate = useCallback(async () => {
    if (!templateId || !hospitalId) {
      setReportTemplate(null);
      return;
    }
    
    setIsLoadingTemplate(true);
    try {
      // In the current pathologyService, there is no direct getTemplateById. We fetch all and find it.
      const templates = await pathologyService.getTemplates(hospitalId);
      const template = templates.find(t => t.templateId === templateId);
      
      if (template) {
        setReportTemplate(template);
        
        // Parse layoutJson
        if (template.layoutJson && template.layoutJson !== '{}') {
          try {
            const parsed = JSON.parse(template.layoutJson);
            if (parsed.margins) {
               setLayoutMargins({
                 top: parsed.margins.top ?? 20,
                 right: parsed.margins.right ?? 20,
                 bottom: parsed.margins.bottom ?? 20,
                 left: parsed.margins.left ?? 20
               });
            }
            if (parsed.typography) {
               setTypography({
                 family: parsed.typography.family ?? 'Helvetica',
                 size: parsed.typography.size ?? 10,
                 weight: parsed.typography.weight ?? 'regular',
                 color: parsed.typography.color ?? '#000000'
               });
            }
            if (parsed.overflowStrategy) {
               setOverflowStrategy(parsed.overflowStrategy);
            }
          } catch (e) {
            console.error("Failed to parse layoutJson", e);
          }
        }
      } else {
        setReportTemplate(null);
      }
    } catch (error) {
      console.error("Failed to fetch template details", error);
    } finally {
      setIsLoadingTemplate(false);
    }
  }, [hospitalId, templateId]);

  useEffect(() => {
    refetchTemplate();
  }, [refetchTemplate]);

  const updateMargins = useCallback((newMargins: Partial<MarginConfig>) => {
    setLayoutMargins((prev) => ({
      top: clamp(newMargins.top ?? prev.top, 0, 500),
      right: clamp(newMargins.right ?? prev.right, 0, 200),
      bottom: clamp(newMargins.bottom ?? prev.bottom, 0, 500),
      left: clamp(newMargins.left ?? prev.left, 0, 200),
    }));
  }, []);

  const updateTypography = useCallback((newTypography: Partial<TypographySettings>) => {
    setTypography((prev) => ({ ...prev, ...newTypography }));
  }, []);

  const ensureA4Dimensions = useCallback(async (file: File): Promise<any> => {
    if (file.type !== 'application/pdf') return null;
    
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      if (pages.length === 0) throw new Error('PDF has no pages');
      
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      const originalOrientation = width > height ? 'landscape' : 'portrait';
      const originalSizeMm = { width: formatMm(width), height: formatMm(height) };

      if (isA4Size(width, height)) {
        return {
          file,
          wasConverted: false,
          pageSizeMm: originalSizeMm,
          orientation: originalOrientation,
          originalPageSizeMm: originalSizeMm
        };
      }

      // Convert to A4 (simplistic conversion)
      const targetDoc = await PDFDocument.create();
      const [embeddedPage] = await targetDoc.embedPdf(buffer, [0]);
      
      const targetWidthPt = originalOrientation === 'landscape' ? A4_HEIGHT_PT : A4_WIDTH_PT;
      const targetHeightPt = originalOrientation === 'landscape' ? A4_WIDTH_PT : A4_HEIGHT_PT;
      const newPage = targetDoc.addPage([targetWidthPt, targetHeightPt]);

      const scale = Math.min(targetWidthPt / width, targetHeightPt / height);
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const x = (targetWidthPt - scaledWidth) / 2;
      const y = (targetHeightPt - scaledHeight) / 2;

      newPage.drawPage(embeddedPage, { x, y, width: scaledWidth, height: scaledHeight });
      
      const convertedBytes = await targetDoc.save();
      const convertedBuffer = new ArrayBuffer(convertedBytes.byteLength);
      new Uint8Array(convertedBuffer).set(convertedBytes);
      const convertedFile = new File([convertedBuffer], appendSuffixToFileName(file.name, '-a4'), { type: 'application/pdf' });

      toast({
        title: 'Adjusted to A4',
        description: 'Template resized to standard A4.',
      });

      return {
        file: convertedFile,
        wasConverted: true,
        pageSizeMm: { width: originalOrientation === 'landscape' ? 297 : 210, height: originalOrientation === 'landscape' ? 210 : 297 },
        orientation: originalOrientation,
        originalPageSizeMm: originalSizeMm,
      };
    } catch (error) {
      console.error("PDF dimension check failed", error);
      return null;
    }
  }, [toast]);

  const uploadTemplateToServer = useCallback(async (originalFile: File) => {
    if (!templateId || !hospitalId || !userId) {
      toast({ title: 'Missing information', description: 'Template or hospital details are unavailable.', variant: 'destructive' });
      return false;
    }

    try {
      await pathologyService.uploadTemplate(hospitalId, {
        file: originalFile,
        templateId,
        hospitalId,
        loggedInUserId: userId,
      });
      return true;
    } catch (error) {
      console.error('Template upload failed', error);
      toast({ title: 'Upload Failed', description: 'Could not upload the template.', variant: 'destructive' });
      return false;
    }
  }, [hospitalId, templateId, toast, userId]);

  const handleTemplateUpload = useCallback(async (file: File) => {
    setTemplateError(null);
    setIsAnalyzingTemplate(true);
    setTemplateFile(file);

    try {
      let finalFile = file;
      if (file.type === 'application/pdf') {
        const compatibility = await ensureA4Dimensions(file);
        if (compatibility) {
           finalFile = compatibility.file;
           setOrientation(compatibility.orientation);
        }
      }
      
      const uploadSuccess = await uploadTemplateToServer(finalFile);
      if (uploadSuccess) {
         setTemplateUploadSuccessMessage('Template uploaded successfully.');
         setTemplateUploadSuccessOpen(true);
         await refetchTemplate();
      }
    } catch (e: any) {
      setTemplateError(e.message || 'An error occurred during template processing');
      setTemplateFile(null);
    } finally {
      setIsAnalyzingTemplate(false);
    }
  }, [ensureA4Dimensions, uploadTemplateToServer, refetchTemplate]);

  const revokePreviewUrl = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl, revokePreviewUrl]);

  useEffect(() => {
    const uri = reportTemplate?.headerBlobPath;
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

    fetch(fetchUrl, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (isCancelled) return;
        const localUrl = URL.createObjectURL(blob);
        setPreviewUrl(localUrl);
        lastServerTemplateUriRef.current = uri;
      })
      .catch((err) => {
        console.error('Failed to pre-fetch report template preview blob', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [reportTemplate?.headerBlobPath, revokePreviewUrl]);

  // Renders through the exact same function that produces the real, signed report PDF (just fed
  // mock sample data), so "Live Preview" always reflects what a real report will actually look
  // like -- including the currently-edited, not-yet-saved margins/typography/mode -- rather than
  // a separate approximation that can drift from the real renderer.
  const generatePreview = useCallback(async (letterheadMode: PathologyLetterheadMode) => {
    setIsGeneratingPreview(true);
    try {
      const hospital = hospitalId ? await hospitalApi.getHospitalById(hospitalId).catch(() => null) : null;
      const now = new Date().toISOString();

      const blob = await generatePathologyReportPdf({
        hospitalName: hospital?.name ?? 'Hospital',
        reportNo: 'PREVIEW-0000',
        orderNo: 'PREVIEW-0000',
        orderDate: now,
        patientName: 'Sample Patient',
        patientId: 'PTID00000000',
        patientAgeYears: 35,
        patientGender: 'M',
        lines: [
          {
            testName: 'Complete Blood Count (CBC)',
            testCode: 'HEM-CBC',
            parameters: [
              { name: 'Hemoglobin (Hb)', unit: 'g/dL', value: '14.2', flag: 'NORMAL', normalRangeLabel: 'Normal: 13.5 - 17.5' },
              { name: 'Total WBC Count (TLC)', unit: '/µL', value: '7200', flag: 'NORMAL', normalRangeLabel: 'Normal: 4000 - 11000' },
              { name: 'Platelet Count', unit: '/µL', value: '95000', flag: 'LOW', normalRangeLabel: 'Normal: 150000 - 450000' },
            ],
            interpretation: 'Sample interpretation text for preview purposes.',
          },
        ],
        technicianName: 'Sample Technician',
        technicianRegNo: 'DMLT-00000',
        technicianSignedAt: now,
        pathologistName: 'Dr. Sample Pathologist',
        pathologistRegNo: 'MCI-00000',
        approvedAt: now,
        verifyUrl: `${window.location.origin}/verify/report/preview`,
        letterheadMode,
        letterheadTemplateUrl: reportTemplate?.headerBlobPath ?? null,
        letterheadMargins: layoutMargins,
        hospitalBranding: hospital && {
          name: hospital.name,
          location: hospital.location,
          city: hospital.city,
          state: hospital.state,
          pincode: hospital.pincode,
          contact: hospital.contact,
          alternateContact: hospital.alternateContact,
          email: hospital.email,
          website: hospital.website,
          registrationNumber: hospital.registrationNumber,
          nabhNumber: hospital.nabhNumber,
        },
      });

      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        revokePreviewUrl(current);
        return url;
      });
      return url;
    } catch (error) {
      console.error('Failed to generate preview', error);
      toast({ title: 'Preview Error', description: 'Failed to generate a preview', variant: 'destructive' });
      return null;
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [toast, hospitalId, reportTemplate?.headerBlobPath, layoutMargins, revokePreviewUrl]);

  const openPreviewInNewTab = useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener');
  }, [previewUrl]);

  const saveLayoutSettings = useCallback(async () => {
    if (!templateId || !hospitalId || !reportTemplate) {
      toast({ title: 'Missing information', description: 'Cannot save layout.', variant: 'destructive' });
      return;
    }

    setIsSavingLayout(true);
    try {
      
      const layoutJsonObj = {
         margins: layoutMargins,
         typography,
         overflowStrategy
      };
      
      await pathologyService.updateTemplate(hospitalId, templateId, {
        ...reportTemplate,
        layoutJson: JSON.stringify(layoutJsonObj)
      });

      toast({ title: 'Layout Saved', description: 'Report letterhead layout has been updated.' });
      setLayoutSaveSuccessMessage('Report layout settings saved.');
      setLayoutSaveSuccessOpen(true);
      
      await refetchTemplate();
    } catch (error) {
      console.error('Failed to save layout settings', error);
      toast({ title: 'Save Failed', description: 'Could not save layout settings.', variant: 'destructive' });
    } finally {
      setIsSavingLayout(false);
    }
  }, [hospitalId, templateId, reportTemplate, layoutMargins, typography, overflowStrategy, refetchTemplate, toast]);

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
    refetchTemplate,
    serverTemplateUri: reportTemplate?.headerBlobPath ?? null,
    serverLayoutSettings: reportTemplate?.layoutJson ? JSON.parse(reportTemplate.layoutJson) : null,
    saveLayoutSettings,
    isSavingLayout,
    isLoadingTemplate,
    reportTemplate
  };
};
