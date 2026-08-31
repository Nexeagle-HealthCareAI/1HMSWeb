import { PDFDocument, PDFFont, PDFPage, PDFEmbeddedPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import { PathologyResultFlag } from './resultFlagCalculator';
import { generateDefaultLetterheadTemplate, DefaultLetterheadHospitalInfo } from '@/components/shared/prescription-preview/utils/defaultLetterhead';
import { PathologyLetterheadMode } from '../services/pathologyService';

const MM_TO_PT = 72 / 25.4;
const mmToPt = (value: number) => value * MM_TO_PT;

const PAGE_WIDTH = mmToPt(210);
const PAGE_HEIGHT = mmToPt(297);
const DEFAULT_MARGIN_MM = 18;

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

// A generic label+value section -- report-level fields and per-line note fields (Interpretation /
// Notes plus any hospital-added custom fields) both use this shape; there's no bespoke drawer per
// field since they're all just narrative label+value pairs, in whatever order the hospital's
// Report Fields layout configured (see pathologyFieldLayoutApi.ts).
export interface PathologyReportPdfField {
  label: string;
  value: string;
}

export interface PathologyReportPdfLine {
  testName: string;
  testCode: string;
  parameters: PathologyReportPdfParameter[];
  noteFields?: PathologyReportPdfField[];
}

export interface PathologyReportPdfMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
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
  // Report-level fields (Clinical History, Comments, ...) -- filled in once for the whole report,
  // drawn after the patient/order info block and before the per-test results. See
  // PathologyReportFieldLayoutEditor.tsx / pathologyFieldLayoutApi.ts.
  reportFields?: PathologyReportPdfField[];

  // Which source the header/footer artwork is drawn from -- omitted entirely (undefined) preserves
  // the original fixed plain-text header for any caller that predates this, CUSTOM_TEMPLATE/
  // SYSTEM_DEFAULT/BLANK_PREPRINTED are the three real modes a hospital picks from in the
  // Configurator (see LabConfiguration.LetterheadMode).
  letterheadMode?: PathologyLetterheadMode;
  // Fetchable URL of the hospital's default PathologyReportTemplate.headerBlobPath, used only when
  // letterheadMode is CUSTOM_TEMPLATE. If missing, or the fetch fails, falls back to the same
  // branded rendering as SYSTEM_DEFAULT rather than silently producing a blank medico-legal
  // document -- BLANK_PREPRINTED is the only mode that ever draws nothing, and only when chosen
  // deliberately.
  letterheadTemplateUrl?: string | null;
  // From the default template's layoutJson (mm). Falls back to a flat 18mm on every side.
  letterheadMargins?: PathologyReportPdfMargins | null;
  // Hospital branding fields for the SYSTEM_DEFAULT branch -- same shape prescription/discharge
  // already feed into generateDefaultLetterheadTemplate.
  hospitalBranding?: DefaultLetterheadHospitalInfo | null;
}

const resolveMargins = (margins: PathologyReportPdfMargins | null | undefined) => ({
  top: mmToPt(margins?.top ?? DEFAULT_MARGIN_MM),
  right: mmToPt(margins?.right ?? DEFAULT_MARGIN_MM),
  bottom: mmToPt(margins?.bottom ?? DEFAULT_MARGIN_MM),
  left: mmToPt(margins?.left ?? DEFAULT_MARGIN_MM),
});

// Resolves what (if anything) gets drawn as the page background, per LetterheadMode. Returns null
// for BLANK_PREPRINTED (deliberately nothing) and for the legacy no-mode-supplied case (the caller
// draws the original hardcoded text header itself instead). A CUSTOM_TEMPLATE that can't be
// fetched falls back to the same branded default SYSTEM_DEFAULT produces, rather than shipping a
// blank signed report because of a transient storage/network failure.
async function resolveLetterheadBackground(
  doc: PDFDocument,
  data: PathologyReportPdfData,
): Promise<PDFEmbeddedPage | null> {
  const mode = data.letterheadMode;
  if (!mode || mode === 'BLANK_PREPRINTED') return null;

  const embedFromBytes = async (bytes: Uint8Array) => {
    const [embedded] = await doc.embedPdf(bytes, [0]);
    return embedded;
  };

  if (mode === 'CUSTOM_TEMPLATE' && data.letterheadTemplateUrl) {
    try {
      const res = await fetch(data.letterheadTemplateUrl);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        return await embedFromBytes(bytes);
      }
    } catch (err) {
      console.error('Failed to fetch the configured pathology letterhead template, falling back to the system default.', err);
    }
  }

  // SYSTEM_DEFAULT, or CUSTOM_TEMPLATE with no usable template.
  try {
    const margins = data.letterheadMargins ?? { top: DEFAULT_MARGIN_MM, right: DEFAULT_MARGIN_MM, bottom: DEFAULT_MARGIN_MM, left: DEFAULT_MARGIN_MM };
    const defaultFile = await generateDefaultLetterheadTemplate({
      layout: { margins, headerHeight: 20, footerHeight: 15, overflowStrategy: 'reuse-template' },
      hospital: data.hospitalBranding,
    });
    const bytes = new Uint8Array(await defaultFile.arrayBuffer());
    return await embedFromBytes(bytes);
  } catch (err) {
    console.error('Failed to generate the default pathology letterhead, continuing with a blank header.', err);
    return null;
  }
}

