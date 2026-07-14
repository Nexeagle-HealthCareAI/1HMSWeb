import { PDFDocument, PDFFont, StandardFonts, rgb, RGB, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import type { MarginConfig, TypographySettings } from '@/features/ipd-redesign/hooks/useDischargeDesigner';

// Simplified sibling of prescription-preview/services/previewRenderer.ts's buildTemplateBoundPreview
// — same core mechanics (load the doctor's uploaded PDF as page-1 background, reserve header/footer
// margin zones, paginate by reusing the template or adding a blank page), but with ONE generic
// section drawer (heading + wrapped paragraph) instead of a bespoke drawer per field, since
// discharge fields are almost all long-form text (no drug-table/vitals-grid shapes). No forced
// uppercase and no markdown-bold parsing — both were prescription-specific stylistic choices.

const MM_TO_PT = 72 / 25.4;
const mmToPt = (value: number) => value * MM_TO_PT;

const fontMap: Record<TypographySettings['family'], { regular: StandardFonts; bold: StandardFonts }> = {
    Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
    Times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
    Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
    Arial: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
    Georgia: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
};

const hexToPdfRgb = (hex: string | undefined): RGB => {
    const cleaned = (hex ?? '#111827').replace('#', '');
    const normalized = cleaned.length === 3 ? cleaned.split('').map(c => `${c}${c}`).join('') : cleaned.padEnd(6, '111827');
    return rgb(parseInt(normalized.slice(0, 2), 16) / 255, parseInt(normalized.slice(2, 4), 16) / 255, parseInt(normalized.slice(4, 6), 16) / 255);
};

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines: string[] = [];
    let current = '';
    words.forEach(word => {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
            current = next;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [''];
};

export interface DischargePrintFieldConfig {
    key: string;
    label: string;
    showInPrint: boolean;
}

export interface DischargeNonPayableLine {
    displayName: string;
    netAmount: number;
}

export interface DischargePrintPayload {
    admissionNo: string;
    patientName: string;
    patientId: string;
    patientAge?: number | null;
    // Already resolved to a display label ("Male"/"Female"/"Other") by the caller — the renderer
    // draws it as-is, no code-to-label mapping in here.
    patientSex?: string;
    mobile?: string;
    patientAddress?: string;
    assignedDoctorName?: string;
    admittedAt: string;
    dischargedAt: string;
    referredBy?: string;
    conditionAtDischarge: string;
    signedByDoctorName?: string;
    signedAt?: string;
    // "Scan to view the full discharge letter" link — only set once the summary is signed (see
    // DischargeSummaryPanel.buildLetterheadPreviewOptions), so an unsigned draft never gets a
    // shareable QR baked into it.
    qrUrl?: string;
    fields: Record<string, string | undefined>;             // built-in values keyed by field key
    customFieldValues: Record<string, string | undefined>;  // custom (cf_*) values keyed by field key
    tpaSplit?: {
        payableTotal: number;
        nonPayableTotal: number;
        unclassifiedTotal: number;
        nonPayableLines: DischargeNonPayableLine[];
    };
}

export interface DischargeTemplateBoundOptions {
    templateFile: File;
    margins: MarginConfig;               // top/bottom double as header/footer reservation height (mm)
    overflowStrategy: 'reuse-template' | 'blank';
    typography: TypographySettings;
    payload: DischargePrintPayload;
    printFields: DischargePrintFieldConfig[]; // the doctor's merged field layout, in print order
}

const inr = (n: number) => `Rs. ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A4 in PDF points (210mm x 297mm at 72pt/inch) — same constant prescription-preview's
// buildPreviewBlob() fallback uses. Lets the preview show correctly-margined content even when a
// doctor hasn't uploaded a letterhead yet, instead of the "no template configured" dead end.
const A4_POINTS: [number, number] = [595.28, 841.89];

export const buildBlankA4TemplateFile = async (): Promise<File> => {
    const doc = await PDFDocument.create();
    doc.addPage(A4_POINTS);
    const pdfBytes = await doc.save();
    return new File([pdfBytes as BlobPart], 'blank-a4.pdf', { type: 'application/pdf' });
};

export const buildDischargeTemplateBoundPreview = async ({ templateFile, margins, overflowStrategy, typography, payload, printFields }: DischargeTemplateBoundOptions): Promise<Uint8Array> => {
    const templateBytes = await templateFile.arrayBuffer();
    const templateDoc = await PDFDocument.load(templateBytes);
    const outputDoc = await PDFDocument.create();
    if (templateDoc.getPageCount() === 0) throw new Error('Letterhead template has no pages.');

    const basePage = templateDoc.getPage(0);
    const pageWidth = basePage.getWidth();
    const pageHeight = basePage.getHeight();

    const fontDef = fontMap[typography.family] ?? fontMap.Helvetica;
    const regularFont = await outputDoc.embedFont(fontDef.regular);
    const boldFont = await outputDoc.embedFont(fontDef.bold);

    const sizeBase = typography.size;
    const sizeHeading = sizeBase + 1.5;
    const lineHeight = sizeBase * 1.45;
    const textColor = hexToPdfRgb(typography.color);
    const accentColor = hexToPdfRgb('#4f46e5');

    const leftPad = mmToPt(margins.left);
    const rightPad = mmToPt(margins.right);
    const headerPad = mmToPt(margins.top);
    const footerPad = mmToPt(margins.bottom);
    const contentWidth = pageWidth - leftPad - rightPad;

    let currentPageIndex = -1;
    let page: PDFPage;
    let cursorY = 0;

    const acquirePage = async () => {
        currentPageIndex += 1;
        const shouldReuseTemplate = currentPageIndex === 0 || overflowStrategy === 'reuse-template';
        if (shouldReuseTemplate) {
            const sourceIndex = Math.min(currentPageIndex, templateDoc.getPageCount() - 1);
            const [copied] = await outputDoc.copyPages(templateDoc, [sourceIndex]);
            page = outputDoc.addPage(copied);
        } else {
            page = outputDoc.addPage([pageWidth, pageHeight]);
        }
        cursorY = pageHeight - headerPad;
    };
    await acquirePage();

    const ensureRoom = async (required: number) => {
        if (cursorY - required < footerPad) await acquirePage();
    };

    const drawParagraph = async (text: string, font: PDFFont = regularFont, size = sizeBase, color = textColor) => {
        const lines = wrapText(text, font, size, contentWidth);
        for (const line of lines) {
            await ensureRoom(lineHeight);
            page.drawText(line, { x: leftPad, y: cursorY, size, font, color });
            cursorY -= lineHeight;
        }
    };

    const drawSectionHeading = async (label: string) => {
        await ensureRoom(lineHeight * 1.6);
        cursorY -= 6;
        page.drawLine({ start: { x: leftPad, y: cursorY + 2 }, end: { x: leftPad, y: cursorY - sizeHeading + 2 }, thickness: 2.5, color: accentColor });
        page.drawText(label, { x: leftPad + 8, y: cursorY - sizeHeading + 4, size: sizeHeading, font: boldFont, color: accentColor });
        cursorY -= lineHeight * 1.4;
    };

    const drawSection = async (label: string, value: string | undefined) => {
        if (!value) return;
        await drawSectionHeading(label);
        await drawParagraph(value);
        cursorY -= 6;
    };

    const drawConditionBadge = async (condition: string) => {
        await ensureRoom(lineHeight * 2);
        const label = `Condition at Discharge: ${condition || '—'}`;
        page.drawText(label, { x: leftPad, y: cursorY, size: sizeBase, font: boldFont, color: accentColor });
        cursorY -= lineHeight * 1.8;
    };

    const drawTpaTable = async (tpa: NonNullable<DischargePrintPayload['tpaSplit']>) => {
        if (!tpa.nonPayableLines.length) return;
        await drawSectionHeading('Non-Payable Items Annexure');
        for (const line of tpa.nonPayableLines) {
            await ensureRoom(lineHeight);
            page.drawText(line.displayName, { x: leftPad, y: cursorY, size: sizeBase - 1, font: regularFont, color: textColor });
            const amountText = inr(line.netAmount);
            const amountW = boldFont.widthOfTextAtSize(amountText, sizeBase - 1);
            page.drawText(amountText, { x: pageWidth - rightPad - amountW, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });
            cursorY -= lineHeight;
        }
        await ensureRoom(lineHeight);
        cursorY -= 4;
        const payableText = `Payable: ${inr(tpa.payableTotal)}    Non-Payable: ${inr(tpa.nonPayableTotal)}`;
        page.drawText(payableText, { x: leftPad, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });
        cursorY -= lineHeight;
    };

    // --- Structural header (not a toggleable field, matches the HTML template's own header treatment) ---
    const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    // "Scan to view full report" QR (only present once signed — see DischargeSummaryPanel) — sits
    // inline in its own column at the left of the SAME header row as the patient details (name,
    // patient ID, age/sex, ...), not stacked above them. The patient-details column starts to the
    // right of the QR; the existing admission-no/admitted/doctor/discharged column further right is
    // unaffected.
    const headerStartY = cursorY;
    let contentLeftX = leftPad;
    const qrSize = 56;
    if (payload.qrUrl) {
        try {
            const qrDataUrl = await QRCode.toDataURL(payload.qrUrl, { margin: 0 });
            const qrImageBytes = await fetch(qrDataUrl).then(r => r.arrayBuffer());
            const qrImage = await outputDoc.embedPng(qrImageBytes);
            page.drawImage(qrImage, { x: leftPad, y: headerStartY - qrSize + 4, width: qrSize, height: qrSize });
            const caption = 'Scan for full report';
            const captionSize = sizeBase - 4;
            const captionW = regularFont.widthOfTextAtSize(caption, captionSize);
            page.drawText(caption, { x: leftPad + qrSize / 2 - captionW / 2, y: headerStartY - qrSize - 6, size: captionSize, font: regularFont, color: hexToPdfRgb('#94a3b8') });
            contentLeftX = leftPad + qrSize + 14;
        } catch {
            // Non-fatal — header text still renders at the normal left margin.
        }
    }

    page.drawText(payload.patientName || 'Unknown Patient', { x: contentLeftX, y: cursorY, size: sizeBase + 2, font: boldFont, color: textColor });

    const rightColX = pageWidth - rightPad - 190;

    page.drawText('Admission No:', { x: rightColX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#64748b') });
    page.drawText(payload.admissionNo || '—', { x: rightColX + 75, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });

    cursorY -= lineHeight * 1.2;

    page.drawText(`Patient ID: ${payload.patientId}`, { x: contentLeftX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#475569') });

    page.drawText('Admitted:', { x: rightColX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#64748b') });
    page.drawText(formatDate(payload.admittedAt), { x: rightColX + 75, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });

    cursorY -= lineHeight * 1.2;

    const demoParts = [];
    if (payload.patientAge != null) demoParts.push(`Age: ${payload.patientAge} years`);
    if (payload.patientSex) demoParts.push(`Sex: ${payload.patientSex}`);
    if (demoParts.length > 0) {
        page.drawText(demoParts.join('   '), { x: contentLeftX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#475569') });
    }

    if (payload.assignedDoctorName) {
        page.drawText('Doctor:', { x: rightColX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#64748b') });
        page.drawText(payload.assignedDoctorName, { x: rightColX + 75, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });
    }

    if (demoParts.length > 0 || payload.assignedDoctorName) cursorY -= lineHeight * 1.2;

    if (payload.mobile) {
        page.drawText(`Ph: ${payload.mobile}`, { x: contentLeftX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#475569') });
    }

    if (payload.dischargedAt) {
        page.drawText('Discharged:', { x: rightColX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#64748b') });
        page.drawText(formatDate(payload.dischargedAt), { x: rightColX + 75, y: cursorY, size: sizeBase - 1, font: boldFont, color: textColor });
    }

    if (payload.mobile || payload.dischargedAt) cursorY -= lineHeight * 1.2;

    if (payload.patientAddress) {
        page.drawText(payload.patientAddress, { x: contentLeftX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#475569') });
        cursorY -= lineHeight * 1.2;
    }

    if (payload.referredBy) {
        page.drawText(`Referred by: ${payload.referredBy}`, { x: contentLeftX, y: cursorY, size: sizeBase - 1, font: regularFont, color: hexToPdfRgb('#475569') });
        cursorY -= lineHeight * 1.2;
    }

    // Whichever is taller — the text column or the QR block — decides where the header ends, so
    // the divider/body content never overlaps either.
    if (payload.qrUrl) cursorY = Math.min(cursorY, headerStartY - qrSize - 18);

    cursorY -= lineHeight * 0.3;
    page.drawLine({ start: { x: leftPad, y: cursorY + 4 }, end: { x: pageWidth - rightPad, y: cursorY + 4 }, thickness: 1, color: hexToPdfRgb('#e2e8f0') });
    cursorY -= 8;

    // --- Body: the doctor's merged field layout drives order/labels/visibility entirely ---
    const valueByKey: Record<string, string | undefined> = { ...payload.fields, ...payload.customFieldValues };
    for (const f of printFields) {
        if (!f.showInPrint) continue;
        if (f.key === 'conditionAtDischarge') { await drawConditionBadge(payload.conditionAtDischarge); continue; }
        if (f.key === 'nonPayableAnnexure') { if (payload.tpaSplit) await drawTpaTable(payload.tpaSplit); continue; }
        await drawSection(f.label, valueByKey[f.key]);
    }

    // --- Signature block removed from preview per user request ---

    return outputDoc.save();
};
