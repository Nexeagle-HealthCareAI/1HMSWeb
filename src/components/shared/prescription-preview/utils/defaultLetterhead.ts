// Builds a minimal, branded A4 PDF to stand in for a doctor's letterhead when none has been
// uploaded (or the uploaded one fails to load) — used as the fallback template fed into
// buildTemplateBoundPreview, in place of the old bare-blank-page fallback. Same pdf-lib approach
// as generateTemplateBoundPrescription.ts / usePrescriptionDesigner.ts's ensureA4Compatibility.
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString, type PDFFont, type PDFPage } from 'pdf-lib';
import type { TemplateBoundLayoutConfig } from '../services/previewRenderer';

const MM_TO_PT = 72 / 25.4;
const mmToPt = (value: number) => value * MM_TO_PT;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// Same palette as previewRenderer.ts's COLORS.Primary / TextLight / Border, so a default
// letterhead doesn't look jarringly different from a custom-uploaded one in the same print run.
const PRIMARY = rgb(0x0f / 255, 0x76 / 255, 0x6e / 255);
const PRIMARY_TINT = rgb(0xf0 / 255, 0xf9 / 255, 0xf8 / 255);
const TEXT_MAIN = rgb(0x11 / 255, 0x18 / 255, 0x27 / 255);
const TEXT_LIGHT = rgb(0x6b / 255, 0x72 / 255, 0x80 / 255);
const BORDER = rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255);
const WHITE = rgb(1, 1, 1);

const ACCENT_BAR_HEIGHT = mmToPt(1.3);
const DIVIDER_HAIRLINE_OFFSET = 2;

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
  // Repeats the header's Reg No/NABH line in the footer too -- off by default so prescription and
  // discharge-summary letterheads render exactly as before; pathology reports opt in (Indian
  // diagnostic-lab norms expect the registration number legible on every printed page, not just
  // wherever the header happens to land after pagination).
  showRegistrationInFooter?: boolean;
  // Ready-to-embed PNG bytes (NexEagle logo centered) for a "scan to chat on WhatsApp" QR, drawn
  // in a reserved slot on the right of the footer when present. Only pathology's SYSTEM_DEFAULT
  // path ever supplies this today -- prescriptions/discharge summaries already embed their own
  // document-specific QR elsewhere and don't need a second one here. Absent (the default for every
  // existing caller), the footer text simply uses the full width as before.
  whatsAppQrImageBytes?: Uint8Array | null;
}

const truncateToWidth = (text: string, font: PDFFont, size: number, maxWidth: number) => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && font.widthOfTextAtSize(`${clipped}…`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
};

// Initials for the hospital/lab monogram badge -- "Test Hospitalyyy" -> "TH", a single-word name
// falls back to its first two letters. Purely decorative, computed from data already passed in
// (hospital.name), so it needs no logo-upload feature to exist.
const initialsFrom = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const normalizeWebUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// pdf-lib has no high-level "add a clickable link" API -- this is the standard low-level cookbook
// pattern (construct the /Subtype /Link annotation dict directly and append it to the page's
// /Annots array).
const addLinkAnnotation = (
  doc: PDFDocument,
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  uri: string,
) => {
  const linkRef = doc.context.register(
    doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) },
    }),
  );
  const existing = page.node.Annots();
  const annots = existing ? [...existing.asArray(), linkRef] : [linkRef];
  page.node.set(PDFName.of('Annots'), doc.context.obj(annots));
};

interface StackedLine {
  text: string;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  gap: number;
  // When set, the drawn line becomes a clickable link (mailto:/tel:/https:) over its own text.
  href?: string;
}