// Purpose-built for pathology reports rather than reusing the prescription preview's richer
// markdown/theme renderer (previewRenderer.ts) -- a lab report's content is a flat results table,
// not free-form doctor-authored prose, so it doesn't need that machinery. No signature block: the
// technician/pathologist sign-off workflow was removed in favor of one freely repeatable "generate
// report" action, so this same function doubles as both the always-available preview (called with
// live, possibly-partial data before a PathologyReport row even exists) and the uploaded PDF.
export async function generatePathologyReportPdf(data: PathologyReportPdfData): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const background = await resolveLetterheadBackground(doc, data);
  const margins = resolveMargins(data.letterheadMargins);
  const contentWidth = PAGE_WIDTH - margins.left - margins.right;

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - margins.top;

  const drawBackground = (p: PDFPage) => {
    if (background) {
      p.drawPage(background, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
    }
  };
  drawBackground(page);

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBackground(page);
    cursorY = PAGE_HEIGHT - margins.top;
  };

  const ensureRoom = (height: number) => {
    if (cursorY - height < margins.bottom) newPage();
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
    const x = opts.x ?? margins.left;
    ensureRoom(size + 4);
    page.drawText(text, { x, y: cursorY, size, font, color: opts.color ?? COLORS.text });
    cursorY -= size + (opts.gapAfter ?? 4);
  };

  // --- Header ---
  // A resolved background (custom template or system-default) already carries its own hospital
  // identity in the reserved margin band -- drawing the plain-text header on top of it would
  // duplicate/collide with that artwork. Only the legacy no-mode-supplied path (data.letterheadMode
  // undefined) keeps the original fixed text header.
  if (!background && !data.letterheadMode) {
    drawLine(data.hospitalName, { font: boldFont, size: 16, gapAfter: 4 });
    drawLine('Pathology Report', { font: regularFont, size: 10, color: COLORS.muted, gapAfter: 10 });
    page.drawLine({
      start: { x: margins.left, y: cursorY }, end: { x: PAGE_WIDTH - margins.right, y: cursorY },
      thickness: 1, color: COLORS.border,
    });
    cursorY -= 14;
  }

  // --- Patient / order info ---
  const ageGender = [
    data.patientAgeYears != null ? `${data.patientAgeYears}y` : null,
    data.patientGender ?? null,
  ].filter(Boolean).join(' / ');
  drawLine(`Patient: ${data.patientName}${ageGender ? ` (${ageGender})` : ''}`, { font: boldFont, size: 11, gapAfter: 3 });
  drawLine(`Patient ID: ${data.patientId}`, { gapAfter: 3 });
  drawLine(`Order No: ${data.orderNo}  |  Order Date: ${new Date(data.orderDate).toLocaleString()}`, { gapAfter: 3 });
  drawLine(`Report No: ${data.reportNo}`, { gapAfter: 12 });

  // --- Generic label+value section, shared by report-level fields and each line's note fields ---
  const drawSection = (label: string, value: string) => {
    if (!value.trim()) return;
    ensureRoom(20);
    for (const wrapped of wrapText(`${label}: ${value}`, regularFont, 9, contentWidth)) {
      drawLine(wrapped, { size: 9, color: COLORS.muted, gapAfter: 3 });
    }
  };

  // --- Report-level fields (Clinical History, Comments, ...) ---
  if (data.reportFields?.length) {
    for (const field of data.reportFields) {
      drawSection(field.label, field.value);
    }
    cursorY -= 8;
  }

  // --- Results per test line ---
  for (const line of data.lines) {
    ensureRoom(30);
    drawLine(`${line.testName} (${line.testCode})`, { font: boldFont, size: 11, gapAfter: 6 });

    const colParam = margins.left;
    const colValue = margins.left + contentWidth * 0.45;
    const colUnit = margins.left + contentWidth * 0.65;
    const colRange = margins.left + contentWidth * 0.78;

    ensureRoom(14);
    page.drawText('Parameter', { x: colParam, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Result', { x: colValue, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Unit', { x: colUnit, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    page.drawText('Normal Range', { x: colRange, y: cursorY, size: 8.5, font: boldFont, color: COLORS.muted });
    cursorY -= 4;
    page.drawLine({ start: { x: margins.left, y: cursorY }, end: { x: PAGE_WIDTH - margins.right, y: cursorY }, thickness: 0.5, color: COLORS.border });
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

    if (line.noteFields?.length) {
      cursorY -= 2;
      for (const field of line.noteFields) {
        drawSection(field.label, field.value);
      }
    }
    cursorY -= 10;
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
