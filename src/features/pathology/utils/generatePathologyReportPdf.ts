import { PDFDocument, PDFFont, PDFPage, PDFEmbeddedPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import { PathologyResultFlag } from './resultFlagCalculator';
import { generateDefaultLetterheadTemplate, DefaultLetterheadHospitalInfo } from '@/components/shared/prescription-preview/utils/defaultLetterhead';
import { PathologyLetterheadMode } from '../services/pathologyService';
import { htmlToBlocks, type RichFontFamily, type StyledRun, type StyledBlock, type BlockAlign } from './richText';

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

// All 12 StandardFonts combinations needed to draw a StyledRun (richText.ts) -- Helvetica/
// TimesRoman/Courier x regular/bold/italic/bold-italic. All are built into pdf-lib with no font
// files to embed, which is exactly why richText.ts's formatting model is constrained to these
// three families: what's authored on screen is guaranteed drawable here, not an approximation.
const FONT_VARIANTS: Record<RichFontFamily, { regular: StandardFonts; bold: StandardFonts; italic: StandardFonts; boldItalic: StandardFonts }> = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique },
  TimesRoman: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique },
};

async function embedAllFonts(doc: PDFDocument): Promise<Map<string, PDFFont>> {
  const map = new Map<string, PDFFont>();
  for (const family of Object.keys(FONT_VARIANTS) as RichFontFamily[]) {
    const v = FONT_VARIANTS[family];
    map.set(`${family}|false|false`, await doc.embedFont(v.regular));
    map.set(`${family}|true|false`, await doc.embedFont(v.bold));
    map.set(`${family}|false|true`, await doc.embedFont(v.italic));
    map.set(`${family}|true|true`, await doc.embedFont(v.boldItalic));
  }
  return map;
}

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// A stored report value is an HTML string produced by RichTextField (see OrderResultEntry.tsx) --
// or, for any report authored before this feature existed, a plain string with no tags at all,
// which htmlToBlocks resolves to a single left-aligned, no-list block. Either way this is the one
// place a value gets turned into drawable blocks; no caller needs its own conversion step.
function valueToBlocks(value: string): StyledBlock[] {
  if (typeof document === 'undefined') return value ? [{ runs: [{ text: value }] }] : [];
  const div = document.createElement('div');
  div.innerHTML = value;
  return htmlToBlocks(div);
}

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
// Report Fields layout configured (see pathologyFieldLayoutApi.ts). `value` may contain
// RichTextField's HTML markup (bold/italic/color/font/size/lists/alignment) -- see valueToBlocks
// above.
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

  // Static, lab-wide manual sign-off labels (LabConfiguration.TechnicianName/PathologistName) --
  // not a per-report workflow (see the removed sign-off pipeline this does NOT resurrect). Drawn
  // once at the end of the whole document. PathologistName is commonly blank (many labs have no
  // in-house pathologist) and simply omits that line rather than printing it empty.
  technicianName?: string | null;
  pathologistName?: string | null;
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
      showRegistrationInFooter: true,
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
  const fontMap = await embedAllFonts(doc);

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

  const resolveFont = (run: StyledRun): PDFFont => {
    const family = run.fontFamily ?? 'Helvetica';
    return fontMap.get(`${family}|${!!run.bold}|${!!run.italic}`) ?? regularFont;
  };
  const resolveColor = (run: StyledRun, fallback: RGB): RGB => (run.color && hexToRgb(run.color)) || fallback;

  // pt-hanging indent for a bullet/number marker -- continuation lines of a wrapped list item start
  // here, under the item's own text, not under the marker.
  const BULLET_INDENT = 14;

  interface Word { text: string; font: PDFFont; size: number; color: RGB; width: number }

  // Mixed-font/size/color word-wrap, one block (paragraph/list-item) at a time -- each word is
  // measured and drawn with its OWN run's resolved font/size (falling back to baseSize/baseColor/
  // Helvetica for a run with no explicit style). An explicit '\n' run (a <br> within one block)
  // forces a hard line break instead of participating in wrapping. A block's `list` draws a marker
  // before its first wrapped line only (hanging indent); its `align` positions each wrapped line's
  // starting x within the available width, computed from that line's own total rendered width.
  const drawStyledBlocks = (
    blocks: StyledBlock[],
    opts: { x?: number; baseSize?: number; baseColor?: RGB; gapAfter?: number } = {},
  ) => {
    const x0 = opts.x ?? margins.left;
    const baseSize = opts.baseSize ?? 9.5;
    const baseColor = opts.baseColor ?? COLORS.text;

    for (const block of blocks) {
      const indent = block.list ? BULLET_INDENT : 0;
      const blockX = x0 + indent;
      const maxWidth = PAGE_WIDTH - margins.right - blockX;
      const align: BlockAlign = block.align ?? 'left';
      const marker = block.list ? (block.list.type === 'number' ? `${block.list.index}.` : '•') : null;

      const tokens: (Word | 'break')[] = [];
      for (const run of block.runs) {
        if (run.text === '\n') { tokens.push('break'); continue; }
        const font = resolveFont(run);
        const size = run.fontSize ?? baseSize;
        const color = resolveColor(run, baseColor);
        for (const w of run.text.split(/\s+/).filter(Boolean)) {
          tokens.push({ text: w, font, size, color, width: font.widthOfTextAtSize(w, size) });
        }
      }
      if (tokens.length === 0 && !marker) continue;

      let line: Word[] = [];
      let lineWidth = 0;
      let lineMaxSize = baseSize;
      let firstLineOfBlock = true;
      const spaceWidth = (w: Word) => w.font.widthOfTextAtSize(' ', w.size);

      const flush = () => {
        if (line.length === 0 && !(firstLineOfBlock && marker)) return;
        ensureRoom(lineMaxSize + 4);
        let startX = blockX;
        if (align === 'center') startX = blockX + Math.max(0, (maxWidth - lineWidth) / 2);
        else if (align === 'right') startX = blockX + Math.max(0, maxWidth - lineWidth);
        if (firstLineOfBlock && marker) {
          const markerFont = line[0]?.font ?? resolveFont({ text: '' });
          const markerSize = line[0]?.size ?? baseSize;
          page.drawText(marker, { x: x0, y: cursorY, size: markerSize, font: markerFont, color: baseColor });
        }
        let x = startX;
        for (const w of line) {
          page.drawText(w.text, { x, y: cursorY, size: w.size, font: w.font, color: w.color });
          x += w.width + spaceWidth(w);
        }
        cursorY -= lineMaxSize + 4;
        line = [];
        lineWidth = 0;
        lineMaxSize = baseSize;
        firstLineOfBlock = false;
      };

      for (const tok of tokens) {
        if (tok === 'break') { flush(); continue; }
        const addWidth = (line.length > 0 ? spaceWidth(tok) : 0) + tok.width;
        if (line.length > 0 && lineWidth + addWidth > maxWidth) {
          flush();
          line.push(tok);
          lineWidth = tok.width;
        } else {
          line.push(tok);
          lineWidth += addWidth;
        }
        lineMaxSize = Math.max(lineMaxSize, tok.size);
      }
      flush();
    }

    if (opts.gapAfter) cursorY -= opts.gapAfter;
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

  // --- Generic label+value section, shared by report-level fields and each line's note fields --
  // `value` may be RichTextField's HTML (bold/italic/color/font/size/lists/alignment) or a plain
  // legacy string; valueToBlocks handles both identically. The "Label: " prefix is prepended to the
  // first block's own runs (not a separate block) so it stays on the same line/list-marker as the
  // value's first line.
  const drawSection = (label: string, value: string) => {
    const plainCheck = value.replace(/<[^>]+>/g, '').trim();
    if (!plainCheck) return;
    ensureRoom(20);
    const blocks = valueToBlocks(value);
    const labelRun: StyledRun = { text: `${label}: ` };
    const withLabel: StyledBlock[] = blocks.length > 0
      ? [{ ...blocks[0], runs: [labelRun, ...blocks[0].runs] }, ...blocks.slice(1)]
      : [{ runs: [labelRun] }];
    drawStyledBlocks(withLabel, { baseSize: 9, baseColor: COLORS.muted, gapAfter: 3 });
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

  // --- Sign-off (Technician / Pathologist) -----------------------------------------------------
  // Static, lab-wide printed labels (LabConfiguration.TechnicianName/PathologistName) -- not the
  // removed per-report sign-off workflow. Drawn once at the end of the whole document (a report is
  // signed once, not per printed page). PathologistName is commonly blank and simply omits that
  // column rather than printing an empty one; if both are blank, no block is drawn at all.
  const technicianName = data.technicianName?.trim();
  const pathologistName = data.pathologistName?.trim();
  if (technicianName || pathologistName) {
    ensureRoom(46);
    cursorY -= 10;
    page.drawLine({
      start: { x: margins.left, y: cursorY }, end: { x: PAGE_WIDTH - margins.right, y: cursorY },
      thickness: 0.5, color: COLORS.border,
    });
    cursorY -= 16;
    const signOffColWidth = contentWidth / 2;
    if (technicianName) {
      page.drawText('Technician', { x: margins.left, y: cursorY, size: 8, font: regularFont, color: COLORS.muted });
      page.drawText(technicianName, { x: margins.left, y: cursorY - 12, size: 10, font: boldFont, color: COLORS.text });
    }
    if (pathologistName) {
      const x = margins.left + signOffColWidth;
      page.drawText('Pathologist', { x, y: cursorY, size: 8, font: regularFont, color: COLORS.muted });
      page.drawText(pathologistName, { x, y: cursorY - 12, size: 10, font: boldFont, color: COLORS.text });
    }
    cursorY -= 12;
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
