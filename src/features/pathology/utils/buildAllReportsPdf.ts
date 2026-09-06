import { PDFDocument } from 'pdf-lib';
import { pathologyService, PathologyOrderDto, PathologyOrderLineDto } from '../services/pathologyService';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { generatePathologyReportPdf, PathologyReportPdfLine, PathologyReportPdfData } from './generatePathologyReportPdf';
import { resolveRange } from './resultFlagCalculator';
import { parseReportFieldLayout, type PathologyFieldConfigItem } from '../services/pathologyFieldLayoutApi';
import { resolvePathologyBranding } from './resolvePathologyBranding';

// Deliberately duplicates (rather than extracts/shares) the equivalent per-line-report logic in
// PathologyOrderDetailPage.tsx (buildPdfLine/resolveReportPdfData) — that page's version is
// tightly coupled to its own component state (reportFields/lineFields from a live hook, a ref-owned
// preview URL), and refactoring it to share code here risked regressing an already-working, tested
// screen for a comparatively small amount of duplication. This module is used from a completely
// different entry point (the Orders Dashboard row) that has none of that state.
const buildPdfLineForTest = (
  o: PathologyOrderDto, line: PathologyOrderLineDto, lineFields: PathologyFieldConfigItem[]
): PathologyReportPdfLine => {
  let params: any[] = [];
  try {
    const schema = line.parameterSchemaJson ? JSON.parse(line.parameterSchemaJson) : null;
    if (schema && Array.isArray(schema.params)) params = schema.params;
  } catch { /* leave params empty */ }

  let savedValues: Record<string, any> = {};
  try {
    savedValues = line.result?.resultValuesJson ? JSON.parse(line.result.resultValuesJson) : {};
  } catch { /* leave savedValues empty */ }

  const parameters = params.map((p) => {
    const entry = savedValues[p.name];
    const value = typeof entry === 'string' ? entry : entry?.value ?? '';
    const flag = typeof entry === 'string' ? 'NORMAL' : entry?.flag ?? 'NORMAL';
    const { min, max } = resolveRange(p, o.patientAgeYears, o.patientGender);
    return {
      name: p.name,
      unit: p.unit,
      value,
      flag,
      normalRangeLabel: min !== undefined || max !== undefined ? `${min ?? '-'} - ${max ?? '-'}` : undefined,
    };
  });

  const noteFields = lineFields
    .filter((f) => f.showInPrint)
    .map((f) => {
      const entry = f.key === 'interpretation' ? line.result?.interpretation : savedValues[f.key];
      const value = typeof entry === 'string' ? entry : entry?.value ?? '';
      return { label: f.label, value };
    })
    .filter((f) => f.value.trim().length > 0);

  return { testName: line.testName, testCode: line.testCode, parameters, noteFields };
};

const resolveOrderReportsPdfData = async (
  hospitalId: string,
  o: PathologyOrderDto,
  targetLines: PathologyOrderLineDto[],
  reportFields: PathologyFieldConfigItem[],
  lineFields: PathologyFieldConfigItem[],
  reportNo: string,
): Promise<PathologyReportPdfData> => {
  const [labConfig, templates, hospital] = await Promise.all([
    pathologyService.getLabConfig(hospitalId).catch(() => null),
    pathologyService.getTemplates(hospitalId).catch(() => []),
    hospitalApi.getHospitalById(hospitalId).catch(() => null),
  ]);
  const defaultTemplate = templates.find(t => t.isDefault);
  const letterheadMargins = (() => {
    if (!defaultTemplate?.layoutJson) return null;
    try {
      const parsed = JSON.parse(defaultTemplate.layoutJson);
      return parsed.margins ?? null;
    } catch {
      return null;
    }
  })();

  let savedReportFieldValues: Record<string, any> = {};
  try {
    savedReportFieldValues = o.reportFieldValuesJson ? JSON.parse(o.reportFieldValuesJson) : {};
  } catch { /* leave empty */ }
  const reportFieldsForPdf = reportFields
    .filter((f) => f.showInPrint)
    .map((f) => ({ label: f.label, value: savedReportFieldValues[f.key] ?? '' }))
    .filter((f) => f.value.trim().length > 0);

  return {
    hospitalName: o.hospitalName ?? 'Hospital',
    reportNo,
    orderNo: o.orderNo,
    orderDate: o.orderDate,
    patientName: o.patientName,
    patientId: o.patientId,
    patientAgeYears: o.patientAgeYears,
    patientGender: o.patientGender,
    patientAddress: o.patientAddress,
    referredByDoctorName: o.orderedByDoctorName,
    lines: targetLines.map((line) => buildPdfLineForTest(o, line, lineFields)),
    reportFields: reportFieldsForPdf,
    letterheadMode: labConfig?.letterheadMode ?? 'SYSTEM_DEFAULT',
    letterheadTemplateUrl: defaultTemplate?.headerBlobPath ?? null,
    letterheadMargins,
    hospitalBranding: resolvePathologyBranding(hospital, labConfig),
    technicianName: labConfig?.technicianName ?? null,
    pathologistName: labConfig?.pathologistName ?? null,
  };
};

export interface AllReportsPdfResult {
  blob: Blob;
  order: PathologyOrderDto;
  reportCount: number;
}

// Builds ONE combined PDF covering every test line on the order that already has a generated
// report. Each line owns its own independent PathologyReport (its own report number, sign-off,
// etc. -- see GeneratePathologyReportHandler), so each is rendered as its own COMPLETE report
// (its own header/footer/patient block/report number, via the exact same generatePathologyReportPdf
// call the single-report preview uses) rather than flowing every test's results under one shared
// header -- that previously made a 2-3-report order print as what looked like a single report with
// extra sections tacked on. The resulting single-report PDFs are then concatenated page-by-page
// into one combined document, so each report still starts on its own fresh page(s). Returns null
// when the order has no ready reports at all (caller should have already gated on
// reportsReadyCount > 0, but this stays defensive against a stale/racing count).
export const buildAllReadyReportsPdf = async (hospitalId: string, orderId: string): Promise<AllReportsPdfResult | null> => {
  const [order, labConfig] = await Promise.all([
    pathologyService.getOrderById(hospitalId, orderId),
    pathologyService.getLabConfig(hospitalId),
  ]);

  const readyLines = order.lines.filter((l) => l.report);
  if (readyLines.length === 0) return null;

  const layout = parseReportFieldLayout(labConfig.reportFieldLayoutJson);

  const mergedDoc = await PDFDocument.create();
  for (const line of readyLines) {
    const data = await resolveOrderReportsPdfData(
      hospitalId, order, [line], layout.reportFields, layout.lineFields,
      line.report?.reportNo ?? order.orderNo,
    );
    const reportBlob = await generatePathologyReportPdf(data);
    const reportBytes = new Uint8Array(await reportBlob.arrayBuffer());
    const reportDoc = await PDFDocument.load(reportBytes);
    const copiedPages = await mergedDoc.copyPages(reportDoc, reportDoc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  const mergedBytes = await mergedDoc.save();
  const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' });
  return { blob, order, reportCount: readyLines.length };
};
