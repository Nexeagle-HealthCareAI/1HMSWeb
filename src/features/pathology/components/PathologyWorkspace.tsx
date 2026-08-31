import React, { useState, useEffect, useMemo } from 'react';
import { pathologyService, PathologyOrderDto, PathologyTestMaster } from '../services/pathologyService';
import { patientService } from '@/features/billing/services/patientService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { Patient } from '@/features/billing/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, ShieldCheck, Search, X, User, UserPlus, Stethoscope, Ambulance, Footprints, Flame, CheckCircle2, ClipboardList, Activity, ActivitySquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { OrderResultEntry } from './OrderResultEntry';
import { generatePathologyReportPdf, PathologyReportPdfLine } from '../utils/generatePathologyReportPdf';
import { resolveRange } from '../utils/resultFlagCalculator';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { PathologyDashboardOverview, PathologyDateMode } from './PathologyDashboardOverview';
import { format } from 'date-fns';

export const PathologyWorkspace: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [orders, setOrders] = useState<PathologyOrderDto[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<PathologyOrderDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // This order's billing status, once it's known to be attached to a visit (selectedOrderDetails.
  // encounterId) -- the ledger for that encounter, scoped down to this order's own lab-sourced
  // lines, so a tech can see the same invoice number Billing sees without leaving Pathology.
  const [orderBilling, setOrderBilling] = useState<{ invoiceNo?: string; invoiceStatus?: string; labTotal: number } | null>(null);
  const [isLoadingOrderBilling, setIsLoadingOrderBilling] = useState(false);

  // New order dialog
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  // A patient placing an order might already be registered (appointment, IPD, WhatsApp -- all
  // just rows in the same table, found via search) or might be a genuine walk-in with no record
  // yet -- this toggle switches the panel below between searching and a quick inline registration.
  const [patientMode, setPatientMode] = useState<'search' | 'register'>('search');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMobile, setNewPatientMobile] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female'>('Male');
  const [newPatientGuardian, setNewPatientGuardian] = useState('');
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);
  const [testCatalog, setTestCatalog] = useState<PathologyTestMaster[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSourceType, setOrderSourceType] = useState<'OPD' | 'EMERGENCY' | 'WALK_IN'>('OPD');
  const [orderIsStat, setOrderIsStat] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // The patient's open OPD visit(s), so an OPD order can attach to the SAME invoice as their
  // consultation instead of never billing at all (IPD already does this via the Clinical Order
  // Panel -- this is the OPD equivalent for orders placed from Pathology's own screen).
  const [opdVisits, setOpdVisits] = useState<Array<{ encounterId: string; invoiceNo?: string; status: string; invoiceDate: string }>>([]);
  const [isLoadingOpdVisits, setIsLoadingOpdVisits] = useState(false);
  const [selectedOpdEncounterId, setSelectedOpdEncounterId] = useState<string | null>(null);
  // Same idea for Walk-in/Emergency orders, which have no OPD visit to attach to -- reuse the
  // patient's open Lab visit if one exists (same fetch as opdVisits above, just filtered to LAB),
  // or submitOrder() creates one fresh at placement time so the charge still has something to
  // post against immediately instead of the pathologist having to go create an invoice separately.
  const [labVisits, setLabVisits] = useState<Array<{ encounterId: string; invoiceNo?: string; status: string; invoiceDate: string }>>([]);
  const [selectedLabEncounterId, setSelectedLabEncounterId] = useState<string | null>(null);

  // Date filter -- defaults to "all" (not "today", unlike RevenueTab's billing dashboard) since a
  // tech needs to see backlog like an older still-pending STAT order; narrowing to today shouldn't
  // hide orders that are otherwise always visible.
  const [dateMode, setDateMode] = useState<PathologyDateMode>('all');
  const [dayDate, setDayDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // IST calendar-day key (YYYY-MM-DD) for an order's date, for day/range comparison -- mirrors
  // RevenueTab.tsx's dayKey exactly (naive timestamps treated as UTC then shifted +5:30).
  const dayKey = (iso: string) => {
    if (!iso) return '';
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : `${iso}Z`);
    if (Number.isNaN(d.getTime())) return '';
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
  };

  const dateFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (dateMode === 'day' && dayDate) return dayKey(o.orderDate) === dayDate;
      if (dateMode === 'range' && (rangeStart || rangeEnd)) {
        const k = dayKey(o.orderDate);
        if (rangeStart && k < rangeStart) return false;
        if (rangeEnd && k > rangeEnd) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, dateMode, dayDate, rangeStart, rangeEnd]);

  const kpis = useMemo(() => ({
    total: dateFilteredOrders.length,
    stat: dateFilteredOrders.filter(o => o.isStat).length,
    pending: dateFilteredOrders.filter(o => o.status === 'PLACED').length,
    inProgress: dateFilteredOrders.filter(o => o.status === 'IN_PROGRESS').length,
    completed: dateFilteredOrders.filter(o => o.status === 'COMPLETED').length,
  }), [dateFilteredOrders]);

  const scopeLabel = useMemo(() => {
    if (dateMode === 'all') return 'All time';
    if (dateMode === 'range') return (rangeStart || rangeEnd) ? `${rangeStart || '…'} → ${rangeEnd || '…'}` : 'Date range';
    if (!dayDate) return 'Day';
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dayDate === todayKey ? 'Today' : format(new Date(dayDate), 'dd MMM yyyy');
  }, [dateMode, dayDate, rangeStart, rangeEnd]);

  // Worklist filter -- IPD orders show up here too (they're created from the IPD Clinical Order
  // Panel, not this dialog, since they need an active admission to bill against), this just filters
  // the date-scoped set above.
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'OPD' | 'IPD' | 'STAT' | 'COMPLETED'>('ALL');
  const filteredOrders = dateFilteredOrders.filter(o => {
    switch (activeFilterTab) {
      case 'OPD': return o.sourceType !== 'IPD';
      case 'IPD': return o.sourceType === 'IPD';
      case 'STAT': return o.isStat;
      case 'COMPLETED': return o.status === 'COMPLETED';
      default: return true;
    }
  });

  // Report generation / dual-signature (order-detail panel). The report's own state lives on
  // selectedOrderDetails.report (refetched from the server after every action) rather than local
  // state, so a page reload mid-flow shows the true status instead of a stale client guess.
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isFinalizingPdf, setIsFinalizingPdf] = useState(false);
  const [isPreviewingReport, setIsPreviewingReport] = useState(false);

  useEffect(() => {
    if (hospitalId) fetchOrders();
  }, [hospitalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    if (!hospitalId) return;
    setIsLoadingOrders(true);
    try {
      const data = await pathologyService.getOrders(hospitalId);
      setOrders(data);
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleOrderSelect = async (orderId: string) => {
    if (!hospitalId) return;
    setSelectedOrderId(orderId);
    setIsLoadingDetails(true);
    try {
      const details = await pathologyService.getOrderById(hospitalId, orderId);
      setSelectedOrderDetails(details);
    } catch (e) {
      console.error("Failed to fetch order details", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Silent refresh after a report action -- keeps the order-detail panel open but pulls the
  // authoritative report state from the server instead of guessing it locally.
  const refreshSelectedOrder = async () => {
    if (!hospitalId || !selectedOrderId) return;
    const details = await pathologyService.getOrderById(hospitalId, selectedOrderId);
    setSelectedOrderDetails(details);
    return details;
  };

  useEffect(() => {
    const encounterId = selectedOrderDetails?.encounterId;
    if (!encounterId) { setOrderBilling(null); return; }
    let cancelled = false;
    setIsLoadingOrderBilling(true);
    ipdBillingService.getEncounterEvents(encounterId, selectedOrderDetails.patientId)
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
  }, [selectedOrderDetails?.encounterId, selectedOrderDetails?.patientId]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PLACED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openNewOrder = () => {
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setPatientMode('search');
    setNewPatientName('');
    setNewPatientMobile('');
    setNewPatientAge('');
    setNewPatientGender('Male');
    setNewPatientGuardian('');
    setSelectedTestIds([]);
    setOrderNotes('');
    setOrderSourceType('OPD');
    setOrderIsStat(false);
    setOpdVisits([]);
    setSelectedOpdEncounterId(null);
    setLabVisits([]);
    setSelectedLabEncounterId(null);
    setNewOrderOpen(true);
    if (hospitalId) {
      pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
    }
  };

  const searchPatients = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;
    setIsSearchingPatients(true);
    try {
      const results = await patientService.searchPatients(queryToSearch.trim(), 'name');
      setPatientResults(results);
    } catch (e) {
      toast.error('Patient search failed');
    } finally {
      setIsSearchingPatients(false);
    }
  };

  useEffect(() => {
    if (patientMode !== 'search' || !patientQuery.trim()) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchPatients(patientQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [patientQuery, patientMode]);

  const registerWalkInPatient = async () => {
    if (!hospitalId || isRegisteringPatient) return;
    const name = newPatientName.trim();
    const mobile = newPatientMobile.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (!/^\d{10}$/.test(mobile)) { toast.error('Enter a valid 10-digit mobile number'); return; }
    setIsRegisteringPatient(true);
    try {
      const patient = await patientService.registerWalkIn(hospitalId, {
        fullName: name,
        mobile,
        age: newPatientAge ? Number(newPatientAge) : undefined,
        sex: newPatientGender,
        guardianName: newPatientGuardian.trim() || undefined,
      });
      setSelectedPatient(patient);
      toast.success('Patient registered');
    } catch (e: any) {
      toast.error(e?.message || 'Could not register patient');
    } finally {
      setIsRegisteringPatient(false);
    }
  };

  // Refetch whenever the selected patient changes -- independent of orderSourceType so switching
  // Source after picking a patient doesn't need a re-fetch.
  useEffect(() => {
    if (!selectedPatient) {
      setOpdVisits([]); setSelectedOpdEncounterId(null);
      setLabVisits([]); setSelectedLabEncounterId(null);
      return;
    }
    let cancelled = false;
    setIsLoadingOpdVisits(true);
    ipdBillingService.getPatientEvents(selectedPatient.patientId)
      .then((res: any) => {
        if (cancelled) return;
        const encounters = res?.data?.encounters ?? [];
        // Prefer the most recent still-open (not finalized) visit, same convention BillingPage's
        // "land on the current bill" logic uses; fall back to the most recent one otherwise.
        const deriveVisits = (typeCode: string) => {
          const list = encounters
            .filter((e: any) => (e.encounterTypeCode ?? '').toUpperCase() === typeCode && !e.isCancelled)
            .map((e: any) => ({ encounterId: e.encounterId, invoiceNo: e.invoiceNo ?? undefined, status: e.status ?? 'OPEN', invoiceDate: e.invoiceDate ?? '' }))
            .sort((a: any, b: any) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
          const current = list.find((e: any) => (e.status ?? '').toUpperCase() !== 'FINALIZED') ?? list[0];
          return { list, currentId: current?.encounterId ?? null };
        };
        const opd = deriveVisits('OPD');
        setOpdVisits(opd.list);
        setSelectedOpdEncounterId(opd.currentId);
        const lab = deriveVisits('LAB');
        setLabVisits(lab.list);
        setSelectedLabEncounterId(lab.currentId);
      })
      .catch(() => {
        if (cancelled) return;
        setOpdVisits([]); setSelectedOpdEncounterId(null);
        setLabVisits([]); setSelectedLabEncounterId(null);
      })
      .finally(() => { if (!cancelled) setIsLoadingOpdVisits(false); });
    return () => { cancelled = true; };
  }, [selectedPatient]);

  const toggleTest = (testId: string) => {
    setSelectedTestIds(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
  };

  const canSubmitOrder = !!selectedPatient && selectedTestIds.length > 0 && !isCreatingOrder;

  const submitOrder = async () => {
    if (!hospitalId || !selectedPatient || selectedTestIds.length === 0) return;
    setIsCreatingOrder(true);
    try {
      // OPD attaches to the patient's open OPD visit (their consultation's own invoice). Walk-in/
      // Emergency have no such visit to attach to -- reuse their open Lab visit if one exists,
      // else create one right now, same "New Lab Invoice" flow PathologyBillingTab.tsx already
      // uses, so the order always has something to bill against instead of the pathologist having
      // to separately create an invoice afterward.
      let billingEncounterId: string | undefined = orderSourceType === 'OPD' ? (selectedOpdEncounterId ?? undefined) : (selectedLabEncounterId ?? undefined);
      if (orderSourceType !== 'OPD' && !billingEncounterId) {
        const encRes = await ipdBillingService.createEncounter({ patientId: selectedPatient.patientId, encounterType: 'LAB' });
        if (encRes?.success && encRes.data?.encounterId) billingEncounterId = encRes.data.encounterId;
      }
      const response = await pathologyService.createOrder(hospitalId, {
        patientId: selectedPatient.patientId,
        testIds: selectedTestIds,
        notes: orderNotes || undefined,
        sourceType: orderSourceType,
        isStat: orderIsStat,
        encounterId: billingEncounterId,
      });
      if (!response.success) {
        toast.error('Could not place order', { description: response.message });
        return;
      }
      toast.success('Order placed', { description: response.orderNo });
      setNewOrderOpen(false);
      fetchOrders();
    } catch (e) {
      toast.error('Could not place order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const allResultsEntered = !!selectedOrderDetails && selectedOrderDetails.lines.length > 0
    && selectedOrderDetails.lines.every(l => !!l.result);

  // Builds the results table from each line's schema + saved {value, flag} results, using the
  // same age/gender-resolved band shown on screen so the printed "Normal Range" column matches
  // what the technician actually saw while entering the result. Every schema parameter is always
  // included (blank when unset) so a report can be previewed before any results exist at all; any
  // saved key that ISN'T in the schema is a custom/ad-hoc field the technician added on this order,
  // appended the same way but with no reference range to flag against.
  const buildPdfLines = (order: PathologyOrderDto): PathologyReportPdfLine[] => {
    return order.lines.map((line) => {
      let params: any[] = [];
      try {
        const schema = line.parameterSchemaJson ? JSON.parse(line.parameterSchemaJson) : null;
        if (schema && Array.isArray(schema.params)) params = schema.params;
      } catch { /* leave params empty */ }

      let savedValues: Record<string, any> = {};
      try {
        savedValues = line.result?.resultValuesJson ? JSON.parse(line.result.resultValuesJson) : {};
      } catch { /* leave savedValues empty */ }

      const schemaParameters = params.map((p) => {
        const entry = savedValues[p.name];
        const value = typeof entry === 'string' ? entry : entry?.value ?? '';
        const flag = typeof entry === 'string' ? 'NORMAL' : entry?.flag ?? 'NORMAL';
        const { min, max } = resolveRange(p, order.patientAgeYears, order.patientGender);
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

      const schemaNames = new Set(params.map((p) => p.name));
      const customParameters = Object.keys(savedValues)
        .filter((name) => !schemaNames.has(name))
        .map((name) => {
          const entry = savedValues[name];
          const value = typeof entry === 'string' ? entry : entry?.value ?? '';
          const unit = typeof entry === 'string' ? undefined : entry?.unit;
          return { name, unit, value, flag: 'NORMAL' as const };
        });

      return {
        testName: line.testName,
        testCode: line.testCode,
        interpretation: line.result?.interpretation,
        parameters: [...schemaParameters, ...customParameters],
      };
    });
  };

  // Resolves everything generatePathologyReportPdf needs except the report number, which the two
  // callers below source differently (a live preview has no PathologyReport row yet, so it makes
  // one up). Letterhead source is hospital-wide config (LabConfiguration), not tied to any one
  // order -- resolved fresh on every call rather than cached, so a mode/margin change in the
  // Configurator takes effect on the very next report/preview without a reload.
  const resolveReportPdfData = async (order: PathologyOrderDto, reportNo: string) => {
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

    return {
      hospitalName: order.hospitalName ?? 'Hospital',
      reportNo,
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      patientName: order.patientName,
      patientId: order.patientId,
      patientAgeYears: order.patientAgeYears,
      patientGender: order.patientGender,
      lines: buildPdfLines(order),
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
  const previewReport = async (order: PathologyOrderDto) => {
    if (!hospitalId) return;
    setIsPreviewingReport(true);
    try {
      const data = await resolveReportPdfData(order, order.report?.reportNo ?? 'PREVIEW');
      const blob = await generatePathologyReportPdf(data);
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e) {
      console.error('Failed to build report preview', e);
      toast.error('Could not build report preview');
    } finally {
      setIsPreviewingReport(false);
    }
  };

  // Renders and uploads the report PDF for an order that already has a PathologyReport row.
  // Freely re-callable -- there's no approval gate anymore, so editing a result and generating
  // again just overwrites the previous PDF with one that reflects the current data.
  const finalizeReportPdf = async (order: PathologyOrderDto) => {
    if (!hospitalId || !order.report) return;
    setIsFinalizingPdf(true);
    try {
      const data = await resolveReportPdfData(order, order.report.reportNo);
      const blob = await generatePathologyReportPdf(data);

      const uploadResult = await pathologyService.uploadReportPdf(hospitalId, order.orderId, order.report.reportId, blob);
      if (!uploadResult.success) {
        toast.error('Report generated, but the PDF could not be saved', { description: uploadResult.message });
        return;
      }
      toast.success('Report PDF generated');
      await refreshSelectedOrder();
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
    if (!hospitalId || !selectedOrderDetails) return;
    setIsGeneratingReport(true);
    try {
      const response = await pathologyService.generateReport(hospitalId, selectedOrderDetails.orderId, {});
      if (!response.success) {
        toast.error('Could not generate report', { description: response.message });
        return;
      }
      const refreshed = await refreshSelectedOrder();
      if (refreshed) await finalizeReportPdf(refreshed);
    } catch (e) {
      toast.error('Could not generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <PathologyDashboardOverview
        kpis={kpis}
        scopeLabel={scopeLabel}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        dayDate={dayDate}
        onDayDateChange={setDayDate}
        rangeStart={rangeStart}
        onRangeStartChange={setRangeStart}
        rangeEnd={rangeEnd}
        onRangeEndChange={setRangeEnd}
      />
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
      {/* Order List */}
      <div className="col-span-4 border rounded-lg flex flex-col h-[calc(100vh-340px)] bg-card">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-lg">Orders Inbox</h2>
          <Button size="sm" onClick={openNewOrder} disabled={!hospitalId}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Order
          </Button>
        </div>
        <div className="flex gap-1 px-2 pt-2 pb-1 border-b overflow-x-auto">
          {([
            { key: 'ALL', label: 'All' },
            { key: 'OPD', label: 'OPD' },
            { key: 'IPD', label: 'IPD' },
            { key: 'STAT', label: 'STAT' },
            { key: 'COMPLETED', label: 'Completed' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilterTab(tab.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeFilterTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ScrollArea className="flex-1">
          {isLoadingOrders ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="p-2 space-y-2">
              {filteredOrders.map((order) => (
                <div
                  key={order.orderId}
                  onClick={() => handleOrderSelect(order.orderId)}
                  className={`p-4 rounded-md cursor-pointer border transition-colors ${
                    order.isStat ? 'border-l-4 border-l-red-500' : ''
                  } ${
                    selectedOrderId === order.orderId
                      ? 'border-primary bg-primary/5'
                      : order.isStat ? 'hover:bg-muted' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{order.orderNo}</span>
                    <div className="flex items-center gap-1">
                      {order.isStat && (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">STAT</Badge>
                      )}
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{order.patientName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>{new Date(order.orderDate).toLocaleString()}</span>
                    {order.sourceType && <span>· {order.sourceType.replace('_', '-')}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No orders in this view.
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Order Details & Result Entry */}
      <div className="col-span-8 flex flex-col h-[calc(100vh-340px)]">
        {selectedOrderId ? (
          isLoadingDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          ) : selectedOrderDetails ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    Order {selectedOrderDetails.orderNo}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => previewReport(selectedOrderDetails)} disabled={isPreviewingReport}>
                      {isPreviewingReport ? 'Preparing preview...' : 'Preview Report'}
                    </Button>
                    <Button size="sm" onClick={handleGenerateOrUpdateReport} disabled={!allResultsEntered || isGeneratingReport || isFinalizingPdf}>
                      {isGeneratingReport || isFinalizingPdf
                        ? (selectedOrderDetails.report ? 'Updating...' : 'Generating...')
                        : (selectedOrderDetails.report ? `Update Report ${selectedOrderDetails.report.reportNo}` : 'Generate Report')}
                    </Button>
                    {selectedOrderDetails.report?.pdfBlobPath && (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Report {selectedOrderDetails.report.reportNo} ready
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>Patient: <span className="font-medium text-foreground">{selectedOrderDetails.patientName}</span></span>
                  <span>•</span>
                  <span>Date: {new Date(selectedOrderDetails.orderDate).toLocaleString()}</span>
                  <span>•</span>
                  <Badge variant="outline" className={getStatusColor(selectedOrderDetails.status)}>
                    {selectedOrderDetails.status.replace('_', ' ')}
                  </Badge>
                </div>
                {!selectedOrderDetails.encounterId ? (
                  <p className="text-xs text-muted-foreground mt-1">Not linked to a billing visit.</p>
                ) : isLoadingOrderBilling ? (
                  <p className="text-xs text-muted-foreground mt-1">Loading billing status...</p>
                ) : orderBilling ? (
                  <p className="text-xs text-emerald-600 mt-1">
                    Billed to: {orderBilling.invoiceNo ?? 'Draft'}
                    {orderBilling.invoiceStatus ? ` (${orderBilling.invoiceStatus})` : ''} · Lab total ₹{orderBilling.labTotal.toLocaleString('en-IN')}
                  </p>
                ) : null}
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Tests & Results</h3>
                {selectedOrderDetails.lines.length > 0 ? (
                  selectedOrderDetails.lines.map((line) => (
                    <OrderResultEntry
                      key={line.orderLineId}
                      hospitalId={hospitalId ?? ''}
                      orderId={selectedOrderDetails.orderId}
                      orderLine={line}
                      patientAgeYears={selectedOrderDetails.patientAgeYears}
                      patientGender={selectedOrderDetails.patientGender}
                      onSuccess={() => handleOrderSelect(selectedOrderDetails.orderId)}
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No tests found in this order.
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null
        ) : (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
            Select an order from the list to view details and enter results.
          </div>
        )}
      </div>

      {/* New Order dialog */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent className="w-[98vw] max-w-7xl h-[95vh] p-0 overflow-hidden flex flex-col bg-slate-50 sm:rounded-2xl">
          
          <div className="flex h-full w-full">
            
            {/* LEFT COLUMN: Order Summary (Cart) */}
            <div className="w-[340px] md:w-[400px] bg-white border-r flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
              
              <div className="p-6 border-b bg-gradient-to-br from-brand-50/80 to-emerald-50/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center shadow-sm border border-brand-200">
                    <ClipboardList className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Order Summary</h2>
                    <p className="text-xs text-slate-500 font-medium">Review before placing</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  
                  {/* Patient Summary Card */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Patient Details</h4>
                    {selectedPatient ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full -z-0 opacity-50 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                            {selectedPatient.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-sm">{selectedPatient.name}</p>
                            <p className="text-xs text-slate-500">{selectedPatient.patientId} · {selectedPatient.mobile}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-sm text-slate-400">
                        No patient selected yet
                      </div>
                    )}
                  </div>

                  {/* Context Summary Card */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Context</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${orderSourceType === 'OPD' ? 'bg-blue-50 text-blue-700 border-blue-200' : orderSourceType === 'EMERGENCY' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        {orderSourceType}
                      </Badge>
                      {orderIsStat && (
                        <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                          <Flame className="h-3 w-3" /> STAT
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tests Summary Card */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Tests</h4>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{selectedTestIds.length}</span>
                    </div>
                    
                    {selectedTestIds.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTestIds.map(id => {
                          const t = testCatalog.find(x => x.testId === id);
                          if (!t) return null;
                          return (
                            <div key={id} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 rounded-md bg-brand-50 flex items-center justify-center shrink-0">
                                  <ActivitySquare className="h-4 w-4 text-brand-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{t.testName}</p>
                                  <p className="text-xs text-slate-400">{t.testCode}</p>
                                </div>
                              </div>
                              <button onClick={() => toggleTest(id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors shrink-0">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-sm text-slate-400">
                        No tests selected
                      </div>
                    )}
                  </div>

                  {/* Billing Hint */}
                  {selectedPatient && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Billing Routing</h4>
                      {isLoadingOpdVisits ? (
                        <p className="text-xs text-amber-600/70">Checking billing visit...</p>
                      ) : orderSourceType === 'OPD' ? (
                        opdVisits.length === 0 ? (
                          <p className="text-xs text-amber-600">No active OPD visit found — this order won't auto-bill.</p>
                        ) : opdVisits.length === 1 ? (
                          <p className="text-xs text-emerald-600 font-medium">Billing to OPD visit: {opdVisits[0].invoiceNo ?? 'Draft'}</p>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium">Billing to selected OPD visit: {opdVisits.find(v => v.encounterId === selectedOpdEncounterId)?.invoiceNo ?? 'Draft'}</p>
                        )
                      ) : (
                        labVisits.length === 0 ? (
                          <p className="text-xs text-emerald-600 font-medium">A new Lab visit will be created for billing.</p>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium">Billing to existing Lab visit: {labVisits[0].invoiceNo ?? 'Draft'}</p>
                        )
                      )}
                    </div>
                  )}

                </div>
              </ScrollArea>

              <div className="p-6 border-t bg-white">
                <Button 
                  onClick={submitOrder} 
                  disabled={!canSubmitOrder || isCreatingOrder} 
                  className="w-full h-12 text-base font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all disabled:shadow-none"
                >
                  {isCreatingOrder ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Placing Order...
                    </span>
                  ) : 'Place Order'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setNewOrderOpen(false)} 
                  className="w-full h-10 mt-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </Button>
              </div>

            </div>

            {/* RIGHT COLUMN: Interactive Form */}
            <ScrollArea className="flex-1 bg-slate-50/50">
              <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                
                {/* Header */}
                <div className="mb-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Configure Order</h1>
                  <p className="text-slate-500 mt-1 text-sm">Complete the steps below to place a new pathology order.</p>
                </div>

                {/* Step 1: Patient Selection */}
                <section className="bg-white p-4 md:p-5 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-2xl"></div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                    <h3 className="text-base font-bold text-slate-800">Patient Details</h3>
                  </div>

                  {!selectedPatient && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPatientMode('search')}
                        className={`group relative flex flex-col items-start p-5 rounded-xl border-2 transition-all ${
                          patientMode === 'search'
                            ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mb-2 transition-colors ${patientMode === 'search' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-brand-600 group-hover:bg-brand-100'}`}>
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">Registered Patient</span>
                        <span className="text-xs text-slate-500 mt-1 text-left leading-relaxed">Search existing hospital records by name or mobile.</span>
                        {patientMode === 'search' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-brand-600 animate-in zoom-in" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPatientMode('register')}
                        className={`group relative flex flex-col items-start p-5 rounded-xl border-2 transition-all ${
                          patientMode === 'register'
                            ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mb-2 transition-colors ${patientMode === 'register' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-brand-600 group-hover:bg-brand-100'}`}>
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-sm">Walk-in / New</span>
                        <span className="text-xs text-slate-500 mt-1 text-left leading-relaxed">Quickly register a new patient for this lab order.</span>
                        {patientMode === 'register' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-brand-600 animate-in zoom-in" />}
                      </button>
                    </div>
                  )}

                  {!selectedPatient && patientMode === 'search' && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2">
                      <div className="flex gap-3">
                        <div className="relative flex-1 group">
                          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                          <Input
                            className="pl-12 h-12 text-base bg-slate-50 border-slate-200 focus-visible:ring-brand-500"
                            value={patientQuery}
                            onChange={(e) => setPatientQuery(e.target.value)}
                            placeholder="Search by patient name or mobile..."
                          />
                          {patientQuery && (
                            <button 
                              onClick={() => setPatientQuery('')} 
                              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-700 bg-slate-200/50 hover:bg-slate-200 p-1 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <Button 
                          onClick={() => searchPatients(patientQuery)} 
                          disabled={isSearchingPatients || !patientQuery.trim()}
                          className="h-12 px-6 font-semibold shadow-sm"
                        >
                          {isSearchingPatients ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                      
                      {patientResults.length > 0 && (
                        <div className="border border-slate-200 rounded-xl mt-4 max-h-60 overflow-y-auto divide-y divide-slate-100 shadow-sm bg-white">
                          {patientResults.map((p) => (
                            <div
                              key={p.patientId}
                              className="p-4 cursor-pointer hover:bg-brand-50/50 transition-colors flex items-center justify-between group"
                              onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold group-hover:bg-brand-100 group-hover:text-brand-700 transition-colors">
                                  {p.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 text-base">{p.name}</p>
                                  <p className="text-sm text-slate-500 mt-0.5">{p.patientId} • {p.mobile}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-brand-600">Select</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedPatient && patientMode === 'register' && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2">
                      <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-slate-700 font-semibold">Full Name <span className="text-red-500">*</span></Label>
                            <Input
                              value={newPatientName}
                              onChange={(e) => setNewPatientName(e.target.value)}
                              placeholder="e.g. Rahul Sharma"
                              className="h-11 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 font-semibold">Mobile Number <span className="text-red-500">*</span></Label>
                            <Input
                              value={newPatientMobile}
                              onChange={(e) => setNewPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="10-digit mobile"
                              className="h-11 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 font-semibold">Age</Label>
                            <Input
                              type="number" min={0}
                              value={newPatientAge}
                              onChange={(e) => setNewPatientAge(e.target.value)}
                              placeholder="e.g. 34"
                              className="h-11 bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 font-semibold">Gender</Label>
                            <div className="flex gap-2 h-11">
                              {(['Male', 'Female'] as const).map(g => (
                                <Button
                                  key={g}
                                  type="button"
                                  variant={newPatientGender === g ? 'default' : 'outline'}
                                  onClick={() => setNewPatientGender(g)}
                                  className={`flex-1 ${newPatientGender === g ? 'bg-brand-600 shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
                                >
                                  {g}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 font-semibold">Guardian Name (Optional)</Label>
                            <Input
                              value={newPatientGuardian}
                              onChange={(e) => setNewPatientGuardian(e.target.value)}
                              placeholder="e.g. Father's Name"
                              className="h-11 bg-white"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="w-full mt-6 h-11 text-base font-semibold shadow-sm"
                          onClick={registerWalkInPatient}
                          disabled={isRegisteringPatient}
                        >
                          {isRegisteringPatient ? 'Registering Patient...' : 'Complete Registration'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-md flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Patient selected successfully
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)} className="h-8">Change Patient</Button>
                    </div>
                  )}
                </section>

                {/* Step 2: Order Context */}
                <section className={`bg-white p-4 md:p-5 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                      <h3 className="text-base font-bold text-slate-800">Order Context & Priority</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['OPD', 'EMERGENCY', 'WALK_IN'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderSourceType(st)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          orderSourceType === st
                            ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2 rounded-full mb-2 transition-colors ${orderSourceType === st ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                          {st === 'OPD' ? <Stethoscope className="h-5 w-5" /> : st === 'EMERGENCY' ? <Ambulance className="h-5 w-5" /> : <Footprints className="h-5 w-5" />}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">
                          {st === 'OPD' ? 'OPD Visit' : st === 'EMERGENCY' ? 'Emergency' : 'Walk-in'}
                        </span>
                        {orderSourceType === st && <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-brand-600 animate-in zoom-in" />}
                      </button>
                    ))}
                  </div>

                  {/* OPD Billing Selection */}
                  {selectedPatient && orderSourceType === 'OPD' && opdVisits.length > 1 && (
                    <div className="mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
                      <p className="text-sm font-semibold text-slate-800">Select which OPD visit to attach this order to:</p>
                      <div className="grid gap-2">
                        {opdVisits.map(v => (
                          <button
                            key={v.encounterId}
                            type="button"
                            onClick={() => setSelectedOpdEncounterId(v.encounterId)}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${v.encounterId === selectedOpdEncounterId ? 'border-brand-500 bg-white shadow-sm ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                          >
                            <span className="font-medium text-slate-700">{v.invoiceNo ?? 'Draft Invoice'}</span>
                            <span className="text-sm text-slate-500">{new Date(v.invoiceDate).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Mark as STAT (Urgent)</h4>
                      <p className="text-sm text-slate-500 mt-1">Check this if the results are required immediately.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderIsStat(!orderIsStat)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold text-sm transition-all ${
                        orderIsStat 
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Flame className={`h-4 w-4 ${orderIsStat ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                      {orderIsStat ? 'STAT ORDER ACTIVE' : 'Mark STAT'}
                    </button>
                  </div>
                </section>

                {/* Step 3: Tests Selection */}
                <section className={`bg-white p-4 md:p-5 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                    <h3 className="text-base font-bold text-slate-800">Select Lab Tests</h3>
                  </div>
                  
                  <div className="relative group mt-2">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                    <Input
                      className="pl-12 h-12 text-base bg-slate-50 border-slate-200 focus-visible:ring-brand-500 shadow-inner"
                      placeholder="Search test catalog by name or code..."
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {testCatalog.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                        <Activity className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="font-medium text-slate-600">No active tests in the catalog</p>
                        <p className="text-sm mt-1">Add tests from Settings to see them here.</p>
                      </div>
                    ) : (() => {
                      const filteredTests = testCatalog.filter(t => 
                        t.testName.toLowerCase().includes(testSearchQuery.toLowerCase()) || 
                        t.testCode.toLowerCase().includes(testSearchQuery.toLowerCase())
                      );
                      return filteredTests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No tests matching "{testSearchQuery}".</div>
                      ) : (
                        <ScrollArea className="h-64 max-h-[40vh]">
                          <div className="divide-y divide-slate-100">
                            {filteredTests.map((t) => (
                              <label key={t.testId} className="flex items-center justify-between p-4 cursor-pointer hover:bg-brand-50/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                  <div className={`flex items-center justify-center h-5 w-5 rounded border ${selectedTestIds.includes(t.testId) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white group-hover:border-brand-400'}`}>
                                    {selectedTestIds.includes(t.testId) && <CheckCircle2 className="h-3.5 w-3.5" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 text-base">{t.testName}</span>
                                    <span className="text-sm text-slate-500 mt-0.5 font-mono">{t.testCode}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-slate-700">₹{t.price}</span>
                                </div>
                                {/* Hidden actual checkbox for accessibility */}
                                <input 
                                  type="checkbox"
                                  className="hidden"
                                  checked={selectedTestIds.includes(t.testId)} 
                                  onChange={() => toggleTest(t.testId)}
                                />
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      );
                    })()}
                  </div>
                </section>

                {/* Step 4: Notes */}
                <section className={`bg-white p-6 md:p-8 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-2xl"></div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shadow-sm">4</div>
                    <h3 className="text-lg font-bold text-slate-800">Clinical Notes (Optional)</h3>
                  </div>
                  <Textarea 
                    value={orderNotes} 
                    onChange={(e) => setOrderNotes(e.target.value)} 
                    placeholder="Enter any additional remarks, clinical history, or instructions for the lab technician..." 
                    className="bg-slate-50 resize-none min-h-[120px] text-base p-4 border-slate-200 focus-visible:ring-brand-500"
                  />
                </section>
                
                {/* Bottom Padding for scroll area */}
                <div className="h-10"></div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
};