export const generateDefaultLetterheadTemplate = async ({
  layout = FALLBACK_LAYOUT,
  hospital,
  doctor,
  showRegistrationInFooter,
  whatsAppQrImageBytes,
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

  // --- Premium dressing: top/bottom accent bars + a light tint wash behind each reserved band ---
  page.drawRectangle({ x: 0, y: A4_HEIGHT_PT - ACCENT_BAR_HEIGHT, width: A4_WIDTH_PT, height: ACCENT_BAR_HEIGHT, color: PRIMARY });
  page.drawRectangle({
    x: 0, y: headerBandBottomY,
    width: A4_WIDTH_PT, height: A4_HEIGHT_PT - ACCENT_BAR_HEIGHT - headerBandBottomY,
    color: PRIMARY_TINT,
  });
  page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH_PT, height: ACCENT_BAR_HEIGHT, color: PRIMARY });
  page.drawRectangle({
    x: 0, y: ACCENT_BAR_HEIGHT,
    width: A4_WIDTH_PT, height: Math.max(0, footerBandTopY - ACCENT_BAR_HEIGHT),
    color: PRIMARY_TINT,
  });

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
      const width = line.font.widthOfTextAtSize(clipped, line.size);
      const x = align === 'right' ? rightEdge - width : leftPad;
      page.drawText(clipped, { x, y, size: line.size, font: line.font, color: line.color });
      if (line.href) {
        addLinkAnnotation(doc, page, { x, y: y - line.size * 0.22, width, height: line.size * 1.3 }, line.href);
      }
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

  // Clinic/lab identity: a circular monogram badge drawn just left of the name, both right-aligned
  // as a unit against the header's right edge.
  const hospitalNameRaw = hospital?.name || 'Hospital / Clinic';
  const hospitalName = hospitalNameRaw.toUpperCase();
  const nameFont = boldFont;
  const nameSize = 14;
  const badgeRadius = 12;
  const badgeGap = 8;
  const clippedName = truncateToWidth(hospitalName, nameFont, nameSize, columnWidth - badgeRadius * 2 - badgeGap);
  const nameWidth = nameFont.widthOfTextAtSize(clippedName, nameSize);
  const nameX = rightEdge - nameWidth;
  const badgeCenterX = nameX - badgeGap - badgeRadius;
  const badgeCenterY = headerStartY + 3;

  page.drawCircle({ x: badgeCenterX, y: badgeCenterY, size: badgeRadius, color: PRIMARY });
  const initials = initialsFrom(hospitalNameRaw);
  if (initials) {
    const initialsSize = 10;
    const initialsWidth = boldFont.widthOfTextAtSize(initials, initialsSize);
    page.drawText(initials, {
      x: badgeCenterX - initialsWidth / 2, y: badgeCenterY - initialsSize * 0.36,
      size: initialsSize, font: boldFont, color: WHITE,
    });
  }
  page.drawText(clippedName, { x: nameX, y: headerStartY, size: nameSize, font: nameFont, color: PRIMARY });

  const accreditationLine = [
    hospital?.registrationNumber ? `Reg No: ${hospital.registrationNumber}` : null,
    hospital?.nabhNumber ? `NABH: ${hospital.nabhNumber}` : null,
  ].filter(Boolean).join('   |   ');

  drawStackedLines(headerStartY - 16, headerFloorY, 'right', columnWidth, [
    accreditationLine ? { text: accreditationLine, font: regularFont, size: 8.5, color: TEXT_LIGHT, gap: 0 } : null,
  ]);

  // Two-tone divider (thicker brand line + thin hairline) at the header/content boundary.
  page.drawLine({ start: { x: leftPad, y: headerBandBottomY }, end: { x: rightEdge, y: headerBandBottomY }, thickness: 1.4, color: PRIMARY });
  page.drawLine({
    start: { x: leftPad, y: headerBandBottomY - DIVIDER_HAIRLINE_OFFSET },
    end: { x: rightEdge, y: headerBandBottomY - DIVIDER_HAIRLINE_OFFSET },
    thickness: 0.5, color: BORDER,
  });

  // Same two-tone divider at the content/footer boundary.
  page.drawLine({ start: { x: leftPad, y: footerBandTopY }, end: { x: rightEdge, y: footerBandTopY }, thickness: 1.4, color: PRIMARY });
  page.drawLine({
    start: { x: leftPad, y: footerBandTopY + DIVIDER_HAIRLINE_OFFSET },
    end: { x: rightEdge, y: footerBandTopY + DIVIDER_HAIRLINE_OFFSET },
    thickness: 0.5, color: BORDER,
  });

  // Footer: clinic address, then contact/email/website (each independently clickable), then --
  // sourced from the Hospital record, same fields the Hospital Branding Config page captures.
  const addressLine = [
    hospital?.location,
    hospital?.city,
    [hospital?.state, hospital?.pincode].filter(Boolean).join(' - '),
  ].filter(Boolean).join(', ');
  const phoneGroup = [hospital?.contact, hospital?.alternateContact].filter(Boolean).join(' / ');
  const contactLine = phoneGroup ? `Ph: ${phoneGroup}` : '';
  const primaryPhoneDigits = (hospital?.contact || hospital?.alternateContact || '').replace(/[^\d+]/g, '');
  const emailLine = hospital?.email ? `Email: ${hospital.email}` : '';
  const websiteLine = hospital?.website ? `Web: ${hospital.website}` : '';

  // Reserve a slot on the right for the WhatsApp QR, when supplied -- shrinks the text column
  // rather than overlapping it.
  const qrGap = mmToPt(4);
  const qrSlotWidth = whatsAppQrImageBytes ? mmToPt(20) + qrGap : 0;
  const footerTextMaxWidth = maxTextWidth - qrSlotWidth;

  const footerStartY = Math.max(footerBandTopY - 11, mmToPt(6));
  const footerFloorY = mmToPt(5);

  drawStackedLines(footerStartY, footerFloorY, 'left', footerTextMaxWidth, [
    addressLine ? { text: addressLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 11 } : null,
    contactLine ? { text: contactLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 11, href: primaryPhoneDigits ? `tel:${primaryPhoneDigits}` : undefined } : null,
    emailLine ? { text: emailLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 11, href: hospital?.email ? `mailto:${hospital.email}` : undefined } : null,
    websiteLine ? { text: websiteLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: showRegistrationInFooter && accreditationLine ? 11 : 0, href: hospital?.website ? normalizeWebUrl(hospital.website) : undefined } : null,
    showRegistrationInFooter && accreditationLine ? { text: accreditationLine, font: regularFont, size: 8, color: TEXT_LIGHT, gap: 0 } : null,
  ]);

  if (whatsAppQrImageBytes) {
    try {
      const qrImage = await doc.embedPng(whatsAppQrImageBytes);
      const qrSize = Math.max(24, Math.min(mmToPt(16), footerBandTopY - mmToPt(5)));
      const qrX = rightEdge - qrSize;
      const qrY = Math.max(mmToPt(5), footerBandTopY - qrSize - mmToPt(3));

      // Thin vertical divider separating the text block from the QR block.
      page.drawLine({
        start: { x: qrX - qrGap / 2, y: footerBandTopY - 2 },
        end: { x: qrX - qrGap / 2, y: mmToPt(4) },
        thickness: 0.5, color: BORDER,
      });

      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

      const captionText = 'Scan to chat on WhatsApp';
      const captionSize = 6.5;
      const captionWidth = regularFont.widthOfTextAtSize(captionText, captionSize);
      page.drawText(captionText, {
        x: qrX + qrSize / 2 - Math.min(captionWidth, qrSize + 24) / 2,
        y: Math.max(mmToPt(2), qrY - 9),
        size: captionSize,
        font: regularFont,
        color: TEXT_LIGHT,
      });
    } catch (err) {
      console.error('Failed to embed the WhatsApp QR into the default letterhead footer, continuing without it.', err);
    }
  }

  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'default-letterhead.pdf', { type: 'application/pdf' });
};
