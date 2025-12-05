import { jsPDF } from 'jspdf';
import { MarginConfig, PrescriptionDesignerData, TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';

export interface GeneratePrescriptionLayoutConfig {
  margins: MarginConfig;
  headerHeight: number;
  footerHeight: number;
  overflowStrategy: 'reuse-template' | 'blank';
  templateBackgroundDataUrl?: string;
}

export interface GeneratePrescriptionOptions {
  layout: GeneratePrescriptionLayoutConfig;
  typography: TypographySettings;
  prescription: PrescriptionDesignerData;
}

const jsPdfFontMap: Record<TypographySettings['family'], string> = {
  Helvetica: 'helvetica',
  Times: 'times',
  Courier: 'courier',
  Arial: 'helvetica',
  Georgia: 'times',
};

const normalizeFontStyle = (weight: TypographySettings['weight']) => {
  if (weight === 'bold') return 'bold';
  if (weight === 'medium') return 'bold';
  return 'normal';
};

const hexToRgb = (hex: string): [number, number, number] => {
  const sanitized = hex.replace('#', '');
  const value = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized.padEnd(6, 'f');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b];
};

export const generatePrescription = ({
  layout,
  typography,
  prescription,
}: GeneratePrescriptionOptions) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontFamily = jsPdfFontMap[typography.family] ?? 'helvetica';
  const baseFontStyle = normalizeFontStyle(typography.weight);
  const [r, g, b] = hexToRgb(typography.color ?? '#111827');

  doc.setFont(fontFamily, baseFontStyle);
  doc.setFontSize(typography.size);
  doc.setTextColor(r, g, b);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const contentLeft = layout.margins.left;
  const contentRight = pageWidth - layout.margins.right;
  const contentWidth = contentRight - contentLeft;
  const contentTop = layout.margins.top + layout.headerHeight;
  const contentBottom = pageHeight - layout.margins.bottom - layout.footerHeight;
  const lineHeight = Math.max(5, typography.size + 2);

  const addTemplateBackground = (force = false) => {
    if (!layout.templateBackgroundDataUrl) return;
    if (!force && layout.overflowStrategy !== 'reuse-template') return;
    doc.addImage(layout.templateBackgroundDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
  };

  let cursorY = contentTop;

  const startNewPage = () => {
    doc.addPage();
    addTemplateBackground();
    cursorY = contentTop;
  };

  const ensureRoom = (requiredHeight = lineHeight) => {
    if (cursorY + requiredHeight > contentBottom) {
      startNewPage();
    }
  };

  const writeLine = (text: string, options?: { bold?: boolean }) => {
    ensureRoom();
    if (options?.bold) {
      doc.setFont(fontFamily, 'bold');
    }
    doc.text(text, contentLeft, cursorY, { maxWidth: contentWidth });
    if (options?.bold) {
      doc.setFont(fontFamily, baseFontStyle);
    }
    cursorY += lineHeight;
  };

  const writeList = (title: string, items: string[]) => {
    if (!items.length) return;
    writeLine(title, { bold: true });
    items.forEach((item, index) => {
      writeLine(`${index + 1}. ${item}`);
    });
    cursorY += lineHeight / 2;
  };

  const patient = prescription.patient ?? { name: '', id: '', age: '', gender: '', phone: '' };
  const doctor = prescription.doctor ?? null;
  const visit = prescription.visit ?? { date: '', location: '', followUp: '' };
  const vitals = prescription.vitals ?? { bloodPressure: '', pulse: '', temperature: '', spo2: '' };
  const chiefComplaints = Array.isArray(prescription.chiefComplaints) ? prescription.chiefComplaints : [];
  const comorbidities = Array.isArray(prescription.comorbidities) ? prescription.comorbidities : [];
  const investigations = Array.isArray(prescription.investigations) ? prescription.investigations : [];
  const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  const advice = Array.isArray(prescription.advice) ? prescription.advice : [];
  const notes = prescription.notes ?? '';
  const resolvedVisitDate = visit.date ? new Date(visit.date).toLocaleDateString() : '';

  addTemplateBackground(true);

  writeLine(`Patient: ${patient.name || '—'} (${patient.age || '—'}/${patient.gender || '—'})`, { bold: true });
  writeLine(`Patient ID: ${patient.id || '—'}`);
  writeLine(`Phone: ${patient.phone || '—'}`);
  cursorY += lineHeight / 2;

  if (doctor) {
    writeLine(`Doctor: ${doctor.name || '—'} (${doctor.specialization || '—'})`, { bold: true });
    writeLine(`Registration: ${doctor.registration || '—'}`);
    writeLine(`Clinic: ${doctor.clinic || '—'}`);
    cursorY += lineHeight / 2;
  }

  writeLine(`Visit date: ${resolvedVisitDate || '—'}`);
  writeLine(`Location: ${visit.location || '—'}`);
  writeLine(`Follow-up: ${visit.followUp || '—'}`);
  cursorY += lineHeight / 2;

  writeLine(`Vitals: BP ${vitals.bloodPressure || '—'} | Pulse ${vitals.pulse || '—'} | Temp ${vitals.temperature || '—'} | SpO2 ${vitals.spo2 || '—'}`);
  cursorY += lineHeight;

  writeList('Chief complaints:', chiefComplaints);
  writeList('Comorbidities:', comorbidities);
  writeList('Investigations:', investigations);

  if (medicines.length) {
    writeLine('Medicines:', { bold: true });
    medicines.forEach((med, index) => {
      if (!med) return;
      writeLine(`${index + 1}. ${med.name || '—'} - ${med.dose || '—'} - ${med.frequency || '—'} - ${med.duration || '—'}`);
      if (med.notes) {
        writeLine(`Notes: ${med.notes}`);
      }
    });
    cursorY += lineHeight / 2;
  }

  writeList('Advice:', advice);
  writeLine(`Notes: ${notes || '—'}`);

  return doc.output('blob');
};
