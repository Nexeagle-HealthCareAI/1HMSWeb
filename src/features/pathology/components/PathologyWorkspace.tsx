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
import { Plus, ShieldCheck, Search, X, User, UserPlus, Stethoscope, Ambulance, Footprints, Flame, CheckCircle2 } from 'lucide-react';
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
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl h-full overflow-y-auto bg-slate-50/50">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">New Pathology Order</SheetTitle>
            <SheetDescription>Configure patient details, select tests, and place the order.</SheetDescription>
          </SheetHeader>

          <div className="space-y-8 pb-8">
            
            {/* Step 1: Patient Selection */}
            <section className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs">1</div>
                  Patient Details
                </h3>
              </div>

              {!selectedPatient ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPatientMode('search')}
                      className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                        patientMode === 'search'
                          ? 'border-brand-600 bg-brand-50 shadow-sm'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mb-3 ${patientMode === 'search' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <User className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-slate-900">Registered Patient</span>
                      <span className="text-xs text-slate-500 mt-1 text-left">Search existing hospital records by name or mobile.</span>
                      {patientMode === 'search' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-brand-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPatientMode('register')}
                      className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                        patientMode === 'register'
                          ? 'border-brand-600 bg-brand-50 shadow-sm'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mb-3 ${patientMode === 'register' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-slate-900">Walk-in / New</span>
                      <span className="text-xs text-slate-500 mt-1 text-left">Quickly register a new patient for this lab order.</span>
                      {patientMode === 'register' && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-brand-600" />}
                    </button>
                  </div>

                  {patientMode === 'search' ? (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            className="pl-9 bg-slate-50"
                            value={patientQuery}
                            onChange={(e) => setPatientQuery(e.target.value)}
                            placeholder="Search by patient name or mobile..."
                          />
                          {patientQuery && (
                            <button 
                              onClick={() => setPatientQuery('')} 
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Button 
                          onClick={() => searchPatients(patientQuery)} 
                          disabled={isSearchingPatients || !patientQuery.trim()}
                        >
                          {isSearchingPatients ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                      {patientResults.length > 0 && (
                        <div className="border rounded-xl mt-3 max-h-48 overflow-y-auto divide-y shadow-sm">
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
            </section>

            {/* Step 2: Order Type */}
            <section className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs">2</div>
                  Order Context
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['OPD', 'EMERGENCY', 'WALK_IN'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderSourceType(st)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      orderSourceType === st
                        ? 'border-brand-600 bg-brand-50 shadow-sm'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-full mb-2 ${orderSourceType === st ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {st === 'OPD' ? <Stethoscope className="h-5 w-5" /> : st === 'EMERGENCY' ? <Ambulance className="h-5 w-5" /> : <Footprints className="h-5 w-5" />}
                    </div>
                    <span className="font-semibold text-slate-900 text-sm">
                      {st === 'OPD' ? 'OPD' : st === 'EMERGENCY' ? 'Emergency' : 'Walk-in'}
                    </span>
                    {orderSourceType === st && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-brand-600" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t mt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Priority</h4>
                  <p className="text-xs text-slate-500">Is this order urgent?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderIsStat(!orderIsStat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-colors ${
                    orderIsStat 
                      ? 'border-red-600 bg-red-50 text-red-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Flame className={`h-4 w-4 ${orderIsStat ? 'text-red-600' : 'text-slate-400'}`} />
                  STAT
                </button>
              </div>
            </section>

            {/* Step 3: Tests Selection */}
            <section className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs">3</div>
                  Select Tests
                </h3>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-100 text-brand-700">
                  {selectedTestIds.length} selected
                </span>
              </div>
              
              {selectedTestIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-brand-200 bg-brand-50/50">
                  {selectedTestIds.map(id => {
                    const t = testCatalog.find(x => x.testId === id);
                    if (!t) return null;
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-1 bg-white border-brand-200 text-brand-800 hover:bg-brand-50 shadow-sm">
                        {t.testName}
                        <button onClick={() => toggleTest(id)} className="text-brand-500 hover:text-brand-900 rounded-full p-0.5 hover:bg-brand-100">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 bg-slate-50"
                  placeholder="Search catalog by name or code..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                />
              </div>

              <div className="border rounded-xl mt-2 max-h-56 overflow-y-auto divide-y shadow-inner bg-slate-50/50">
                {testCatalog.length === 0 ? (
                  <div className="p-4 text-sm text-center text-slate-500">No active tests in the catalog.</div>
                ) : (() => {
                  const filteredTests = testCatalog.filter(t => 
                    t.testName.toLowerCase().includes(testSearchQuery.toLowerCase()) || 
                    t.testCode.toLowerCase().includes(testSearchQuery.toLowerCase())
                  );
                  return filteredTests.length === 0 ? (
                    <div className="p-4 text-sm text-center text-slate-500">No tests matching "{testSearchQuery}".</div>
                  ) : (
                    filteredTests.map((t) => (
                      <label key={t.testId} className="flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-white transition-colors">
                        <Checkbox 
                          checked={selectedTestIds.includes(t.testId)} 
                          onCheckedChange={() => toggleTest(t.testId)}
                          className="data-[state=checked]:bg-brand-600 data-[state=checked]:border-brand-600"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{t.testName}</span>
                          <span className="text-xs text-slate-500">{t.testCode}</span>
                        </div>
                      </label>
                    ))
                  );
                })()}
              </div>
            </section>

            {/* Step 4: Notes */}
            <section className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs">4</div>
                  Additional Notes
                </h3>
              </div>
              <Textarea 
                value={orderNotes} 
                onChange={(e) => setOrderNotes(e.target.value)} 
                placeholder="Optional clinical notes or remarks..." 
                className="bg-slate-50 resize-none min-h-[80px]"
              />
            </section>
          </div>

          <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t z-10 flex justify-end gap-2 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
            <Button variant="outline" onClick={() => setNewOrderOpen(false)} className="px-6 rounded-full">Cancel</Button>
            <Button onClick={submitOrder} disabled={!canSubmitOrder} className="px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md">
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

