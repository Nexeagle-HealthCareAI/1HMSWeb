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
  email?: string | null;
  registrationNumber?: string | null;
}

export interface DefaultLetterheadDoctorInfo {
  name?: string | null;
  qualification?: string | null;
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
  const rightEdge = A4_WIDTH_PT - rightPad;
  const maxTextWidth = A4_WIDTH_PT - leftPad - rightPad;
  const columnWidth = maxTextWidth * 0.55; // leaves a gutter so the two header columns can't collide
  const headerBandBottomY = A4_HEIGHT_PT - mmToPt(layout.margins.top + layout.headerHeight);
  const footerBandTopY = mmToPt(layout.margins.bottom + layout.footerHeight);

  const drawRightAligned = (text: string, font: import('pdf-lib').PDFFont, size: number, y: number, color: ReturnType<typeof rgb>) => {
    const clipped = truncateToWidth(text, font, size, columnWidth);
    page.drawText(clipped, { x: rightEdge - font.widthOfTextAtSize(clipped, size), y, size, font, color });
  };

  // Header: doctor identity on the left, clinic identity on the right — two independent columns
  // sharing the same top Y, since the two blocks rarely have the same number of lines.
  let leftCursorY = A4_HEIGHT_PT - mmToPt(12);
  const doctorName = doctor?.name?.trim();
  if (doctorName) {
    page.drawText(truncateToWidth(doctorName, boldFont, 12, columnWidth), { x: leftPad, y: leftCursorY, size: 12, font: boldFont, color: TEXT_MAIN });
    leftCursorY -= 14;
  }
  const qualificationLine = [doctor?.qualification, doctor?.specialization].filter(Boolean).join('   |   ');
  if (qualificationLine) {
    page.drawText(truncateToWidth(qualificationLine, regularFont, 9, columnWidth), { x: leftPad, y: leftCursorY, size: 9, font: regularFont, color: TEXT_LIGHT });
    leftCursorY -= 12;
  }
  if (doctor?.registration) {
    page.drawText(truncateToWidth(`Reg: ${doctor.registration}`, regularFont, 8.5, columnWidth), { x: leftPad, y: leftCursorY, size: 8.5, font: regularFont, color: TEXT_LIGHT });
  }

  const hospitalName = (hospital?.name || 'Hospital / Clinic').toUpperCase();
  drawRightAligned(hospitalName, boldFont, 14, A4_HEIGHT_PT - mmToPt(12), PRIMARY);

  page.drawLine({
    start: { x: leftPad, y: headerBandBottomY },
    end: { x: rightEdge, y: headerBandBottomY },
    thickness: 0.75,
    color: BORDER,
  });

  page.drawLine({
    start: { x: leftPad, y: footerBandTopY },
    end: { x: rightEdge, y: footerBandTopY },
    thickness: 0.75,
    color: BORDER,
  });

  // Footer: clinic address, then contact + email — sourced from the Hospital record, same fields
  // the Hospital Branding Config page captures.
  const addressLine = [hospital?.location, hospital?.city, hospital?.state].filter(Boolean).join(', ');
  const contactEmailLine = [
    hospital?.contact ? `Ph: ${hospital.contact}` : null,
    hospital?.email || null,
  ].filter(Boolean).join('   |   ');

  let footerCursorY = Math.max(footerBandTopY - 11, mmToPt(6));
  if (addressLine) {
    page.drawText(truncateToWidth(addressLine, regularFont, 8, maxTextWidth), { x: leftPad, y: footerCursorY, size: 8, font: regularFont, color: TEXT_LIGHT });
    footerCursorY -= 11;
  }
  if (contactEmailLine) {
    page.drawText(truncateToWidth(contactEmailLine, regularFont, 8, maxTextWidth), { x: leftPad, y: footerCursorY, size: 8, font: regularFont, color: TEXT_LIGHT });
  }

  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'default-letterhead.pdf', { type: 'application/pdf' });
};
