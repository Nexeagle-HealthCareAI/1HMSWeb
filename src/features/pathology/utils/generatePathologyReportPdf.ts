import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import QRCode from 'qrcode';
import { PathologyResultFlag } from './resultFlagCalculator';

const MM_TO_PT = 72 / 25.4;
const mmToPt = (value: number) => value * MM_TO_PT;

const PAGE_WIDTH = mmToPt(210);
const PAGE_HEIGHT = mmToPt(297);
const MARGIN = mmToPt(18);

const COLORS = {
  text: rgb(0.07, 0.09, 0.15),
  muted: rgb(0.4, 0.44, 0.5),
  border: rgb(0.85, 0.87, 0.9),
  headerBg: rgb(0.95, 0.96, 0.97),
  normal: rgb(0.07, 0.09, 0.15),
  abnormal: rgb(0.72, 0.45, 0.02), // amber-700
  critical: rgb(0.72, 0.11, 0.11), // red-700
};

const flagColor = (flag: PathologyResultFlag): RGB =>
  flag === 'CRITICAL_HIGH' || flag === 'CRITICAL_LOW' ? COLORS.critical
    : flag === 'HIGH' || flag === 'LOW' ? COLORS.abnormal
    : COLORS.normal;

// pdf-lib's StandardFonts only support WinAnsi encoding -- the ▲/▼ glyphs used for the on-screen
// live preview (resultFlagCalculator consumers) throw "WinAnsi cannot encode" here, so the PDF
// uses plain ASCII markers instead.
const flagSuffix = (flag: PathologyResultFlag): string => {
  switch (flag) {
    case 'CRITICAL_HIGH': return ' (H) CRITICAL';
    case 'CRITICAL_LOW': return ' (L) CRITICAL';
    case 'HIGH': return ' (H)';
    case 'LOW': return ' (L)';
    default: return '';
  }
};

export interface PathologyReportPdfParameter {
  name: string;
  unit?: string;
  value: string;
  flag: PathologyResultFlag;
  normalRangeLabel?: string;
}

export interface PathologyReportPdfLine {
  testName: string;
  testCode: string;
  parameters: PathologyReportPdfParameter[];
  interpretation?: string;
}

export interface PathologyReportPdfData {
  hospitalName: string;
  reportNo: string;
  orderNo: string;
  orderDate: string;
  patientName: string;
  patientId: string;
  patientAgeYears?: number | null;
  patientGender?: string | null;
  lines: PathologyReportPdfLine[];
  technicianName: string;
  technicianRegNo: string;
  technicianSignedAt: string;
  pathologistName: string;
  pathologistRegNo: string;
  approvedAt: string;
  verifyUrl: string;
}

