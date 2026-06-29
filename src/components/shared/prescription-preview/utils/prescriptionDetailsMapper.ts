import { TypographySettings } from '@/features/prescription/hooks/usePrescriptionDesigner';
import { PrescriptionData, PrescriptionVitals, PrescriptionPatient } from './prescriptionModel';
import { TemplateBoundLayoutConfig } from '../services/previewRenderer';
import {
  type PrescriptionTemplateDescriptor,
  type GeneratePrescriptionDetailsPayload,
  PrescriptionPatientDetail,
} from '../services/generatePrescriptionDetailsService';
// Use PrescriptionPatientDetail only from generatePrescriptionDetailsService.ts

const DEFAULT_PREVIEW_LAYOUT: TemplateBoundLayoutConfig = {
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  headerHeight: 20,
  footerHeight: 20,
  overflowStrategy: 'reuse-template',
};

const DEFAULT_PREVIEW_TYPOGRAPHY: TypographySettings = {
  family: 'Helvetica',
  size: 11,
  weight: 'regular',
  color: '#111827',
};

const FONT_FAMILIES: TypographySettings['family'][] = ['Helvetica', 'Times', 'Courier', 'Arial', 'Georgia'];
const FONT_WEIGHTS: TypographySettings['weight'][] = ['regular', 'medium', 'bold'];

const ensurePositiveNumber = (value: number | null | undefined, fallback: number) =>
  typeof value === 'number' && value > 0 ? value : fallback;

const resolveFontFamily = (value: string | null | undefined): TypographySettings['family'] => {
  if (value && FONT_FAMILIES.includes(value as TypographySettings['family'])) {
    return value as TypographySettings['family'];
  }
  return DEFAULT_PREVIEW_TYPOGRAPHY.family;
};

const resolveFontWeight = (value: string | null | undefined): TypographySettings['weight'] => {
  if (!value) return DEFAULT_PREVIEW_TYPOGRAPHY.weight;
  const normalized = value.toLowerCase();
  if (FONT_WEIGHTS.includes(normalized as TypographySettings['weight'])) {
    return normalized as TypographySettings['weight'];
  }
  if (normalized === 'semibold' || normalized === 'semi-bold') {
    return 'medium';
  }
  return DEFAULT_PREVIEW_TYPOGRAPHY.weight;
};

const formatMetric = (value?: number | null, suffix = '', fractionDigits = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  const formatted = fractionDigits > 0 ? value.toFixed(fractionDigits) : String(value);
  return `${formatted}${suffix}`;
};

const buildAddressLine = (rawAddress?: string | null, cityId?: string | null, state?: string | null, country?: string | null, pincode?: string | number | null) => {
  const parts = [
    rawAddress?.trim(),
    cityId?.trim(),
    state?.trim(),
    country?.trim(),
    typeof pincode === 'number' || (typeof pincode === 'string' && pincode.trim().length > 0) ? String(pincode).trim() : undefined,
  ].filter(Boolean) as string[];
  return parts.join(', ');
};

export const mapTemplateToPreviewConfig = (template?: PrescriptionTemplateDescriptor | null) => {
  const margins = {
    top: ensurePositiveNumber(template?.headerHeight, DEFAULT_PREVIEW_LAYOUT.margins.top),
    bottom: ensurePositiveNumber(template?.footerHeight, DEFAULT_PREVIEW_LAYOUT.margins.bottom),
    left: ensurePositiveNumber(template?.contentLeftMargin, DEFAULT_PREVIEW_LAYOUT.margins.left),
    right: ensurePositiveNumber(template?.contentRightMargin, DEFAULT_PREVIEW_LAYOUT.margins.right),
  };

  const layout: TemplateBoundLayoutConfig = {
    margins,
    headerHeight: ensurePositiveNumber(template?.headerHeight, DEFAULT_PREVIEW_LAYOUT.headerHeight),
    footerHeight: ensurePositiveNumber(template?.footerHeight, DEFAULT_PREVIEW_LAYOUT.footerHeight),
    overflowStrategy: template?.overFlowPage ? 'reuse-template' : 'blank',
  };

  const typography: TypographySettings = {
    family: resolveFontFamily(template?.fontFamily),
    size: ensurePositiveNumber(template?.fontSize, DEFAULT_PREVIEW_TYPOGRAPHY.size),
    weight: resolveFontWeight(template?.fontWeight),
    color: template?.textColour && template.textColour.trim().length > 0 ? template.textColour : DEFAULT_PREVIEW_TYPOGRAPHY.color,
  };

  return {
    layout,
    typography,
    templateUrl: template?.uri ?? null,
  };
};

export const buildPrescriptionDataFromResponse = (
  payload?: GeneratePrescriptionDetailsPayload | null,
): PrescriptionData => {
  const vitals = payload?.patientData?.vitals;
  const patientRecords: PrescriptionPatientDetail[] = Array.isArray(payload?.patientData?.patientDetails)
    ? payload?.patientData?.patientDetails
    : [];
  const firstPatient: PrescriptionPatientDetail | undefined = patientRecords[0];

  const mappedVitals: PrescriptionVitals = {
    bloodPressure:
      vitals && typeof vitals.bp?.sys === 'number' && typeof vitals.bp?.dia === 'number'
        ? `${vitals.bp.sys}/${vitals.bp.dia} mmHg`
        : '',
    pulse: vitals?.pulse ? `${vitals.pulse} bpm` : '',
    temperature: vitals?.tempC ? `${vitals.tempC} °C` : '',
    spo2: vitals?.spo2 ? `${vitals.spo2}%` : '',
    height: formatMetric(vitals?.heightCm, ' cm'),
    weight: formatMetric(vitals?.weightKg, ' kg'),
    bmi: formatMetric(vitals?.bmi, '', 1),
  };

  // Build guardian suffix
  const guardianLabel = firstPatient?.guardianRelation || 'C/O';
  const guardianSuffix = firstPatient?.guardianName
    ? `${guardianLabel} ${firstPatient.guardianName}`
    : '';

  // Build the referrer prefix based on type for a context-aware label
  const referrerLabel = firstPatient?.referrerType === 'DOCTOR'
    ? 'Ref. Dr.'
    : firstPatient?.referrerType === 'AGENT'
    ? 'Ref. Agt.'
    : (firstPatient?.referrerRelation || 'C/O');
  const referrerSuffix = firstPatient?.referrerName
    ? `${referrerLabel} ${firstPatient.referrerName}`
    : '';

  const nameParts = [firstPatient?.name ?? ''];
  if (guardianSuffix) nameParts.push(guardianSuffix);
  if (referrerSuffix) nameParts.push(referrerSuffix);

  const mappedPatient: PrescriptionPatient = {
    name: nameParts.join(' - '),
    id: firstPatient?.patientId ?? '',
    age: typeof firstPatient?.age === 'number' ? String(firstPatient.age) : '',
    ageUnit: firstPatient?.ageUnit,
    gender: firstPatient?.sex ?? '',
    phone: firstPatient?.contact ?? '',
    address: buildAddressLine(firstPatient?.address, firstPatient?.city, firstPatient?.state, firstPatient?.country, firstPatient?.pincode),
    contact: firstPatient?.contact ?? '',
    // Optionally add details if needed
  };

  return {
    patient: mappedPatient,
    vitals: mappedVitals,
  };
};
