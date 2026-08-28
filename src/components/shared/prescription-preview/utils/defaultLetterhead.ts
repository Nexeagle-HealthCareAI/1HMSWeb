// Builds a minimal, branded A4 PDF to stand in for a doctor's letterhead when none has been
// uploaded (or the uploaded one fails to load) — used as the fallback template fed into
// buildTemplateBoundPreview, in place of the old bare-blank-page fallback. Same pdf-lib approach
// as generateTemplateBoundPrescription.ts / usePrescriptionDesigner.ts's ensureA4Compatibility.
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
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
  pincode?: string | null;
  contact?: string | null;
  alternateContact?: string | null;
  email?: string | null;
  website?: string | null;
  registrationNumber?: string | null;
  nabhNumber?: string | null;
}

export interface DefaultLetterheadDoctorInfo {
  name?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  department?: string | null;
  registration?: string | null;
  medicalCouncil?: string | null;
  registrationYear?: number | null;
  experienceYears?: number | null;
}

export interface GenerateDefaultLetterheadOptions {
  layout?: TemplateBoundLayoutConfig;
  hospital?: DefaultLetterheadHospitalInfo | null;
  doctor?: DefaultLetterheadDoctorInfo | null;
}

const truncateToWidth = (text: string, font: PDFFont, size: number, maxWidth: number) => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && font.widthOfTextAtSize(`${clipped}…`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
};

interface StackedLine {
  text: string;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  gap: number;
}

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

  // Draws lines top-down from startY, stopping (rather than overflowing past floorY) once the
  // reserved band runs out of room — a doctor with a small header/footer band configured still
  // gets the most important lines instead of text spilling into the printable content area.
  // null entries (a field with no data) are skipped without consuming space. The FIRST non-null
  // line (the identity line - doctor/clinic name) always draws regardless of floorY: margins and
  // header/footer height are user-configurable down to 0, and losing the name entirely to an
  // aggressively small band is worse than letting it sit a little close to the divider.
  const drawStackedLines = (
    startY: number,
    floorY: number,
    align: 'left' | 'right',
    maxWidth: number,
    lines: Array<StackedLine | null>,
  ) => {
    let y = startY;
    let drewIdentityLine = false;
    for (const line of lines) {
      if (!line) continue;
      if (drewIdentityLine && y < floorY) break;
      drewIdentityLine = true;
      const clipped = truncateToWidth(line.text, line.font, line.size, maxWidth);
      const x = align === 'right' ? rightEdge - line.font.widthOfTextAtSize(clipped, line.size) : leftPad;
      page.drawText(clipped, { x, y, size: line.size, font: line.font, color: line.color });
      y -= line.gap;
    }
  };

  // Header: doctor identity on the left, clinic identity on the right — two independent columns
  // sharing the same top Y, since the two blocks rarely have the same number of lines.
  const headerStartY = A4_HEIGHT_PT - mmToPt(12);
  const headerFloorY = headerBandBottomY + 2;

  const doctorName = doctor?.name?.trim();
  const qualificationLine = [doctor?.qualification, doctor?.specialization || doctor?.department].filter(Boolean).join('   |   ');
  const regParts = [
    doctor?.registration ? `Reg: ${doctor.registration}` : null,
    doctor?.medicalCouncil || null,
  ].filter(Boolean).join(' — ');
  const regLine = regParts + (doctor?.registrationYear ? ` (${doctor.registrationYear})` : '');
  const experienceLine = doctor?.experienceYears ? `${doctor.experienceYears}+ years experience` : '';

  drawStackedLines(headerStartY, headerFloorY, 'left', columnWidth, [
    doctorName ? { text: doctorName, font: boldFont, size: 12, color: TEXT_MAIN, gap: 14 } : null,
    qualificationLine ? { text: qualificationLine, font: regularFont, size: 9, color: TEXT_LIGHT, gap: 12 } : null,
    regLine ? { text: regLine, font: regularFont, size: 8.5, color: TEXT_LIGHT, gap: 11 } : null,
    experienceLine ? { text: experienceLine, font: regularFont, size: 8.5, color: TEXT_LIGHT, gap: 0 } : null,
  ]);

  const hospitalName = (hospital?.name || 'Hospital / Clinic').toUpperCase();
  const accreditationLine = [
    hospital?.registrationNumber ? `Reg No: ${hospital.registrationNumber}` : null,
    hospital?.nabhNumber ? `NABH: ${hospital.nabhNumber}` : null,
  ].filter(Boolean).join('   |   ');

  drawStackedLines(headerStartY, headerFloorY, 'right', columnWidth, [
    { text: hospitalName, font: boldFont, size: 14, color: PRIMARY, gap: 16 },
    accreditationLine ? { text: accreditationLine, font: regularFont, size: 8.5, color: TEXT_LIGHT, gap: 0 } : null,
  ]);

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

  // Footer: clinic address, then contact, then email/website — sourced from the Hospital record,
  // same fields the Hospital Branding Config page captures.
  const addressLine = [
    hospital?.location,
    hospital?.city,
    [hospital?.state, hospital?.pincode].filter(Boolean).join(' - '),
  ].filter(Boolean).join(', ');
  const phoneGroup = [hospital?.contact, hospital?.alternateContact].filter(Boolean).join(' / ');
  const contactLine = phoneGroup ? `Ph: ${phoneGroup}` : '';
  const emailWebLine = [hospital?.email, hospital?.website].filter(Boolean).join('   |   ');

  const footerStartY = Math.max(footerBandTopY - 11, mmToPt(6));
  const footerFloorY = mmToPt(5);

  drawStackedLines(footerStartY, footerFloorY, 'left', maxTextWidth, [
    addressLine ? { text: addressLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 11 } : null,
    contactLine ? { text: contactLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 11 } : null,
    emailWebLine ? { text: emailWebLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 0 } : null,
  ]);

  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'default-letterhead.pdf', { type: 'application/pdf' });
};
