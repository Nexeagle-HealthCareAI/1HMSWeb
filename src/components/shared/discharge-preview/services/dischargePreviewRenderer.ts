import { PDFDocument, PDFFont, StandardFonts, rgb, RGB, PDFPage } from 'pdf-lib';
import { stayText } from '@/printTemplates/dischargeSummaryA4';
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

// pdf-lib's built-in fonts only cover WinAnsi (Latin-1 plus a few symbols). Anything else — Hindi
// and other Indian scripts, "₹" — would make drawText throw, so such lines are drawn by the browser
// (which shapes Devanagari correctly) onto a canvas and placed on the page as an image.
const NON_WIN_ANSI = /[^\t\n\r\u0020-\u00FF\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u20AC\u2122]/;
export const needsUnicodeRendering = (text: string) => NON_WIN_ANSI.test(text);
const stripNonWinAnsi = (text: string) => text.replace(new RegExp(NON_WIN_ANSI.source, 'g'), '');

const UNICODE_FONT_STACK = "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Noto Sans', 'Segoe UI', sans-serif";

/** Wraps and draws text on canvases, one PNG per line. Returns null where canvas isn't available. */
const renderUnicodeLines = (text: string, widthPt: number, sizePt: number, colorHex: string): { png: string; widthPt: number; heightPt: number }[] | null => {
    if (typeof document === 'undefined') return null;
    const scale = 3;
    const probe = document.createElement('canvas');
    const ctx = probe.getContext('2d');
    if (!ctx) return null;
    const font = `${sizePt * scale}px ${UNICODE_FONT_STACK}`;
    ctx.font = font;
    const maxW = widthPt * scale;
    const lines: string[] = [];
    let current = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const next = current ? `${current} ${word}` : word;
        if (ctx.measureText(next).width <= maxW || !current) current = next;
        else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    const lineH = Math.ceil(sizePt * 1.55 * scale);
    return lines.map(line => {
        const c = document.createElement('canvas');
        const cx = c.getContext('2d')!;
        cx.font = font;
        c.width = Math.max(1, Math.ceil(Math.min(maxW, cx.measureText(line).width) + 2 * scale));
        c.height = lineH;
        cx.font = font;
        cx.fillStyle = colorHex;
        cx.textBaseline = 'alphabetic';
        cx.fillText(line, 0, Math.round(lineH * 0.74));
        return { png: c.toDataURL('image/png'), widthPt: c.width / scale, heightPt: lineH / scale };
    });
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
    // Backend-rendered QR (NexEagle logo centered) encoding the WhatsApp-delivery link -- only
    // set once the summary is signed (see DischargeSummaryPanel.ensureQrImageBytes), so an
    // unsigned draft never gets a shareable QR baked into it.
    qrImageBytes?: ArrayBuffer;
    fields: Record<string, string | undefined>;             // built-in values keyed by field key
    customFieldValues: Record<string, string | undefined>;  // custom (cf_*) values keyed by field key
    tpaSplit?: {
        payableTotal: number;
        nonPayableTotal: number;
        unclassifiedTotal: number;
        nonPayableLines: DischargeNonPayableLine[];
    };
    /** Take-home medicines as rows — drawn as a table. `fields.dischargeMedications` (text) is the fallback. */
    medications?: { name: string; dose?: string; route?: string; frequency?: string; duration?: string; instructions?: string }[];
    /** Ward / bed at discharge and payer — shown in the patient box. */
    wardBed?: string;
    payer?: string;
    /** Hospital phone, printed with the "come back at once" advice. */
    hospitalPhone?: string;
    /** The treating doctor's degree, speciality and registration number, printed with the name. */
    doctorQualification?: string;
    doctorSpeciality?: string;
    doctorRegistration?: string;
    /** Patient advice in the hospital's second language, drawn under each English advice section. */
    secondLanguage?: { code: string; name: string; fields: Record<string, string | undefined> };
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
    // The letterhead's own footer keeps its reserved height; one extra line above it carries the
    // patient's identity and the page number on every page.
    const letterheadFooter = mmToPt(margins.bottom);
    const footerPad = letterheadFooter + sizeBase + 6;
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

    const drawUnicodeParagraph = async (text: string, size: number, colorHex: string) => {
        const images = renderUnicodeLines(text, contentWidth, size, colorHex);
        if (!images) {
            // No canvas (e.g. tests): fall back to the Latin characters only rather than failing.
            const latin = stripNonWinAnsi(text).trim();
            if (/[A-Za-z0-9]/.test(latin)) for (const line of wrapText(latin, regularFont, size, contentWidth)) {
                await ensureRoom(lineHeight);
                page.drawText(line, { x: leftPad, y: cursorY, size, font: regularFont, color: textColor });
                cursorY -= lineHeight;
            }
            return;
        }
        for (const img of images) {
            await ensureRoom(img.heightPt);
            const png = await outputDoc.embedPng(img.png);
            page.drawImage(png, { x: leftPad, y: cursorY - img.heightPt * 0.26, width: img.widthPt, height: img.heightPt });
            cursorY -= Math.max(lineHeight, img.heightPt);
        }
    };

    // Keeps the doctor's line breaks (lists of results or medicines), wrapping each line to the width.
    const drawParagraph = async (text: string, font: PDFFont = regularFont, size = sizeBase, color = textColor) => {
        for (const para of String(text ?? '').split(/\r?\n/)) {
            if (!para.trim()) { cursorY -= lineHeight * 0.4; continue; }
            if (needsUnicodeRendering(para)) { await drawUnicodeParagraph(para, size, typography.color ?? '#111827'); continue; }
            const lines = wrapText(para, font, size, contentWidth);
            for (const line of lines) {
                await ensureRoom(lineHeight);
                page.drawText(line, { x: leftPad, y: cursorY, size, font, color });
                cursorY -= lineHeight;
            }
        }
    };

    // Single-line text must stay inside what the built-in fonts can draw.
    const safe = (t: unknown) => stripNonWinAnsi(String(t ?? ''));
    const muted = hexToPdfRgb('#64748b');
    const ruleColor = hexToPdfRgb('#e2e8f0');
    const labelSize = Math.max(6, sizeBase - 3.5);
    const smallSize = Math.max(7, sizeBase - 1.5);

    const drawSectionHeading = async (label: string) => {
        await ensureRoom(lineHeight * 2.6);
        cursorY -= 2;
        const text = safe(label).toUpperCase();
        const size = Math.max(7, sizeBase - 1);
        const y = cursorY - sizeBase + 3;
        page.drawText(text, { x: leftPad, y, size, font: boldFont, color: accentColor });
        const textW = boldFont.widthOfTextAtSize(text, size);
        page.drawLine({ start: { x: leftPad + textW + 8, y: y + size * 0.35 }, end: { x: pageWidth - rightPad, y: y + size * 0.35 }, thickness: 0.6, color: ruleColor });
        cursorY -= lineHeight * 1.35;
    };

    const drawSection = async (label: string, value: string | undefined) => {
        if (!value) return;
        await drawSectionHeading(label);
        await drawParagraph(value);
        cursorY -= 2;
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

    const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const valueByKey: Record<string, string | undefined> = { ...payload.fields, ...payload.customFieldValues };
    const shown = (key: string) => printFields.some(f => f.key === key && f.showInPrint);
    const valueIfShown = (key: string) => (shown(key) ? valueByKey[key]?.trim() || undefined : undefined);

    // A run of lines measured before it is drawn, so a box can be sized and kept on one page.
    type Item = { h: number; draw: (x: number, y: number) => Promise<void> | void };
    const textItems = (text: string | undefined, width: number, font: PDFFont, size: number, color = textColor, colorHex = typography.color ?? '#111827'): Item[] => {
        const items: Item[] = [];
        for (const para of String(text ?? '').split(/\r?\n/)) {
            if (!para.trim()) continue;
            const images = needsUnicodeRendering(para) ? renderUnicodeLines(para, width, size, colorHex) : null;
            if (images) {
                for (const img of images) items.push({
                    h: Math.max(size * 1.45, img.heightPt),
                    draw: async (x, y) => { const png = await outputDoc.embedPng(img.png); page.drawImage(png, { x, y: y - img.heightPt * 0.26, width: img.widthPt, height: img.heightPt }); },
                });
                continue;
            }
            // Without a canvas only the Latin characters can be drawn; skip a line that has none left.
            const latin = safe(para);
            if (!/[A-Za-z0-9]/.test(latin)) continue;
            for (const line of wrapText(latin, font, size, width)) items.push({ h: size * 1.45, draw: (x, y) => { page.drawText(line, { x, y, size, font, color }); } });
        }
        return items;
    };
    const drawItems = async (items: Item[], x: number, startY: number): Promise<number> => {
        let y = startY;
        for (const item of items) { y -= item.h; await item.draw(x, y); }
        return y;
    };
    const bracketed = (t: string) => (/^[([].*[)\]]$/s.test(t) ? t : `(${t})`);
    const translatedFor = (key: string) => payload.secondLanguage?.fields[key]?.trim();

    // --- Title, with the condition at discharge beside it ---
    page.drawText('DISCHARGE SUMMARY', { x: leftPad, y: cursorY - 2, size: sizeBase + 4, font: boldFont, color: textColor });
    if (shown('conditionAtDischarge') && payload.conditionAtDischarge) {
        const condition = safe(`Condition at discharge: ${payload.conditionAtDischarge}`);
        const w = boldFont.widthOfTextAtSize(condition, sizeBase);
        page.drawText(condition, { x: pageWidth - rightPad - w, y: cursorY - 2, size: sizeBase, font: boldFont, color: accentColor });
    }
    cursorY -= lineHeight * 1.5;

    // --- Patient and stay box. The "scan for full report" QR (signed summaries only) sits to its right. ---
    const qrSize = 56;
    let qrImage: Awaited<ReturnType<typeof outputDoc.embedPng>> | null = null;
    if (payload.qrImageBytes) {
        try { qrImage = await outputDoc.embedPng(payload.qrImageBytes); } catch { qrImage = null; /* non-fatal */ }
    }
    const boxW = contentWidth - (qrImage ? qrSize + 12 : 0);
    const boxTop = cursorY + sizeBase;
    const row1H = lineHeight * 3.05;
    const row2H = row1H;
    const boxPad = 8;
    page.drawRectangle({ x: leftPad, y: boxTop - row1H, width: boxW, height: row1H, color: hexToPdfRgb('#f8fafc') });
    page.drawRectangle({ x: leftPad, y: boxTop - row1H - row2H, width: boxW, height: row1H + row2H, borderColor: hexToPdfRgb('#cbd5e1'), borderWidth: 0.8 });
    page.drawLine({ start: { x: leftPad, y: boxTop - row1H }, end: { x: leftPad + boxW, y: boxTop - row1H }, thickness: 0.6, color: ruleColor });

    const colW = [1.5, 1, 1, 1].map(f => (f / 4.5) * (boxW - boxPad * 2));
    const colX = colW.map((_, i) => leftPad + boxPad + colW.slice(0, i).reduce((a, b) => a + b, 0));
    const fit = (text: string, font: PDFFont, size: number, width: number) => {
        let t = safe(text);
        if (font.widthOfTextAtSize(t, size) <= width) return t;
        while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
        return `${t}…`;
    };
    const drawCell = (col: number, top: number, label: string, value: string | undefined, valueSize = smallSize + 0.5, sub?: string) => {
        const w = colW[col] - 8;
        page.drawText(label.toUpperCase(), { x: colX[col], y: top - boxPad - labelSize + 2, size: labelSize, font: boldFont, color: muted });
        page.drawText(fit(value || '—', boldFont, valueSize, w), { x: colX[col], y: top - boxPad - labelSize - valueSize - 2, size: valueSize, font: boldFont, color: textColor });
        if (sub) page.drawText(fit(sub, regularFont, smallSize - 0.5, w), { x: colX[col], y: top - boxPad - labelSize - valueSize - smallSize - 4, size: smallSize - 0.5, font: regularFont, color: hexToPdfRgb('#475569') });
    };
    const demographics = [payload.patientAge != null ? `${payload.patientAge} years` : '', payload.patientSex ?? '', payload.mobile ?? ''].filter(Boolean).join(' · ');
    drawCell(0, boxTop, 'Patient', payload.patientName || 'Unknown patient', sizeBase + 1, demographics);
    drawCell(1, boxTop, 'Patient ID', payload.patientId);
    drawCell(2, boxTop, 'Admission no.', payload.admissionNo);
    // "Star Health (INSURANCE)" → name on the value line, type under it, so neither is cut short.
    const payerParts = /^(.*\S)\s*\(([^)]*)\)$/.exec(payload.payer ?? '');
    drawCell(3, boxTop, 'Payer', payerParts ? payerParts[1] : payload.payer, undefined, payerParts?.[2]);
    const row2Top = boxTop - row1H;
    const doctorCredentials = [payload.doctorQualification, payload.doctorSpeciality].filter(Boolean).join(' · ');
    drawCell(0, row2Top, 'Consultant', payload.assignedDoctorName || payload.signedByDoctorName, undefined, doctorCredentials || undefined);
    drawCell(1, row2Top, 'Admitted', formatDate(payload.admittedAt));
    drawCell(2, row2Top, 'Discharged', payload.dischargedAt ? formatDate(payload.dischargedAt) : undefined);
    drawCell(3, row2Top, 'Stay', payload.dischargedAt ? stayText(payload.admittedAt, payload.dischargedAt) : undefined, undefined, payload.wardBed);

    if (qrImage) {
        const qrX = pageWidth - rightPad - qrSize;
        page.drawImage(qrImage, { x: qrX, y: boxTop - qrSize, width: qrSize, height: qrSize });
        const caption = 'Scan for full report';
        const captionSize = Math.max(5.5, sizeBase - 4);
        page.drawText(caption, { x: qrX + qrSize / 2 - regularFont.widthOfTextAtSize(caption, captionSize) / 2, y: boxTop - qrSize - captionSize - 2, size: captionSize, font: regularFont, color: hexToPdfRgb('#94a3b8') });
    }
    cursorY = boxTop - row1H - row2H - lineHeight;

    const underBox = [payload.patientAddress, payload.referredBy ? `Referred by: ${payload.referredBy}` : ''].filter(Boolean).join('  ·  ');
    if (underBox) {
        for (const line of wrapText(safe(underBox), regularFont, smallSize, contentWidth)) {
            page.drawText(line, { x: leftPad, y: cursorY, size: smallSize, font: regularFont, color: hexToPdfRgb('#475569') });
            cursorY -= lineHeight;
        }
    }
    cursorY -= 4;

    // --- Diagnosis: the one thing every later reader looks for first ---
    const finalDx = valueIfShown('finalDiagnosis');
    const admittingDx = valueIfShown('admittingDiagnosis');
    const icd = valueIfShown('finalDiagnosisIcd10');
    const mainDx = finalDx || admittingDx;
    if (mainDx || icd) {
        const indent = 10;
        const items: Item[] = [
            ...textItems(mainDx, contentWidth - indent, boldFont, sizeBase + 2),
            ...textItems([icd ? `ICD-10 ${icd}` : '', finalDx && admittingDx ? `Admitted with: ${admittingDx.replace(/\s*\r?\n\s*/g, '; ')}` : ''].filter(Boolean).join('  ·  '), contentWidth - indent, regularFont, smallSize, hexToPdfRgb('#475569'), '#475569'),
        ];
        const height = labelSize + 4 + items.reduce((a, i) => a + i.h, 0);
        await ensureRoom(height + 8);
        const top = cursorY + sizeBase * 0.8;
        page.drawLine({ start: { x: leftPad + 1, y: top }, end: { x: leftPad + 1, y: top - height - 2 }, thickness: 2.5, color: accentColor });
        page.drawText(finalDx ? 'FINAL DIAGNOSIS' : admittingDx ? 'ADMITTING DIAGNOSIS' : 'DIAGNOSIS', { x: leftPad + indent, y: top - labelSize, size: labelSize, font: boldFont, color: muted });
        const endY = await drawItems(items, leftPad + indent, top - labelSize - 2);
        cursorY = endY - lineHeight;
    }

    // A bordered box for the advice a patient must not miss. Sized first so it never splits.
    const drawBox = async (opts: { title: string; big?: string; text?: string; translated?: string; extra?: string; borderHex: string; fillHex: string }) => {
        const pad = 8;
        const innerW = contentWidth - pad * 2;
        const strong = hexToPdfRgb(opts.borderHex);
        const items: Item[] = [
            ...textItems(opts.big, innerW, boldFont, sizeBase + 2),
            ...textItems(opts.text, innerW, regularFont, sizeBase),
            ...(opts.translated ? textItems(bracketed(opts.translated), innerW, regularFont, sizeBase, hexToPdfRgb('#334155'), '#334155') : []),
            ...textItems(opts.extra, innerW, boldFont, sizeBase, strong, opts.borderHex),
        ];
        const height = pad * 2 + labelSize + 3 + items.reduce((a, i) => a + i.h, 0);
        await ensureRoom(height + 6);
        const top = cursorY + sizeBase * 0.8;
        page.drawRectangle({ x: leftPad, y: top - height, width: contentWidth, height, color: hexToPdfRgb(opts.fillHex), borderColor: strong, borderWidth: 1 });
        page.drawText(safe(opts.title).toUpperCase(), { x: leftPad + pad, y: top - pad - labelSize + 1, size: labelSize, font: boldFont, color: strong });
        await drawItems(items, leftPad + pad, top - pad - labelSize - 1);
        cursorY = top - height - lineHeight - 2;
    };

    // Take-home medicines as a table: one row per medicine, every cell wrapped (never cut short).
    const drawMedicineTable = async (label: string, rows: NonNullable<DischargePrintPayload['medications']>) => {
        await drawSectionHeading(label);
        const size = smallSize;
        const rowLine = size * 1.4;
        const fractions = [0.05, 0.33, 0.14, 0.16, 0.12, 0.20];
        const widths = fractions.map(f => f * contentWidth);
        const xs = widths.map((_, i) => leftPad + widths.slice(0, i).reduce((a, b) => a + b, 0));
        const headerH = rowLine + 4;
        const drawHeader = () => {
            const top = cursorY + size;
            page.drawRectangle({ x: leftPad, y: top - headerH, width: contentWidth, height: headerH, color: hexToPdfRgb('#f1f5f9') });
            ['#', 'MEDICINE', 'DOSE', 'WHEN', 'FOR', 'HOW'].forEach((h, i) => page.drawText(h, { x: xs[i] + 4, y: top - headerH + 4, size: labelSize, font: boldFont, color: muted }));
            cursorY = top - headerH - size - 3;
        };
        await ensureRoom(headerH + rowLine * 2);
        drawHeader();
        for (let r = 0; r < rows.length; r++) {
            const m = rows[r];
            const cells = [String(r + 1), m.name, m.dose, m.frequency, m.duration, [m.route, m.instructions].filter(v => v?.trim()).join(' · ')]
                .map((v, i) => wrapText(safe(v?.trim() || '—'), i === 1 ? boldFont : regularFont, size, widths[i] - 8));
            const rowH = Math.max(...cells.map(c => c.length)) * rowLine + 5;
            if (cursorY - rowH < footerPad) { await acquirePage(); drawHeader(); }
            cells.forEach((lines, i) => lines.forEach((line, n) => page.drawText(line, { x: xs[i] + 4, y: cursorY - n * rowLine, size, font: i === 1 ? boldFont : regularFont, color: textColor })));
            const bottom = cursorY - rowH + size;
            page.drawLine({ start: { x: leftPad, y: bottom }, end: { x: pageWidth - rightPad, y: bottom }, thickness: 0.5, color: ruleColor });
            cursorY -= rowH;
        }
        cursorY -= 8;
    };

    // --- Body: the doctor's field layout still drives order, labels and visibility. A few
    //     fields have their own shape: diagnosis (above), medicines (table), next visit and
    //     warning signs (boxes). ---
    const inDiagnosisBlock = new Set(['conditionAtDischarge', 'finalDiagnosis', 'finalDiagnosisIcd10', 'admittingDiagnosis']);
    const medicineRows = (payload.medications ?? []).filter(m => m.name?.trim());
    let nextVisitDrawn = false;
    for (const f of printFields) {
        if (!f.showInPrint || inDiagnosisBlock.has(f.key)) continue;
        if (f.key === 'nonPayableAnnexure') { if (payload.tpaSplit) await drawTpaTable(payload.tpaSplit); continue; }
        if (f.key === 'dischargeMedications' && medicineRows.length > 0) { await drawMedicineTable(f.label, medicineRows); continue; }
        if (f.key === 'followUpInstructions' || f.key === 'followUpDate') {
            if (nextVisitDrawn) continue;
            nextVisitDrawn = true;
            const date = valueIfShown('followUpDate');
            const text = valueIfShown('followUpInstructions');
            if (date || text) await drawBox({ title: 'Next visit', big: date, text, translated: text ? translatedFor('followUpInstructions') : undefined, borderHex: '#4f46e5', fillHex: '#eef2ff' });
            continue;
        }
        if (f.key === 'warningSigns') {
            const text = valueByKey[f.key]?.trim();
            if (text) await drawBox({ title: f.label, text, translated: translatedFor('warningSigns'), extra: payload.hospitalPhone ? `Hospital: ${payload.hospitalPhone}` : undefined, borderHex: '#dc2626', fillHex: '#fef2f2' });
            continue;
        }
        await drawSection(f.label, valueByKey[f.key]);
        const translated = translatedFor(f.key);
        if (translated && valueByKey[f.key]) {
            cursorY += 4;
            // The translation prints in brackets after the English.
            await drawUnicodeParagraph(bracketed(translated), sizeBase, '#334155');
            cursorY -= 6;
        }
    }

    // --- Sign-off: the patient or attendant on the left, the doctor on the right ---
    await ensureRoom(lineHeight * 7.5);
    cursorY -= lineHeight * 2.6;
    const signW = Math.min(200, contentWidth * 0.42);
    const rightX = pageWidth - rightPad - signW;
    for (const x of [leftPad, rightX]) page.drawLine({ start: { x, y: cursorY }, end: { x: x + signW, y: cursorY }, thickness: 0.7, color: hexToPdfRgb('#94a3b8') });
    cursorY -= smallSize + 3;
    page.drawText('Patient / attendant - advice explained', { x: leftPad, y: cursorY, size: smallSize - 0.5, font: regularFont, color: muted });
    page.drawText(fit(payload.signedByDoctorName || payload.assignedDoctorName || "Doctor's signature", boldFont, smallSize + 0.5, signW), { x: rightX, y: cursorY, size: smallSize + 0.5, font: boldFont, color: textColor });
    // Degree and speciality, then the registration number, under the doctor's name.
    for (const line of [doctorCredentials, payload.doctorRegistration ? `Reg. no. ${payload.doctorRegistration}` : '']) {
        if (!line) continue;
        cursorY -= lineHeight * 0.9;
        page.drawText(fit(line, regularFont, smallSize - 0.5, signW), { x: rightX, y: cursorY, size: smallSize - 0.5, font: regularFont, color: hexToPdfRgb('#475569') });
    }
    if (payload.signedAt) {
        cursorY -= lineHeight * 0.9;
        page.drawText(`Signed ${formatDate(payload.signedAt)}`, { x: rightX, y: cursorY, size: smallSize - 0.5, font: regularFont, color: muted });
    }

    // --- Every page carries who it belongs to and its page number ---
    const pages = outputDoc.getPages();
    const identity = fit([payload.patientName, payload.patientId, payload.admissionNo].filter(Boolean).join(' · '), regularFont, labelSize + 0.5, contentWidth - 70);
    pages.forEach((p, i) => {
        const y = letterheadFooter + 3;
        p.drawLine({ start: { x: leftPad, y: y + labelSize + 4 }, end: { x: pageWidth - rightPad, y: y + labelSize + 4 }, thickness: 0.5, color: ruleColor });
        p.drawText(identity, { x: leftPad, y, size: labelSize + 0.5, font: regularFont, color: hexToPdfRgb('#94a3b8') });
        const pageText = `Page ${i + 1} of ${pages.length}`;
        p.drawText(pageText, { x: pageWidth - rightPad - regularFont.widthOfTextAtSize(pageText, labelSize + 0.5), y, size: labelSize + 0.5, font: regularFont, color: hexToPdfRgb('#94a3b8') });
    });

    return outputDoc.save();
};
