import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { MarginConfig, PrescriptionDesignerData, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';

const MM_TO_PT = 72 / 25.4;

const templateFontMap: Record<TypographySettings['family'], { regular: StandardFonts; bold: StandardFonts }> = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
  Arial: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Georgia: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
};

const jsPdfFontMap: Record<TypographySettings['family'], string> = {
  Helvetica: 'helvetica',
  Times: 'times',
  Courier: 'courier',
  Arial: 'helvetica',
  Georgia: 'times',
};

const normalizeFontStyle = (weight: TypographySettings['weight']) => {
  if (weight === 'bold' || weight === 'medium') {
    return 'bold';
  }
  return 'normal';
};

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const safeText = text ?? '';
  const words = safeText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  if (!words.length) {
    return [''];
  }

  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
};

const mmToPt = (value: number) => value * MM_TO_PT;

const hexToPdfRgb = (hex: string | undefined) => {
  const fallback = '111827';
  const cleaned = (hex ?? '#111827').replace('#', '');
  const normalized = cleaned.length === 3
    ? cleaned.split('').map((char) => `${char}${char}`).join('')
    : cleaned.padEnd(6, fallback);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return rgb(r / 255, g / 255, b / 255);
};

const hexToJsPdfRgb = (hex: string): [number, number, number] => {
  const sanitized = hex.replace('#', '');
  const value = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized.padEnd(6, 'f');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b];
};

export interface TemplateBoundLayoutConfig {
  margins: MarginConfig;
  headerHeight: number;
  footerHeight: number;
  overflowStrategy: 'reuse-template' | 'blank';
}

export interface TemplateBoundPreviewOptions {
  templateFile: File;
  layout: TemplateBoundLayoutConfig;
  typography: TypographySettings;
  prescription: PrescriptionDesignerData;
}

export interface DynamicPreviewLayoutConfig extends TemplateBoundLayoutConfig {
  templateBackgroundDataUrl?: string;
}

export interface DynamicPreviewOptions {
  layout: DynamicPreviewLayoutConfig;
  typography: TypographySettings;
  prescription: PrescriptionDesignerData;
}

