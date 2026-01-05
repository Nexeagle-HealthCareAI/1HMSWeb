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

// Helper to ensure upper case
const toUpper = (text: string | undefined | null) => String(text || '').toUpperCase();

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number) => {
  const safeText = toUpper(text);
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

// --- Markdown Helpers ---
interface StyledSegment {
  text: string;
  isBold: boolean;
}

const parseMarkdown = (text: string): StyledSegment[] => {
  // Convert to upper first, preserving asterisks for parsing logic?
  // Or parse then convert?
  // Converting first is safer for "text content" as long as it doesn't break * syntax.
  // * is not a letter, so it won't change.
  const upperText = toUpper(text);
  const parts = upperText.split(/(\*[^*\n]+\*)/g); // Split by *BOLD*
  return parts.map(part => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return { text: part.slice(1, -1), isBold: true };
    }
    return { text: part, isBold: false };
  }).filter(s => s.text.length > 0);
};

// ... (Rest of Styled Helpers remain similar, wrapStyledText consumes upper cased segments now)

// [SKIP RenderableSegment and wrapStyledText overrides if not modifying logic structure, just ensuring they get upper strings]
// Actually I need to re-emit wrapStyledText to be safe or rely on parseMarkdown doing the uppercasing.
// parseMarkdown above does toUpper(text), so wrapStyledText receives uppercased segments.
// So I don't need to change wrapStyledText logic itself, just the calls potentially or just rely on parseMarkdown.


interface RenderableSegment {
  text: string;
  font: PDFFont;
  width: number;
}