// Purpose-built for pathology reports rather than reusing the prescription preview's richer
// markdown/theme renderer (previewRenderer.ts) -- a lab report's content is a flat results table
// plus a signature block, not free-form doctor-authored prose, so it doesn't need that machinery.
export async function generatePathologyReportPdf(data: PathologyReportPdfData): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, { margin: 1, width: 200 });
  const qrPngBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0));
  const qrImage = await doc.embedPng(qrPngBytes);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - MARGIN;
  };

  const ensureRoom = (height: number) => {
    if (cursorY - height < MARGIN) newPage();
  };

  const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  const drawLine = (
    text: string,
    opts: { font?: PDFFont; size?: number; color?: RGB; x?: number; gapAfter?: number } = {}
  ) => {
    const font = opts.font ?? regularFont;
    const size = opts.size ?? 9.5;
    const x = opts.x ?? MARGIN;
    ensureRoom(size + 4);
    page.drawText(text, { x, y: cursorY, size, font, color: opts.color ?? COLORS.text });
    cursorY -= size + (opts.gapAfter ?? 4);
  };

  // --- Header ---
  drawLine(data.hospitalName, { font: boldFont, size: 16, gapAfter: 4 });
  drawLine('Pathology Report', { font: regularFont, size: 10, color: COLORS.muted, gapAfter: 10 });
  page.drawLine({
    start: { x: MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - MARGIN, y: cursorY },
    thickness: 1, color: COLORS.border,
  });
  cursorY -= 14;

  // --- Patient / order info ---
  const ageGender = [
    data.patientAgeYears != null ? `${data.patientAgeYears}y` : null,
    data.patientGender ?? null,
  ].filter(Boolean).join(' / ');
  drawLine(`Patient: ${data.patientName}${ageGender ? ` (${ageGender})` : ''}`, { font: boldFont, size: 11, gapAfter: 3 });
  drawLine(`Patient ID: ${data.patientId}`, { gapAfter: 3 });
  drawLine(`Order No: ${data.orderNo}  |  Order Date: ${new Date(data.orderDate).toLocaleString()}`, { gapAfter: 3 });
  drawLine(`Report No: ${data.reportNo}`, { gapAfter: 12 });

  // --- Results per test line ---
  for (const line of data.lines) {
    ensureRoom(30);
    drawLine(`${line.testName} (${line.testCode})`, { font: boldFont, size: 11, gapAfter: 6 });

    const colParam = MARGIN;
    const colValue = MARGIN + contentWidth * 0.45;
    const colUnit = MARGIN + contentWidth * 0.65;
    const colRange = MARGIN + contentWidth * 0.78;

    ensureRoom(14);
    page.drawText('Parameter', { x: colParam, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Result', { x: colValue, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Unit', { x: colUnit, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Normal Range', { x: colRange, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    cursorY -= 4;
    page.drawLine({ start: { x: MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - MARGIN, y: cursorY }, thickness: 0.5, color: COLORS.border });
    cursorY -= 12;

    for (const p of line.parameters) {
      ensureRoom(14);
      const color = flagColor(p.flag);
      const valueText = `${p.value}${flagSuffix(p.flag)}`;
      page.drawText(p.name, { x: colParam, y: cursorY, size: 9, font: regularFont, color: COLORS.text });
      page.drawText(valueText, { x: colValue, y: cursorY, size: 9, font: boldFont, color });
      page.drawText(p.unit ?? '', { x: colUnit, y: cursorY, size: 9, font: regularFont, color: COLORS.muted });
      page.drawText(p.normalRangeLabel ?? '', { x: colRange, y: cursorY, size: 9, font: regularFont, color: COLORS.muted });
      cursorY -= 14;
    }

    if (line.interpretation) {
      cursorY -= 2;
      for (const wrapped of wrapText(`Interpretation: ${line.interpretation}`, regularFont, 9, contentWidth)) {
        drawLine(wrapped, { size: 9, color: COLORS.muted, gapAfter: 3 });
      }
    }
    cursorY -= 10;
  }

  // --- Signature block ---
  ensureRoom(90);
  cursorY -= 6;
  page.drawLine({ start: { x: MARGIN, y: cursorY }, end: { x: PAGE_WIDTH - MARGIN, y: cursorY }, thickness: 1, color: COLORS.border });
  cursorY -= 20;

  const sigColWidth = contentWidth / 2;
  const techX = MARGIN;
  const pathX = MARGIN + sigColWidth;
  const sigTopY = cursorY;

  page.drawText('Verified by (Lab Technician)', { x: techX, y: sigTopY, size: 8.5, font: boldFont, color: COLORS.muted });
  page.drawText(data.technicianName, { x: techX, y: sigTopY - 16, size: 10, font: boldFont, color: COLORS.text });
  page.drawText(`Reg. No: ${data.technicianRegNo}`, { x: techX, y: sigTopY - 30, size: 9, font: regularFont, color: COLORS.text });
  page.drawText(`Signed: ${new Date(data.technicianSignedAt).toLocaleString()}`, { x: techX, y: sigTopY - 44, size: 8.5, font: regularFont, color: COLORS.muted });

  page.drawText('Authorized by (Pathologist)', { x: pathX, y: sigTopY, size: 8.5, font: boldFont, color: COLORS.muted });
  page.drawText(data.pathologistName, { x: pathX, y: sigTopY - 16, size: 10, font: boldFont, color: COLORS.text });
  page.drawText(`Reg. No: ${data.pathologistRegNo}`, { x: pathX, y: sigTopY - 30, size: 9, font: regularFont, color: COLORS.text });
  page.drawText(`Approved: ${new Date(data.approvedAt).toLocaleString()}`, { x: pathX, y: sigTopY - 44, size: 8.5, font: regularFont, color: COLORS.muted });

  cursorY = sigTopY - 60;

  // --- QR verification block ---
  ensureRoom(70);
  const qrSize = 56;
  page.drawImage(qrImage, { x: MARGIN, y: cursorY - qrSize, width: qrSize, height: qrSize });
  page.drawText('Scan to verify this report is genuine', {
    x: MARGIN + qrSize + 10, y: cursorY - qrSize / 2 + 4, size: 8.5, font: regularFont, color: COLORS.muted,
  });

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