export const buildTemplateBoundPreview = async ({ templateFile, layout, typography, prescription }: TemplateBoundPreviewOptions) => {
  const templateBytes = await templateFile.arrayBuffer();
  const templateDoc = await PDFDocument.load(templateBytes);
  const outputDoc = await PDFDocument.create();

  // Format: 16th Dec,2025 (always current date)
  function getFormattedDateLabel(date: Date): string {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    // Ordinal suffix
    const j = day % 10, k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';
    return `${day}${suffix} ${month},${year}`;
  }
  const defaultPreviewDateLabel = getFormattedDateLabel(new Date());

  if (templateDoc.getPageCount() === 0) {
    throw new Error('Template PDF has no pages to render.');
  }

  const basePage = templateDoc.getPage(0);
  const pageWidth = basePage.getWidth();
  const pageHeight = basePage.getHeight();

  const fontDefinition = templateFontMap[typography.family] ?? templateFontMap.Helvetica;
  const regularFont = await outputDoc.embedFont(fontDefinition.regular);
  const boldFont = await outputDoc.embedFont(fontDefinition.bold);
  const color = hexToPdfRgb(typography.color);

  const textSize = typography.size;
  const lineHeight = Math.max(textSize + 2, textSize * 1.3);
  const leftPad = mmToPt(layout.margins.left);
  const rightPad = mmToPt(layout.margins.right);
  const templateHeaderPad = mmToPt(layout.margins.top + layout.headerHeight);
  const templateFooterPad = mmToPt(layout.margins.bottom + layout.footerHeight);
  const blankHeaderPad = mmToPt(layout.margins.top);
  const blankFooterPad = mmToPt(layout.margins.bottom);
  const contentWidth = pageWidth - leftPad - rightPad;

  let currentPageIndex = -1;
  let activeHeaderPad = templateHeaderPad;
  let activeFooterPad = templateFooterPad;
  let page = await acquirePage();
  let cursorY = page.getHeight() - activeHeaderPad;

  // Remove the default date at the top margin (now only show with Patient Information)
  function drawDefaultDate(targetPage: typeof page) {
    // intentionally left blank to suppress top margin date
  }

  async function acquirePage() {
    currentPageIndex += 1;
    const shouldReuseTemplate = currentPageIndex === 0 || layout.overflowStrategy === 'reuse-template' || currentPageIndex < templateDoc.getPageCount();
    if (shouldReuseTemplate) {
      const sourceIndex = Math.min(currentPageIndex, templateDoc.getPageCount() - 1);
      const [copied] = await outputDoc.copyPages(templateDoc, [sourceIndex]);
      activeHeaderPad = templateHeaderPad;
      activeFooterPad = templateFooterPad;
      const newPage = outputDoc.addPage(copied);
      drawDefaultDate(newPage);
      return newPage;
    }
    activeHeaderPad = blankHeaderPad;
    activeFooterPad = blankFooterPad;
    const newBlankPage = outputDoc.addPage([pageWidth, pageHeight]);
    drawDefaultDate(newBlankPage);
    return newBlankPage;
  }

  async function ensureRoom(required = lineHeight) {
    if (cursorY - required < activeFooterPad) {
      page = await acquirePage();
      cursorY = page.getHeight() - activeHeaderPad;
    }
  }

  const writeLine = async (text: string, options?: { bold?: boolean }) => {
    const font = options?.bold ? boldFont : regularFont;
    const wrapped = wrapText(text, font, textSize, contentWidth);
    for (const line of wrapped) {
      await ensureRoom();
      page.drawText(line, {
        x: leftPad,
        y: cursorY,
        size: textSize,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
  };


  const patient = prescription.patient ?? { name: '', id: '', age: '', gender: '', phone: '', address: '', contact: '' };
  const vitals = prescription.vitals ?? { bloodPressure: '', pulse: '', temperature: '', spo2: '', height: '', weight: '', bmi: '' };

  // Gather all patient fields as label-value pairs
  const patientFields: [string, string][] = [
    ['Patient ID', patient.id ?? ''],
    ['Name', patient.name ?? ''],
    ['Age', patient.age ?? ''],
    ['Gender', patient.gender ?? ''],
    ['Contact', ((patient as any).contact ?? patient.phone ?? '')],
    ['Address', ((patient as any).address ?? '')],
  ].filter(([_, value]) => value && value.trim().length > 0) as [string, string][];

  // Add details array if present and non-empty
  const patientDetails = Array.isArray((patient as any).details)
    ? (patient as any).details.filter((detail: any) => detail && (detail.label || detail.value))
    : [];
  for (const detail of patientDetails) {
    if (detail.label || detail.value) {
      patientFields.push([String(detail.label ?? ''), String(detail.value ?? '')]);
    }
  }

  // Decide number of columns based on contentWidth
  let numColumns = 4;
  if (contentWidth < 350) numColumns = 3;
  const colWidth = contentWidth / numColumns;
  const cellPad = 4;
  const labelFont = regularFont;
  const valueFont = boldFont;

  // --- Patient Information Block ---
  if (patientFields.length) {
    // Block title with underline and date at right
    await ensureRoom(lineHeight * 1.5);
    const patientTitle = 'Patient Information';
    const patientTitleFontSize = textSize + 2;
    const patientTitleWidth = boldFont.widthOfTextAtSize(patientTitle, patientTitleFontSize);
    const dateLabelWidth = boldFont.widthOfTextAtSize(defaultPreviewDateLabel, textSize);
    // Draw Patient Information at left
    page.drawText(patientTitle, {
      x: leftPad,
      y: cursorY,
      size: patientTitleFontSize,
      font: boldFont,
      color,
    });
    // Draw date at right (same row, aligned right)
    // Add extra right margin (e.g., 12pt) for more separation from content
    const extraRightMargin = 12;
    const dateFontSize = textSize + 2;
    const dateX = pageWidth - rightPad - dateLabelWidth + extraRightMargin;
    const dateY = cursorY + (patientTitleFontSize - textSize);
    // Draw date (bolder and larger)
    page.drawText(defaultPreviewDateLabel, {
      x: dateX,
      y: dateY,
      size: dateFontSize,
      font: boldFont,
      color,
    });
    // Underline the date
    const dateUnderlineY = dateY - 2;
    page.drawLine({
      start: { x: dateX, y: dateUnderlineY },
      end: { x: dateX + dateLabelWidth, y: dateUnderlineY },
      thickness: 1.2,
      color,
    });
    // Draw underline under Patient Information only
    const patientTitleUnderlineY = cursorY - 2;
    page.drawLine({
      start: { x: leftPad, y: patientTitleUnderlineY },
      end: { x: leftPad + patientTitleWidth, y: patientTitleUnderlineY },
      thickness: 1,
      color,
    });
    cursorY -= lineHeight * 1.2;

    // Render all patient fields in a single row, wrapping to next row if overflow, no table borders
    let xCursor = leftPad;
    let rowHeight = lineHeight;
    for (let i = 0; i < patientFields.length; i++) {
      const [label, value] = patientFields[i];
      const labelText = `${label}:`;
      const valueText = value || '—';
      const labelWidth = boldFont.widthOfTextAtSize(labelText, textSize);
      const valueWidth = labelFont.widthOfTextAtSize(valueText, textSize);
      const totalWidth = labelWidth + valueWidth + 6; // 6pt gap between label and value
      // If not enough space, move to next row
      if (xCursor + totalWidth > pageWidth - rightPad) {
        xCursor = leftPad;
        cursorY -= rowHeight;
      }
      // Draw label (bold)
      page.drawText(labelText, {
        x: xCursor,
        y: cursorY,
        size: textSize,
        font: boldFont,
        color,
      });
      // Draw value (normal, no underline)
      const valueX = xCursor + labelWidth + 6;
      page.drawText(valueText, {
        x: valueX,
        y: cursorY,
        size: textSize,
        font: labelFont,
        color,
      });
      xCursor += totalWidth + 18; // 18pt gap between fields
    }
    cursorY -= lineHeight + 10;
  } else {
    await writeLine('Patient details unavailable.');
    cursorY -= lineHeight / 2;
  }

  // --- Vitals Block ---
  // Prepare vitals as label-value pairs
  const vitalsFields: [string, string][] = [
    ['BP', vitals.bloodPressure],
    ['Pulse', vitals.pulse],
    ['Temp', vitals.temperature],
    ['SpO2', vitals.spo2],
    ['Height', vitals.height],
    ['Weight', vitals.weight],
    ['BMI', vitals.bmi],
  ].filter(([_, value]) => {
    if (!value) return false;
    const v = value.trim();
    // Consider all forms of empty/zero/null for all vitals
    if (!v || v === '0' || v === '0.0' || v === '0.00' || v === '0/0' || v === '0 mmHg' || v === '0%' || v === '0 kg' || v === '0 cm' || v === '0 °C' || v === '0bpm' || v === '0 bpm' || v === '-') return false;
    // For BP, also hide if value is like '0/0 mmHg' or '0/0'
    if (v.replace(/\s/g, '') === '0/0mmHg' || v.replace(/\s/g, '') === '0/0') return false;
    return true;
  }) as [string, string][];

  // Only render Vitals section if at least one value is non-empty/non-zero
  if (vitalsFields.length > 0) {
    // Only render if at least one real value
    await ensureRoom(lineHeight * 1.5);
    const vitalsTitle = 'Vitals';
    const vitalsTitleFontSize = textSize + 2;
    const vitalsTitleWidth = boldFont.widthOfTextAtSize(vitalsTitle, vitalsTitleFontSize);
    page.drawText(vitalsTitle, {
      x: leftPad,
      y: cursorY,
      size: vitalsTitleFontSize,
      font: boldFont,
      color,
    });
    // Draw underline
    const vitalsTitleUnderlineY = cursorY - 2;
    page.drawLine({
      start: { x: leftPad, y: vitalsTitleUnderlineY },
      end: { x: leftPad + vitalsTitleWidth, y: vitalsTitleUnderlineY },
      thickness: 1,
      color,
    });
    cursorY -= lineHeight * 0.7;

    // Table should start at content left margin + 2pt and end at content right margin + 2pt
    const vitalsNumColumns = Math.min(4, vitalsFields.length);
    const vitalsTableLeftX = leftPad + 2;
    const vitalsTableWidth = contentWidth;
    const vitalsColWidth = vitalsTableWidth / vitalsNumColumns;
    const vitalsRows = Math.ceil(vitalsFields.length / vitalsNumColumns);
    let vitalsY = cursorY;
    // Draw table border
    const vitalsTableHeight = vitalsRows * lineHeight;
    page.drawRectangle({
      x: vitalsTableLeftX,
      y: vitalsY - vitalsTableHeight,
      width: vitalsTableWidth,
      height: vitalsTableHeight,
      borderWidth: 1,
      color: undefined,
      borderColor: color,
    });
    // Draw horizontal lines
    for (let r = 0; r <= vitalsRows; r++) {
      const y = vitalsY - r * lineHeight;
      page.drawLine({
        start: { x: vitalsTableLeftX, y },
        end: { x: vitalsTableLeftX + vitalsTableWidth, y },
        thickness: 0.5,
        color,
      });
    }
    // Draw vertical lines
    for (let c = 0; c <= vitalsNumColumns; c++) {
      page.drawLine({
        start: { x: vitalsTableLeftX + c * vitalsColWidth, y: vitalsY },
        end: { x: vitalsTableLeftX + c * vitalsColWidth, y: vitalsY - vitalsTableHeight },
        thickness: 0.5,
        color,
      });
    }
    // Render vitals text
    let vitalsIdx = 0;
    for (let r = 0; r < vitalsRows; r++) {
      for (let c = 0; c < vitalsNumColumns; c++) {
        if (vitalsIdx >= vitalsFields.length) break;
        const [label, value] = vitalsFields[vitalsIdx];
        // Defensive: skip if value is empty/zero/null
        const v = value ? value.trim() : '';
        if (!v || v === '0' || v === '0.0' || v === '0.00' || v === '0/0' || v === '0 mmHg' || v === '0%' || v === '0 kg' || v === '0 cm' || v === '0 °C' || v === '0bpm' || v === '0 bpm' || v === '-' || v.replace(/\s/g, '') === '0/0mmHg' || v.replace(/\s/g, '') === '0/0') {
          vitalsIdx++;
          continue;
        }
        const labelText = `${label}:`;
        const valueText = value;
        const labelWidth = boldFont.widthOfTextAtSize(labelText, textSize);
        const valueWidth = labelFont.widthOfTextAtSize(valueText, textSize);
        const cellX = vitalsTableLeftX + c * vitalsColWidth + cellPad;
        const cellY = vitalsY - r * lineHeight - (lineHeight * 0.8);
        // Draw label (bold)
        page.drawText(labelText, {
          x: cellX,
          y: cellY,
          size: textSize,
          font: boldFont,
          color,
        });
        // Draw value (normal, no underline)
        const valueX = cellX + labelWidth + 4;
        page.drawText(valueText, {
          x: valueX,
          y: cellY,
          size: textSize,
          font: labelFont,
          color,
        });
        vitalsIdx++;
      }
    }
    cursorY -= vitalsTableHeight + (lineHeight / 2);
  }

  // Removed fallback text-based vitals summary to ensure BP and other vitals do not appear if all values are empty/zero/null.

  const outputBytes = await outputDoc.save();
  const byteArray = Uint8Array.from(outputBytes);
  return new Blob([byteArray], { type: 'application/pdf' });
};

