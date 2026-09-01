import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pathologyService, PathologyOrderDto } from '../services/pathologyService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldCheck, AlertCircle, FileText, User2, CalendarClock, ReceiptText, ClipboardCheck, SlidersHorizontal, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { OrderResultEntry } from '../components/OrderResultEntry';
import { PathologyReportPreviewModal } from '../components/PathologyReportPreviewModal';
import { PathologyReportFieldLayoutEditor } from '../components/PathologyReportFieldLayoutEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { generatePathologyReportPdf, PathologyReportPdfLine } from '../utils/generatePathologyReportPdf';
import { resolveRange } from '../utils/resultFlagCalculator';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { usePathologyReportFieldLayout } from '../hooks/usePathologyReportFieldLayout';
import type { PathologyFieldConfigItem } from '../services/pathologyFieldLayoutApi';
import { getPathologyStatusColor } from '../utils/pathologyStatusColor';

// Dedicated page for one pathology order -- a pathologist/technician lands here from the
// Pathology Lab dashboard's order cards to fill in per-test results, report-level fields, and
// preview/generate the report. Deep-linkable (reloading this URL re-fetches the same order),
// mirroring IpdPatientWorkspacePage.tsx's routed detail-page pattern.
const PathologyOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const hospitalId = useAuthStore(state => state.hospitalId);

  const [order, setOrder] = useState<PathologyOrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The hospital's configured report field layout -- report-level fields (once per report) and
  // per-test fields (repeat on every test line, starting with Interpretation / Notes). See
  // PathologyReportFieldLayoutEditor.tsx / pathologyFieldLayoutApi.ts.
  const { reportFields, lineFields, refetch: refetchFieldLayout } = usePathologyReportFieldLayout(hospitalId ?? undefined);
  const [reportFieldValues, setReportFieldValues] = useState<Record<string, string>>({});
  const [isSavingReportFields, setIsSavingReportFields] = useState(false);
  // The same field-layout editor Pathology Settings uses (add/reorder/rename custom fields),
  // opened in a dialog here too -- a pathologist filling in a report shouldn't have to leave it to
  // add a field like "Method Used". It manages its own hospitalId/save via useAuthStore, so it's
  // safe to drop in as-is; this page's own field-layout hook instance is refetched on close since
  // it's a separate hook call and won't otherwise see the edit.
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);

  // This order's billing status, once it's known to be attached to a visit (order.encounterId) --
  // the ledger for that encounter, scoped down to this order's own lab-sourced lines, so a tech
  // can see the same invoice number Billing sees without leaving Pathology.
  const [orderBilling, setOrderBilling] = useState<{ invoiceNo?: string; invoiceStatus?: string; labTotal: number } | null>(null);
  const [isLoadingOrderBilling, setIsLoadingOrderBilling] = useState(false);

  // Report generation. The report's own state lives on order.report (refetched from the server
  // after every action) rather than local state, so a page reload mid-flow shows the true status
  // instead of a stale client guess.
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isFinalizingPdf, setIsFinalizingPdf] = useState(false);
  const [isPreviewingReport, setIsPreviewingReport] = useState(false);

  // Preview popup state -- the blob: URL is built client-side (see previewReport below) and owned
  // here rather than inside the modal, since generating it depends on this page's own report-field
  // layout/hospital-config lookups. Revoked on close/regenerate/unmount so a technician clicking
  // Preview repeatedly doesn't leak one blob per click.
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const refetch = useCallback(async () => {
    if (!hospitalId || !orderId) return undefined;
    try {
      const details = await pathologyService.getOrderById(hospitalId, orderId);
      setOrder(details);
      setLoadError(null);
      return details;
    } catch (e) {
      console.error('Failed to fetch order details', e);
      setLoadError('Could not load this order.');
      return undefined;
    }
  }, [hospitalId, orderId]);

  useEffect(() => {
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [refetch]);

  useEffect(() => {
    try {
      setReportFieldValues(order?.reportFieldValuesJson ? JSON.parse(order.reportFieldValuesJson) : {});
    } catch {
      setReportFieldValues({});
    }
  }, [order?.orderId, order?.reportFieldValuesJson]);

  const handleReportFieldChange = (key: string, value: string) => {
    setReportFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveReportFields = async () => {
    if (!hospitalId || !order) return;
    setIsSavingReportFields(true);
    try {
      const success = await pathologyService.saveOrderReportFields(hospitalId, order.orderId, JSON.stringify(reportFieldValues));
      if (!success) {
        toast.error('Could not save report details');
        return;
      }
      toast.success('Report details saved');
      await refetch();
    } catch (e) {
      toast.error('Could not save report details');
    } finally {
      setIsSavingReportFields(false);
    }
  };

  const renderReportFieldInput = (field: PathologyFieldConfigItem) => {
    const value = reportFieldValues[field.key] ?? '';
    const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
    switch (field.type) {
      case 'paragraph':
        return <Textarea value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} placeholder={field.label} />;
      case 'number':
        return <Input type="number" value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} placeholder={field.label} />;
      case 'date':
        return <Input type="date" value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} />;
      case 'boolean':
        return (
          <select value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} className={selectClass}>
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        );
      case 'select':
        return (
          <select value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      default:
        return <Input value={value} onChange={(e) => handleReportFieldChange(field.key, e.target.value)} placeholder={field.label} />;
    }
  };

  useEffect(() => {
    const encounterId = order?.encounterId;
    if (!encounterId) { setOrderBilling(null); return; }
    let cancelled = false;
    setIsLoadingOrderBilling(true);
    ipdBillingService.getEncounterEvents(encounterId, order!.patientId)
      .then((res) => {
        if (cancelled || !res?.success) { if (!cancelled) setOrderBilling(null); return; }
        const labTotal = (res.data?.charges ?? [])
          .filter(c => c.sourceModule === 'LAB_PATH')
          .reduce((sum, c) => sum + c.netAmount, 0);
        setOrderBilling({
          invoiceNo: res.data?.currentInvoice?.invoiceNo,
          invoiceStatus: res.data?.currentInvoice?.statusCode as string | undefined,
          labTotal,
        });
      })
      .catch(() => { if (!cancelled) setOrderBilling(null); })
      .finally(() => { if (!cancelled) setIsLoadingOrderBilling(false); });
    return () => { cancelled = true; };
  }, [order?.encounterId, order?.patientId]);

  const allResultsEntered = !!order && order.lines.length > 0 && order.lines.every(l => !!l.result);

  // Builds the results table from each line's schema + saved {value, flag} results, using the
  // same age/gender-resolved band shown on screen so the printed "Normal Range" column matches
  // what the technician actually saw while entering the result. Every schema parameter is always
  // included (blank when unset) so a report can be previewed before any results exist at all.
  const buildPdfLines = (o: PathologyOrderDto): PathologyReportPdfLine[] => {
    return o.lines.map((line) => {
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
          // Plain hyphen, not an en dash -- pdf-lib's WinAnsi StandardFonts encoding threw on
          // the arrow glyphs used elsewhere in this file (see generatePathologyReportPdf.ts),
          // so this stays ASCII-only defensively rather than assuming en dash is safe too.
          normalRangeLabel: min !== undefined || max !== undefined ? `${min ?? '-'} - ${max ?? '-'}` : undefined,
        };
      });

      // Per-test narrative fields (Interpretation / Notes + any hospital-added custom line
      // fields), in the hospital's configured order -- built from the field layout, not from
      // whatever keys happen to be in resultValuesJson, so the printed order always matches the
      // Report Fields editor.
      const noteFields = lineFields
        .filter((f) => f.showInPrint)
        .map((f) => {
          const entry = f.key === 'interpretation' ? line.result?.interpretation : savedValues[f.key];
          const value = typeof entry === 'string' ? entry : entry?.value ?? '';
          return { label: f.label, value };
        })
        .filter((f) => f.value.trim().length > 0);

      return {
        testName: line.testName,
        testCode: line.testCode,
        parameters,
        noteFields,
      };
    });
  };

  // Resolves everything generatePathologyReportPdf needs except the report number, which the two
  // callers below source differently (a live preview has no PathologyReport row yet, so it makes
  // one up). Letterhead source is hospital-wide config (LabConfiguration), not tied to any one
  // order -- resolved fresh on every call rather than cached, so a mode/margin change in the
  // Configurator takes effect on the very next report/preview without a reload.
  const resolveReportPdfData = async (o: PathologyOrderDto, reportNo: string) => {
    const [labConfig, templates, hospital] = await Promise.all([
      pathologyService.getLabConfig(hospitalId!).catch(() => null),
      pathologyService.getTemplates(hospitalId!).catch(() => []),
      hospitalApi.getHospitalById(hospitalId!).catch(() => null),
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
      lines: buildPdfLines(o),
      reportFields: reportFieldsForPdf,
      letterheadMode: labConfig?.letterheadMode ?? 'SYSTEM_DEFAULT',
      letterheadTemplateUrl: defaultTemplate?.headerBlobPath ?? null,
      letterheadMargins,
      hospitalBranding: hospital && {
        name: hospital.name,
        location: hospital.location,
        city: hospital.city,
        state: hospital.state,
        pincode: hospital.pincode,
        contact: hospital.contact,
        alternateContact: hospital.alternateContact,
        email: hospital.email,
        website: hospital.website,
        registrationNumber: hospital.registrationNumber,
        nabhNumber: hospital.nabhNumber,
      },
    };
  };

  // Always available, even with zero results entered -- builds and opens the PDF client-side only
  // (no upload, no PathologyReport row required), so a technician can see exactly what the report
  // will look like before anything is saved.
  const previewReport = async (o: PathologyOrderDto) => {
    if (!hospitalId) return;
    setIsPreviewingReport(true);
    setPreviewError(null);
    setIsPreviewModalOpen(true);
    try {
      const data = await resolveReportPdfData(o, o.report?.reportNo ?? 'PREVIEW');
      const blob = await generatePathologyReportPdf(data);
      const nextUrl = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      setPreviewUrl(nextUrl);
    } catch (e) {
      console.error('Failed to build report preview', e);
      setPreviewError('Could not build report preview');
      toast.error('Could not build report preview');
    } finally {
      setIsPreviewingReport(false);
    }
  };

  const handlePreviewOpenChange = (open: boolean) => {
    setIsPreviewModalOpen(open);
    if (!open && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      setPreviewUrl(null);
      setPreviewError(null);
    }
  };

  // Renders and uploads the report PDF for an order that already has a PathologyReport row.
  // Freely re-callable -- there's no approval gate anymore, so editing a result and generating
  // again just overwrites the previous PDF with one that reflects the current data.
  const finalizeReportPdf = async (o: PathologyOrderDto) => {
    if (!hospitalId || !o.report) return;
    setIsFinalizingPdf(true);
    try {
      const data = await resolveReportPdfData(o, o.report.reportNo);
      const blob = await generatePathologyReportPdf(data);

      const uploadResult = await pathologyService.uploadReportPdf(hospitalId, o.orderId, o.report.reportId, blob);
      if (!uploadResult.success) {
        toast.error('Report generated, but the PDF could not be saved', { description: uploadResult.message });
        return;
      }
      toast.success('Report PDF generated');
      await refetch();
    } catch (e) {
      console.error('Failed to generate/upload report PDF', e);
      toast.error('Report generated, but the PDF could not be generated');
    } finally {
      setIsFinalizingPdf(false);
    }
  };

  // The one report action: creates the PathologyReport row if this order doesn't have one yet
  // (or reuses/updates it if it does -- GeneratePathologyReportHandler is freely repeatable), then
  // renders and uploads the PDF. Re-clickable any time results change.
  const handleGenerateOrUpdateReport = async () => {
    if (!hospitalId || !order) return;
    setIsGeneratingReport(true);
    try {
      const response = await pathologyService.generateReport(hospitalId, order.orderId, {});
      if (!response.success) {
        toast.error('Could not generate report', { description: response.message });
        return;
      }
      const refreshed = await refetch();
      if (refreshed) await finalizeReportPdf(refreshed);
    } catch (e) {
      toast.error('Could not generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[50vh]">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{loadError ?? 'Order not found.'}</p>
        <Button variant="outline" onClick={() => navigate('/pathology')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Pathology Lab
        </Button>
      </div>
    );
  }

  const padFields = reportFields.filter(f => f.showInPad);
  const resultsEnteredCount = order.lines.filter(l => !!l.result).length;

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <button
          onClick={() => navigate('/pathology')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pathology Lab
        </button>

        {/* Full-width two-column layout -- main content on the left, a sticky right-hand panel
            holding every report action (preview/generate, manage fields, save) so they're reachable
            without hunting through the page while filling in results further down. */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            {/* Order/patient identity -- who and what this order is, at a glance. */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-white">
                <h2 className="text-2xl font-bold tracking-tight">Order {order.orderNo}</h2>
                <div className="flex items-center gap-1.5 text-brand-50 text-sm mt-1.5 flex-wrap">
                  <User2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium truncate">{order.patientName}</span>
                  {(order.patientAgeYears != null || order.patientGender) && (
                    <span className="text-brand-100">
                      · {order.patientAgeYears ?? '—'}{order.patientGender ? `/${order.patientGender}` : ''}
                    </span>
                  )}
                  <span className="text-brand-200">· {order.patientId}</span>
                </div>
                <div className="flex items-center gap-1.5 text-brand-100 text-xs mt-1">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  Ordered {new Date(order.orderDate).toLocaleString()}
                </div>
              </div>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {order.isStat && (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">STAT</Badge>
                  )}
                  <Badge variant="outline" className={getPathologyStatusColor(order.status)}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs mt-2">
                  <ReceiptText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {!order.encounterId ? (
                    <span className="text-muted-foreground">Not linked to a billing visit.</span>
                  ) : isLoadingOrderBilling ? (
                    <span className="text-muted-foreground">Loading billing status...</span>
                  ) : orderBilling ? (
                    <span className="text-emerald-600">
                      Billed to: {orderBilling.invoiceNo ?? 'Draft'}
                      {orderBilling.invoiceStatus ? ` (${orderBilling.invoiceStatus})` : ''} · Lab total ₹{orderBilling.labTotal.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Billing status unavailable.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/30 space-y-0">
                <CardTitle className="text-lg">Report Details</CardTitle>
                <CardDescription>Included on the printed report, in the order configured in Pathology Settings.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {padFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {padFields.map((field) => (
                      <div key={field.key} className={`space-y-2 ${field.type === 'paragraph' ? 'sm:col-span-2' : ''}`}>
                        <Label>{field.label}</Label>
                        {renderReportFieldInput(field)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No report-level fields configured yet. Use <span className="font-medium text-foreground">Manage Fields</span> (right panel) to add one -- e.g. Clinical History, Specimen Type.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">Tests &amp; Results</h3>
                <span className="text-xs font-medium text-muted-foreground">
                  {resultsEnteredCount}/{order.lines.length} entered
                </span>
              </div>
              {order.lines.length > 0 ? (
                order.lines.map((line) => (
                  <OrderResultEntry
                    key={line.orderLineId}
                    hospitalId={hospitalId ?? ''}
                    orderId={order.orderId}
                    orderLine={line}
                    patientAgeYears={order.patientAgeYears}
                    patientGender={order.patientGender}
                    lineFields={lineFields}
                    onSuccess={() => refetch()}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No tests found in this order.
                </div>
              )}
            </div>
          </div>

          {/* Sticky action panel -- every report action lives here, in one reachable place. */}
          <div className="xl:sticky xl:top-6 space-y-4">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-5 py-4 text-white">
                <div className="text-xs font-bold uppercase tracking-widest text-brand-100">Report Actions</div>
                <div className="text-sm font-semibold mt-0.5 truncate">
                  {order.report ? `Report ${order.report.reportNo}` : 'No report yet'}
                </div>
              </div>
              <CardContent className="p-4 space-y-2.5">
                <Button
                  variant="outline" className="w-full justify-start gap-2"
                  onClick={() => previewReport(order)} disabled={isPreviewingReport}
                >
                  {isPreviewingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {isPreviewingReport ? 'Preparing...' : 'Preview Report'}
                </Button>
                <Button
                  className="w-full justify-start gap-2 bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={handleGenerateOrUpdateReport}
                  disabled={!allResultsEntered || isGeneratingReport || isFinalizingPdf}
                >
                  {isGeneratingReport || isFinalizingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isGeneratingReport || isFinalizingPdf
                    ? (order.report ? 'Updating...' : 'Generating...')
                    : (order.report ? 'Update Report' : 'Generate Report')}
                </Button>
                {!allResultsEntered && (
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    Enter all {order.lines.length} test result{order.lines.length === 1 ? '' : 's'} to generate.
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  {order.report?.pdfBlobPath && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Report ready
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {resultsEnteredCount}/{order.lines.length} results
                  </span>
                </div>

                <Separator className="my-1" />

                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsFieldEditorOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" /> Manage Fields
                </Button>
                {padFields.length > 0 && (
                  <Button
                    variant="outline" className="w-full justify-start gap-2"
                    onClick={handleSaveReportFields} disabled={isSavingReportFields}
                  >
                    {isSavingReportFields ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSavingReportFields ? 'Saving...' : 'Save Report Details'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <PathologyReportPreviewModal
        open={isPreviewModalOpen}
        onOpenChange={handlePreviewOpenChange}
        previewUrl={previewUrl}
        isLoading={isPreviewingReport}
        error={previewError}
        fileName={`${order.orderNo}-report.pdf`}
        title={`Report Preview — ${order.orderNo}`}
      />

      <Sheet
        open={isFieldEditorOpen}
        onOpenChange={(open) => {
          setIsFieldEditorOpen(open);
          if (!open) refetchFieldLayout();
        }}
      >
        {isFieldEditorOpen && (
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Report Fields</SheetTitle>
              <SheetDescription>
                Add and arrange custom fields for your pathology reports -- report-level fields fill in
                once per report, per-test fields repeat on every test alongside Interpretation / Notes.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <PathologyReportFieldLayoutEditor />
            </div>
          </SheetContent>
        )}
      </Sheet>
    </ScrollArea>
  );
};

export default PathologyOrderDetailPage;
