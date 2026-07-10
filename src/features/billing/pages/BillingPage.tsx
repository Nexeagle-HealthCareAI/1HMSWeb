import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Plus, Receipt, ArrowLeft, IndianRupee, Loader2, RefreshCw,
    AlertCircle, X, Wallet, TrendingDown, Trash2, Printer, Lock, Unlock, CreditCard, Percent, CalendarDays, Check, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { debounce } from 'lodash';

import { patientService } from '../services/patientService';
import {
    ipdBillingService,
    type BillingChargeRow, type BillingPaymentRow, type GetEncounterEventsResponse, type PaymentMode,
} from '../services/ipdBillingService';
import { AdmissionDayBillsPanel } from '../components/AdmissionDayBillsPanel';
import { offlineCachedRead, isReachable } from '@/offline';
import type { Patient } from '../types';
import { AddChargeDialog } from '../components/dialogs/AddChargeDialog';
import { AddChargesModal } from '../components/AddChargesModal';
import { EditChargeDialog } from '../components/dialogs/EditChargeDialog';
import { AddPaymentDialog } from '../components/dialogs/AddPaymentDialog';
import { CreditApprovalsCard } from '../components/CreditApprovalsCard';
import { VISIT_TYPES, visitTypeLabel } from '../utils/constants';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { downloadHtmlAsPdf, openBlankPrintWindow, writeAndPrint } from '@/utils/printUtils';
import { getOpdDocHtml, buildPrintSettingsFromHospital, splitChargePeriod, type OpdDocKind } from '../utils/opdDocuments';
import { Download } from 'lucide-react';

// Render a backend timestamp in IST. Naive (offset-less) timestamps are treated as UTC,
// since the backend stores UTC — so they convert correctly to Asia/Kolkata.
const formatIst = (iso?: string | null): string => {
    if (!iso) return '';
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : `${iso}Z`);
    if (isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
};

// ─── Local view models ──────────────────────────────────────────────────────

type Encounter = {
    encounterId: string;
    invoiceNo?: string;
    invoiceDate: string;
    doctorName?: string;
    status: string;
    isCancelled: boolean;
    cancelReason?: string;
    totalBilled?: number;
    balance?: number;
    paymentStatus?: string;   // PAID / PART / UNPAID
};


// ─── Main BillingPage ───────────────────────────────────────────────────────

