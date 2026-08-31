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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Plus, ShieldCheck } from 'lucide-react';
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
  const [isSigningAsTechnician, setIsSigningAsTechnician] = useState(false);
  const [isApprovingReport, setIsApprovingReport] = useState(false);
  const [isFinalizingPdf, setIsFinalizingPdf] = useState(false);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [technicianRegNo, setTechnicianRegNo] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [pathologistRegNo, setPathologistRegNo] = useState('');

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
    setNewOrderOpen(true);
    if (hospitalId) {
      pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
    }
  };

  const searchPatients = async () => {
    if (!patientQuery.trim()) return;
    setIsSearchingPatients(true);
    try {
      const results = await patientService.searchPatients(patientQuery.trim(), 'name');
      setPatientResults(results);
    } catch (e) {
      toast.error('Patient search failed');
    } finally {
      setIsSearchingPatients(false);
    }
  };

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
    if (!selectedPatient) { setOpdVisits([]); setSelectedOpdEncounterId(null); return; }
    let cancelled = false;
    setIsLoadingOpdVisits(true);
    ipdBillingService.getPatientEvents(selectedPatient.patientId)
      .then((res: any) => {
        if (cancelled) return;
        const list = (res?.data?.encounters ?? [])
          .filter((e: any) => (e.encounterTypeCode ?? '').toUpperCase() === 'OPD' && !e.isCancelled)
          .map((e: any) => ({ encounterId: e.encounterId, invoiceNo: e.invoiceNo ?? undefined, status: e.status ?? 'OPEN', invoiceDate: e.invoiceDate ?? '' }))
          .sort((a: any, b: any) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
        setOpdVisits(list);
        // Prefer the most recent still-open (not finalized) visit, same convention BillingPage's
        // "land on the current bill" logic uses; fall back to the most recent one otherwise.
        const current = list.find((e: any) => (e.status ?? '').toUpperCase() !== 'FINALIZED') ?? list[0];
        setSelectedOpdEncounterId(current?.encounterId ?? null);
      })
      .catch(() => { if (!cancelled) { setOpdVisits([]); setSelectedOpdEncounterId(null); } })
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
      const response = await pathologyService.createOrder(hospitalId, {
        patientId: selectedPatient.patientId,
        testIds: selectedTestIds,
        notes: orderNotes || undefined,
        sourceType: orderSourceType,
        isStat: orderIsStat,
        // Attach to the patient's open OPD visit so these charges land on the same invoice as
        // their consultation, instead of never billing (IPD already does this via CPOE).
        encounterId: orderSourceType === 'OPD' ? (selectedOpdEncounterId ?? undefined) : undefined,
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

  const handleGenerateReport = async () => {
    if (!hospitalId || !selectedOrderDetails) return;
    setIsGeneratingReport(true);
    try {
      const response = await pathologyService.generateReport(hospitalId, selectedOrderDetails.orderId, {});
      if (!response.success) {
        toast.error('Could not generate report', { description: response.message });
        return;
      }
      toast.success('Report generated', { description: response.reportNo });
      await refreshSelectedOrder();
    } catch (e) {
      toast.error('Could not generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSignAsTechnician = async () => {
    if (!hospitalId || !selectedOrderDetails?.report || !technicianRegNo.trim()) return;
    setIsSigningAsTechnician(true);
    try {
      const success = await pathologyService.signReportAsTechnician(
        hospitalId, selectedOrderDetails.orderId, selectedOrderDetails.report.reportId, technicianRegNo.trim()
      );
      if (!success) {
        toast.error('Could not sign report');
        return;
      }
      toast.success('Signed as technician');
      setSignDialogOpen(false);
      setTechnicianRegNo('');
      await refreshSelectedOrder();
    } catch (e) {
      toast.error('Could not sign report');
    } finally {
      setIsSigningAsTechnician(false);
    }
  };

  // Builds the results table from each line's schema + saved {value, flag} results, using the
  // same age/gender-resolved band shown on screen so the printed "Normal Range" column matches
  // what the technician actually saw while entering the result.
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

      return {
        testName: line.testName,
        testCode: line.testCode,
        interpretation: line.result?.interpretation,
        parameters: params
          .filter((p) => savedValues[p.name] !== undefined)
          .map((p) => {
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
          }),
      };
    });
  };

  const finalizeReportPdf = async (order: PathologyOrderDto) => {
    if (!hospitalId || !order.report || order.report.status !== 'APPROVED') return;
    setIsFinalizingPdf(true);
    try {
      const verifyUrl = `${window.location.origin}/verify/report/${order.report.reportId}`;

      // Letterhead source is hospital-wide config (LabConfiguration), not tied to any one order --
      // resolved fresh at finalization time rather than cached, so a mode/margin change in the
      // Configurator takes effect on the very next report without a reload.
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

      const blob = await generatePathologyReportPdf({
        hospitalName: order.hospitalName ?? 'Hospital',
        reportNo: order.report.reportNo,
        orderNo: order.orderNo,
        orderDate: order.orderDate,
        patientName: order.patientName,
        patientId: order.patientId,
        patientAgeYears: order.patientAgeYears,
        patientGender: order.patientGender,
        lines: buildPdfLines(order),
        technicianName: order.report.technicianName ?? '—',
        technicianRegNo: order.report.technicianRegNo ?? '—',
        technicianSignedAt: order.report.technicianSignedAt ?? new Date().toISOString(),
        pathologistName: order.report.pathologistName ?? '—',
        pathologistRegNo: order.report.pathologistRegNo ?? '—',
        approvedAt: order.report.approvedAt ?? new Date().toISOString(),
        verifyUrl,
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
      });

      const uploadResult = await pathologyService.uploadReportPdf(hospitalId, order.orderId, order.report.reportId, blob);
      if (!uploadResult.success) {
        toast.error('Report approved, but the final PDF could not be saved', { description: uploadResult.message });
        return;
      }
      toast.success('Final signed report PDF generated');
      await refreshSelectedOrder();
    } catch (e) {
      console.error('Failed to generate/upload final report PDF', e);
      toast.error('Report approved, but the final PDF could not be generated');
    } finally {
      setIsFinalizingPdf(false);
    }
  };

  const handleApproveReport = async () => {
    if (!hospitalId || !selectedOrderDetails?.report || !pathologistRegNo.trim()) return;
    setIsApprovingReport(true);
    try {
      const success = await pathologyService.approveReport(
        hospitalId, selectedOrderDetails.orderId, selectedOrderDetails.report.reportId, pathologistRegNo.trim()
      );
      if (!success) {
        toast.error('Could not approve report');
        return;
      }
      toast.success('Report approved');
      setApproveDialogOpen(false);
      setPathologistRegNo('');
      const refreshed = await refreshSelectedOrder();
      if (refreshed) await finalizeReportPdf(refreshed);
    } catch (e) {
      toast.error('Could not approve report');
    } finally {
      setIsApprovingReport(false);
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
                  {allResultsEntered && !selectedOrderDetails.report && (
                    <Button size="sm" onClick={handleGenerateReport} disabled={isGeneratingReport}>
                      {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                    </Button>
                  )}
                  {selectedOrderDetails.report?.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                      Sign as Technician
                    </Button>
                  )}
                  {selectedOrderDetails.report?.status === 'TECH_SIGNED' && (
                    <Button size="sm" onClick={() => setApproveDialogOpen(true)} disabled={isFinalizingPdf}>
                      {isFinalizingPdf ? 'Finalizing PDF...' : `Approve Report ${selectedOrderDetails.report.reportNo}`}
                    </Button>
                  )}
                  {selectedOrderDetails.report?.status === 'APPROVED' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Report {selectedOrderDetails.report.reportNo} approved
                      </Badge>
                      {selectedOrderDetails.report.pdfBlobPath ? (
                        <a
                          href={`${window.location.origin}/verify/report/${selectedOrderDetails.report.reportId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Verification page
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => finalizeReportPdf(selectedOrderDetails)} disabled={isFinalizingPdf}>
                          {isFinalizingPdf ? 'Finalizing PDF...' : 'Retry PDF generation'}
                        </Button>
                      )}
                    </div>
                  )}
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
      <Sheet open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Pathology Order</SheetTitle>
            <SheetDescription>Search for a patient and select the tests to order.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between border rounded-md p-3 mt-1">
                  <div>
                    <div className="font-medium">{selectedPatient.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedPatient.patientId} · {selectedPatient.mobile}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Change</Button>
                </div>
              ) : null}
              {selectedPatient && orderSourceType === 'OPD' && (
                isLoadingOpdVisits ? (
                  <p className="text-xs text-muted-foreground mt-1.5">Checking for an open OPD visit...</p>
                ) : opdVisits.length === 0 ? (
                  <p className="text-xs text-amber-600 mt-1.5">No active OPD visit found — this order won't auto-bill.</p>
                ) : opdVisits.length === 1 ? (
                  <p className="text-xs text-emerald-600 mt-1.5">
                    Billing to: OPD visit · {opdVisits[0].invoiceNo ?? 'Draft'} · {new Date(opdVisits[0].invoiceDate).toLocaleDateString()}
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs text-muted-foreground">Multiple open OPD visits — pick which one to bill:</p>
                    {opdVisits.map(v => (
                      <button
                        key={v.encounterId}
                        type="button"
                        onClick={() => setSelectedOpdEncounterId(v.encounterId)}
                        className={`w-full flex items-center justify-between text-xs rounded-md border px-2 py-1.5 ${v.encounterId === selectedOpdEncounterId ? 'border-brand-400 bg-brand-50' : 'border-border'}`}
                      >
                        <span>{v.invoiceNo ?? 'Draft'} · {new Date(v.invoiceDate).toLocaleDateString()}</span>
                        <span className="text-muted-foreground">{v.status}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
              {!selectedPatient && (
                <>
                  <div className="flex gap-1 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={patientMode === 'search' ? 'default' : 'outline'}
                      onClick={() => setPatientMode('search')}
                    >
                      Registered Patient
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={patientMode === 'register' ? 'default' : 'outline'}
                      onClick={() => setPatientMode('register')}
                    >
                      New / Walk-in Patient
                    </Button>
                  </div>
                  {patientMode === 'search' ? (
                    <>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={patientQuery}
                          onChange={(e) => setPatientQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') searchPatients(); }}
                          placeholder="Search by patient name..."
                        />
                        <Button onClick={searchPatients} disabled={isSearchingPatients}>
                          {isSearchingPatients ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                      {patientResults.length > 0 && (
                        <div className="border rounded-md mt-2 max-h-40 overflow-y-auto divide-y">
                          {patientResults.map((p) => (
                            <div
                              key={p.patientId}
                              className="p-2 cursor-pointer hover:bg-muted text-sm"
                              onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground"> · {p.patientId} · {p.mobile}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-2 space-y-2 border rounded-md p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={newPatientName}
                          onChange={(e) => setNewPatientName(e.target.value)}
                          placeholder="Full name *"
                          className="col-span-2"
                        />
                        <Input
                          value={newPatientMobile}
                          onChange={(e) => setNewPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Mobile (10 digits) *"
                        />
                        <Input
                          type="number" min={0}
                          value={newPatientAge}
                          onChange={(e) => setNewPatientAge(e.target.value)}
                          placeholder="Age"
                        />
                        <div className="flex gap-1">
                          {(['Male', 'Female'] as const).map(g => (
                            <Button
                              key={g}
                              type="button"
                              size="sm"
                              variant={newPatientGender === g ? 'default' : 'outline'}
                              onClick={() => setNewPatientGender(g)}
                              className="flex-1"
                            >
                              {g}
                            </Button>
                          ))}
                        </div>
                        <Input
                          value={newPatientGuardian}
                          onChange={(e) => setNewPatientGuardian(e.target.value)}
                          placeholder="Guardian (optional)"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={registerWalkInPatient}
                        disabled={isRegisteringPatient}
                      >
                        {isRegisteringPatient ? 'Registering...' : 'Register & Continue'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <Label>Tests</Label>
              <div className="border rounded-md mt-1 max-h-56 overflow-y-auto divide-y">
                {testCatalog.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No active tests in the catalog.</div>
                ) : (
                  testCatalog.map((t) => (
                    <label key={t.testId} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted">
                      <Checkbox checked={selectedTestIds.includes(t.testId)} onCheckedChange={() => toggleTest(t.testId)} />
                      <span className="font-medium">{t.testName}</span>
                      <span className="text-muted-foreground">({t.testCode})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source</Label>
                <div className="flex gap-1 mt-1">
                  {(['OPD', 'EMERGENCY', 'WALK_IN'] as const).map((st) => (
                    <Button
                      key={st}
                      type="button"
                      size="sm"
                      variant={orderSourceType === st ? 'default' : 'outline'}
                      onClick={() => setOrderSourceType(st)}
                    >
                      {st === 'WALK_IN' ? 'Walk-in' : st === 'EMERGENCY' ? 'Emergency' : 'OPD'}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  IPD lab orders are placed from the patient's Clinical Order Panel so they bill against the admission.
                </p>
              </div>
              <div>
                <Label>Urgency</Label>
                <label className="flex items-center gap-2 mt-1 p-2 border rounded-md cursor-pointer w-fit">
                  <Checkbox checked={orderIsStat} onCheckedChange={(c) => setOrderIsStat(!!c)} />
                  <span className="text-sm font-medium">Mark as STAT</span>
                </label>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button>
            <Button onClick={submitOrder} disabled={!canSubmitOrder}>
              {isCreatingOrder ? 'Placing...' : 'Place Order'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Technician sign-off dialog */}
      <Sheet open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sign as Lab Technician</SheetTitle>
            <SheetDescription>Enter your DMLT/BMLT registration number to sign off on this report's results.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Label>Registration Number</Label>
            <Input
              value={technicianRegNo}
              onChange={(e) => setTechnicianRegNo(e.target.value)}
              placeholder="e.g. DMLT-12345"
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSignAsTechnician} disabled={isSigningAsTechnician || !technicianRegNo.trim()}>
              {isSigningAsTechnician ? 'Signing...' : 'Sign Report'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Pathologist approval dialog */}
      <Sheet open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Approve as Pathologist</SheetTitle>
            <SheetDescription>Enter your medical registration number to finalize and authorize this report.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Label>Registration Number</Label>
            <Input
              value={pathologistRegNo}
              onChange={(e) => setPathologistRegNo(e.target.value)}
              placeholder="e.g. MCI-99999"
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApproveReport} disabled={isApprovingReport || !pathologistRegNo.trim()}>
              {isApprovingReport ? 'Approving...' : 'Approve & Finalize'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
};