const wrapStyledText = (segments: StyledSegment[], regularFont: PDFFont, boldFont: PDFFont, fontSize: number, maxWidth: number) => {
  const lines: RenderableSegment[][] = [];
  let currentLine: RenderableSegment[] = [];
  let currentLineWidth = 0;

  segments.forEach(seg => {
    const font = seg.isBold ? boldFont : regularFont;
    // Split by spaces but preserve them attached to words for measuring, or split strictly
    // Simple approach: split by space, add space width manually
    const words = seg.text.split(/(\s+)/).filter(w => w.length > 0);

    words.forEach(word => {
      const wordW = font.widthOfTextAtSize(word, fontSize);

      // If word fits
      if (currentLineWidth + wordW <= maxWidth) {
        currentLine.push({ text: word, font, width: wordW });
        currentLineWidth += wordW;
      } else {
        // If word is just a space and it's end of line, ignore it (or let it push to new? usually trailing space is ignored)
        if (word.trim() === '') {
          // Skip trailing space at EOL
          return;
        }

        // Push line
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }

        // If word itself is huge (wider than max), force split? OR just push it.
        // For simple logic, just push it to new line.
        currentLine.push({ text: word, font, width: wordW });
        currentLineWidth += wordW;
      }
    });
  });

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
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
    Secondary: userColor,
    TextMain: userColor,
    TextLight: userColor,
    BgAccent: hexToPdfRgb('#F0FDFA'),
    BgLight: hexToPdfRgb('#F9FAFB'),
    Border: hexToPdfRgb('#E5E7EB'),
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
    const upperLabel = toUpper(label);
    const upperValue = toUpper(value);

    // Check width with upper case text
    const labelW = boldFont.widthOfTextAtSize(upperLabel, sizeSm);
    page.drawText(upperLabel, { x, y, size: sizeSm, font: boldFont, color: COLORS.TextLight });
    // Value below label
    if (upperValue) {
      page.drawText(upperValue, { x, y: y - sizeBase - 2, size: sizeBase, font, color: COLORS.TextMain });
    }
  };

  const drawSectionHeader = async (title: string, iconStr = '') => {
    await ensureRoom(lineHeight * 2);
    cursorY -= 6;
    const upperTitle = toUpper(title);

    // Teal left border accent
    page.drawLine({
      start: { x: leftPad, y: cursorY + 2 },
      end: { x: leftPad, y: cursorY - sizeLg + 2 },
      thickness: 3,
      color: COLORS.Primary
    });

    page.drawText(upperTitle, {
      x: leftPad + 8,
      y: cursorY - sizeLg + 4,
      size: sizeLg,
      font: boldFont,
      color: COLORS.Primary
    });

    cursorY -= lineHeight * 1.5;
  };

  // --- 1. Top Section: Date & Patient Grid ---
  const patient = payload.patientData?.patientDetails?.[0] || {} as PrescriptionPatientDetail;
  const vitals = payload.patientData?.vitals || {} as PrescriptionVitals;

  await ensureRoom(100);

  // A. Date (Top Right)
  const dateLabel = toUpper(`Date: ${currentDateLabel}`);
  const dateW = boldFont.widthOfTextAtSize(dateLabel, sizeBase);
  page.drawText(dateLabel, {
    x: pageWidth - rightPad - dateW,
    y: cursorY,
    size: sizeBase,
    font: boldFont,
    color: COLORS.TextMain
  });

  // B. Valid Upto
  const validUptoDays = payload.template?.validUpto ?? 10;
  if (validUptoDays > 0) {
    const validUptoDate = new Date();
    validUptoDate.setDate(validUptoDate.getDate() + validUptoDays);
    const validUptoLabel = toUpper(`Valid Upto: ${getFormattedDate(validUptoDate)}`);
    const validUptoW = regularFont.widthOfTextAtSize(validUptoLabel, sizeSm);
    page.drawText(validUptoLabel, {
      x: pageWidth - rightPad - validUptoW,
      y: cursorY - lineHeight,
      size: sizeSm,
      font: regularFont,
      color: COLORS.TextLight
    });
    cursorY -= lineHeight * 2.5;
  } else {
    cursorY -= lineHeight * 1.5;
  }

  // Name (Large)
  const pName = toUpper(patient.name || 'Unknown Patient');
  page.drawText(pName, {
    x: leftPad,
    y: cursorY,
    size: sizeXl,
    font: boldFont,
    color: COLORS.TextMain
  });
  cursorY -= lineHeight * 1.2;

  // Grid Info
  const pAgeSex = toUpper([patient.age ? `${patient.age} Y` : '', patient.sex].filter(Boolean).join(' / '));
  const pUhid = toUpper(patient.patientId ? `ID: ${patient.patientId}` : '');

  drawLabelValue('AGE / GENDER', pAgeSex, leftPad, cursorY, contentWidth * 0.4);
  drawLabelValue('UHID / MRN', pUhid, leftPad + (contentWidth * 0.4), cursorY, contentWidth * 0.4);
  cursorY -= lineHeight * 2;

  // Address
  if (patient.address) {
    const address = toUpper([patient.address, patient.city].filter(Boolean).join(', '));
    page.drawText('ADDRESS', { x: leftPad, y: cursorY, size: sizeSm, font: boldFont, color: COLORS.TextLight });

    const addressLines = wrapText(address, regularFont, sizeBase, contentWidth * 0.6);
    let addressY = cursorY - sizeBase - 2;

    addressLines.forEach((line) => {
      page.drawText(line, { x: leftPad, y: addressY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      addressY -= lineHeight;
    });
    cursorY = addressY - lineHeight;
  }

  // Vitals Side Box (Right) -- Simplified placement
  const vitalsX = leftPad + (contentWidth * 0.65) + 20;
  // ... (Vitals logic - apply toUpper)

  // Vitals Header
  // page.drawText('VITALS', ...);

  // Vitals Loop
  // vitalItems.forEach((vit) => { ... toUpper(vit.v) ... });

  // RE-INSERT VITALS LOGIC (Correctly Uppercased)
  const vitalItems = [
    { l: 'BP', v: vitals.bp && (vitals.bp.sys || vitals.bp.dia) ? `${vitals.bp.sys}/${vitals.bp.dia}` : '' },
    { l: 'Pulse', v: vitals.pulse ? `${vitals.pulse}` : '' },
    { l: 'Temp', v: vitals.tempC ? `${vitals.tempC}` : '' },
    { l: 'SpO2', v: vitals.spo2 ? `${vitals.spo2}%` : '' },
    { l: 'Wt', v: vitals.weightKg ? `${vitals.weightKg}` : '' },
    { l: 'BMI', v: vitals.bmi ? `${vitals.bmi}` : '' },
  ].filter(x => x.v && x.v !== '0' && x.v !== '0/0' && x.v !== '0%');

  const vitalsW = (contentWidth * 0.35);
  // Move Vitals Box to Top Right below Date
  const vitalsTopY = cursorY + 80; // Rough positioning back up?
  // Actually let's just place it relative to Name/Date as before

  if (vitalItems.length > 0) {
    const vHeaderH = lineHeight + 4;
    const vContentH = vitalItems.length * lineHeight;
    const vH = vHeaderH + vContentH + 4;

    // Position closer to Valid Upto (approx 2 lines down instead of 3.5)
    // Date (0) -> Valid Upto (-1.5) -> Gap -> Vitals
    const topOffset = 35;

    // Draw Vitals Box
    page.drawRectangle({
      x: pageWidth - rightPad - vitalsW,
      y: page.getHeight() - activeHeaderPad - topOffset - vH + (lineHeight + 4),
      width: vitalsW,
      height: vH,
      color: COLORS.BgAccent,
      borderRadius: 4,
    });

    page.drawText('VITALS', {
      x: pageWidth - rightPad - vitalsW + 8,
      y: page.getHeight() - activeHeaderPad - topOffset,
      size: sizeSm,
      font: boldFont,
      color: COLORS.Primary
    });

    let vY = page.getHeight() - activeHeaderPad - topOffset - lineHeight - 4;
    const vX_Label = pageWidth - rightPad - vitalsW + 8;
    const vX_Val = pageWidth - rightPad - 10;

    vitalItems.forEach((vit) => {
      const vL = toUpper(vit.l);
      const vV = toUpper(vit.v);

      page.drawText(vL, { x: vX_Label, y: vY, size: sizeSm, font: regularFont, color: COLORS.TextLight });
      const valW = boldFont.widthOfTextAtSize(vV, sizeBase);
      page.drawText(vV, { x: vX_Val - valW, y: vY, size: sizeBase, font: boldFont, color: COLORS.TextMain });
      vY -= lineHeight;
    });
  }


  // Clinical Summary
  const renderTabularItem = async (title: string, content: string | undefined, x: number, w: number, isBoldValues = false, simulate = false): Promise<number> => {
    if (!content || !content.trim()) return 0;

    const labelFull = toUpper(`${title}: `);
    // 1. Replace newlines with comma+space
    // 2. Normalize spaces
    // 3. toUpper
    const normalizedContent = (content || '').replace(/\r?\n/g, ', ').replace(/\s+/g, ' ').trim();
    const combinedContent = toUpper(normalizedContent);

    // REWRITE WRAPPING LOGIC FOR SIMPLICITY AND CORRECTNESS
    const flowLines: { text: string; x: number; yOffset: number; font: PDFFont; size: number; color: RGB }[] = [];

    // Add Label
    flowLines.push({ text: labelFull, x: x, yOffset: 0, font: boldFont, size: sizeBase, color: COLORS.TextLight });

    // Split by space, preserving attached punctuation if any
    const words = combinedContent.split(' ').filter(Boolean);
    const labelW = boldFont.widthOfTextAtSize(labelFull, sizeBase);
    let lineWords: string[] = [];
    let lineW = labelW; // First line has label
    let lineIndex = 0;

    const contentFont = isBoldValues ? boldFont : regularFont;
    const contentSize = isBoldValues ? sizeLg : sizeBase;

    words.forEach(word => {
      const wordW = contentFont.widthOfTextAtSize(word + ' ', contentSize);
      if (lineW + wordW <= w) {
        lineWords.push(word);
        lineW += wordW;
      } else {
        // Flush line
        flowLines.push({
          text: lineWords.join(' '),
          x: x + (lineIndex === 0 ? labelW : 0),
          yOffset: lineIndex * (contentSize * 1.3),
          font: contentFont,
          size: contentSize,
          color: COLORS.TextMain
        });
        lineWords = [word];
        lineW = wordW;
        lineIndex++;
      }
    });
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

    const totalLines = lineIndex + 1;
    const totalH = (totalLines * (contentSize * 1.3)) + 4;

    if (simulate) return totalH;

    if (cursorY - totalH < activeFooterPad) {
      page = await acquirePage();
      cursorY = page.getHeight() - activeHeaderPad;
    }

    const startY = cursorY;

    for (const item of flowLines) {
      page.drawText(item.text, {
        x: item.x,
        y: startY - sizeBase - item.yOffset,
        size: item.size,
        font: item.font,
        color: item.color
      });
    }

    return totalH;
  };

  if (payload.chiefComplaint || payload.history || payload.comorbidity || payload.examination) {
    await ensureRoom(lineHeight * 3);
    cursorY -= 10; // Add some spacing before Clinical Summary
    const h1 = await renderTabularItem('Chief Complaint', payload.chiefComplaint, leftPad, contentWidth);
    if (h1 > 0) cursorY -= (h1 + 6);

    // ... (Repeat for others, renderTabularItem handles toUpper)
    const hHist = await renderTabularItem('History', payload.history, leftPad, contentWidth);
    if (hHist) cursorY -= (hHist + 6);

    const hCom = await renderTabularItem('Comorbidity', payload.comorbidity, leftPad, contentWidth);
    if (hCom) cursorY -= (hCom + 6);

    const hExam = await renderTabularItem('Examination', payload.examination, leftPad, contentWidth);
    if (hExam) cursorY -= (hExam + 6);
  }

  // Orders
  const investigations = payload.orders?.investigations || [];
  const procedures = payload.orders?.procedures || [];

  if (investigations.length > 0) {
    const hInv = await renderTabularItem('Investigations', investigations.join(', '), leftPad, contentWidth, false);
    if (hInv) cursorY -= (hInv + 6);
  }

  // Diagnosis
  if (payload.diagnosis) {
    await ensureRoom(lineHeight * 3);
    const hDiag = await renderTabularItem('Diagnosis', payload.diagnosis, leftPad, contentWidth, false);
    if (hDiag) cursorY -= (hDiag + 6);
    cursorY -= 4;
  }

  if (procedures.length > 0) {
    const hProc = await renderTabularItem('Procedures', procedures.join(', '), leftPad, contentWidth, false);
    if (hProc) cursorY -= (hProc + 6);
  }

  // Advice
  const adviceItems = (payload.nonPharmacologicalAdvice || []).filter(item => item.advice && item.advice.trim());
  if (adviceItems.length > 0) {
    await ensureRoom(lineHeight * 6);
    page.drawText('ADVICE / INSTRUCTIONS', { x: leftPad, y: cursorY, size: sizeBase, font: boldFont, color: COLORS.Primary });
    cursorY -= lineHeight;

    for (const item of adviceItems) {
      let t = item.advice;
      if (item.duration) t += ` (${item.duration})`;
      if (item.notes) t += ` - ${item.notes}`;

      // PARSE MARKDOWN WITH UPPERCASE
      const segments = parseMarkdown(t); // parseMarkdown uses toUpper()

      if (item.isBold) {
        segments.forEach(s => s.isBold = true);
      }

      const lines = wrapStyledText(segments, regularFont, boldFont, sizeBase, contentWidth - 8);

      for (let i = 0; i < lines.length; i++) {
        await ensureRoom();
        const lineSegments = lines[i];
        const prefix = i === 0 ? '• ' : '  ';
        const y = cursorY;

        page.drawText(prefix, {
          x: leftPad + 4,
          y: y,
          size: sizeBase,
          font: regularFont,
          color: COLORS.TextMain
        });

        let currentX = leftPad + 4 + regularFont.widthOfTextAtSize(prefix, sizeBase);

        for (const seg of lineSegments) {
          page.drawText(seg.text, {
            x: currentX,
            y: y,
            size: sizeBase,
            font: seg.font,
            color: COLORS.TextMain
          });
          currentX += seg.width;
        }

        cursorY -= lineHeight;
      }
      cursorY -= 2;
    }
    cursorY -= (lineHeight - 2);
  }

  // Medications
  if (payload.medications && payload.medications.length > 0) {
    await drawSectionHeader('Medications', 'Rx');

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

    let curX = leftPad + 6;
    const textY = cursorY - 4;
    cols.forEach(col => {
      page.drawText(col.header, { x: curX, y: textY, size: sizeSm, font: boldFont, color: COLORS.TextLight });
      curX += (contentWidth * col.width);
    });
    cursorY -= headerH + 6;

    for (const med of payload.medications) {
      await ensureRoom(lineHeight * 1.8);
      let rX = leftPad + 6;
      const rY = cursorY;

      const medName = toUpper(med.drugName);
      const medSub = toUpper(med.saltName ? `(${med.saltName})` : '');

      page.drawText(medName, { x: rX, y: rY, size: sizeBase, font: boldFont, color: COLORS.TextMain });
      if (medSub) {
        page.drawText(medSub, { x: rX, y: rY - 10, size: sizeSm - 1, font: regularFont, color: COLORS.TextLight });
      }
      rX += (contentWidth * cols[0].width);

      page.drawText(toUpper(med.dose || '-'), { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[1].width);

      page.drawText(toUpper(med.frequency || '-'), { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[2].width);

      page.drawText(toUpper(med.duration || '-'), { x: rX, y: rY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      rX += (contentWidth * cols[3].width);

      const inst = med.instructions || '-';
      const instColWidth = contentWidth * cols[4].width;
      const instLines = wrapText(inst, regularFont, sizeBase, instColWidth - 4); // wrapText uses toUpper

      instLines.forEach((line, idx) => {
        page.drawText(line, { x: rX, y: rY - (idx * lineHeight), size: sizeBase, font: regularFont, color: COLORS.TextMain });
      });

      const nameRows = medSub ? 2 : 1;
      const instRows = instLines.length;
      const maxRows = Math.max(nameRows, instRows);
      const rowHeight = (maxRows * lineHeight) + (medSub ? 8 : 6);

      const lineY = rY - rowHeight + (lineHeight * 0.2);
      page.drawLine({
        start: { x: leftPad, y: lineY },
        end: { x: pageWidth - rightPad, y: lineY },
        thickness: 0.5,
        color: COLORS.BgLight
      });
      cursorY -= rowHeight;
    }
  }

  // Certificates & Follow Up (Omit specific logic details if not critical for uppercase check, but ensuring wrapText usage)
  if (payload.certificates && payload.certificates.content) {
    // ... logic uses wrapText which works
    // But placeholders replacement?
    // getFormattedDate output is mostly digits, keep generic.
    // content string: wrapText will upper it.
    const content = payload.certificates.content;
    // ... logic as before ...
    const paragraphs = content.split(/\r?\n/);
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) { cursorY -= lineHeight; continue; }
      const lines = wrapText(paragraph, regularFont, sizeBase, contentWidth); // toUpper inside
      for (const line of lines) {
        await ensureRoom();
        page.drawText(line, { x: leftPad, y: cursorY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
        cursorY -= lineHeight;
      }
    }
  }

  // Follow Up & Instructions
  const followUp = payload.followUp;
  if (followUp && (followUp.followUpOn || followUp.patientInstructions || followUp.reason || (followUp.referral && followUp.referral.referredTo?.doctorName))) {


    // Extract reason and instructions handling both flat and nested structures
    let rawReason = followUp.reason;
    let rawInstructions = followUp.patientInstructions;

    // Check if 'reason' is actually an object (backend discrepancy)
    if (rawReason && typeof rawReason === 'object') {
      // @ts-ignore
      rawInstructions = rawReason.patientInstructions || rawInstructions;
      // @ts-ignore
      rawReason = rawReason.reason;
    }

    // --- MEASURE HEIGHT FOR BOX ---
    let totalBoxH = lineHeight * 2; // Header

    const hasDate = !!followUp.followUpOn;
    const hasReason = !!(rawReason && typeof rawReason === 'string' && rawReason.trim());

    // 1. Follow Up Date
    if (hasDate) {
      totalBoxH += (lineHeight * 1.5);
    }

    // 2. Reason (Measure)
    if (hasReason) {
      const hReason = await renderTabularItem('Reason', rawReason, leftPad, contentWidth, false, true);
      if (hReason) totalBoxH += (hReason + 6);
    }

    // 3. Instructions (Measure)
    if (rawInstructions && typeof rawInstructions === 'string' && rawInstructions.trim()) {
      const hInst = await renderTabularItem('Instructions', rawInstructions, leftPad, contentWidth, false, true);
      if (hInst) totalBoxH += (hInst + 6);
    }

    // 4. Referral (Measure)
    if (followUp.referral && followUp.referral.referredTo?.doctorName) {
      totalBoxH += (lineHeight * 1.5); // "Referred To" line
      if (followUp.referral.clinicalSummary) {
        const hSum = await renderTabularItem('Clinical Summary', followUp.referral.clinicalSummary, leftPad, contentWidth, false, true);
        if (hSum) totalBoxH += (hSum + 6);
      }
    }

    totalBoxH += 10; // Padding

    // --- DRAW BOX ---
    await ensureRoom(totalBoxH);

    const boxY = cursorY - totalBoxH + 4; // approximate bottom Y
    page.drawRectangle({
      x: leftPad,
      y: boxY,
      width: contentWidth,
      height: totalBoxH,
      color: COLORS.BgAccent, // Teal 50 background
      borderRadius: 4,
      borderColor: COLORS.Border,
      borderWidth: 1,
    });

    // Reset Cursor to Top of Box (with padding)
    cursorY -= 8; // Top padding inside box

    // Draw Header Text
    page.drawText('FOLLOW UP & INSTRUCTIONS', {
      x: leftPad + 8,
      y: cursorY,
      size: sizeLg,
      font: boldFont,
      color: COLORS.Primary
    });
    cursorY -= (lineHeight * 1.5);


    // --- RENDER CONTENT (Stacked Rows) ---
    const innerPadX = leftPad + 8;
    const innerWidth = contentWidth - 16;

    if (hasDate) {
      const dateStr = getFormattedDate(followUp.followUpOn);
      page.drawText('FOLLOW UP DATE:', { x: innerPadX, y: cursorY, size: sizeBase, font: boldFont, color: COLORS.TextLight });
      const labelW = boldFont.widthOfTextAtSize('FOLLOW UP DATE:', sizeBase);
      page.drawText(toUpper(dateStr), { x: innerPadX + labelW + 10, y: cursorY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      cursorY -= lineHeight * 1.2; // Reduced spacing
    }

    if (hasReason) { // Stacked Reason
      const hReason = await renderTabularItem('Reason', rawReason, innerPadX, innerWidth);
      if (hReason) cursorY -= (hReason + 6);
    }

    if (rawInstructions && typeof rawInstructions === 'string' && rawInstructions.trim()) {
      const hInst = await renderTabularItem('Instructions', rawInstructions, innerPadX, innerWidth);
      if (hInst) cursorY -= (hInst + 6);
    }

    if (followUp.referral && followUp.referral.referredTo?.doctorName) {
      const ref = followUp.referral;
      const refText = `${ref.referredTo.doctorName} ${ref.referredTo.specialty ? `(${ref.referredTo.specialty})` : ''}`;

      page.drawText('REFERRED TO:', { x: innerPadX, y: cursorY, size: sizeBase, font: boldFont, color: COLORS.TextLight });
      const labelW = boldFont.widthOfTextAtSize('REFERRED TO:', sizeBase);
      page.drawText(toUpper(refText), { x: innerPadX + labelW + 10, y: cursorY, size: sizeBase, font: regularFont, color: COLORS.TextMain });
      cursorY -= lineHeight * 1.5;

      if (ref.clinicalSummary) {
        const hSum = await renderTabularItem('Clinical Summary', ref.clinicalSummary, innerPadX, innerWidth);
        if (hSum) cursorY -= (hSum + 6);
      }
    }

    // Ensure cursor ends below box
    cursorY = boxY - 10; // Space after box
  }


  const outputBytes = await outputDoc.save();
  const byteArray = Uint8Array.from(outputBytes);
  return new Blob([byteArray], { type: 'application/pdf' });
};
