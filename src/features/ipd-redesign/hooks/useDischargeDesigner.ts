import { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { dischargeSettingsApi, type DischargeSettings } from '../services/dischargeSettingsApi';

// Mirrors MarginConfig/TemplateMetadata/TypographySettings from usePrescriptionDesigner.ts.
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

const defaultMargins: MarginConfig = { top: 20, right: 20, bottom: 20, left: 20 };
const defaultTypography: TypographySettings = { family: 'Helvetica', size: 11, weight: 'regular', color: '#111827' };

// Sample data for the design-time mock preview only — never used for the real print (that reads
// the actual signed DischargeSummary via dischargePreviewRenderer.ts).
const sampleDischargeData = {
    patientName: 'John Doe (PT-000458)',
    admissionNo: 'ADM-2026-00042',
    admittingDiagnosis: 'Acute appendicitis',
    finalDiagnosis: 'Acute appendicitis, post laparoscopic appendectomy',
    conditionAtDischarge: 'STABLE',
    courseInHospital: 'Patient underwent uncomplicated laparoscopic appendectomy on day of admission. Post-operative recovery uneventful, afebrile throughout, tolerating oral diet by day 2.',
    dischargeMedications: 'Tab. Amoxiclav 625mg BD x 5 days, Tab. Paracetamol 650mg SOS for pain',
    followUpInstructions: 'Review in surgical OPD after 7 days for suture removal.',
};

const jsPdfFontMap: Record<TypographySettings['family'], string> = {
    Helvetica: 'helvetica',
    Times: 'times',
    Courier: 'courier',
    Arial: 'helvetica',
    Georgia: 'times',
};

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const POINTS_TO_MM_RATIO = 25.4 / 72;
const pointsToMm = (value: number) => value * POINTS_TO_MM_RATIO;
const formatMm = (value: number) => Number(pointsToMm(value).toFixed(1));
const isApproximately = (actual: number, expected: number, tolerance: number) => Math.abs(actual - expected) <= tolerance;
const isA4Size = (widthPt: number, heightPt: number) => {
    const shorter = Math.min(formatMm(widthPt), formatMm(heightPt));
    const longer = Math.max(formatMm(widthPt), formatMm(heightPt));
    return isApproximately(shorter, 210, 3) && isApproximately(longer, 297, 3);
};
const appendSuffixToFileName = (fileName: string, suffix: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return `${fileName}${suffix}`;
    return `${fileName.slice(0, dotIndex)}${suffix}${fileName.slice(dotIndex)}`;
};
const resolvePositiveNumber = (value: number | null | undefined, fallback: number) => (typeof value === 'number' && value > 0 ? value : fallback);

/**
 * Discharge-summary letterhead designer state: margins, typography, overflow strategy, template
 * upload + A4 normalization, and a watermarked mock preview. Mirrors usePrescriptionDesigner.ts,
 * simplified: no shared zustand store (this is the only Phase 1 consumer of this state) and no
 * i18n (plain English strings — Discharge doesn't need translated designer copy yet).
 */
export const useDischargeDesigner = (overrideDoctorId?: string, overrideHospitalId?: string) => {
    const { toast } = useToast();
    const { getDoctorId, getHospitalId } = useAuthStore();

    const doctorId = overrideDoctorId || getDoctorId() || '';
    const hospitalId = overrideHospitalId || getHospitalId() || '';

    const [serverSettings, setServerSettings] = useState<DischargeSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);

    const [margins, setMargins] = useState<MarginConfig>(defaultMargins);
    const [typography, setTypography] = useState<TypographySettings>(defaultTypography);
    const [overflowStrategy, setOverflowStrategy] = useState<'reuse-template' | 'blank'>('reuse-template');
    const [templateMeta, setTemplateMeta] = useState<TemplateMetadata | null>(null);
    const [templateError, setTemplateError] = useState<string | null>(null);
    const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
    const [templateFile, setTemplateFile] = useState<File | null>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    // Ref that always holds the *current* previewUrl so callbacks that close over it
    // can revoke the correct blob URL without a stale-closure bug.
    const previewUrlRef = useRef<string | null>(null);
    useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    const [isSavingLayout, setIsSavingLayout] = useState(false);
    const [templateUploadSuccessOpen, setTemplateUploadSuccessOpen] = useState(false);
    const [templateUploadSuccessMessage, setTemplateUploadSuccessMessage] = useState('Template uploaded successfully.');
    const [layoutSaveSuccessOpen, setLayoutSaveSuccessOpen] = useState(false);
    const [layoutSaveSuccessMessage, setLayoutSaveSuccessMessage] = useState('Layout settings saved successfully.');

    const hydratedForRef = useRef<string | null>(null);

    const refetchSettings = useCallback(async () => {
        if (!doctorId || !hospitalId) return;
        setIsLoadingSettings(true);
        try {
            const settings = await dischargeSettingsApi.getDischargeSettings(doctorId, hospitalId);
            setServerSettings(settings);
        } finally {
            setIsLoadingSettings(false);
        }
    }, [doctorId, hospitalId]);

    useEffect(() => { refetchSettings(); }, [refetchSettings]);

    // Hydrate local designer state from saved settings once per doctor+hospital.
    useEffect(() => {
        const key = `${doctorId}:${hospitalId}`;
        if (!serverSettings || hydratedForRef.current === key) return;
        hydratedForRef.current = key;

        setMargins({
            top: resolvePositiveNumber(serverSettings.headerHeight, defaultMargins.top),
            bottom: resolvePositiveNumber(serverSettings.footerHeight, defaultMargins.bottom),
            left: resolvePositiveNumber(serverSettings.contentLeftMargin, defaultMargins.left),
            right: resolvePositiveNumber(serverSettings.contentRightMargin, defaultMargins.right),
        });
        setOverflowStrategy(serverSettings.overFlowPage === false ? 'blank' : 'reuse-template');
        setTypography({
            family: (serverSettings.fontFamily as TypographySettings['family']) ?? defaultTypography.family,
            size: resolvePositiveNumber(serverSettings.fontSize, defaultTypography.size),
            weight: (serverSettings.fontWeight as TypographySettings['weight']) ?? defaultTypography.weight,
            color: serverSettings.textColour ?? defaultTypography.color,
        });

    }, [serverSettings, doctorId, hospitalId]);

    // Fetch the uploaded template PDF fresh whenever its URL changes (mirrors
    // usePrescriptionDesigner.ts's hydrateTemplateFromServer — presigned S3/MinIO URLs expire, so
    // this never caches the File itself, only re-fetches by the (server-refreshed) URL).
    useEffect(() => {
        const uri = serverSettings?.uri;
        if (!uri) return;
        let cancelled = false;
        dischargeSettingsApi.fetchTemplateFile(uri).then(file => {
            if (!cancelled && file) setTemplateFile(file);
        });
        return () => { cancelled = true; };
    }, [serverSettings?.uri]);

    // Reset per-doctor designer state when switching doctors (mirrors usePrescriptionDesigner.ts).
    useEffect(() => {
        setPreviewUrl(null);
        setTemplateFile(null);
        setTemplateMeta(null);
        setTemplateError(null);
        hydratedForRef.current = null;
    }, [doctorId, hospitalId]);

    const revokePreviewUrl = useCallback((url: string | null) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }, []);
    useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl, revokePreviewUrl]);

    const ensureA4Compatibility = useCallback(async (file: File) => {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        if (pages.length === 0) throw new Error('The uploaded file has no pages.');

        const firstPage = pages[0];
        const firstWidthPt = firstPage.getWidth();
        const firstHeightPt = firstPage.getHeight();
        const originalOrientation: 'portrait' | 'landscape' = firstWidthPt > firstHeightPt ? 'landscape' : 'portrait';
        const originalSizeMm = { width: formatMm(firstWidthPt), height: formatMm(firstHeightPt) };

        if (pages.every(p => isA4Size(p.getWidth(), p.getHeight()))) {
            return { file, wasConverted: false, pageSizeMm: originalSizeMm, orientation: originalOrientation };
        }

        const targetDoc = await PDFDocument.create();
        const embeddedPages = await targetDoc.embedPdf(buffer, pages.map((_, i) => i));
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
            newPage.drawPage(embeddedPage, { x: (targetWidthPt - scaledWidth) / 2, y: (targetHeightPt - scaledHeight) / 2, width: scaledWidth, height: scaledHeight });
        });

        const convertedBytes = await targetDoc.save();
        const convertedBuffer = new ArrayBuffer(convertedBytes.byteLength);
        new Uint8Array(convertedBuffer).set(convertedBytes);
        const convertedFile = new File([convertedBuffer], appendSuffixToFileName(file.name, '-a4'), { type: 'application/pdf' });

        const widthMm = originalOrientation === 'landscape' ? 297 : 210;
        const heightMm = originalOrientation === 'landscape' ? 210 : 297;
        return { file: convertedFile, wasConverted: true, pageSizeMm: { width: widthMm, height: heightMm }, orientation: originalOrientation, originalPageSizeMm: originalSizeMm };
    }, []);

    const handleTemplateUpload = useCallback(async (file: File) => {
        if (!doctorId || !hospitalId) {
            toast({ title: 'Select a doctor first', variant: 'destructive' });
            return;
        }
        setIsAnalyzingTemplate(true);
        setTemplateError(null);
        try {
            const { file: compatibleFile, wasConverted, pageSizeMm, orientation, originalPageSizeMm } = await ensureA4Compatibility(file);

            setTemplateMeta({
                fileName: compatibleFile.name,
                fileSizeKb: Math.round(compatibleFile.size / 1024),
                pageSize: { width: pageSizeMm.width, height: pageSizeMm.height, unit: 'mm' },
                orientationHint: orientation,
                recommendedMargins: margins,
                analyzedAt: new Date().toISOString(),
                wasConverted,
                originalPageSize: originalPageSizeMm ? { ...originalPageSizeMm, unit: 'mm' } : undefined,
            });
            setTemplateFile(compatibleFile);

            const objectUrl = URL.createObjectURL(compatibleFile);
            // Use the ref so we revoke the current URL, not the stale closure value.
            revokePreviewUrl(previewUrlRef.current);
            setPreviewUrl(objectUrl);

            await dischargeSettingsApi.uploadTemplate({ file: compatibleFile, doctorId, hospitalId });
            setTemplateUploadSuccessMessage(wasConverted ? 'Non-A4 upload converted to standard A4 and saved.' : 'Template uploaded successfully.');
            setTemplateUploadSuccessOpen(true);
            refetchSettings();
        } catch (error) {
            console.error('Discharge template analysis failed', error);
            setTemplateError('Could not read this PDF. Please try another file.');
        } finally {
            setIsAnalyzingTemplate(false);
        }
    }, [doctorId, hospitalId, ensureA4Compatibility, margins, revokePreviewUrl, refetchSettings, toast]);

    const generatePreview = useCallback(async () => {
        setIsGeneratingPreview(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const fontStyle = typography.weight === 'regular' ? 'normal' : 'bold';
            doc.setFont(jsPdfFontMap[typography.family] ?? 'helvetica', fontStyle);
            doc.setFontSize(typography.size);

            if (!templateFile) {
                doc.setTextColor(230, 230, 230);
                doc.setFontSize(50);
                doc.text('SAMPLE', 105, 140, { align: 'center', angle: 315 });
                doc.setTextColor(typography.color);
                doc.setFontSize(typography.size);
            }

            const startX = margins.left;
            let cursorY = margins.top;
            const writeLine = (text: string) => { doc.text(text, startX, cursorY, { maxWidth: 210 - margins.left - margins.right }); cursorY += 6; };

            writeLine(`Patient: ${sampleDischargeData.patientName}`);
            writeLine(`Admission No: ${sampleDischargeData.admissionNo}`);
            cursorY += 4;
            writeLine(`Admitting Diagnosis: ${sampleDischargeData.admittingDiagnosis}`);
            writeLine(`Final Diagnosis: ${sampleDischargeData.finalDiagnosis}`);
            writeLine(`Condition at Discharge: ${sampleDischargeData.conditionAtDischarge}`);
            cursorY += 4;
            writeLine('Course in Hospital:');
            writeLine(sampleDischargeData.courseInHospital);
            cursorY += 4;
            writeLine('Discharge Medications:');
            writeLine(sampleDischargeData.dischargeMedications);
            cursorY += 4;
            writeLine('Follow-up Instructions:');
            writeLine(sampleDischargeData.followUpInstructions);

            const blob = doc.output('blob');
            const nextUrl = URL.createObjectURL(blob);
            revokePreviewUrl(previewUrl);
            setPreviewUrl(nextUrl);
        } catch (error) {
            console.error('Failed to generate discharge letterhead preview', error);
            toast({ title: 'Could not generate preview', variant: 'destructive' });
        } finally {
            setIsGeneratingPreview(false);
        }
    }, [margins, previewUrl, revokePreviewUrl, toast, typography]);

    const openPreviewInNewTab = useCallback(() => {
        if (!previewUrl) return;
        window.open(previewUrl, '_blank', 'noopener');
    }, [previewUrl]);

    const updateMargins = useCallback((next: MarginConfig) => setMargins(next), []);
    const updateTypography = useCallback((patch: Partial<TypographySettings>) => setTypography(prev => ({ ...prev, ...patch })), []);

    const saveLayoutSettings = useCallback(async () => {
        if (!doctorId || !hospitalId) {
            toast({ title: 'Select a doctor first', variant: 'destructive' });
            return;
        }
        setIsSavingLayout(true);
        try {
            await dischargeSettingsApi.updateDischargeSettings({
                doctorId,
                hospitalId,
                headerHeight: margins.top,
                footerHeight: margins.bottom,
                contentLeftMargin: margins.left,
                contentRightMargin: margins.right,
                overFlowPage: overflowStrategy === 'reuse-template',
                fontFamily: typography.family,
                fontSize: typography.size,
                fontWeight: typography.weight,
                textColour: typography.color,
            });
            setLayoutSaveSuccessMessage('Discharge letterhead settings saved.');
            setLayoutSaveSuccessOpen(true);
            await refetchSettings();
        } catch (error) {
            console.error('Failed to save discharge letterhead settings', error);
            toast({ title: 'Could not save settings', variant: 'destructive' });
        } finally {
            setIsSavingLayout(false);
        }
    }, [doctorId, hospitalId, margins, overflowStrategy, typography, refetchSettings, toast]);

    return {
        layoutMargins: margins,
        updateMargins,
        typography,
        updateTypography,
        overflowStrategy,
        setOverflowStrategy,
        templateMeta,
        templateError,
        isAnalyzingTemplate,
        handleTemplateUpload,
        templateFile,
        serverTemplateUri: serverSettings?.uri ?? null,
        previewUrl,
        isGeneratingPreview,
        generatePreview,
        openPreviewInNewTab,
        isSavingLayout,
        saveLayoutSettings,
        isLoadingLayoutSettings: isLoadingSettings,
        templateUploadSuccessOpen,
        setTemplateUploadSuccessOpen,
        templateUploadSuccessMessage,
        layoutSaveSuccessOpen,
        setLayoutSaveSuccessOpen,
        layoutSaveSuccessMessage,
    };
};