export const BillingPage: React.FC = () => {
    const { toast } = useToast();
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialPatientId = searchParams.get('patientId');
    const { hospitalId } = useAuthStore();
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId ?? '');
    const [invoicing, setInvoicing] = useState(false);
    const [docBusy, setDocBusy] = useState(false);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [reopenOpen, setReopenOpen] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [discountInput, setDiscountInput] = useState('');
    const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
    const [showDiscount, setShowDiscount] = useState(false);

    // Patient panel
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Encounters (visits)
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [encountersLoading, setEncountersLoading] = useState(false);
    const [encountersError, setEncountersError] = useState<string | null>(null);

    // Selected encounter + its events
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(appointmentId || null);
    const [eventsData, setEventsData] = useState<GetEncounterEventsResponse['data'] | null>(null);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);

    // Dialogs
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddChargesModal, setShowAddChargesModal] = useState(false);
    const [editChargeTarget, setEditChargeTarget] = useState<{ chargeEventId: string; displayName?: string; qty: number; rate: number; discountAmount: number } | null>(null);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showNewVisit, setShowNewVisit] = useState(false);
    const [newVisitType, setNewVisitType] = useState<'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY'>('OPD');
    const [creatingVisit, setCreatingVisit] = useState(false);
    const [voidConfirm, setVoidConfirm] = useState<{ kind: 'charge' | 'payment'; id: string; label: string } | null>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidBusy, setVoidBusy] = useState(false);
    const [instantRefundBusy, setInstantRefundBusy] = useState(false);

    // Visit day-wise interim billing (opt-in, anchored to the visit; no admission)
    const [showDayWise, setShowDayWise] = useState(false);
    const [showMoreDocs, setShowMoreDocs] = useState(false);
    // "Paid in full" prompt: offer to lock & print after a payment clears the balance.
    const [showPaidPrompt, setShowPaidPrompt] = useState(false);
    const justPaidRef = useRef(false);
    const autoPrintBillRef = useRef(false);

    // ─── Patient search ─────
    const debouncedSearch = useMemo(
        () => debounce(async (query: string) => {
            if (!query || query.length < 3) { setSearchResults([]); setIsSearching(false); return; }
            setIsSearching(true);
            let by: 'patientId' | 'name' | 'contact' = 'name';
            if (query.toUpperCase().startsWith('PT')) by = 'patientId';
            else if (/^\d{4,}$/.test(query)) by = 'contact';
            try {
                const results = await patientService.searchPatients(query, by);
                setSearchResults(results);
            } catch {
                toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch patients.' });
            } finally {
                setIsSearching(false);
            }
        }, 500),
        [toast]
    );

    useEffect(() => {
        debouncedSearch(patientSearch);
        return () => { debouncedSearch.cancel(); };
    }, [patientSearch, debouncedSearch]);

    // ─── Load encounters for selected patient ─────
    const loadEncounters = useCallback(async (patientIdValue: string) => {
        setEncountersLoading(true);
        setEncountersError(null);
        try {
            const res: any = await offlineCachedRead(
                ['billing', 'patientEvents', patientIdValue],
                () => ipdBillingService.getPatientEvents(patientIdValue),
            );
            if (res?.success === false) throw new Error(res.message ?? 'Could not load visits');
            const list: Encounter[] = (res?.data?.encounters ?? []).map((e: any) => ({
                encounterId: e.encounterId,
                invoiceNo: e.invoiceNo ?? undefined,
                invoiceDate: e.invoiceDate ?? new Date().toISOString(),
                doctorName: e.doctorName ?? undefined,
                status: e.status ?? 'OPEN',
                isCancelled: !!e.isCancelled,
                cancelReason: e.cancelReason ?? undefined,
                totalBilled: typeof e.totalBilled === 'number' ? e.totalBilled : undefined,
                balance: typeof e.balance === 'number' ? e.balance : undefined,
                paymentStatus: e.paymentStatus ?? undefined,
            })).sort((a: Encounter, b: Encounter) => b.invoiceDate.localeCompare(a.invoiceDate));
            setEncounters(list);
            if (!selectedEncounterId && list.length > 0) {
                // Land on the CURRENT bill by default: the most recent still-open (not finalized,
                // not cancelled) visit; otherwise just the most recent one.
                const current = list.find(e => !e.isCancelled && (e.status ?? '').toUpperCase() !== 'FINALIZED') ?? list[0];
                setSelectedEncounterId(current.encounterId);
            } else if (list.length === 0) setSelectedEncounterId(null);
        } catch (e: any) {
            setEncountersError(e?.message ?? 'Failed to load visits');
        } finally {
            setEncountersLoading(false);
        }
    }, [selectedEncounterId]);

    // ─── Load events for selected encounter ─────
    const loadEvents = useCallback(async () => {
        if (!selectedPatient || !selectedEncounterId) {
            setEventsData(null);
            return;
        }
        setEventsLoading(true);
        setEventsError(null);
        try {
            const res = await offlineCachedRead(
                ['billing', 'encounterEvents', selectedEncounterId, selectedPatient.patientId],
                () => ipdBillingService.getEncounterEvents(selectedEncounterId, selectedPatient.patientId),
            );
            if (!res?.success) throw new Error(res?.message ?? 'Could not load events');
            setEventsData(res.data ?? null);
        } catch (e: any) {
            setEventsError(e?.message ?? 'Failed to load events');
        } finally {
            setEventsLoading(false);
        }
    }, [selectedPatient, selectedEncounterId]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    useEffect(() => {
        if (selectedPatient) loadEncounters(selectedPatient.patientId);
    }, [selectedPatient, loadEncounters]);

    // Auto-select patient from initial URL param (best effort)
    useEffect(() => {
        if (!initialPatientId || selectedPatient) return;
        (async () => {
            try {
                const results = await patientService.searchPatients(initialPatientId, 'patientId');
                if (results.length > 0) setSelectedPatient(results[0]);
            } catch { /* ignore */ }
        })();
    }, [initialPatientId, selectedPatient]);

    // ─── Mutations ─────

    const handleCreateVisit = async () => {
        if (!selectedPatient || creatingVisit) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Opening a new visit requires an internet connection.', variant: 'destructive' }); return; }
        setCreatingVisit(true);
        try {
            const res = await ipdBillingService.createEncounter({
                patientId: selectedPatient.patientId,
                encounterType: newVisitType,
            });
            if (!res?.success || !res.data?.encounterId) throw new Error(res?.message ?? 'Could not create visit');
            const newId = res.data.encounterId;
            toast({ title: 'Visit created', description: `${visitTypeLabel(newVisitType)} visit ready for billing` });
            await loadEncounters(selectedPatient.patientId);
            setSelectedEncounterId(newId);
            setShowNewVisit(false);
        } catch (e: any) {
            toast({ title: 'Could not create visit', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setCreatingVisit(false);
        }
    };

    const handleVoid = async () => {
        if (!voidConfirm || !selectedPatient || voidBusy) return;
        setVoidBusy(true);
        try {
            const type = voidConfirm.kind === 'charge' ? 'Charges' : 'Payment';
            const res: any = await ipdBillingService.deleteEvent(voidConfirm.id, type, selectedPatient.patientId, voidReason.trim() || undefined);
            if (res?.success === false) throw new Error(res.message ?? 'Could not delete');
            toast({ title: `${voidConfirm.kind === 'charge' ? 'Charge' : 'Payment'} removed` });
            setVoidConfirm(null);
            setVoidReason('');
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setVoidBusy(false);
        }
    };

    // One-click refund of the whole available credit, straight from the top-of-ledger badge.
    // Uses the RAW ledger balance (totals.balance), never `due` — `due` nets out an invoice-level
    // discount, which was never real cash collected and so can never be refunded (see the
    // AddPaymentDialog netBalance fix above for the same distinction).
    const handleInstantRefund = async () => {
        if (!selectedPatient || !selectedEncounterId || instantRefundBusy) return;
        const creditAmount = -totals.balance;
        if (creditAmount <= 0) return;
        if (!window.confirm(`Refund ₹${creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to the patient now?`)) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Processing a refund requires an internet connection.', variant: 'destructive' }); return; }
        setInstantRefundBusy(true);
        try {
            // Mirror the mode of the most recent real payment (same convention as the
            // auto-refund-on-cancel flow), so the receipt makes sense — default to CASH.
            const priorPayments = (eventsData?.payments ?? [])
                .filter(p => p.paymentType !== 'REFUND')
                .slice()
                .sort((a, b) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime());
            const lastMode = (priorPayments[0]?.paymentMode as PaymentMode) || 'CASH';

            const res: any = await ipdBillingService.addPayment({
                patientId: selectedPatient.patientId,
                encounterId: selectedEncounterId,
                payment: { paymentType: 'REFUND', paymentMode: lastMode, amount: creditAmount },
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not process refund');
            toast({ title: 'Refund processed', description: `₹${creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} refunded (${lastMode}).` });
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not process refund', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setInstantRefundBusy(false);
        }
    };

    // Finalize (lock) the invoice. We re-link any posted charges first so nothing is left off
    // the bill, then finalize. After this no charges/payments can be added until reopened.
    const handleFinalize = async () => {
        if (!selectedPatient || !selectedEncounterId || invoicing) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Finalizing an invoice requires an internet connection.', variant: 'destructive' }); return; }
        setInvoicing(true);
        try {
            const inv = await ipdBillingService.createDraftInvoice({ patientId: selectedPatient.patientId, encounterId: selectedEncounterId, invoiceDiscountAmount: overallDiscount > 0 ? overallDiscount : undefined });
            if (inv?.success === false) throw new Error(inv?.message ?? 'Could not prepare invoice');
            const res = await ipdBillingService.finalize('finalize', { patientId: selectedPatient.patientId, encounterId: selectedEncounterId });
            if (res?.success === false) throw new Error(res?.message ?? 'Could not finalize');
            toast({ title: 'Invoice finalized', description: inv?.data?.invoiceNo ? `Invoice ${inv.data.invoiceNo} is now locked.` : 'Invoice is now locked.' });
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not finalize', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setInvoicing(false);
        }
    };

    // Reopen a finalized invoice back to DRAFT (audit reason required) so it can be edited again.
    const handleReopen = async () => {
        if (!selectedPatient || !selectedEncounterId || !reopenReason.trim() || invoicing) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Reopening an invoice requires an internet connection.', variant: 'destructive' }); return; }
        setInvoicing(true);
        try {
            const res = await ipdBillingService.finalize('reopen', { patientId: selectedPatient.patientId, encounterId: selectedEncounterId, reason: reopenReason.trim() });
            if (res?.success === false) throw new Error(res?.message ?? 'Could not reopen');
            toast({ title: 'Invoice reopened', description: 'You can edit charges and payments again.' });
            setReopenOpen(false);
            setReopenReason('');
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not reopen', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setInvoicing(false);
        }
    };

    // Apply / change the overall (invoice-level) discount. Re-runs the draft builder with the
    // discount amount so the invoice net (and the due) update. Passing 0 clears it.
    const handleApplyDiscount = async (explicitAmount?: number) => {
        if (!selectedPatient || !selectedEncounterId || invoicing) return;
        let amount: number;
        if (explicitAmount !== undefined) {
            amount = explicitAmount;
        } else {
            const raw = parseFloat(discountInput || '0');
            if (isNaN(raw) || raw < 0) { toast({ title: 'Enter a valid discount', variant: 'destructive' }); return; }
            amount = discountMode === 'percent' ? (totals.debit * Math.min(100, raw)) / 100 : raw;
        }
        if (amount > totals.debit) { toast({ title: 'Discount exceeds the bill total', variant: 'destructive' }); return; }
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Updating the invoice requires an internet connection.', variant: 'destructive' }); return; }
        const rounded = Math.round(amount * 100) / 100;
        setInvoicing(true);
        try {
            const res = await ipdBillingService.createDraftInvoice({ patientId: selectedPatient.patientId, encounterId: selectedEncounterId, invoiceDiscountAmount: rounded });
            if (res?.success === false) throw new Error(res?.message ?? 'Could not apply discount');
            if (res?.pendingApproval) {
                toast({
                    title: 'Pending admin approval',
                    description: res.message ?? 'This discount would dip into already-collected money and needs Admin/AdminDoctor sign-off before it is applied.',
                });
            } else {
                toast({ title: rounded > 0 ? 'Discount applied' : 'Discount cleared', description: rounded > 0 ? `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2 })} off the invoice.` : undefined });
            }
            setDiscountInput('');
            setShowDiscount(false);
            loadEvents();
        } catch (e: any) {
            toast({ title: 'Could not apply discount', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setInvoicing(false);
        }
    };

    // Optimistic UI: drop the new charge into the ledger instantly so the user sees it the moment
    // they hit save, before the round-trip. loadEvents() later reconciles with the server; the
    // returned rollback undoes the row if the write fails.
    const applyOptimisticCharges = (
        rows: Array<{ displayName: string; qty: number; rate: number; discountPercent: number; categoryCode: string }>,
    ): (() => void) => {
        const now = new Date().toISOString();
        const provisional = rows.map((r, i) => {
            const gross = (r.qty || 0) * (r.rate || 0);
            const discountAmount = Math.round(gross * ((r.discountPercent || 0) / 100) * 100) / 100;
            return {
                chargeEventId: `optimistic-${now}-${i}`,
                createdDateTime: now,
                displayName: r.displayName,
                categoryCode: r.categoryCode,
                qty: r.qty,
                rate: r.rate,
                discountAmount,
                netAmount: Math.round((gross - discountAmount) * 100) / 100,
                _optimistic: true,
            };
        });
        const addedNet = provisional.reduce((s, c) => s + c.netAmount, 0);
        setEventsData(prev => prev ? ({
            ...prev,
            charges: [...provisional, ...(prev.charges ?? [])],
            totalBilledAmount: (prev.totalBilledAmount ?? 0) + addedNet,
        } as typeof prev) : prev);
        const ids = new Set(provisional.map(p => p.chargeEventId));
        return () => setEventsData(prev => prev ? ({
            ...prev,
            charges: (prev.charges ?? []).filter((c: any) => !ids.has(c.chargeEventId)),
            totalBilledAmount: (prev.totalBilledAmount ?? 0) - addedNet,
        } as typeof prev) : prev);
    };

    // After a charge is added, automatically fold it into the (draft) invoice so the user never
    // has to click "Update Invoice". Best-effort: the charge is already posted either way.
    const handleChargeSaved = async () => {
        if (selectedPatient && selectedEncounterId) {
            try {
                await ipdBillingService.createDraftInvoice({
                    patientId: selectedPatient.patientId,
                    encounterId: selectedEncounterId,
                    invoiceDiscountAmount: overallDiscount > 0 ? overallDiscount : undefined,
                });
            } catch { /* non-blocking — the charge is posted; ledger will still reflect it */ }
        }
        loadEvents();
        // Keep the Visits panel's per-visit amount/status in sync after a charge.
        if (selectedPatient) loadEncounters(selectedPatient.patientId);
    };

    // Render the bill (invoice / receipt / bill-cum-receipt) from the loaded ledger data
    // using the shared A4 templates — print to a window or download as PDF.
    const handleDoc = async (kind: OpdDocKind, mode: 'print' | 'download', paymentId?: string, paperFormat?: 'a4' | 'thermal') => {
        if (!selectedPatient || !eventsData || docBusy) return;

        // Open the tab synchronously, before any await below, so the browser still treats it as
        // a direct response to this click — invoice/bill-cum-receipt prints await an extra
        // day-wise fetch first, and opening window.open() AFTER an await can get silently
        // blocked or land on a blank/generic tab instead of the print document.
        const printWindow = mode === 'print' ? openBlankPrintWindow() : null;
        if (mode === 'print' && !printWindow) return; // popup blocked — already alerted the user

        setDocBusy(true);
        try {
            const settings = buildPrintSettingsFromHospital(hospitalData);
            const ctx = {
                patientName: selectedPatient.name,
                patientId: selectedPatient.patientId,
                ageGender: [selectedPatient.age, selectedPatient.sex].filter(Boolean).join(' / '),
                mobile: selectedPatient.mobile,
                doctorName: selectedEncounter?.doctorName,
            };
            // For a final invoice of an admitted patient, append a day-wise breakup (best-effort).
            let dayWise: { dayNumber: number; label: string; netAmount: number }[] | undefined;
            if ((kind === 'invoice' || kind === 'billcum') && selectedEncounterId) {
                try {
                    const db = await ipdBillingService.getVisitDayBills(selectedEncounterId);
                    const days = db?.data?.days ?? [];
                    // Only attach a day-wise breakup when day-wise is actually in use (multiple days
                    // or at least one closed interim bill) — a plain single-day bill needs none.
                    const usesDayWise = days.length > 1 || days.some(d => d.isClosed);
                    if (usesDayWise) {
                        dayWise = days.map(d => ({
                            dayNumber: d.dayNumber,
                            label: `${formatIst(d.fromUtc)} → ${formatIst(d.toUtc)}`,
                            netAmount: d.netAmount,
                        }));
                    }
                } catch { /* best-effort — invoice still prints without the breakup */ }
            }
            const html = getOpdDocHtml(kind, eventsData, settings, ctx, { paymentId, dayWise, paperFormat });
            const fileSuffix = paymentId ? `${kind}-${paymentId.slice(0, 8)}` : `${kind}-${selectedPatient.patientId}`;
            if (mode === 'print' && printWindow) writeAndPrint(printWindow, html);
            else await downloadHtmlAsPdf(html, `${fileSuffix}.pdf`);
        } catch (e: any) {
            printWindow?.close();
            toast({ title: 'Could not generate document', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setDocBusy(false);
        }
    };

    // ─── Derived totals ─────
    const totals = useMemo(() => {
        const debit = eventsData?.totalBilledAmount ?? 0;
        const credit = eventsData?.amountReceived ?? 0;
        const balance = eventsData?.netBalance ?? (debit - credit);
        return { debit, credit, balance };
    }, [eventsData]);

    const selectedEncounter = useMemo(
        () => encounters.find(e => e.encounterId === selectedEncounterId) ?? null,
        [encounters, selectedEncounterId]
    );

    const isFinalized = (eventsData?.currentInvoice?.statusCode ?? '').toUpperCase() === 'FINALIZED';

    // Posted charges on the encounter that aren't yet folded into the current invoice
    // (e.g. a lab added after the consult invoice was created). Drives the "Update Invoice" action.
    const hasUninvoicedCharges = (eventsData?.charges ?? []).some(
        c => !c.isInvoiced && (c.statusCode ?? '').toUpperCase() === 'POSTED'
    );

    // Invoice-level (overall) discount = the invoice's total discount minus the per-line discounts
    // of the charges already linked to it. Deriving it this way (rather than charge-total − invoice
    // net) avoids counting a freshly-added, not-yet-invoiced charge as a "discount".
    const linkedLineDiscount = (eventsData?.charges ?? [])
        .filter(c => c.isInvoiced)
        .reduce((s, c) => s + (Number(c.discountAmount) || 0), 0);
    const overallDiscount = Math.max(0, (eventsData?.currentInvoice?.discountAmount ?? 0) - linkedLineDiscount);
    // Payable = all posted charges (net of line discounts) minus the overall discount.
    const netPayable = totals.debit - overallDiscount;
    const due = netPayable - totals.credit;

    // After a payment refreshes the ledger, if it cleared the balance, offer to lock & print.
    const handlePaymentSaved = useCallback(() => {
        justPaidRef.current = true;
        loadEvents();
        if (selectedPatient) loadEncounters(selectedPatient.patientId);
    }, [loadEvents, loadEncounters, selectedPatient]);

    useEffect(() => {
        if (!justPaidRef.current) return;
        justPaidRef.current = false;
        if (!isFinalized && (eventsData?.charges?.length ?? 0) > 0 && due <= 0) {
            setShowPaidPrompt(true);
        }
    }, [eventsData, isFinalized, due]);

    // Deferred print: once the bill is locked AND the refreshed (finalized) data is in, print it.
    // This avoids printing stale "draft" data right after finalizing.
    useEffect(() => {
        if (autoPrintBillRef.current && isFinalized && eventsData) {
            autoPrintBillRef.current = false;
            handleDoc((eventsData?.payments?.length ?? 0) > 0 ? 'billcum' : 'invoice', 'print');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinalized, eventsData]);

    // Unified ledger: charges + payments interleaved in chronological order (oldest first).
    const ledgerRows = useMemo(() => {
        const charges = (eventsData?.charges ?? []).map(c => ({ kind: 'charge' as const, ts: c.createdDateTime, c }));
        const payments = (eventsData?.payments ?? []).map(p => ({ kind: 'payment' as const, ts: p.createdDateTime, p }));
        return [...charges, ...payments].sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''));
    }, [eventsData]);

    // ─── Render ─────
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-2 sm:px-4 pb-4 pt-1 gap-4 text-sm text-slate-800">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-white/40 ring-1 ring-black/5 shadow-lg shadow-brand-500/5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100" onClick={() => navigate('/billing')}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-md shadow-brand-500/30">
                        <IndianRupee className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold tracking-wide text-slate-900 uppercase">Billing Ledger</h1>
                        <p className="text-[10px] text-slate-500">Charges, payments &amp; receipts</p>
                    </div>

                    {selectedPatient && (
                        <div className="flex items-center gap-3 ml-3 min-w-0">
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-300 shrink-0">
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 truncate">{selectedPatient.name}</h3>
                                        <Badge variant="outline" className="text-[11px] h-5 px-1.5 shrink-0">{selectedPatient.age}Y / {selectedPatient.sex}</Badge>
                                    </div>
                                    <span className="text-[10px] text-cyan-700 font-mono">{selectedPatient.patientId}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-600" onClick={() => { setSelectedPatient(null); setEncounters([]); setSelectedEncounterId(null); setEventsData(null); }}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {totals.balance < 0 ? (
                                // Real, refundable credit (raw ledger — never the discount-adjusted
                                // `due`, which can show a phantom credit that was never real cash
                                // collected and so can never actually be refunded).
                                <button
                                    type="button"
                                    onClick={handleInstantRefund}
                                    disabled={instantRefundBusy}
                                    title="Click to refund this credit instantly"
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-2 transition-colors',
                                        'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400',
                                        'disabled:opacity-60 disabled:cursor-wait'
                                    )}
                                >
                                    {instantRefundBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                                    <div className="flex flex-col items-start">
                                        <span className="text-[11px] font-bold tracking-wider uppercase">Credit · tap to refund</span>
                                        <span className="text-sm font-bold tabular-nums">₹ {Math.abs(totals.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </button>
                            ) : due > 0 ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-2 bg-rose-50 border-rose-300 text-rose-700">
                                    <TrendingDown className="h-4 w-4" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold tracking-wider uppercase">Due</span>
                                        <span className="text-sm font-bold tabular-nums">₹ {due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
                {eventsData?.currentInvoice?.isReopened && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shrink-0 max-w-[260px]" title={eventsData.currentInvoice.reopenedReason || 'No reason recorded'}>
                        <Unlock className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex flex-col leading-tight">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Invoice reopened</span>
                            {eventsData.currentInvoice.reopenedReason && <span className="text-[11px] truncate">{eventsData.currentInvoice.reopenedReason}</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Guided 3-step rail — orients a first-time user: Patient → Add items → Pay & print.
                Steps are derived from live state; the current step is highlighted, done steps ticked. */}
            <div className="flex items-center gap-1 sm:gap-3 px-1 shrink-0">
                {[
                    { n: 1, label: 'Patient', done: !!selectedPatient },
                    { n: 2, label: 'Add items', done: (eventsData?.charges?.length ?? 0) > 0 },
                    { n: 3, label: 'Pay & print', done: (eventsData?.charges?.length ?? 0) > 0 && due <= 0 },
                ].map((s, i, arr) => {
                    const currentStep = !selectedPatient ? 1 : (eventsData?.charges?.length ?? 0) === 0 ? 2 : 3;
                    const isCurrent = currentStep === s.n;
                    return (
                        <React.Fragment key={s.n}>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors',
                                    s.done ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-200 text-slate-500'
                                )}>
                                    {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
                                </span>
                                <span className={cn(
                                    'text-xs font-semibold hidden sm:inline',
                                    isCurrent ? 'text-brand-700' : s.done ? 'text-emerald-700' : 'text-slate-400'
                                )}>{s.label}</span>
                            </div>
                            {i < arr.length - 1 && <div className={cn('h-px flex-1 min-w-[12px]', s.done ? 'bg-emerald-300' : 'bg-slate-200')} />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Main 3-column layout (lg uses a 24-track grid for finer column balance) */}
            <div className="grid grid-cols-12 lg:grid-cols-[repeat(24,minmax(0,1fr))] gap-4 flex-1 overflow-hidden">

                {/* Left: patient search + visits */}
                <Card className="col-span-12 md:col-span-3 lg:col-span-3 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-brand-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Patient &amp; Visits</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 flex flex-col min-h-0 gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="PTID / name / mobile" className="h-9 pl-8 text-xs" autoFocus />
                        </div>

                        {patientSearch.length > 0 && (
                            <div className="border border-slate-200 rounded-md max-h-72 overflow-auto bg-white text-xs">
                                {isSearching && (
                                    <div className="p-3 flex items-center gap-2 text-cyan-700"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>
                                )}
                                {!isSearching && patientSearch.length >= 3 && searchResults.length === 0 && (
                                    <div className="p-3 text-rose-600 text-[10px] text-center">No patients found</div>
                                )}
                                {!isSearching && patientSearch.length < 3 && (
                                    <div className="p-3 text-slate-400 text-[10px] text-center">Type at least 3 characters</div>
                                )}
                                {searchResults.map(p => (
                                    <button key={p.patientId} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(''); setSearchResults([]); setSelectedEncounterId(null); setEventsData(null); }} className="w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-cyan-50">
                                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{p.patientId} · {p.mobile} · {p.age}y/{p.sex}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {patientSearch.length === 0 && !selectedPatient && (
                            <div className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400 px-3">
                                Search by patient ID, name, or mobile to start billing.
                            </div>
                        )}

                        {/* Visits for the selected patient */}
                        {patientSearch.length === 0 && selectedPatient && (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visits</span>
                                    <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => loadEncounters(selectedPatient.patientId)} disabled={encountersLoading} title="Refresh visits">
                                        <RefreshCw className={cn('h-3 w-3', encountersLoading && 'animate-spin')} />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-auto -mx-1 px-1 space-y-2">
                                    {encountersLoading ? (
                                        <div className="space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                                    ) : encountersError ? (
                                        <div className="p-3 text-center text-rose-600 text-xs flex items-center justify-center gap-2"><AlertCircle className="h-4 w-4" /> {encountersError}</div>
                                    ) : encounters.length === 0 ? (
                                        <div className="p-4 text-center text-[11px] text-slate-400">No visits yet — use “Create New Invoice” below to start.</div>
                                    ) : (
                                        encounters.map(enc => {
                                            const active = enc.encounterId === selectedEncounterId;
                                            const chipCls = enc.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                                                : enc.paymentStatus === 'PART' ? 'bg-amber-100 text-amber-700'
                                                : 'bg-slate-100 text-slate-500';
                                            return (
                                                <button
                                                    key={enc.encounterId}
                                                    type="button"
                                                    onClick={() => setSelectedEncounterId(enc.encounterId)}
                                                    className={cn(
                                                        'w-full px-3 py-2 rounded-xl border text-xs text-left transition-all',
                                                        active ? 'border-transparent bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-md shadow-brand-500/30' : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm',
                                                        enc.isCancelled && 'opacity-60'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono font-bold text-[10px] truncate max-w-full">{enc.invoiceNo ?? enc.encounterId.slice(0, 8)}</span>
                                                        <Badge variant="outline" className={cn('text-[11px] h-4 px-1', active && 'bg-white/20 text-white border-white/30')}>{enc.status}</Badge>
                                                        {enc.isCancelled && <Badge variant="outline" className="text-[11px] h-4 px-1 bg-rose-50 text-rose-700 border-rose-200">VOID</Badge>}
                                                    </div>
                                                    <p className={cn('text-[10px] mt-0.5 truncate', active ? 'text-brand-100' : 'text-slate-500')}>
                                                        {format(parseISO(enc.invoiceDate), 'dd MMM yyyy')}
                                                        {enc.doctorName ? ` · ${enc.doctorName}` : ''}
                                                    </p>
                                                    {(enc.totalBilled ?? 0) > 0 && (
                                                        <div className="flex items-center justify-between gap-1 mt-1">
                                                            <span className={cn('text-[10px] tabular-nums', active ? 'text-brand-100' : 'text-slate-600')}>
                                                                ₹{(enc.totalBilled ?? 0).toLocaleString('en-IN')}{(enc.balance ?? 0) > 0 ? ` · Due ₹${(enc.balance ?? 0).toLocaleString('en-IN')}` : ''}
                                                            </span>
                                                            {enc.paymentStatus && (
                                                                <span className={cn('text-[11px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0', active ? 'bg-white/20 text-white' : chipCls)}>{enc.paymentStatus}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Middle: ledger */}
                <Card className="col-span-12 md:col-span-9 lg:col-[span_16/span_16] border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-brand-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ledger</CardTitle>
                        {/* Primary CTA: start a new billable visit (= a new invoice). Centered in the
                            ledger header, distinct dark premium style. Shown once a patient is selected. */}
                        {selectedPatient && (
                            <Button
                                onClick={() => setShowNewVisit(true)}
                                className="h-9 px-6 min-w-[220px] shrink-0 whitespace-nowrap rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 ring-1 ring-white/10 shadow-md shadow-black/30 transition-all active:scale-[0.98]"
                            >
                                <Plus className="h-4 w-4 mr-0.5" />Create New Invoice
                            </Button>
                        )}
                        {eventsData?.currentInvoice ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Invoice</span>
                                <span className="text-sm font-bold text-slate-700 tabular-nums whitespace-nowrap shrink-0" title={eventsData.currentInvoice.invoiceNo ?? undefined}>{eventsData.currentInvoice.invoiceNo ?? '—'}</span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-[11px] h-6 px-2.5 font-bold uppercase tracking-wider shrink-0',
                                        isFinalized
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                            : (eventsData.currentInvoice.statusCode ?? '').toUpperCase() === 'CANCELLED'
                                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                                : 'bg-amber-50 text-amber-700 border-amber-300'
                                    )}
                                >
                                    {eventsData.currentInvoice.statusCode ?? '—'}
                                </Badge>
                            </div>
                        ) : selectedEncounterId ? (
                            <span className="text-[10px] text-slate-400">No invoice yet</span>
                        ) : null}
                    </CardHeader>

                    {/* Ledger */}
                    <CardContent className="p-0 flex-1 overflow-auto">
                        {!selectedEncounterId ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {selectedPatient ? 'Pick a visit above (or create one) to see the ledger.' : 'Select a patient first.'}
                            </div>
                        ) : eventsLoading ? (
                            <div className="p-3 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
                        ) : eventsError ? (
                            <div className="p-6 text-center text-rose-600 text-xs flex flex-col items-center gap-2">
                                <AlertCircle className="h-6 w-6" /> {eventsError}
                                <Button size="sm" variant="outline" onClick={loadEvents} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                            </div>
                        ) : (
                            <>
                                <table className="w-full text-xs [&_thead_th]:border-r [&_thead_th]:border-slate-200 [&_tbody_td]:border-r [&_tbody_td]:border-slate-100 [&_thead_th:last-child]:border-r-0 [&_tbody_td:last-child]:border-r-0">
                                    <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10">
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Date</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Particular</th>
                                            <th className="text-left px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Category</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Qty × Rate</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Discount</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Debit</th>
                                            <th className="text-right px-3 py-2.5 font-bold text-[11px] text-slate-500 uppercase tracking-widest">Credit</th>
                                            <th className="w-px" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerRows.map((row) => row.kind === 'charge' ? (
                                            <tr key={`c-${row.c.chargeEventId}`} className={cn("border-b border-slate-100 border-l-2 transition-colors", row.c.statusCode === 'VOID' ? "border-l-transparent bg-slate-50/50 opacity-75" : "border-l-transparent hover:border-l-brand-300 hover:bg-slate-50")}>
                                                <td className={cn("px-3 py-2 whitespace-nowrap text-slate-600", row.c.statusCode === 'VOID' && "line-through opacity-70")}>{formatIst(row.c.createdDateTime)}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0", row.c.statusCode === 'VOID' ? "bg-slate-100 text-slate-400" : "bg-brand-50 text-brand-500")}><IndianRupee className="h-3.5 w-3.5" /></span>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("font-semibold text-slate-800 truncate max-w-[260px]", row.c.statusCode === 'VOID' && "line-through text-slate-500")}>{splitChargePeriod(row.c.displayName, row.c.categoryCode).name || '—'}</div>
                                                                {row.c.statusCode === 'VOID' && <Badge variant="outline" className="text-[9px] bg-white text-slate-500 border-slate-200">VOID</Badge>}
                                                            </div>
                                                            {splitChargePeriod(row.c.displayName, row.c.categoryCode).period && (
                                                                <div className={cn("text-[10px] text-slate-500 whitespace-nowrap", row.c.statusCode === 'VOID' && "line-through opacity-70")}>📅 {splitChargePeriod(row.c.displayName, row.c.categoryCode).period}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={cn("px-3 py-2 text-[10px] font-mono uppercase text-slate-500", row.c.statusCode === 'VOID' && "line-through opacity-70")}>{row.c.categoryCode ?? '—'}</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", row.c.statusCode === 'VOID' && "line-through text-slate-400")}>{row.c.qty} × ₹{Number(row.c.rate).toFixed(2)}</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums", row.c.statusCode === 'VOID' ? "line-through text-slate-400" : "text-rose-600")}>{Number(row.c.discountAmount) > 0 ? `− ₹${Number(row.c.discountAmount).toFixed(2)}` : <span className="text-slate-300">—</span>}</td>
                                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
                                                    {row.c.statusCode === 'VOID' ? <span className="text-slate-400 line-through font-medium">₹{Number(row.c.netAmount).toFixed(2)}</span> : `₹${Number(row.c.netAmount).toFixed(2)}`}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-300">—</td>
                                                <td className="px-2 py-2 text-right whitespace-nowrap">
                                                    {!isFinalized && row.c.statusCode !== 'VOID' && (
                                                        <div className="inline-flex items-center gap-0.5">
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" onClick={() => setEditChargeTarget({ chargeEventId: row.c.chargeEventId, displayName: row.c.displayName ?? undefined, qty: Number(row.c.qty), rate: Number(row.c.rate), discountAmount: Number(row.c.discountAmount) || 0 })}>
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" onClick={() => setVoidConfirm({ kind: 'charge', id: row.c.chargeEventId, label: row.c.displayName ?? 'Charge' })}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={`p-${row.p.paymentId}`} className={cn("border-b border-slate-100 border-l-2 transition-colors", row.p.paymentType === 'REFUND' ? "border-l-amber-300 hover:bg-amber-50/40 bg-amber-50/20" : "border-l-emerald-300 hover:bg-emerald-50/40 bg-emerald-50/20")}>
                                                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatIst(row.p.createdDateTime)}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center shrink-0", row.p.paymentType === 'REFUND' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}><Wallet className="h-3.5 w-3.5" /></span>
                                                        <div className="min-w-0">
                                                            <div className={cn("font-semibold", row.p.paymentType === 'REFUND' ? "text-amber-700" : "text-emerald-700")}>{row.p.paymentType ?? 'PAYMENT'} · {row.p.paymentMode ?? '—'}</div>
                                                            <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{row.p.receiptNo ? `Receipt ${row.p.receiptNo}` : ''}{row.p.paymentDescription ? ` · ${row.p.paymentDescription}` : ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-[10px] font-mono uppercase text-slate-500">{row.p.paymentType === 'REFUND' ? 'REFUND' : 'PAYMENT'}</td>
                                                <td className="px-3 py-2 text-right text-slate-300 tabular-nums">—</td>
                                                <td className="px-3 py-2 text-right text-slate-300">—</td>
                                                <td className="px-3 py-2 text-right text-slate-300">—</td>
                                                <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", row.p.paymentType === 'REFUND' ? "text-amber-700" : "text-emerald-700")}>
                                                    {row.p.paymentType === 'REFUND' ? `− ₹${Number(row.p.amount).toFixed(2)}` : `₹${Number(row.p.amount).toFixed(2)}`}
                                                </td>
                                                <td className="px-2 py-2 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-0.5">
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" disabled={docBusy} title="Print this payment's receipt (A4)" onClick={() => handleDoc('receipt', 'print', row.p.paymentId, 'a4')}>
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" disabled={docBusy} title="Print this payment's receipt (80mm thermal)" onClick={() => handleDoc('receipt', 'print', row.p.paymentId, 'thermal')}>
                                                            <Receipt className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" disabled={docBusy} title="Download this payment's receipt (PDF)" onClick={() => handleDoc('receipt', 'download', row.p.paymentId)}>
                                                            <Download className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {!isFinalized && row.p.paymentType !== 'REFUND' && (
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" onClick={() => setVoidConfirm({ kind: 'payment', id: row.p.paymentId, label: row.p.paymentType ?? 'Payment' })}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(eventsData?.charges?.length ?? 0) === 0 && (eventsData?.payments?.length ?? 0) === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-3 py-16 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center">
                                                            <Receipt className="h-6 w-6 text-slate-300" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-500">No entries yet</p>
                                                        <p className="text-xs">Add a charge or record a payment from the right panel.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {((eventsData?.charges?.length ?? 0) > 0 || (eventsData?.payments?.length ?? 0) > 0) && (
                                        <tfoot className="sticky bottom-0 bg-white/90 backdrop-blur">
                                            <tr className="border-t-2 border-slate-200 text-[11px]">
                                                <td colSpan={5} className="px-3 py-2 text-right font-bold uppercase tracking-widest text-slate-400">Totals</td>
                                                <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">₹{totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td />
                                            </tr>
                                            {overallDiscount > 0 && (
                                                <tr className="text-[11px]">
                                                    <td colSpan={5} className="px-3 py-1 text-right font-bold uppercase tracking-widest text-rose-500">Invoice Discount</td>
                                                    <td colSpan={2} className="px-3 py-1 text-right tabular-nums font-bold text-rose-600">− ₹{overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td />
                                                </tr>
                                            )}
                                            <tr>
                                                <td colSpan={5} className="px-3 pb-2 text-right font-bold uppercase tracking-widest text-slate-500">{overallDiscount > 0 ? 'Balance (after discount)' : 'Balance'}</td>
                                                <td colSpan={2} className={cn('px-3 pb-2 text-right tabular-nums font-black text-sm', due > 0 ? 'text-rose-700' : due < 0 ? 'text-emerald-700' : 'text-slate-700')}>
                                                    ₹{Math.abs(due).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {due < 0 ? 'CR' : due > 0 ? 'DR' : ''}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Right: actions */}
                <Card className="col-span-12 lg:col-span-5 border-0 ring-1 ring-black/5 rounded-2xl shadow-lg shadow-brand-500/5 bg-white flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/50">
                        <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center shadow-sm shadow-brand-500/30"><IndianRupee className="h-3.5 w-3.5" /></span>
                            Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-auto space-y-3">
                        {/* Totals summary */}
                        <div className="relative overflow-hidden rounded-2xl border border-brand-100 p-4 bg-gradient-to-br from-brand-50 to-violet-50 ring-1 ring-black/5">
                            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/40 blur-2xl pointer-events-none" />
                            <div className="relative flex justify-between text-xs"><span className="text-slate-500">Gross Charged</span><span className="font-semibold tabular-nums">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            {overallDiscount > 0 && (
                                <>
                                    <div className="relative flex justify-between text-xs mt-1.5"><span className="text-slate-500">Invoice Discount</span><span className="font-semibold text-rose-600 tabular-nums">− ₹{overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="relative flex justify-between text-xs mt-1.5"><span className="text-slate-500">Net Payable</span><span className="font-semibold tabular-nums">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                </>
                            )}
                            <div className="relative flex justify-between text-xs mt-1.5"><span className="text-slate-500">Received</span><span className="font-semibold text-emerald-700 tabular-nums">₹{totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            <div className="relative flex justify-between items-baseline text-sm pt-2.5 mt-2.5 border-t border-brand-200/60">
                                <span className="font-bold text-slate-700">Balance</span>
                                <span className={cn('font-black text-lg tabular-nums', due > 0 ? 'text-rose-700' : due < 0 ? 'text-emerald-700' : 'text-slate-700')}>
                                    ₹{Math.abs(due).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {due < 0 ? 'CR' : due > 0 ? 'DR' : ''}
                                </span>
                            </div>
                            {isFinalized && (
                                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    <Lock className="h-3 w-3" /> Invoice {eventsData?.currentInvoice?.invoiceNo ?? ''} finalized — charges locked.
                                    {due > 0 ? ' Payments can still be collected until settled.' : totals.balance < 0 ? ' Patient is in credit — refund available below.' : ' Fully settled.'}
                                </div>
                            )}
                        </div>

                        {/* Real, refundable credit — raw ledger balance (totals.balance), never the
                            discount-adjusted `due` above, which can sit near zero even while real
                            cash credit remains (see handleInstantRefund). Shown prominently here
                            (not just the small header pill) so it's impossible to miss. */}
                        {totals.balance < 0 && (
                            <button
                                type="button"
                                onClick={handleInstantRefund}
                                disabled={instantRefundBusy}
                                className={cn(
                                    'w-full flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition-colors',
                                    'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 hover:from-emerald-100 hover:to-teal-100',
                                    'disabled:opacity-60 disabled:cursor-wait',
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    {instantRefundBusy ? <Loader2 className="h-5 w-5 text-emerald-700 animate-spin" /> : <Wallet className="h-5 w-5 text-emerald-700" />}
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Patient in credit</p>
                                        <p className="text-[10px] text-emerald-600">Tap to refund instantly</p>
                                    </div>
                                </div>
                                <span className="text-lg font-black tabular-nums text-emerald-700">₹{Math.abs(totals.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </button>
                        )}

                        {/* Action buttons */}
                        <div className="grid grid-cols-1 gap-2">
                            <Button onClick={() => setShowAddCharge(true)} disabled={!selectedEncounterId || isFinalized} className="h-10 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-md shadow-brand-500/20 transition-all active:scale-[0.98]">
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                            {/* Bulk entry: pick several catalog items (or type one-off lines) and post them together. */}
                            <Button onClick={() => setShowAddChargesModal(true)} disabled={!selectedEncounterId || isFinalized} variant="outline" className="h-10 rounded-xl border-brand-200 text-brand-700 hover:bg-brand-50">
                                <Plus className="h-4 w-4 mr-1" /> Add Multiple
                            </Button>
                            {/* Payments are decoupled from finalize: a finalized invoice can still be
                                collected against until the balance is settled (charges stay locked) —
                                and, separately, a real credit (totals.balance < 0, raw ledger) must
                                still be refundable even once due <= 0, since due <= 0 is also true
                                for a credit balance (it was disabling refunds on finalized bills). */}
                            <Button onClick={() => setShowAddPayment(true)} disabled={!selectedEncounterId || (isFinalized && due <= 0 && totals.balance >= 0)} className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]">
                                <CreditCard className="h-4 w-4 mr-1" /> Take Payment
                            </Button>
                            {/* IPD day-wise interim billing — opens a drawer; admits the visit if needed. */}
                            {selectedEncounterId && (
                                <Button onClick={() => setShowDayWise(true)} variant="outline" className="h-10 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50">
                                    <CalendarDays className="h-4 w-4 mr-1" /> Day-wise billing
                                </Button>
                            )}
                            {/* Overall (invoice-level) discount — opens a premium drawer. */}
                            {selectedEncounterId && eventsData?.currentInvoice && !isFinalized && (
                                <Button onClick={() => { setDiscountInput(overallDiscount > 0 ? String(overallDiscount) : ''); setDiscountMode('amount'); setShowDiscount(true); }} variant="outline" className="h-10 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-300">
                                    <Percent className="h-4 w-4 mr-1" /> {overallDiscount > 0 ? 'Edit Discount' : 'Add Discount'}
                                </Button>
                            )}
                            {/* The bill builds automatically as items are added or a payment is taken —
                                no manual "generate / update invoice" step. Locking is the only bill action. */}
                            {selectedEncounterId && eventsData?.currentInvoice && !isFinalized && (
                                <Button onClick={() => setShowFinalizeConfirm(true)} disabled={invoicing} variant="outline" className="h-10 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                                    <Lock className="h-4 w-4 mr-1" /> Lock Bill
                                </Button>
                            )}
                            {/* Unlock a finalized bill (audit reason required). */}
                            {selectedEncounterId && isFinalized && (
                                <Button onClick={() => setReopenOpen(true)} disabled={invoicing} variant="outline" className="h-10 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:text-amber-300">
                                    <Unlock className="h-4 w-4 mr-1" /> Unlock Bill
                                </Button>
                            )}

                            {/* One obvious action: print the bill (bill-cum-receipt once anything is paid,
                                otherwise the invoice). Other document types tuck away under "More". */}
                            {eventsData?.currentInvoice && (
                                <>
                                    <Button
                                        onClick={() => handleDoc((eventsData?.payments?.length ?? 0) > 0 ? 'billcum' : 'invoice', 'print')}
                                        disabled={docBusy}
                                        className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-black/20"
                                    >
                                        {docBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Printer className="h-4 w-4 mr-1" />} Print Bill
                                    </Button>
                                    <button type="button" onClick={() => setShowMoreDocs(v => !v)} className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 self-center">
                                        {showMoreDocs ? 'Hide other documents' : 'More documents'}
                                    </button>
                                    {showMoreDocs && (
                                        <div className="rounded-xl border border-slate-200 p-2.5 space-y-1.5">
                                            {([['invoice', 'Invoice'], ['receipt', 'Receipt'], ['statement', 'Statement'], ['billcum', 'Bill + Receipt']] as const)
                                                .filter(([kind]) => kind === 'invoice' || (eventsData?.payments?.length ?? 0) > 0)
                                                .map(([kind, label]) => (
                                                    <div key={kind} className="flex items-center justify-between gap-1.5 text-xs">
                                                        <span className="font-medium text-slate-600 truncate">{label}</span>
                                                        <div className="flex gap-1 shrink-0">
                                                            <Button size="sm" variant="ghost" title={`Print ${label} (A4)`} className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50" disabled={docBusy} onClick={() => handleDoc(kind, 'print', undefined, 'a4')}><Printer className="h-3.5 w-3.5" /></Button>
                                                            {kind === 'receipt' && (
                                                                <Button size="sm" variant="ghost" title={`Print ${label} (80mm thermal)`} className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50" disabled={docBusy} onClick={() => handleDoc(kind, 'print', undefined, 'thermal')}><Receipt className="h-3.5 w-3.5" /></Button>
                                                            )}
                                                            <Button size="sm" variant="ghost" title={`Download ${label} (PDF)`} className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50" disabled={docBusy} onClick={() => handleDoc(kind, 'download')}><Download className="h-3.5 w-3.5" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {selectedEncounter?.isCancelled && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-700">
                                <p className="font-bold">VISIT CANCELLED</p>
                                {selectedEncounter.cancelReason && <p className="mt-1">{selectedEncounter.cancelReason}</p>}
                            </div>
                        )}

                        {/* Credit approvals (only renders if any approvals exist for this encounter) */}
                        {selectedEncounterId && (
                            <CreditApprovalsCard encounterId={selectedEncounterId} pendingOnly={false} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            {selectedPatient && selectedEncounterId && (
                <AddChargeDialog
                    open={showAddCharge}
                    onOpenChange={setShowAddCharge}
                    patientId={selectedPatient.patientId}
                    encounterId={selectedEncounterId}
                    onSaved={handleChargeSaved}
                    onOptimistic={applyOptimisticCharges}
                />
            )}
            {selectedPatient && selectedEncounterId && (
                <AddChargesModal
                    open={showAddChargesModal}
                    onOpenChange={setShowAddChargesModal}
                    patientId={selectedPatient.patientId}
                    encounterId={selectedEncounterId}
                    onCharged={handleChargeSaved}
                />
            )}
            <EditChargeDialog
                open={!!editChargeTarget}
                onOpenChange={(o) => { if (!o) setEditChargeTarget(null); }}
                charge={editChargeTarget}
                onSaved={handleChargeSaved}
            />
            {selectedPatient && selectedEncounterId && (
                <AddPaymentDialog
                    open={showAddPayment}
                    onOpenChange={setShowAddPayment}
                    patientId={selectedPatient.patientId}
                    encounterId={selectedEncounterId}
                    // netBalance must be the RAW ledger balance (billed vs. actually collected),
                    // matching what the backend's REFUND validation checks — `due` additionally
                    // nets out an invoice-level discount, which was never real cash collected and so
                    // can never be refunded. Passing `due` as netBalance made the "Credit available"
                    // quick-fill show a discount as refundable credit, which the backend then
                    // correctly rejected ("Available credit: 0"). `due` is still passed separately
                    // as dueAmount so the "Balance Due" quick-fill keeps reflecting the discount.
                    netBalance={totals.balance}
                    dueAmount={due}
                    onSaved={handlePaymentSaved}
                />
            )}

            {/* IPD day-wise interim billing drawer */}
            <Sheet open={showDayWise} onOpenChange={setShowDayWise}>
                <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-slate-50">
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                                <CalendarDays className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-white text-lg font-bold">Day-wise Billing</SheetTitle>
                                <p className="text-slate-200/90 text-xs mt-0.5">Interim bills per day (24h cycles from the first charge)</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {selectedEncounterId ? (
                            <AdmissionDayBillsPanel
                                encounterId={selectedEncounterId}
                                onChanged={loadEvents}
                                printSettings={buildPrintSettingsFromHospital(hospitalData)}
                                patient={selectedPatient ? {
                                    name: selectedPatient.name,
                                    patientId: selectedPatient.patientId,
                                    ageGender: [selectedPatient.age, selectedPatient.sex].filter(Boolean).join(' / '),
                                    mobile: selectedPatient.mobile,
                                } : undefined}
                            />
                        ) : (
                            <div className="p-6 text-center text-xs text-slate-400 mt-6">Select a visit to manage its day-wise bills.</div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Overall discount drawer */}
            <Sheet open={showDiscount} onOpenChange={setShowDiscount}>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col bg-white dark:bg-slate-950">
                    <div className="px-6 py-5 bg-gradient-to-r from-rose-500 to-pink-600">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                <Percent className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-white text-lg font-bold">Overall Discount</SheetTitle>
                                <p className="text-rose-50/90 text-xs mt-0.5">Applied to the whole invoice</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Gross Charged</span><span className="tabular-nums font-semibold">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            {overallDiscount > 0 && (
                                <div className="flex justify-between text-xs"><span className="text-slate-500">Current Discount</span><span className="tabular-nums font-semibold text-rose-600">− ₹{overallDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            )}
                            <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200"><span className="font-bold text-slate-800">Net Payable</span><span className="tabular-nums font-bold text-emerald-700">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-slate-700">New discount</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
                                    <button type="button" onClick={() => setDiscountMode('amount')} className={cn('px-3 py-2 text-sm font-bold transition-colors', discountMode === 'amount' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>₹</button>
                                    <button type="button" onClick={() => setDiscountMode('percent')} className={cn('px-3 py-2 text-sm font-bold transition-colors', discountMode === 'percent' ? 'bg-rose-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}>%</button>
                                </div>
                                <Input type="number" min={0} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder={discountMode === 'amount' ? 'Amount in ₹' : 'Percent of bill'} className="h-11 rounded-xl flex-1 text-lg tabular-nums" autoFocus />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">Enter 0 to clear the discount. Cannot exceed the gross total.</p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 mt-auto">
                        {overallDiscount > 0 && (
                            <Button variant="outline" className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50" disabled={invoicing} onClick={() => handleApplyDiscount(0)}>Clear</Button>
                        )}
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDiscount(false)} disabled={invoicing}>Cancel</Button>
                        <Button className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20" disabled={invoicing} onClick={() => handleApplyDiscount()}>
                            {invoicing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying…</> : <><Percent className="h-4 w-4 mr-2" />Apply Discount</>}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* New visit dialog */}
            <Dialog open={showNewVisit} onOpenChange={setShowNewVisit}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5">
                            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-brand-500/30"><Plus className="h-4 w-4" /></span>
                            New Visit
                        </DialogTitle>
                        <DialogDescription>Start a new billing encounter for {selectedPatient?.name}.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Visit type</Label>
                        <Select value={newVisitType} onValueChange={(v) => setNewVisitType(v as any)}>
                            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewVisit(false)} disabled={creatingVisit}>Cancel</Button>
                        <Button onClick={handleCreateVisit} disabled={creatingVisit} className="bg-brand-600 hover:bg-brand-700">
                            {creatingVisit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Create Visit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Void confirm — premium */}
            <AlertDialog open={!!voidConfirm} onOpenChange={(o) => { if (!o) { setVoidConfirm(null); setVoidReason(''); } }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-rose-500 to-rose-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Trash2 className="h-5 w-5 text-white" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold">Delete this entry?</AlertDialogTitle>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        <AlertDialogDescription className="text-sm text-slate-600">
                            Remove <span className="font-semibold text-slate-800">{voidConfirm?.label}</span> from this visit. This takes effect immediately.
                        </AlertDialogDescription>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                            <Textarea
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                rows={2}
                                placeholder="Why is this being deleted?"
                                className="text-sm"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={voidBusy} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleVoid(); }} disabled={voidBusy} className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20">
                            {voidBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : <><Trash2 className="h-4 w-4 mr-1.5" />Request Delete</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Finalize confirm — premium. Finalizing locks the invoice. */}
            {/* Paid-in-full prompt — offer to lock & print (no surprise auto-lock). */}
            <AlertDialog open={showPaidPrompt} onOpenChange={(o) => { if (!o) setShowPaidPrompt(false); }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Check className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <AlertDialogTitle className="text-white text-base font-bold leading-tight">Paid in full</AlertDialogTitle>
                            <p className="text-[11px] text-emerald-50/90 mt-0.5">Balance settled</p>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <AlertDialogDescription className="text-sm text-slate-600">
                            This bill is fully paid. Lock it and print the bill &amp; receipt for the patient? You can still reopen later (a reason is required).
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={invoicing} className="rounded-xl">Not now</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { setShowPaidPrompt(false); autoPrintBillRef.current = true; handleFinalize(); }}
                            disabled={invoicing}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                        >
                            {invoicing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Locking…</> : <><Lock className="h-4 w-4 mr-1.5" />Lock &amp; print</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showFinalizeConfirm} onOpenChange={(o) => { if (!o) setShowFinalizeConfirm(false); }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Lock className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <AlertDialogTitle className="text-white text-base font-bold leading-tight">Lock this bill</AlertDialogTitle>
                            <p className="text-[11px] text-amber-50/90 mt-0.5">Freezes the charges</p>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p>
                                    Finalizing this invoice <span className="font-semibold text-slate-800">locks its charges</span> —
                                    you can no longer add or edit charges (e.g. lab tests, procedures).
                                </p>
                                <p>Payments can still be recorded against it until the balance is settled.</p>
                                {due > 0 && (
                                    <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 font-medium">
                                        ₹{Math.abs(due).toLocaleString('en-IN', { minimumFractionDigits: 2 })} is still due — you can finalize now and collect the balance afterwards.
                                    </p>
                                )}
                                {hasUninvoicedCharges ? (
                                    <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 font-medium">
                                        Some charges aren’t on the bill yet — they’ll be folded in automatically when you
                                        finalize. Make sure every charge (e.g. a pending lab) has been added first.
                                    </p>
                                ) : (
                                    <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-600">
                                        If a charge is still pending (e.g. a lab), add it before finalizing. You can reopen
                                        later, but it needs a reason for audit.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={invoicing} className="rounded-xl">Not yet</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { setShowFinalizeConfirm(false); handleFinalize(); }}
                            disabled={invoicing}
                            className="rounded-xl bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20"
                        >
                            {invoicing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Locking…</> : <><Lock className="h-4 w-4 mr-1.5" />Lock bill</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reopen confirm — premium. Back to DRAFT, audit reason required. */}
            <AlertDialog open={reopenOpen} onOpenChange={(o) => { if (!o) { setReopenOpen(false); setReopenReason(''); } }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-brand-500 to-violet-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Unlock className="h-5 w-5 text-white" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold">Reopen finalized invoice?</AlertDialogTitle>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        <AlertDialogDescription className="text-sm text-slate-600">
                            Reopening converts invoice <span className="font-semibold text-slate-800">{eventsData?.currentInvoice?.invoiceNo ?? ''}</span> back to DRAFT and reverts
                            its charges from INVOICED to POSTED so you can edit again. A reason is required for audit.
                        </AlertDialogDescription>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Reason for reopening <span className="text-rose-500">*</span></Label>
                            <Textarea
                                placeholder="e.g. Added lab charge after finalizing…"
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                                rows={3}
                                className="text-sm mt-1.5 rounded-xl"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={invoicing} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleReopen(); }}
                            disabled={!reopenReason.trim() || invoicing}
                            className="rounded-xl bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
                        >
                            {invoicing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reopening…</> : <><Unlock className="h-4 w-4 mr-1.5" /> Reopen</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BillingPage;
