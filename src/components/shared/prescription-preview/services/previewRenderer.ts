import { PDFDocument, PDFFont, StandardFonts, rgb, RGB } from 'pdf-lib';
import { MarginConfig, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { GeneratePrescriptionDetailsPayload, PrescriptionPatientDetail, PrescriptionVitals } from './generatePrescriptionDetailsService';

const MM_TO_PT = 72 / 25.4;

const templateFontMap: Record<TypographySettings['family'], { regular: StandardFonts; bold: StandardFonts }> = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
  Arial: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Georgia: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
};

const hexToPdfRgb = (hex: string | undefined): RGB => {
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

// --- Theme Configuration ---
const COLORS = {
  Primary: hexToPdfRgb('#0F766E'), // Teal 700
  Secondary: hexToPdfRgb('#374151'), // Gray 700
  TextMain: hexToPdfRgb('#111827'), // Gray 900
  TextLight: hexToPdfRgb('#6B7280'), // Gray 500
  BgAccent: hexToPdfRgb('#F0FDFA'), // Teal 50
  BgLight: hexToPdfRgb('#F9FAFB'), // Gray 50
  Border: hexToPdfRgb('#E5E7EB'), // Gray 200
  Success: hexToPdfRgb('#059669'), // Green 600
};

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const safeText = String(text || '');
  const words = safeText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  if (!words.length) return [''];

  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const mmToPt = (value: number) => value * MM_TO_PT;

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
  payload: GeneratePrescriptionDetailsPayload;
}

