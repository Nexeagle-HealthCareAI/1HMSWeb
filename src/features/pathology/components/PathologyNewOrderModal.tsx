import React, { useState, useEffect, useRef } from 'react';
import { pathologyService, PathologyTestMaster, PathologyOrderLineDto } from '../services/pathologyService';
import { patientService } from '@/features/billing/services/patientService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { admissionApi, ActiveAdmissionItem } from '@/features/ipd-redesign/services/admissionApi';
import { Patient } from '@/features/billing/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, X, User, UserPlus, Stethoscope, Ambulance, Footprints, Hotel, Flame, CheckCircle2, ClipboardList, Activity, ActivitySquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Same relation-prefix convention as the OPD registration form (PatientForm.tsx) — kept in sync
// so a guardian entered here reads the same way everywhere else in the app.
const GUARDIAN_RELATION_OPTIONS = ['C/O', 'S/O', 'D/O', 'W/O', 'H/O', 'G/O', 'F/O', 'M/O'];

// Dedicated page for placing a new pathology order, or editing an already-placed one -- a
// pathologist/technician lands here from the Pathology Lab dashboard's "New Lab Order" button, or
// from an order row's "Edit Order" action (orderId set). Edit mode reuses every step of the create
// flow (patient, context, tests, notes) since the ask was to edit "all information added during
// add new order" -- patient reassignment and test add/remove stay available no matter how far the
// order has progressed (confirmed via clarifying question), so unchecking a test that already has a
// generated report requires a second confirming click (see toggleTest) rather than being blocked.
export const PathologyNewOrderModal: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void; orderId?: string }> = ({ open, onOpenChange, onSuccess, orderId }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const isEditMode = !!orderId;
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  // The order's lines at load time, keyed by TestId -- lets the test checklist know which selected
  // tests already have a generated report, so removing one can warn before it deletes that report.
  const [existingLinesByTestId, setExistingLinesByTestId] = useState<Record<string, PathologyOrderLineDto>>({});
  const [testIdsPendingRemovalConfirm, setTestIdsPendingRemovalConfirm] = useState<string[]>([]);
  // The order's own encounter/admission at load time -- preferred over the "current open visit"
  // auto-selection below when it's still in the fetched list, so editing doesn't silently reattach
  // the order to a different visit the patient happens to have opened more recently.
  const originalEncounterIdRef = useRef<string | null>(null);
  const originalAdmissionIdRef = useRef<string | null>(null);

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
  const [newPatientAgeUnit, setNewPatientAgeUnit] = useState<'Y' | 'M' | 'D'>('Y');
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [newPatientGuardian, setNewPatientGuardian] = useState('');
  const [newPatientGuardianRelation, setNewPatientGuardianRelation] = useState('C/O');
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);
  const [testCatalog, setTestCatalog] = useState<PathologyTestMaster[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSourceType, setOrderSourceType] = useState<'OPD' | 'EMERGENCY' | 'WALK_IN' | 'IPD'>('OPD');
  const [orderIsStat, setOrderIsStat] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // IPD context -- the patient's own active admission(s), fetched only once IPD is selected (not
  // eagerly with OPD/Lab visits above) since most orders never need it.
  const [admissions, setAdmissions] = useState<ActiveAdmissionItem[]>([]);
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

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

  useEffect(() => {
    if (hospitalId) {
      pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
    }
  }, [hospitalId]);

  // This component stays mounted for the dashboard's whole lifetime (only `open` toggles), so
  // without an explicit reset a later "New Lab Order" would silently inherit whatever an earlier
  // create attempt or "Edit Order" session left behind. Reset once the dialog closes, so every
  // fresh open (create or edit) starts from a clean slate -- edit mode's own loader effect above
  // repopulates from scratch when orderId is set.
  useEffect(() => {
    if (open) return;
    setSelectedPatient(null);
    setPatientQuery('');
    setPatientResults([]);
    setPatientMode('search');
    setNewPatientName(''); setNewPatientMobile(''); setNewPatientAge(''); setNewPatientAgeUnit('Y'); setNewPatientGender(''); setNewPatientGuardian(''); setNewPatientGuardianRelation('C/O');
    setTestSearchQuery('');
    setSelectedTestIds([]);
    setOrderNotes('');
    setOrderSourceType('OPD');
    setOrderIsStat(false);
    setSelectedAdmissionId(null);
    setAdmissions([]);
    setSelectedOpdEncounterId(null);
    setOpdVisits([]);
    setSelectedLabEncounterId(null);
    setLabVisits([]);
    setExistingLinesByTestId({});
    setTestIdsPendingRemovalConfirm([]);
    originalEncounterIdRef.current = null;
    originalAdmissionIdRef.current = null;
  }, [open]);

  // Edit mode: load the existing order once and pre-fill every field the create flow below already
  // knows how to drive -- patient, source type, selected tests, notes/STAT.
  useEffect(() => {
    if (!open || !orderId || !hospitalId) return;
    let cancelled = false;
    setIsLoadingOrder(true);
    pathologyService.getOrderById(hospitalId, orderId)
      .then((order) => {
        if (cancelled) return;
        setSelectedPatient({
          id: order.patientId,
          patientId: order.patientId,
          name: order.patientName,
          mobile: order.patientMobile || '',
          age: order.patientAgeYears || 0,
          sex: order.patientGender === 'F' ? 'F' : 'M',
        });
        setOrderSourceType((order.sourceType as typeof orderSourceType) || 'OPD');
        setOrderNotes(order.notes || '');
        setOrderIsStat(order.isStat);
        setSelectedTestIds(order.lines.map(l => l.testId));
        setExistingLinesByTestId(Object.fromEntries(order.lines.map(l => [l.testId, l])));
        originalEncounterIdRef.current = order.encounterId || null;
        originalAdmissionIdRef.current = order.admissionId || null;
      })
      .catch(() => { if (!cancelled) toast.error('Could not load order'); })
      .finally(() => { if (!cancelled) setIsLoadingOrder(false); });
    return () => { cancelled = true; };
  }, [open, orderId, hospitalId]);

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
    const ageValue = newPatientAge.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (!/^\d{10}$/.test(mobile)) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!ageValue || Number(ageValue) <= 0) { toast.error('Age is required'); return; }
    if (!newPatientGender) { toast.error('Gender is required'); return; }
    setIsRegisteringPatient(true);
    try {
      const patient = await patientService.registerWalkIn(hospitalId, {
        fullName: name,
        mobile,
        age: Number(ageValue),
        ageUnit: newPatientAgeUnit,
        sex: newPatientGender,
        guardianName: newPatientGuardian.trim() || undefined,
        guardianRelation: newPatientGuardianRelation,
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
        const originalStillOpen = (list: typeof opd.list) => list.find(v => v.encounterId === originalEncounterIdRef.current)?.encounterId;
        setSelectedOpdEncounterId(originalStillOpen(opd.list) ?? opd.currentId);
        const lab = deriveVisits('LAB');
        setLabVisits(lab.list);
        setSelectedLabEncounterId(originalStillOpen(lab.list) ?? lab.currentId);
      })
      .catch(() => {
        if (cancelled) return;
        setOpdVisits([]); setSelectedOpdEncounterId(null);
        setLabVisits([]); setSelectedLabEncounterId(null);
      })
      .finally(() => { if (!cancelled) setIsLoadingOpdVisits(false); });
    return () => { cancelled = true; };
  }, [selectedPatient]);

  // Only fetched once IPD is actually selected -- most orders never touch this, so it stays out of
  // the patient-selection critical path above. Filtered to the currently selected patient's own
  // active admission(s); a hospital-wide fetch (no per-patient endpoint exists) is fine here since
  // active-admission lists are small.
  useEffect(() => {
    if (orderSourceType !== 'IPD' || !selectedPatient || !hospitalId) {
      setAdmissions([]); setSelectedAdmissionId(null);
      return;
    }
    let cancelled = false;
    setIsLoadingAdmissions(true);
    admissionApi.getActiveAdmissions('ACTIVE', hospitalId)
      .then((items) => {
        if (cancelled) return;
        const mine = items.filter(a => a.patientId === selectedPatient.patientId);
        setAdmissions(mine);
        const original = mine.find(a => a.admissionId === originalAdmissionIdRef.current);
        setSelectedAdmissionId(original?.admissionId ?? (mine.length > 0 ? mine[0].admissionId : null));
      })
      .catch(() => { if (!cancelled) { setAdmissions([]); setSelectedAdmissionId(null); } })
      .finally(() => { if (!cancelled) setIsLoadingAdmissions(false); });
    return () => { cancelled = true; };
  }, [orderSourceType, selectedPatient, hospitalId]);

  // Unchecking a test that already has a generated report needs a second confirming click --
  // removing it deletes that report (and its result) server-side, so the first click just arms a
  // warning instead of silently discarding it.
  const toggleTest = (testId: string) => {
    const isSelected = selectedTestIds.includes(testId);
    if (isSelected) {
      const hasReport = !!existingLinesByTestId[testId]?.report;
      if (hasReport && !testIdsPendingRemovalConfirm.includes(testId)) {
        setTestIdsPendingRemovalConfirm(prev => [...prev, testId]);
        return;
      }
      setTestIdsPendingRemovalConfirm(prev => prev.filter(id => id !== testId));
      setSelectedTestIds(prev => prev.filter(id => id !== testId));
    } else {
      setTestIdsPendingRemovalConfirm(prev => prev.filter(id => id !== testId));
      setSelectedTestIds(prev => [...prev, testId]);
    }
  };

  const canSubmitOrder = !!selectedPatient && selectedTestIds.length > 0 && !isCreatingOrder
    && (orderSourceType !== 'IPD' || !!selectedAdmissionId);

  const submitOrder = async () => {
    if (!hospitalId || !selectedPatient || selectedTestIds.length === 0) return;
    if (orderSourceType === 'IPD' && !selectedAdmissionId) return;
    setIsCreatingOrder(true);
    try {
      // IPD bills against the admission itself (PathologyAutoBillingHelper resolves its encounter
      // server-side, same as ClinicalOrderCommandHandlers' lab orders) -- no encounterId needed.
      // OPD attaches to the patient's open OPD visit (their consultation's own invoice) when one
      // exists. Walk-in/Emergency have no such visit to attach to -- reuse their open Lab visit if
      // one exists, else create one right now, same "New Lab Invoice" flow PathologyBillingTab.tsx
      // already uses. OPD with NO open visit falls through to that identical Lab-visit fallback
      // instead of silently going unbilled -- a patient picked as "OPD" with no actual open visit
      // is functionally a walk-in for billing purposes (confirmed real case: a brand-new patient
      // with zero encounters, ordered as OPD, produced a "billing skipped" warning with no invoice
      // anywhere -- this makes that scenario bill correctly instead).
      let billingEncounterId: string | undefined;
      if (orderSourceType === 'OPD' && selectedOpdEncounterId) {
        billingEncounterId = selectedOpdEncounterId;
      } else if (orderSourceType !== 'IPD') {
        billingEncounterId = selectedLabEncounterId ?? undefined;
        if (!billingEncounterId) {
          const encRes = await ipdBillingService.createEncounter({ patientId: selectedPatient.patientId, encounterType: 'LAB' });
          if (encRes?.success && encRes.data?.encounterId) billingEncounterId = encRes.data.encounterId;
        }
      }
      const admissionId = orderSourceType === 'IPD' ? (selectedAdmissionId ?? undefined) : undefined;

      if (isEditMode && orderId) {
        const response = await pathologyService.updateOrder(hospitalId, orderId, {
          patientId: selectedPatient.patientId,
          testIds: selectedTestIds,
          notes: orderNotes || undefined,
          sourceType: orderSourceType,
          isStat: orderIsStat,
          encounterId: billingEncounterId,
          admissionId,
        });
        if (!response.success) {
          toast.error('Could not save changes', { description: response.message });
          return;
        }
        toast.success('Order updated');
        if (response.billingWarning) {
          toast.warning('Billing needs attention', { description: response.billingWarning, duration: 10000 });
        }
      } else {
        const response = await pathologyService.createOrder(hospitalId, {
          patientId: selectedPatient.patientId,
          testIds: selectedTestIds,
          notes: orderNotes || undefined,
          sourceType: orderSourceType,
          isStat: orderIsStat,
          encounterId: billingEncounterId,
          admissionId,
        });
        if (!response.success) {
          toast.error('Could not place order', { description: response.message });
          return;
        }
        toast.success('Order placed', { description: response.orderNo });
        if (response.billingWarning) {
          toast.warning('Billing needs attention', { description: response.billingWarning, duration: 10000 });
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(isEditMode ? 'Could not save changes' : 'Could not place order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-7xl h-[95vh] p-0 overflow-hidden flex flex-col bg-slate-50 sm:rounded-2xl" hideClose>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-1 min-h-0 w-full">

          {/* LEFT COLUMN: Order Summary (Cart) */}
          <div className="w-[340px] md:w-[400px] bg-white border-r flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">

          <div className="p-6 border-b bg-gradient-to-br from-brand-50/80 to-emerald-50/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center shadow-sm border border-brand-200">
                <ClipboardList className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Order Summary</h2>
                <p className="text-xs text-slate-500 font-medium">{isEditMode ? 'Review before saving' : 'Review before placing'}</p>
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
                  <Badge variant="outline" className={`px-3 py-1 text-xs font-semibold ${
                    orderSourceType === 'OPD' ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : orderSourceType === 'EMERGENCY' ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : orderSourceType === 'IPD' ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
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
                      const pendingConfirm = testIdsPendingRemovalConfirm.includes(id);
                      return (
                        <div key={id} className={`rounded-lg border shadow-sm ${pendingConfirm ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="h-8 w-8 rounded-md bg-brand-50 flex items-center justify-center shrink-0">
                                <ActivitySquare className="h-4 w-4 text-brand-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{t.testName}</p>
                                <p className="text-xs text-slate-400">{t.testCode}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleTest(id)}
                              title={pendingConfirm ? 'Click again to confirm removal' : undefined}
                              className={`p-1.5 rounded-full transition-colors shrink-0 ${pendingConfirm ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                            >
                              {pendingConfirm ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                          </div>
                          {pendingConfirm && (
                            <p className="px-3 pb-2 text-[10px] text-red-600 font-medium">This test's report already exists -- click the warning icon again to remove it and delete that report.</p>
                          )}
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
                  {orderSourceType === 'IPD' ? (
                    isLoadingAdmissions ? (
                      <p className="text-xs text-amber-600/70">Checking active admissions...</p>
                    ) : !selectedAdmissionId ? (
                      <p className="text-xs text-amber-600">No active admission selected — this order won't auto-bill.</p>
                    ) : (
                      <p className="text-xs text-emerald-600 font-medium">Billing to admission: {admissions.find(a => a.admissionId === selectedAdmissionId)?.admissionNo}</p>
                    )
                  ) : isLoadingOpdVisits ? (
                    <p className="text-xs text-amber-600/70">Checking billing visit...</p>
                  ) : orderSourceType === 'OPD' ? (
                    opdVisits.length === 0 ? (
                      labVisits.length === 0 ? (
                        <p className="text-xs text-emerald-600 font-medium">No active OPD visit — a new Lab visit will be created for billing instead.</p>
                      ) : (
                        <p className="text-xs text-emerald-600 font-medium">No active OPD visit — billing to existing Lab visit: {labVisits[0].invoiceNo ?? 'Draft'}</p>
                      )
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
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {isEditMode ? 'Saving Changes...' : 'Placing Order...'}
                </span>
              ) : (isEditMode ? 'Save Changes' : 'Place Order')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full h-10 mt-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Button>
          </div>

        </div>

          {/* RIGHT COLUMN: Interactive Form */}
          <ScrollArea className="flex-1 bg-slate-50/50">
            <div className="max-w-5xl mx-auto p-3 md:p-4 space-y-3">

              {/* Header */}
              <div className="mb-1 flex items-center justify-between">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{isEditMode ? 'Edit Order' : 'New Lab Order'}</h1>
                <p className="text-slate-500 text-xs font-medium">{isEditMode ? 'Change patient, tests, or notes.' : 'Complete steps to place order.'}</p>
              </div>

            {isLoadingOrder ? (
              <div className="flex items-center justify-center py-24">
                <LoadingSpinner />
              </div>
            ) : (
            <>
            {/* Step 1: Patient Selection */}
            <section className="bg-white p-3 rounded-xl border shadow-sm space-y-2.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500 rounded-l-xl"></div>

              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shadow-sm">1</div>
                <h3 className="text-sm font-bold text-slate-800">Patient Details</h3>
              </div>

              {!selectedPatient && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPatientMode('search')}
                    className={`group relative flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all ${
                      patientMode === 'search'
                        ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md transition-colors ${patientMode === 'search' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-brand-600 group-hover:bg-brand-100'}`}>
                      <User className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-slate-900 text-xs">Registered Patient</span>
                      <span className="block text-[10px] text-slate-500">Search existing records.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPatientMode('register')}
                    className={`group relative flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all ${
                      patientMode === 'register'
                        ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md transition-colors ${patientMode === 'register' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:text-brand-600 group-hover:bg-brand-100'}`}>
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-slate-900 text-xs">Walk-in / New</span>
                      <span className="block text-[10px] text-slate-500">Quickly register patient.</span>
                    </div>
                  </button>
                </div>
              )}

              {!selectedPatient && patientMode === 'search' && (
                <div className="mt-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-1">
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                      <Input
                        className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-brand-500"
                        value={patientQuery}
                        onChange={(e) => setPatientQuery(e.target.value)}
                        placeholder="Search patient..."
                      />
                      {patientQuery && (
                         <button onClick={() => setPatientQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 bg-slate-200/50 hover:bg-slate-200 p-0.5 rounded-full">
                           <X className="h-3 w-3" />
                         </button>
                      )}
                    </div>
                    <Button
                      onClick={() => searchPatients(patientQuery)}
                      disabled={isSearchingPatients || !patientQuery.trim()}
                      className="h-9 px-4 text-sm font-semibold shadow-sm"
                    >
                      {isSearchingPatients ? 'Wait...' : 'Search'}
                    </Button>
                  </div>

                  {patientResults.length > 0 && (
                    <div className="border border-slate-200 rounded-lg mt-2 max-h-40 overflow-y-auto divide-y divide-slate-100 shadow-sm bg-white">
                      {patientResults.map((p) => (
                        <div
                          key={p.patientId}
                          className="p-2 cursor-pointer hover:bg-brand-50/50 transition-colors flex items-center justify-between group"
                          onClick={() => { setSelectedPatient(p); setPatientResults([]); originalEncounterIdRef.current = null; originalAdmissionIdRef.current = null; }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs group-hover:bg-brand-100 group-hover:text-brand-700 transition-colors">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                              <p className="text-[10px] text-slate-500">{p.patientId} • {p.mobile}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100 text-brand-600">Select</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedPatient && patientMode === 'register' && (
                <div className="mt-2 pt-2 border-t border-slate-100 animate-in slide-in-from-top-1">
                  <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[10px] text-slate-700 font-semibold">Full Name <span className="text-red-500">*</span></Label>
                        <Input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-semibold">Mobile Number <span className="text-red-500">*</span></Label>
                        <Input value={newPatientMobile} onChange={(e) => setNewPatientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" className="h-8 text-xs bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-semibold">Age <span className="text-red-500">*</span></Label>
                        <div className="flex gap-1">
                          <Input type="number" min={0} value={newPatientAge} onChange={(e) => setNewPatientAge(e.target.value)} placeholder="e.g. 34" className="h-8 text-xs bg-white flex-1 min-w-0" />
                          {(['Y', 'M', 'D'] as const).map(u => (
                            <Button key={u} type="button" variant={newPatientAgeUnit === u ? 'default' : 'outline'} onClick={() => setNewPatientAgeUnit(u)} className={`h-8 w-9 shrink-0 text-[10px] px-0 ${newPatientAgeUnit === u ? 'bg-brand-600 shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-600'}`}>
                              {u === 'Y' ? 'Yrs' : u === 'M' ? 'Mon' : 'Days'}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-semibold">Gender <span className="text-red-500">*</span></Label>
                        <div className="flex gap-1 h-8">
                          {(['Male', 'Female', 'Other'] as const).map(g => (
                            <Button key={g} type="button" variant={newPatientGender === g ? 'default' : 'outline'} onClick={() => setNewPatientGender(g)} className={`flex-1 h-8 text-[10px] px-1 ${newPatientGender === g ? 'bg-brand-600 shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-600'}`}>
                              {g}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-700 font-semibold">Guardian (Optional)</Label>
                        <div className="flex h-8 rounded-md border border-input bg-white overflow-hidden">
                          <select
                            value={newPatientGuardianRelation}
                            onChange={(e) => setNewPatientGuardianRelation(e.target.value)}
                            className="h-full w-[56px] border-0 border-r border-input px-1 text-[10px] bg-muted/40 focus:outline-none shrink-0"
                          >
                            {GUARDIAN_RELATION_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <Input value={newPatientGuardian} onChange={(e) => setNewPatientGuardian(e.target.value)} placeholder="e.g. Father's Name" className="h-8 text-xs bg-white border-0 rounded-none flex-1" />
                        </div>
                      </div>
                    </div>
                    <Button type="button" className="w-full mt-3 h-8 text-xs font-semibold shadow-sm" onClick={registerWalkInPatient} disabled={isRegisteringPatient}>
                      {isRegisteringPatient ? 'Registering...' : 'Register'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <section className={`bg-white p-3 rounded-xl border shadow-sm space-y-2.5 relative overflow-hidden transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>

                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shadow-sm">2</div>
                  <h3 className="text-sm font-bold text-slate-800">Order Context</h3>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {(['OPD', 'IPD', 'EMERGENCY', 'WALK_IN'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderSourceType(st)}
                      className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${
                        orderSourceType === st
                          ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-full mb-1 transition-colors ${orderSourceType === st ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                        {st === 'OPD' ? <Stethoscope className="h-3 w-3" /> : st === 'IPD' ? <Hotel className="h-3 w-3" /> : st === 'EMERGENCY' ? <Ambulance className="h-3 w-3" /> : <Footprints className="h-3 w-3" />}
                      </div>
                      <span className="font-bold text-[10px] text-slate-900 leading-tight">
                        {st === 'OPD' ? 'OPD' : st === 'IPD' ? 'IPD' : st === 'EMERGENCY' ? 'ER' : 'Walk-in'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* OPD Billing Selection */}
                {selectedPatient && orderSourceType === 'OPD' && opdVisits.length > 1 && (
                  <div className="mt-2 p-2 rounded-lg border border-blue-100 bg-blue-50/50 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-800">Attach to OPD visit:</p>
                    <div className="grid gap-1">
                      {opdVisits.map(v => (
                        <button
                          key={v.encounterId}
                          type="button"
                          onClick={() => setSelectedOpdEncounterId(v.encounterId)}
                          className={`flex items-center justify-between p-1.5 rounded border transition-colors ${v.encounterId === selectedOpdEncounterId ? 'border-brand-500 bg-white shadow-sm ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                        >
                          <span className="text-[10px] font-medium text-slate-700">{v.invoiceNo ?? 'Draft Invoice'}</span>
                          <span className="text-[9px] text-slate-500">{new Date(v.invoiceDate).toLocaleDateString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* IPD Admission Selection */}
                {selectedPatient && orderSourceType === 'IPD' && (
                  <div className="mt-2 p-2 rounded-lg border border-purple-100 bg-purple-50/50 space-y-1">
                    {isLoadingAdmissions ? (
                      <p className="text-[10px] text-purple-700">Checking active admissions...</p>
                    ) : admissions.length === 0 ? (
                      <p className="text-[10px] text-amber-700">No active admission found for this patient -- use OPD or Walk-in instead.</p>
                    ) : (
                      <>
                        <p className="text-[10px] font-semibold text-slate-800">Attach to admission:</p>
                        <div className="grid gap-1">
                          {admissions.map(a => (
                            <button
                              key={a.admissionId}
                              type="button"
                              onClick={() => setSelectedAdmissionId(a.admissionId)}
                              className={`flex items-center justify-between p-1.5 rounded border transition-colors ${a.admissionId === selectedAdmissionId ? 'border-brand-500 bg-white shadow-sm ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                            >
                              <span className="text-[10px] font-medium text-slate-700">{a.admissionNo}{a.bedCode ? ` · ${a.bedCode}` : ''}</span>
                              <span className="text-[9px] text-slate-500">{new Date(a.admittedAt).toLocaleDateString()}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* Step 4 Moved Here: Notes & Priority */}
              <section className={`bg-white p-3 rounded-xl border shadow-sm space-y-2.5 relative flex flex-col transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shadow-sm">4</div>
                    <h3 className="text-sm font-bold text-slate-800">Notes & Priority</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderIsStat(!orderIsStat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all ${
                      orderIsStat
                        ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Flame className={`h-3 w-3 ${orderIsStat ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                    STAT
                  </button>
                </div>
                <Textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Additional remarks or clinical history..."
                  className="bg-slate-50 resize-none flex-1 min-h-[60px] text-xs p-2 border-slate-200 focus-visible:ring-brand-500"
                />
              </section>
            </div>

            {/* Step 3: Tests Selection */}
            <section className={`bg-white p-3 rounded-xl border shadow-sm space-y-2.5 relative overflow-hidden transition-opacity ${!selectedPatient ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>

              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shadow-sm">3</div>
                <h3 className="text-sm font-bold text-slate-800">Select Lab Tests</h3>
              </div>

              <div className="relative group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
                <Input
                  className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-brand-500 shadow-inner"
                  placeholder="Search catalog..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                />
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                {testCatalog.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 flex flex-col items-center">
                    <Activity className="h-6 w-6 text-slate-300 mb-1" />
                    <p className="font-medium text-xs text-slate-600">No active tests in the catalog</p>
                  </div>
                ) : (() => {
                  const filteredTests = testCatalog.filter(t =>
                    t.testName.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
                    t.testCode.toLowerCase().includes(testSearchQuery.toLowerCase())
                  );
                  return filteredTests.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">No tests matching "{testSearchQuery}".</div>
                  ) : (
                    <ScrollArea className="h-[20vh] min-h-[140px]">
                      <div className="divide-y divide-slate-100">
                        {filteredTests.map((t) => {
                          const pendingConfirm = testIdsPendingRemovalConfirm.includes(t.testId);
                          return (
                          <label key={t.testId} className={`flex items-center justify-between p-2 cursor-pointer transition-colors group ${pendingConfirm ? 'bg-red-50' : 'hover:bg-brand-50/50'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center h-4 w-4 rounded border ${pendingConfirm ? 'bg-red-100 border-red-400 text-red-600' : selectedTestIds.includes(t.testId) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white group-hover:border-brand-400'}`}>
                                {pendingConfirm ? <AlertTriangle className="h-3 w-3" /> : selectedTestIds.includes(t.testId) && <CheckCircle2 className="h-3 w-3" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-xs">{t.testName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {pendingConfirm ? 'Click again to remove -- deletes the generated report' : t.testCode}
                                </span>
                              </div>
                            </div>
                            {/* Hidden actual checkbox for accessibility */}
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selectedTestIds.includes(t.testId)}
                              onChange={() => toggleTest(t.testId)}
                            />
                          </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  );
                })()}
              </div>
            </section>

              {/* Bottom Padding for scroll area */}
              <div className="h-10"></div>
            </>
            )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
