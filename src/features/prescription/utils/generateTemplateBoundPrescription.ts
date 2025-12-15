import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { MarginConfig, PrescriptionDesignerData, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';

const MM_TO_PT = 72 / 25.4;

const fontMap: Record<TypographySettings['family'], { regular: StandardFonts; bold: StandardFonts }> = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
  Arial: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Georgia: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
};

const hexToRgb = (hex: string | undefined) => {
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

const mmToPt = (value: number) => value * MM_TO_PT;

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

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
};

export interface TemplateBoundLayoutConfig {
  margins: MarginConfig;
  headerHeight: number;
  footerHeight: number;
  overflowStrategy: 'reuse-template' | 'blank';
}

interface GenerateTemplateBoundPrescription {
  templateFile: File;
  layout: TemplateBoundLayoutConfig;
  typography: TypographySettings;
  prescription: PrescriptionDesignerData;
}

export const generateTemplateBoundPrescription = async ({ templateFile, layout, typography, prescription }: GenerateTemplateBoundPrescription) => {
  const templateBytes = await templateFile.arrayBuffer();
  const templateDoc = await PDFDocument.load(templateBytes);
  const outputDoc = await PDFDocument.create();

  if (templateDoc.getPageCount() === 0) {
    throw new Error('Template PDF has no pages to render.');
  }

  const basePage = templateDoc.getPage(0);
  const pageWidth = basePage.getWidth();
  const pageHeight = basePage.getHeight();

  const fontDefinition = fontMap[typography.family] ?? fontMap.Helvetica;
  const regularFont = await outputDoc.embedFont(fontDefinition.regular);
  const boldFont = await outputDoc.embedFont(fontDefinition.bold);
  const color = hexToRgb(typography.color);

  const textSize = typography.size > 0 ? typography.size : 12;
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

  async function acquirePage() {
    currentPageIndex += 1;
    const shouldReuseTemplate = currentPageIndex === 0 || layout.overflowStrategy === 'reuse-template' || currentPageIndex < templateDoc.getPageCount();
    if (shouldReuseTemplate) {
      const sourceIndex = Math.min(currentPageIndex, templateDoc.getPageCount() - 1);
      const [copied] = await outputDoc.copyPages(templateDoc, [sourceIndex]);
      activeHeaderPad = templateHeaderPad;
      activeFooterPad = templateFooterPad;
      return outputDoc.addPage(copied);
    }
    activeHeaderPad = blankHeaderPad;
    activeFooterPad = blankFooterPad;
    return outputDoc.addPage([pageWidth, pageHeight]);
  }

  async function ensureRoom(required = lineHeight) {
    if (cursorY - required < activeFooterPad) {
      page = await acquirePage();
      cursorY = page.getHeight() - activeHeaderPad;
    }
  }

  const writeLine = async (text: string, options?: { bold?: boolean }) => {
    const font = options?.bold
      ? boldFont
      : typography.weight === 'bold'
        ? boldFont
        : regularFont;
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

  const writeList = async (title: string, items: string[]) => {
    if (!items.length) return;
    await writeLine(title, { bold: true });
    for (let index = 0; index < items.length; index += 1) {
      await writeLine(`${index + 1}. ${items[index]}`);
    }
    cursorY -= lineHeight / 2;
  };

  const patient = prescription.patient ?? { name: '', id: '', age: '', gender: '', phone: '' };
  const patientAddress = (() => {
    const fromDetails = patient.details?.find((detail) => detail.label?.toLowerCase().includes('address'))?.value;
    const fromField = (patient as { address?: string }).address;
    return fromDetails || fromField || '';
  })();
  const doctor = prescription.doctor ?? null;
  const visit = prescription.visit ?? { date: '', location: '', followUp: '' };
  const vitals =
    prescription.vitals ?? {
      bloodPressure: '',
      pulse: '',
      temperature: '',
      spo2: '',
      height: '',
      weight: '',
      bmi: '',
    };
  const chiefComplaints = ensureStringArray(prescription.chiefComplaints);
  const comorbidities = ensureStringArray(prescription.comorbidities);
  const investigations = ensureStringArray(prescription.investigations);
  const advice = ensureStringArray(prescription.advice);
  const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  const notes = prescription.notes ?? '';
  const resolvedVisitDate = visit.date ? new Date(visit.date).toLocaleDateString() : '';

  await writeLine('Patient Information', { bold: true });
  await writeLine(`Patient ID: ${patient.id || '—'} Name: ${patient.name || '—'} Age: ${patient.age || '—'} Gender: ${patient.gender || '—'}`);
  if (patientAddress) {
    await writeLine(`Address: ${patientAddress}`);
  }
  await writeLine(`Phone: ${patient.phone || '—'}`);
  cursorY -= lineHeight / 2;

  if (doctor) {
    await writeLine(`Doctor: ${doctor.name || '—'} (${doctor.specialization || '—'})`, { bold: true });
    await writeLine(`Registration: ${doctor.registration || '—'}`);
    await writeLine(`Clinic: ${doctor.clinic || '—'}`);
    cursorY -= lineHeight / 2;
  }

  await writeLine(`Visit date: ${resolvedVisitDate || '—'}`);
  await writeLine(`Location: ${visit.location || '—'}`);
  await writeLine(`Follow-up: ${visit.followUp || '—'}`);
  cursorY -= lineHeight / 2;

  await writeLine(`Vitals: BP ${vitals.bloodPressure || '—'} | Pulse ${vitals.pulse || '—'} | Temp ${vitals.temperature || '—'} | SpO2 ${vitals.spo2 || '—'}`);
  cursorY -= lineHeight / 2;

  await writeList('Chief complaints:', chiefComplaints);
  await writeList('Comorbidities:', comorbidities);
  await writeList('Investigations:', investigations);

  if (medicines.length) {
    await writeLine('Medicines:', { bold: true });
    for (let index = 0; index < medicines.length; index += 1) {
      const med = medicines[index];
      if (!med) continue;
      await writeLine(`${index + 1}. ${med.name || '—'} - ${med.dose || '—'} - ${med.frequency || '—'} - ${med.duration || '—'}`);
      if (med.notes) {
        await writeLine(`Notes: ${med.notes}`);
      }
    }
    cursorY -= lineHeight / 2;
  }

  await writeList('Advice:', advice);
  await writeLine(`Notes: ${notes || '—'}`);

  const outputBytes = await outputDoc.save();
  const byteArray = Uint8Array.from(outputBytes);
  return new Blob([byteArray], { type: 'application/pdf' });
};