export const buildTemplateBoundPreview = async ({ templateFile, layout, typography, payload }: TemplateBoundPreviewOptions) => {
  const templateBytes = await templateFile.arrayBuffer();
  const templateDoc = await PDFDocument.load(templateBytes);
  const outputDoc = await PDFDocument.create();

  // Helper: Date Formatter
  const getFormattedDate = (d: string | Date) => {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };
  const currentDateLabel = getFormattedDate(new Date());

  if (templateDoc.getPageCount() === 0) throw new Error('Template PDF has no pages.');

  const basePage = templateDoc.getPage(0);
  const pageWidth = basePage.getWidth();
  const pageHeight = basePage.getHeight();

  const fontDef = templateFontMap[typography.family] ?? templateFontMap.Helvetica;
  const regularFont = await outputDoc.embedFont(fontDef.regular);
  const boldFont = await outputDoc.embedFont(fontDef.bold);

  // Typography Sizes
  const sizeBase = typography.size; // 10
  const sizeSm = sizeBase - 1.5; // 8.5
  const sizeLg = sizeBase + 2; // 12
  const sizeXl = sizeBase + 4; // 14
  const lineHeight = sizeBase * 1.4;

  // Theme Configuration (Dynamic based on user settings)
  const userColor = hexToPdfRgb(typography.color);
  const COLORS = {
    Primary: userColor,
    Secondary: userColor, // Simplify palette to user choice
    TextMain: userColor,
    TextLight: userColor, // Could be lighter, but keeping consistent
    BgAccent: hexToPdfRgb('#F0FDFA'), // Keep layout backgrounds subtle? Or neutral?
    BgLight: hexToPdfRgb('#F9FAFB'),
    Border: hexToPdfRgb('#E5E7EB'), // Keep structural borders gray
    Success: hexToPdfRgb('#059669'),
  };

  // Layout Constraints
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

  function drawFooter(targetPage: typeof page) {
    // Optional: Draw page numbers or small branding
  }

  async function acquirePage() {
    currentPageIndex += 1;
    let newPage;
    const shouldReuseTemplate = currentPageIndex === 0 || layout.overflowStrategy === 'reuse-template' || currentPageIndex < templateDoc.getPageCount();

    if (shouldReuseTemplate) {
      const sourceIndex = Math.min(currentPageIndex, templateDoc.getPageCount() - 1);
      const [copied] = await outputDoc.copyPages(templateDoc, [sourceIndex]);
      newPage = outputDoc.addPage(copied);
      activeHeaderPad = templateHeaderPad;
      activeFooterPad = templateFooterPad;
    } else {
      newPage = outputDoc.addPage([pageWidth, pageHeight]);
      activeHeaderPad = blankHeaderPad;
      activeFooterPad = blankFooterPad;
    }

    drawFooter(newPage);
    return newPage;
  }

  async function ensureRoom(requiredPx = lineHeight) {
    if (cursorY - requiredPx < activeFooterPad) {
      page = await acquirePage();
      cursorY = page.getHeight() - activeHeaderPad;
    }
  }

  // --- Helpers ---
  const drawLabelValue = (label: string, value: string, x: number, y: number, w: number, font = regularFont) => {
    const labelW = boldFont.widthOfTextAtSize(label, sizeSm);
    page.drawText(label, { x, y, size: sizeSm, font: boldFont, color: COLORS.TextLight });
    // Value below label
    if (value) {
      page.drawText(value, { x, y: y - sizeBase - 2, size: sizeBase, font, color: COLORS.TextMain });
    }
  };

  const drawSectionHeader = async (title: string, iconStr = '') => {
    await ensureRoom(lineHeight * 2);
    cursorY -= 6;

    // Teal left border accent
    page.drawLine({
      start: { x: leftPad, y: cursorY + 2 },
      end: { x: leftPad, y: cursorY - sizeLg + 2 },
      thickness: 3,
      color: COLORS.Primary
    });

    page.drawText(title.toUpperCase(), {
      x: leftPad + 8,
      y: cursorY - sizeLg + 4,
      size: sizeLg,
      font: boldFont,
      color: COLORS.Primary
    });

    cursorY -= lineHeight * 1.5;
  };

  // --- 1. Top Section: Date & Patient Grid ---
  // We'll create a 2-column feel: Left (Patient Details), Right (Vitals Box)

  const patient = payload.patientData?.patientDetails?.[0] || {} as PrescriptionPatientDetail;
  const vitals = payload.patientData?.vitals || {} as PrescriptionVitals;

  await ensureRoom(100); // Reserve rough space

  // A. Date (Top Right)
  const dateLabel = `Date: ${currentDateLabel}`;
  const dateW = boldFont.widthOfTextAtSize(dateLabel, sizeBase);
  page.drawText(dateLabel, {
    x: pageWidth - rightPad - dateW,
    y: cursorY,
    size: sizeBase,
    font: boldFont,
    color: COLORS.TextMain
  });
  cursorY -= lineHeight * 1.5;

  // B. Patient / Vitals Split
  const gap = 20;
  const vitalsW = (contentWidth * 0.35);
  const patientW = contentWidth - vitalsW - gap;

  const topSectionStartY = cursorY;

  // -- Patient Card --
  const pName = patient.name || 'Unknown Patient';
  const pAgeSex = [patient.age ? `${patient.age} Y` : '', patient.sex].filter(Boolean).join(' / ');
  const pUhid = patient.patientId ? `ID: ${patient.patientId}` : '';


  // Name (Large)
  page.drawText(pName, {
    x: leftPad,
    y: cursorY,
    size: sizeXl,
    font: boldFont,
    color: COLORS.TextMain
  });
  cursorY -= lineHeight * 1.2;

  // Info Grid (2x2ish)
  const gridW = patientW / 2;
  // Row 1
  drawLabelValue('AGE / GENDER', pAgeSex, leftPad, cursorY, gridW);
  drawLabelValue('UHID / MRN', pUhid, leftPad + gridW, cursorY, gridW);
  cursorY -= lineHeight * 2;

  // Row 2 (if exists)
  if (patient.address) {
    const address = [patient.address, patient.city].filter(Boolean).join(', ');

    // Draw Label manually
    page.drawText('Address', { x: leftPad, y: cursorY, size: sizeSm, font: boldFont, color: COLORS.TextLight });

    // Wrap Address Value
    const addressLines = wrapText(address, regularFont, sizeBase, patientW);
    let addressY = cursorY - sizeBase - 2;

    addressLines.forEach((line) => {
      page.drawText(line, { x: leftPad, y: addressY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      addressY -= lineHeight; // Move down for next line
    });

    // Update cursorY based on the number of lines, ensuring enough spacing
    cursorY = addressY - lineHeight;
  }

  // -- Vitals Card (Right Side) --
  const vitalsX = leftPad + patientW + gap;

  // Calculate vitals items first to determine height
  const vitalItems = [
    { l: 'BP', v: vitals.bp && (vitals.bp.sys || vitals.bp.dia) ? `${vitals.bp.sys}/${vitals.bp.dia}` : '' },
    { l: 'Pulse', v: vitals.pulse ? `${vitals.pulse}` : '' },
    { l: 'Temp', v: vitals.tempC ? `${vitals.tempC}` : '' },
    { l: 'SpO2', v: vitals.spo2 ? `${vitals.spo2}%` : '' },
    { l: 'Wt', v: vitals.weightKg ? `${vitals.weightKg}` : '' },
    { l: 'BMI', v: vitals.bmi ? `${vitals.bmi}` : '' },
  ].filter(x => x.v && x.v !== '0' && x.v !== '0/0' && x.v !== '0%');

  // Calculate proper height for vitals card
  const vitalsHeaderH = lineHeight + 4; // Reduced from 8
  const vitalsContentH = vitalItems.length > 0 ? (vitalItems.length * lineHeight) : lineHeight;
  const vitalsPadding = 4; // Reduced from 8
  const vitalsH = vitalsHeaderH + vitalsContentH + vitalsPadding;

  // Move vitals section up by adding offset (reduced for smaller margin below date)
  const vitalsVerticalOffset = lineHeight * 0.5; // Reduced from 1.5
  const vitalsTopY = topSectionStartY + vitalsVerticalOffset;

  if (vitalItems.length > 0) {
    page.drawRectangle({
      x: vitalsX,
      y: vitalsTopY - vitalsH,
      width: vitalsW,
      height: vitalsH,
      color: COLORS.BgAccent,
      borderRadius: 4,
    });

    // Vitals Header
    page.drawText('VITALS', {
      x: vitalsX + 8,
      y: vitalsTopY - 6,
      size: sizeSm,
      font: boldFont,
      color: COLORS.Primary
    });

    let vY = vitalsTopY - lineHeight - 4;
    const vX_Label = vitalsX + 8;
    const vX_Val = vitalsX + vitalsW - 10;

    vitalItems.forEach((vit) => {
      page.drawText(vit.l, { x: vX_Label, y: vY, size: sizeSm, font: regularFont, color: COLORS.TextLight });
      const valW = boldFont.widthOfTextAtSize(vit.v.toString(), sizeBase);
      page.drawText(vit.v.toString(), { x: vX_Val - valW, y: vY, size: sizeBase, font: boldFont, color: COLORS.TextMain });
      vY -= lineHeight;
    });

    // Ensure cursorY is below both patient info and vitals card
    const vitalsBottom = vitalsTopY - vitalsH;
    cursorY = Math.min(cursorY, vitalsBottom) - lineHeight;
  } else {
    // If no vitals, just ensure padding below patient info
    cursorY = cursorY - lineHeight;
  }



  // --- 2. Clinical Summary (Simplified Tabular) ---

  // Helper to draw a clean tabular cell (Simplified & Compact Inline)
  const renderTabularItem = async (title: string, content: string | undefined, x: number, w: number, isBoldValues = false): Promise<number> => {
    if (!content || !content.trim()) return 0;

    const labelFull = `${title.toUpperCase()}: `;
    const contentFont = isBoldValues ? boldFont : regularFont;
    const contentSize = isBoldValues ? sizeLg : sizeBase;
    const bulletChar = '•';
    const bulletWidth = contentFont.widthOfTextAtSize(bulletChar + ' ', contentSize);

    // Prepare content string
    const items = content.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const separator = ', ';
    const combinedContent = items.length > 0 ? items.join(separator) : content.trim();

    // Measurement for inline layout
    const labelW = boldFont.widthOfTextAtSize(labelFull, sizeSm);
    let currentX = x + labelW;
    let currentY = 0; // Relative Y

    // Custom wrapping for mixed style (Label + Content)
    const words = combinedContent.split(' ');
    const lines: { text: string; x: number; yOffset: number; isLabel?: boolean }[] = [];

    // Push Label
    lines.push({ text: labelFull, x: x, yOffset: 0, isLabel: true });

    let currentLine = '';

    words.forEach((word) => {
      const wordW = contentFont.widthOfTextAtSize(word + ' ', contentSize);
      const availableW = w - (currentX - x);

      if (wordW <= availableW) {
        currentLine += word + ' ';
        currentX += wordW;
      } else {
        // Push current line chunk
        if (currentLine) {
          lines.push({ text: currentLine, x: x + (currentX - wordW - contentFont.widthOfTextAtSize(currentLine, contentSize)), yOffset: currentY }); // x calc is tricky, simplifying
          // Actually, we just need to store the line content and where it started. 
          // But since we are building word by word, easier to just push completed lines.
          // Let's restart logic: accumulate words, if fail, push line.
        }
      }
    });

    // REWRITE WRAPPING LOGIC FOR SIMPLICITY AND CORRECTNESS
    const flowLines: { text: string; x: number; yOffset: number; font: PDFFont; size: number; color: RGB }[] = [];

    // Add Label
    flowLines.push({ text: labelFull, x: x, yOffset: 0, font: boldFont, size: sizeSm, color: COLORS.TextLight });

    let lineWords: string[] = [];
    let lineW = labelW; // Start with label width used on first line
    let lineIndex = 0;

    words.forEach(word => {
      const wordW = contentFont.widthOfTextAtSize(word + ' ', contentSize);
      if (lineW + wordW <= w) {
        lineWords.push(word);
        lineW += wordW;
      } else {
        // Flush current line
        flowLines.push({
          text: lineWords.join(' '),
          x: x + (lineIndex === 0 ? labelW : 0),
          yOffset: lineIndex * (contentSize * 1.3),
          font: contentFont,
          size: contentSize,
          color: COLORS.TextMain
        });

        // Start next line
        lineWords = [word];
        lineW = wordW; // Reset width (no label offset)
        lineIndex++;
      }
    });

    // Flush last line
    if (lineWords.length > 0) {
      flowLines.push({
        text: lineWords.join(' '),
        x: x + (lineIndex === 0 ? labelW : 0),
        yOffset: lineIndex * (contentSize * 1.3),
        font: contentFont,
        size: contentSize,
        color: COLORS.TextMain
      });
    }

    // Calculate total height
    const totalLines = lineIndex + 1;
    const totalH = (totalLines * (contentSize * 1.3)) + 4; // reduced padding

    if (cursorY - totalH < activeFooterPad) {
      page = await acquirePage();
      cursorY = page.getHeight() - activeHeaderPad;
    }

    const startY = cursorY;

    for (const item of flowLines) {
      page.drawText(item.text, {
        x: item.x,
        y: startY - sizeBase - item.yOffset, // Adjust baseline
        size: item.size,
        font: item.font,
        color: item.color
      });
    }

    return totalH;
  };

  if (payload.chiefComplaint || payload.history || payload.comorbidity || payload.examination) {
    await ensureRoom(lineHeight * 3);

    // 1. C/O
    const h1 = await renderTabularItem('Chief Complaint', payload.chiefComplaint, leftPad, contentWidth);
    if (h1 > 0) cursorY -= (h1 + 6);

    // 2. History & Comorbidities (Split Row)
    if (payload.history && payload.comorbidity && payload.history.trim() && payload.comorbidity.trim()) {
      const midGap = 10;
      const colW = (contentWidth - midGap) / 2;

      const startY = cursorY;
      // Lookahead render? No, just render
      const hH = await renderTabularItem('History', payload.history, leftPad, colW);

      // Reset Y for second col
      const afterH_Y = cursorY; // Where cursor would be
      cursorY = startY;
      const hC = await renderTabularItem('Comorbidity', payload.comorbidity, leftPad + colW + midGap, colW);

      const maxH = Math.max(hH, hC);
      cursorY = startY - maxH - 6;

    } else {
      // Sequential
      const hHist = await renderTabularItem('History', payload.history, leftPad, contentWidth);
      if (hHist) cursorY -= (hHist + 6);

      const hCom = await renderTabularItem('Comorbidity', payload.comorbidity, leftPad, contentWidth);
      if (hCom) cursorY -= (hCom + 6);
    }

    // 3. Examination
    const hExam = await renderTabularItem('Examination', payload.examination, leftPad, contentWidth);
    if (hExam) cursorY -= (hExam + 6);
  }

  // --- 2.5. Clinical Orders: Investigations & Procedures ---
  const investigations = payload.orders?.investigations || [];
  const procedures = payload.orders?.procedures || [];

  if (investigations.length > 0 || procedures.length > 0) {
    await ensureRoom(lineHeight * 3);

    const invStr = investigations.join(', ');
    const procStr = procedures.join(', ');

    if (investigations.length > 0 && procedures.length > 0) {
      // Side by Side
      const midGap = 10;
      const colW = (contentWidth - midGap) / 2;

      const startY = cursorY;

      const hInv = await renderTabularItem('Investigations', invStr, leftPad, colW, true); // Bold values? User didn't specify, but Diagnos is bold. Clinical Summary is not. Investigations usually not. Let's keep `false` for `isBoldValues` to match general text style, or `true` if emphasize. Previous drawOrderList used regularFont for items. So isBoldValues=false.
      // Wait, renderTabularItem defaults to false.

      // Reset Y for second col
      const afterInv_Y = cursorY;
      cursorY = startY;
      const hProc = await renderTabularItem('Procedures', procStr, leftPad + colW + midGap, colW, false);

      const maxH = Math.max(hInv, hProc);
      cursorY = startY - maxH - 15;

    } else {
      // Sequential
      if (investigations.length > 0) {
        const hInv = await renderTabularItem('Investigations', invStr, leftPad, contentWidth, false);
        if (hInv) cursorY -= (hInv + 6);
      }

      if (procedures.length > 0) {
        const hProc = await renderTabularItem('Procedures', procStr, leftPad, contentWidth, false);
        if (hProc) cursorY -= (hProc + 6);
      }
    }
  }

  // --- 2.7. Diagnosis (Moved after Investigations) ---
  if (payload.diagnosis) {
    await ensureRoom(lineHeight * 3);
    const hDiag = await renderTabularItem('Diagnosis', payload.diagnosis, leftPad, contentWidth, true);
    if (hDiag) cursorY -= (hDiag + 6);
    cursorY -= 4;
  }

  // --- 3. Rx: Medications Table ---
  if (payload.medications && payload.medications.length > 0) {
    await drawSectionHeader('Medications', 'Rx');

    // Table Config - Adjusted for spacing
    const cols = [
      { header: 'DRUG / BRAND', width: 0.30, align: 'left' },
      { header: 'DOSAGE', width: 0.20, align: 'left' },
      { header: 'FREQUENCY', width: 0.15, align: 'left' },
      { header: 'DURATION', width: 0.15, align: 'left' },
      { header: 'NOTES', width: 0.20, align: 'left' },
    ];

    // Header Bar
    const headerH = lineHeight + 8;
    page.drawRectangle({
      x: leftPad,
      y: cursorY - headerH + 6,
      width: contentWidth,
      height: headerH,
      color: COLORS.BgLight,
    });
    page.drawLine({
      start: { x: leftPad, y: cursorY - headerH + 6 },
      end: { x: pageWidth - rightPad, y: cursorY - headerH + 6 },
      thickness: 1,
      color: COLORS.Border
    });

    // Headers
    let curX = leftPad + 6;
    const textY = cursorY - 4;
    cols.forEach(col => {
      page.drawText(col.header, { x: curX, y: textY, size: sizeSm, font: boldFont, color: COLORS.TextLight });
      curX += (contentWidth * col.width);
    });
    cursorY -= headerH + 6;

    // Rows
    for (const med of payload.medications) {
      await ensureRoom(lineHeight * 1.8);

      let rX = leftPad + 6;
      const rY = cursorY;

      // Med Name
      const medName = med.drugName;
      const medSub = med.saltName ? `(${med.saltName})` : '';

      page.drawText(medName, { x: rX, y: rY, size: sizeBase, font: boldFont, color: COLORS.TextMain });
      if (medSub) {
        page.drawText(medSub, { x: rX, y: rY - 10, size: sizeSm - 1, font: regularFont, color: COLORS.TextLight });
      }
      rX += (contentWidth * cols[0].width);

      page.drawText(med.dose || '-', { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[1].width);

      page.drawText(med.frequency || '-', { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[2].width);

      page.drawText(med.duration || '-', { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[3].width);

      const inst = med.instructions || '-';
      if (regularFont.widthOfTextAtSize(inst, sizeBase) > (contentWidth * cols[4].width)) {
        page.drawText(inst.substring(0, 15) + '..', { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      } else {
        page.drawText(inst, { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      }

      const lineY = rY - (medSub ? 16 : 10) - 4;
      page.drawLine({
        start: { x: leftPad, y: lineY },
        end: { x: pageWidth - rightPad, y: lineY },
        thickness: 0.5,
        color: COLORS.BgLight
      });

      cursorY -= lineHeight * (medSub ? 1.8 : 1.4);
    }
    cursorY -= lineHeight;
  }

  // --- 4. Split Bottom Section: Orders | Follow-up ---
  await ensureRoom(lineHeight * 6);

  const initialBottomY = cursorY;

  // -- Left Col: Removed (Moved up) --
  // We keep the column structure if needed for future, or just use full width for Advice?
  // User asked to move Inv/Proc up. Advice/Followup stays here.
  // The original code was split column. Now Left Col is effectively empty.
  // We can just proceed with "Right Col" logic but maybe shift it left or keep it right?
  // Let's keep Advice/Follow-up on the right (or essentially taking up space as needed).
  // Actually, usually Advice looks better full width if there are no investigations.
  // But let's stick to the existing layout for Advice/Followup (Right Col originally) or make it fill?
  // Given "Split Bottom Section", let's make Advice/Followup take the full width now since Left is gone.

  const col2X = leftPad; // Start from left now
  const colWidth = contentWidth; // Full width

  // -- Right Col equivalent (now main content) --
  let rightY = initialBottomY;

  // Advice
  // Advice
  const adviceItems = (payload.nonPharmacologicalAdvice || []).filter(item => item.advice && item.advice.trim());

  if (adviceItems.length > 0) {
    page.drawText('ADVICE / INSTRUCTIONS', { x: col2X, y: rightY, size: sizeSm, font: boldFont, color: COLORS.Primary });
    rightY -= lineHeight;

    for (const item of adviceItems) {
      let t = item.advice;
      if (item.duration) t += ` (${item.duration})`;
      if (item.notes) t += ` - ${item.notes}`;

      const wrapped = wrapText(t, regularFont, sizeBase, colWidth - 8);

      wrapped.forEach((line, idx) => {
        // Verify space? Just render for now to match local pattern
        const prefix = idx === 0 ? '• ' : '  ';
        page.drawText(`${prefix}${line}`, { x: col2X + 4, y: rightY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
        rightY -= lineHeight;
      });
      rightY -= 2; // small gap between items
    }
    rightY -= (lineHeight - 2); // adjust remaining gap
  }

  // Follow Up Box
  // Follow Up Box
  if (payload.followUp && payload.followUp.followUpOn) {
    // 1. Calculate Content
    const instructions = [];

    // Date
    instructions.push({ type: 'header', text: 'NEXT FOLLOW UP' });
    instructions.push({ type: 'date', text: getFormattedDate(payload.followUp.followUpOn) });

    // Reason & Instructions Handling
    let reasonText = payload.followUp.reason;
    let instructionsText = payload.followUp.patientInstructions;

    // Handle case where reason is an object (unexpected payload structure)
    if (typeof reasonText === 'object' && reasonText !== null) {
      const rObj = reasonText as any;
      reasonText = rObj.reason || '';
      if (!instructionsText && rObj.patientInstructions) {
        instructionsText = rObj.patientInstructions;
      }
    }

    if (reasonText && typeof reasonText === 'string' && reasonText.trim()) {
      instructions.push({ type: 'subLabel', text: 'Reason:' });
      instructions.push({ type: 'text', text: reasonText });
    }

    // Instructions
    if (instructionsText && typeof instructionsText === 'string' && instructionsText.trim()) {
      instructions.push({ type: 'subLabel', text: 'Instructions:' });
      instructions.push({ type: 'text', text: instructionsText });
    }

    // 2. Measure Height
    let contentH = 8; // Top padding
    const innerW = colWidth - 20;

    const renderLines: { text: string; size: number; font: PDFFont; color: RGB; yOff: number }[] = [];

    for (const item of instructions) {
      if (item.type === 'header') {
        renderLines.push({ text: item.text, size: sizeSm, font: boldFont, color: COLORS.Primary, yOff: contentH });
        contentH += lineHeight;
      } else if (item.type === 'date') {
        renderLines.push({ text: item.text, size: sizeLg, font: boldFont, color: COLORS.TextMain, yOff: contentH });
        contentH += lineHeight * 1.5;
      } else if (item.type === 'subLabel') {
        renderLines.push({ text: item.text, size: sizeSm, font: boldFont, color: COLORS.TextLight, yOff: contentH });
        contentH += lineHeight;
      } else {
        // Text Body
        const lines = wrapText(item.text, regularFont, sizeBase, innerW);
        lines.forEach(l => {
          renderLines.push({ text: l, size: sizeBase, font: regularFont, color: COLORS.TextMain, yOff: contentH });
          contentH += lineHeight;
        });
        contentH += 4; // Gap after block
      }
    }

    contentH += 4; // Bottom padding

    // 3. Draw Box
    page.drawRectangle({
      x: col2X,
      y: rightY - contentH + 8,
      width: colWidth,
      height: contentH,
      color: COLORS.BgAccent,
      borderWidth: 0.5,
      borderColor: COLORS.Primary
    });

    // 4. Draw Content
    const startBoxY = rightY + 4; // Adjust baseline slightly relative

    for (const line of renderLines) {
      page.drawText(line.text, {
        x: col2X + 10,
        y: startBoxY - line.yOff - 4,
        size: line.size,
        font: line.font,
        color: line.color
      });
    }

    rightY -= contentH + lineHeight;
  }

  cursorY = rightY;

  // --- Referral (if enabled) ---
  if (payload.followUp?.referralEnabled && payload.followUp?.referral) {
    await ensureRoom(lineHeight * 4);

    page.drawText('REFERRAL', { x: leftPad, y: cursorY, size: sizeSm, font: boldFont, color: COLORS.Primary });
    cursorY -= lineHeight;

    const ref = payload.followUp.referral;
    if (ref.referredTo) {
      const referralText = `Referred to: ${ref.referredTo.specialty || ''} ${ref.referredTo.doctorName ? `- Dr. ${ref.referredTo.doctorName}` : ''}`.trim();
      page.drawText(referralText, { x: leftPad + 4, y: cursorY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      cursorY -= lineHeight;
    }

    if (ref.clinicalSummary && ref.clinicalSummary.trim()) {
      page.drawText('Clinical Summary:', { x: leftPad + 4, y: cursorY, size: sizeSm, font: boldFont, color: COLORS.TextLight });
      cursorY -= lineHeight;

      const summaryLines = wrapText(ref.clinicalSummary, regularFont, sizeBase, contentWidth - 8);
      for (const line of summaryLines) {
        await ensureRoom();
        page.drawText(line, { x: leftPad + 8, y: cursorY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
        cursorY -= lineHeight;
      }
    }

    cursorY -= lineHeight;
  }

  // --- Immunizations ---
  if (payload.immunizations && payload.immunizations.length > 0) {
    await ensureRoom(lineHeight * 4);

    page.drawText('IMMUNIZATIONS', { x: leftPad, y: cursorY, size: sizeSm, font: boldFont, color: COLORS.Primary });
    cursorY -= lineHeight;

    for (const imm of payload.immunizations) {
      await ensureRoom(lineHeight * 2);

      const immText = `• ${imm.name} - ${imm.status.toUpperCase()}`;
      page.drawText(immText, { x: leftPad + 4, y: cursorY, size: sizeBase, font: boldFont, color: COLORS.TextMain });
      cursorY -= lineHeight;

      const details: string[] = [];
      if (imm.date) details.push(`Date: ${getFormattedDate(imm.date)}`);
      if (imm.nextDueDate) details.push(`Next Due: ${getFormattedDate(imm.nextDueDate)}`);
      if (imm.doseNumber) details.push(`Dose #${imm.doseNumber}`);

      if (details.length > 0) {
        page.drawText(details.join(' | '), { x: leftPad + 8, y: cursorY, size: sizeSm, font: regularFont, color: COLORS.TextLight });
        cursorY -= lineHeight;
      }

      if (imm.remarks && imm.remarks.trim()) {
        page.drawText(`Remarks: ${imm.remarks}`, { x: leftPad + 8, y: cursorY, size: sizeSm, font: regularFont, color: COLORS.TextLight });
        cursorY -= lineHeight;
      }
    }

    cursorY -= lineHeight;
  }


  // --- 5. Certificates ---
  if (payload.certificates && payload.certificates.content) {
    await ensureRoom(lineHeight * 4);

    // Placeholder Replacement Logic
    let content = payload.certificates.content;
    const cert = payload.certificates;
    const pat = payload.patientData?.patientDetails?.[0];

    const replacements: Record<string, string> = {
      '{{patientName}}': pat?.name || '',
      '{{age}}': pat?.age?.toString() || '',
      '{{gender}}': pat?.sex || '',
      '{{patientId}}': pat?.patientId || '',
      '{{uhid}}': pat?.patientId || '', // Assuming uhid maps to patientId
      '{{appointmentDate}}': getFormattedDate(new Date()), // Defaulting to current date as appointment date wasn't explicit in payload top level
      '{{issuedDate}}': cert.issuedDate ? getFormattedDate(cert.issuedDate) : getFormattedDate(new Date()),
      '{{fromDate}}': cert.fromDate ? getFormattedDate(cert.fromDate) : '',
      '{{toDate}}': cert.toDate ? getFormattedDate(cert.toDate) : '',
      '{{fitnessStatus}}': cert.fitnessStatus || '',
      '{{diagnosis}}': payload.diagnosis || '',
      '{{remarks}}': cert.remarks || '',
    };

    Object.entries(replacements).forEach(([key, val]) => {
      content = content.replace(new RegExp(key, 'g'), val);
    });

    // Draw Certificate Content with newline preservation
    const paragraphs = content.split(/\r?\n/);

    cursorY -= lineHeight; // Spacing before cert

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        cursorY -= lineHeight; // Render empty line
        await ensureRoom();
        continue;
      }

      const lines = wrapText(paragraph, regularFont, sizeBase, contentWidth);
      for (const line of lines) {
        await ensureRoom();
        page.drawText(line, {
          x: leftPad,
          y: cursorY,
          size: sizeBase,
          font: regularFont,
          color: COLORS.TextMain
        });
        cursorY -= lineHeight;
      }
    }
  }

  // No signature

  const outputBytes = await outputDoc.save();
  const byteArray = Uint8Array.from(outputBytes);
  return new Blob([byteArray], { type: 'application/pdf' });
};
