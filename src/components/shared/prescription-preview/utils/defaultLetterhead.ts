// Builds a minimal, branded A4 PDF to stand in for a doctor's letterhead when none has been
// uploaded (or the uploaded one fails to load) — used as the fallback template fed into
// buildTemplateBoundPreview, in place of the old bare-blank-page fallback. Same pdf-lib approach
// as generateTemplateBoundPrescription.ts / usePrescriptionDesigner.ts's ensureA4Compatibility.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { TemplateBoundLayoutConfig } from '../services/previewRenderer';

const MM_TO_PT = 72 / 25.4;
const mmToPt = (value: number) => value * MM_TO_PT;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// Same palette as previewRenderer.ts's COLORS.Primary / TextLight / Border, so a default
// letterhead doesn't look jarringly different from a custom-uploaded one in the same print run.
const PRIMARY = rgb(0x0f / 255, 0x76 / 255, 0x6e / 255);
const TEXT_MAIN = rgb(0x11 / 255, 0x18 / 255, 0x27 / 255);
const TEXT_LIGHT = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255);
const BORDER = rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255);

// Used whenever the caller has no per-doctor layout to hand in (e.g. InkRxPad, which never
// fetches a PrescriptionTemplateDescriptor) — matches prescriptionDetailsMapper's
// DEFAULT_PREVIEW_LAYOUT so a default letterhead reserves the same header/footer band either way.
const FALLBACK_LAYOUT: TemplateBoundLayoutConfig = {
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  headerHeight: 20,
  footerHeight: 15,
  overflowStrategy: 'reuse-template',
};

export interface DefaultLetterheadHospitalInfo {
  name?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  contact?: string | null;
  registrationNumber?: string | null;
}

export interface DefaultLetterheadDoctorInfo {
  name?: string | null;
  specialization?: string | null;
  registration?: string | null;
}

export interface GenerateDefaultLetterheadOptions {
  layout?: TemplateBoundLayoutConfig;
  hospital?: DefaultLetterheadHospitalInfo | null;
  doctor?: DefaultLetterheadDoctorInfo | null;
}

const truncateToWidth = (text: string, font: import('pdf-lib').PDFFont, size: number, maxWidth: number) => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && font.widthOfTextAtSize(`${clipped}…`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
};

export const generateDefaultLetterheadTemplate = async ({
  layout = FALLBACK_LAYOUT,
  hospital,
  doctor,
}: GenerateDefaultLetterheadOptions): Promise<File> => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const leftPad = mmToPt(layout.margins.left);
  const rightPad = mmToPt(layout.margins.right);
  const maxTextWidth = A4_WIDTH_PT - leftPad - rightPad;
  const headerBandBottomY = A4_HEIGHT_PT - mmToPt(layout.margins.top + layout.headerHeight);
  const footerBandTopY = mmToPt(layout.margins.bottom + layout.footerHeight);

  const hospitalName = truncateToWidth((hospital?.name || 'Hospital / Clinic').toUpperCase(), boldFont, 15, maxTextWidth);
  const addressLine = [hospital?.location, hospital?.city, hospital?.state].filter(Boolean).join(', ');
  const contactLine = [
    hospital?.contact ? `Ph: ${hospital.contact}` : null,
    hospital?.registrationNumber ? `Reg. No: ${hospital.registrationNumber}` : null,
  ].filter(Boolean).join('   |   ');
  const doctorName = doctor?.name?.trim();
  const doctorLine = doctorName
    ? [doctorName, doctor?.specialization, doctor?.registration ? `Reg: ${doctor.registration}` : null].filter(Boolean).join('   |   ')
    : null;

  let cursorY = A4_HEIGHT_PT - mmToPt(12);
  page.drawText(hospitalName, { x: leftPad, y: cursorY, size: 15, font: boldFont, color: PRIMARY });
  cursorY -= 16;

  if (addressLine) {
    page.drawText(truncateToWidth(addressLine, regularFont, 9, maxTextWidth), { x: leftPad, y: cursorY, size: 9, font: regularFont, color: TEXT_LIGHT });
    cursorY -= 12;
  }
  if (contactLine) {
    page.drawText(truncateToWidth(contactLine, regularFont, 9, maxTextWidth), { x: leftPad, y: cursorY, size: 9, font: regularFont, color: TEXT_LIGHT });
    cursorY -= 12;
  }
  if (doctorLine) {
    page.drawText(truncateToWidth(doctorLine, boldFont, 9.5, maxTextWidth), { x: leftPad, y: cursorY, size: 9.5, font: boldFont, color: TEXT_MAIN });
  }

  page.drawLine({
    start: { x: leftPad, y: headerBandBottomY },
    end: { x: A4_WIDTH_PT - rightPad, y: headerBandBottomY },
    thickness: 0.75,
    color: BORDER,
  });

  page.drawLine({
    start: { x: leftPad, y: footerBandTopY },
    end: { x: A4_WIDTH_PT - rightPad, y: footerBandTopY },
    thickness: 0.75,
    color: BORDER,
  });
  page.drawText('System-generated default letterhead — no custom letterhead uploaded for this doctor.', {
    x: leftPad,
    y: Math.max(footerBandTopY - 10, mmToPt(6)),
    size: 7,
    font: regularFont,
    color: TEXT_LIGHT,
  });

  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'default-letterhead.pdf', { type: 'application/pdf' });
};
