import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Receipt, CreditCard, Loader2, Printer, FlaskConical, ChevronLeft, ChevronRight,
    Search, ChevronDown, FileText, ReceiptText, MoreVertical, Pencil, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { AddChargesModal } from '@/features/billing/components/AddChargesModal';
import { AddPaymentDialog } from '@/features/billing/components/dialogs/AddPaymentDialog';
import { LoadingState, EmptyState, ErrorState } from '@/features/billing/components/StatePanel';
import { inr } from '@/features/billing/utils/money';
import { mapEventsToInvoiceData, mapEventsToReceiptData, buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { buildInvoiceThermal80 } from '@/printTemplates/invoiceThermal80';
import { buildReceiptA4 } from '@/printTemplates/receiptA4';
import { buildReceiptThermal80 } from '@/printTemplates/receiptThermal80';
import { openPrintHtml } from '@/utils/printUtils';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { useAuthStore } from '@/store/authStore';
import type { Visit, VisitStatus } from '@/features/billing/types';
import { offlineCachedRead } from '@/offline';
import { PathologyBillingOverview, type PathologyBillingDateMode } from './PathologyBillingOverview';
import { NewLabBillDrawer } from './NewLabBillDrawer';
import { EditBillSheet } from './EditBillSheet';

// Render a backend timestamp in IST. Naive (offset-less) timestamps are treated as UTC, since the
// backend stores UTC -- so they convert correctly to Asia/Kolkata. Copied verbatim from BillingPage.
const formatIst = (iso?: string | null): string => {
    if (!iso) return '';
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const d = new Date(hasTz ? iso : `${iso}Z`);
    if (isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' });
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
};

const mapStatus = (s?: string | null, isCancelled?: boolean): VisitStatus => {
    if (isCancelled) return 'CANCELLED';
    const upper = (s ?? '').toUpperCase();
    if (upper === 'FINALIZED' || upper === 'FINAL' || upper === 'PAID') return 'FINAL';
    if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
    return 'OPEN';
};

interface RowDetail {
    particulars: string[];
    discountTotal: number;
    hasPayments: boolean;
    invoiceId?: string;
    invoiceNo?: string;
}

export const PathologyBillingTab: React.FC = () => {
    const { toast } = useToast();

    // ─── Recent Transactions: hospital-wide LAB visits -- this table IS the workspace now ─────
    const [recent, setRecent] = useState<Visit[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);
    const [recentError, setRecentError] = useState<string | null>(null);

    const loadRecent = useCallback(async (silent = false) => {
        if (!silent) setRecentLoading(true);
        setRecentError(null);
        try {
            const res: any = await offlineCachedRead(['billing', 'dashboard'], () => ipdBillingService.dashboard());
            if (res && res.success === false) throw new Error(res.message ?? 'Could not load transactions');
            const rows: Visit[] = [];
            for (const patient of (res?.data ?? [])) {
                for (const enc of (patient.encounters ?? [])) {
                    if ((enc.visitType ?? '').toUpperCase() !== 'LAB') continue;
                    rows.push({
                        id: enc.encounterId,
                        patientId: patient.patientId ?? '',
                        type: 'LAB',
                        date: enc.invoiceDate ?? enc.updatedAt ?? new Date().toISOString(),
                        status: mapStatus(enc.status, enc.isCancelled),
                        patientName: patient.patientName ?? '—',
                        patientIdDisplay: patient.patientId ?? '',
                        totalDebit: Number(enc.netAmount ?? 0),
                        totalCredit: Number(enc.paidAmount ?? 0),
                        balance: Number(enc.dueAmount ?? 0),
                    });
                }
            }
            rows.sort((a, b) => b.date.localeCompare(a.date));
            setRecent(rows);
        } catch (e: any) {
            setRecentError(e?.message ?? 'Failed to load recent transactions');
        } finally {
            setRecentLoading(false);
        }
    }, []);

    useEffect(() => { loadRecent(); }, [loadRecent]);

    // ─── Per-row line items (Particulars) + discount -- the dashboard summary only carries
    // net/paid/due totals, so each row's actual charge list is fetched separately. Only the
    // current page's rows are fetched (see the pagination section below), not the whole list.
    // Keyed by encounterId; entries persist across page changes so paging back doesn't re-flash
    // "Loading…" for rows already fetched. ─────
    const [rowDetails, setRowDetails] = useState<Record<string, RowDetail>>({});
    const [detailsLoading, setDetailsLoading] = useState(false);

    const loadRowDetails = useCallback(async (rows: Visit[]) => {
        if (rows.length === 0) { setRowDetails({}); return; }
        setDetailsLoading(true);
        try {
            const entries = await Promise.all(rows.map(async (r): Promise<[string, RowDetail]> => {
                try {
                    const res = await ipdBillingService.getEncounterEvents(r.id, r.patientId);
                    const charges = res?.success ? (res.data?.charges ?? []) : [];
                    const payments = res?.success ? (res.data?.payments ?? []) : [];
                    const invoice = res?.success ? res.data?.currentInvoice : null;
                    return [r.id, {
                        particulars: charges.map(c => c.displayName ?? c.categoryCode ?? 'Charge'),
                        discountTotal: charges.reduce((s, c) => s + (c.discountAmount ?? 0), 0),
                        hasPayments: payments.length > 0,
                        invoiceId: invoice?.invoiceId,
                        invoiceNo: invoice?.invoiceNo,
                    }];
                } catch {
                    return [r.id, { particulars: [], discountTotal: 0, hasPayments: false }];
                }
            }));
            // Merge rather than replace -- otherwise paging back to an already-fetched page would
            // flash "Loading…" again for rows whose details we already have.
            setRowDetails(prev => ({ ...prev, ...Object.fromEntries(entries) }));
        } finally {
            setDetailsLoading(false);
        }
    }, []);

    // ─── Date filter for the Overview KPIs + Recent Transactions list ─────
    const [dateMode, setDateMode] = useState<PathologyBillingDateMode>('all');
    const [dayDate, setDayDate] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    // IST calendar-day key (YYYY-MM-DD), same as PathologyWorkspace.tsx's dayKey / RevenueTab.tsx's.
    const dayKey = (iso: string) => {
        if (!iso) return '';
        const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
        const d = new Date(hasTz ? iso : `${iso}Z`);
        if (Number.isNaN(d.getTime())) return '';
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
    };

    const dateFilteredRecent = useMemo(() => {
        return recent.filter(r => {
            if (dateMode === 'day' && dayDate) return dayKey(r.date) === dayDate;
            if (dateMode === 'range' && (rangeStart || rangeEnd)) {
                const k = dayKey(r.date);
                if (rangeStart && k < rangeStart) return false;
                if (rangeEnd && k > rangeEnd) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recent, dateMode, dayDate, rangeStart, rangeEnd]);

    const billingKpis = useMemo(() => ({
        transactionCount: dateFilteredRecent.length,
        totalBilled: dateFilteredRecent.reduce((sum, r) => sum + (r.totalDebit ?? 0), 0),
        collected: dateFilteredRecent.reduce((sum, r) => sum + (r.totalCredit ?? 0), 0),
        pendingDue: dateFilteredRecent.reduce((sum, r) => sum + Math.max(0, r.balance ?? 0), 0),
    }), [dateFilteredRecent]);

    const scopeLabel = useMemo(() => {
        if (dateMode === 'all') return 'All time';
        if (dateMode === 'range') return (rangeStart || rangeEnd) ? `${rangeStart || '…'} → ${rangeEnd || '…'}` : 'Date range';
        if (!dayDate) return 'Day';
        const d = new Date();
        const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dayDate === todayKey ? 'Today' : format(new Date(dayDate), 'dd MMM yyyy');
    }, [dateMode, dayDate, rangeStart, rangeEnd]);

    // ─── Search -- filters by patient name/ID only (not particulars: those are fetched per-page,
    // see below, so they aren't reliably available for rows outside the current page). ─────
    const [searchQuery, setSearchQuery] = useState('');
    const searchedRecent = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return dateFilteredRecent;
        return dateFilteredRecent.filter(r =>
            r.patientName.toLowerCase().includes(q) || r.patientIdDisplay.toLowerCase().includes(q));
    }, [dateFilteredRecent, searchQuery]);

    // ─── Pagination -- same "Showing A-B of N" + Prev/Next convention as PathologyWorkspace.tsx's
    // orders table, fixed at 10 rows/page. ─────
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(searchedRecent.length / itemsPerPage));
    const paginatedRecent = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return searchedRecent.slice(start, start + itemsPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchedRecent, currentPage]);

    // Only the visible page's rows need their particulars/discount fetched -- cheaper than
    // fetching every row in the whole (unpaginated) list up front, and re-runs as the user pages.
    useEffect(() => { loadRowDetails(paginatedRecent); }, [paginatedRecent, loadRowDetails]);

    // Jump back to page 1 whenever the visible set changes shape, so a filter/search/date change
    // or a fresh load never strands the user on a now-empty page.
    useEffect(() => {
        setCurrentPage(1);
    }, [dateMode, dayDate, rangeStart, rangeEnd, searchQuery, recent]);

    // ─── Row-level actions: Add Charges / Take Payment / Print fire straight from the Actions
    // column -- one row per bill, no dropdown/expand step. `actingRow` is whichever row the two
    // dialogs are currently open for. ─────
    const [actingRow, setActingRow] = useState<Visit | null>(null);
    const [actingAddCharge, setActingAddCharge] = useState(false);
    const [actingAddPayment, setActingAddPayment] = useState(false);
    const [printingRowId, setPrintingRowId] = useState<string | null>(null);

    const openAddCharge = (row: Visit) => { setActingRow(row); setActingAddCharge(true); };
    const openAddPayment = (row: Visit) => { setActingRow(row); setActingAddPayment(true); };

    const handleActingCharged = () => {
        setActingAddCharge(false);
        loadRecent(true);
        toast({ title: 'Charges added' });
    };

    const handleActingPaid = () => {
        setActingAddPayment(false);
        loadRecent(true);
    };

    // ─── Edit Bill (drill into charge lines) / Cancel Bill (void the whole invoice) -- mirrors
    // BillingPage.tsx's OPD/IPD ledger patterns exactly against the same already-deployed
    // endpoints (updateChargeEvent/deleteEvent, billing/delete-invoice). ─────
    const [editingRow, setEditingRow] = useState<Visit | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Visit | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelBusy, setCancelBusy] = useState(false);

    const refreshRowDetail = useCallback(async (row: Visit) => {
        try {
            const res = await ipdBillingService.getEncounterEvents(row.id, row.patientId);
            const charges = res?.success ? (res.data?.charges ?? []) : [];
            const payments = res?.success ? (res.data?.payments ?? []) : [];
            const invoice = res?.success ? res.data?.currentInvoice : null;
            setRowDetails(prev => ({
                ...prev,
                [row.id]: {
                    particulars: charges.map(c => c.displayName ?? c.categoryCode ?? 'Charge'),
                    discountTotal: charges.reduce((s, c) => s + (c.discountAmount ?? 0), 0),
                    hasPayments: payments.length > 0,
                    invoiceId: invoice?.invoiceId,
                    invoiceNo: invoice?.invoiceNo,
                },
            }));
        } catch {
            // Best-effort refresh -- the row keeps its last-known detail on failure.
        }
    }, []);

    const handleBillEdited = () => {
        if (editingRow) refreshRowDetail(editingRow);
        loadRecent(true);
    };

    const handleCancelBill = async () => {
        const row = cancelTarget;
        const detail = row ? rowDetails[row.id] : undefined;
        if (!row || !detail?.invoiceId || cancelBusy) return;
        setCancelBusy(true);
        try {
            const res = await ipdBillingService.deleteInvoice({
                patientId: row.patientId,
                encounterId: row.id,
                invoiceId: detail.invoiceId,
                reason: cancelReason.trim(),
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not cancel this bill');
            toast({ title: 'Bill cancelled', description: `${res.chargesVoided ?? 0} charge(s) voided.` });
            setCancelTarget(null);
            setCancelReason('');
            await refreshRowDetail(row);
            loadRecent(true);
        } catch (e: any) {
            toast({ title: 'Could not cancel bill', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setCancelBusy(false);
        }
    };

    // Invoice covers everything billed on this encounter; Receipt covers the latest payment
    // received against it -- both available in A4 (full sheet) or Thermal (80mm receipt printer).
    const handlePrint = async (row: Visit, doc: 'invoice' | 'receipt', mode: 'a4' | 'thermal') => {
        setPrintingRowId(row.id);
        try {
            const hospitalId = useAuthStore.getState().getHospitalId();
            const [events, hospital] = await Promise.all([
                ipdBillingService.getEncounterEvents(row.id, row.patientId),
                hospitalApi.getHospitalById(hospitalId),
            ]);
            if (!events.success || !events.data) throw new Error(events.message ?? 'Could not load this bill.');
            const ctx = { patientName: row.patientName, patientId: row.patientIdDisplay };
            const settings = buildPrintSettingsFromHospital(hospital);
            let html: string;
            if (doc === 'invoice') {
                const data = mapEventsToInvoiceData(events.data, ctx);
                html = mode === 'thermal' ? buildInvoiceThermal80(data, settings) : buildInvoiceA4(data, settings);
            } else {
                if (!events.data.payments || events.data.payments.length === 0) {
                    throw new Error('No payment has been recorded against this bill yet.');
                }
                const data = mapEventsToReceiptData(events.data, ctx);
                html = mode === 'thermal' ? buildReceiptThermal80(data, settings) : buildReceiptA4(data, settings);
            }
            openPrintHtml(html);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not print', description: e?.message ?? '' });
        } finally {
            setPrintingRowId(null);
        }
    };

    // ─── New Bill: a side drawer for patient selection (search or add manually) that creates a
    // fresh LAB encounter, then chains straight into the existing AddChargesModal for test
    // selection -- replaces the old always-on patient-search + ledger panel. ─────
    const [showNewBillDrawer, setShowNewBillDrawer] = useState(false);
    const [pendingChargesFor, setPendingChargesFor] = useState<{ encounterId: string; patientId: string } | null>(null);

    const handleEncounterReady = (encounterId: string, patientId: string) => {
        setPendingChargesFor({ encounterId, patientId });
    };

    const handlePendingCharged = async () => {
        const target = pendingChargesFor;
        setPendingChargesFor(null);
        // billing/dashboard (Recent Transactions' data source) only lists encounters that already
        // have a BillingInvoice row -- a charge with none sits posted-but-invisible indefinitely
        // (the same gap PathologyAutoBillingHelper.PostChargesAndInvoiceAsync exists to close for
        // the order-triggered billing path). A brand-new bill's very first charge always hits this,
        // so create the draft invoice right here rather than leaving it invisible until whatever
        // eventually finalizes one.
        if (target) {
            try {
                await ipdBillingService.createDraftInvoice({ patientId: target.patientId, encounterId: target.encounterId });
            } catch {
                // Charges are already posted and safe -- worst case the bill stays invisible on
                // this list until a retry; not worth blocking on.
            }
        }
        loadRecent(true);
        toast({ title: 'Bill created', description: 'Charges posted for the new lab bill.' });
    };

    return (
        <div className="space-y-6">
            <PathologyBillingOverview
                kpis={billingKpis}
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

            {/* ── Recent Transactions ── */}
            <Card className="shadow-sm border-slate-200/80">
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 border-b border-slate-100 gap-4">
                    <div className="min-w-0">
                        <CardTitle className="text-base font-bold text-slate-800">Recent Transactions</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">One row per bill — act on it directly, no need to open it first.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search patient…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 w-48 text-sm"
                            />
                        </div>
                        <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setShowNewBillDrawer(true)}>
                            <Plus className="h-3.5 w-3.5" /> New Bill
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {recentLoading ? (
                        <div className="p-6"><LoadingState rows={4} /></div>
                    ) : recentError ? (
                        <div className="p-6"><ErrorState message={recentError} onRetry={() => loadRecent()} /></div>
                    ) : searchedRecent.length === 0 ? (
                        <div className="p-6"><EmptyState icon={<Receipt className="h-6 w-6" />} title={searchQuery ? 'No bills match your search.' : 'No transactions in this range.'} /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-400">
                                        <th className="text-left font-bold px-5 py-3 text-[10px] uppercase tracking-wider">Date (IST)</th>
                                        <th className="text-left font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Patient</th>
                                        <th className="text-left font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Particulars</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Net Amount</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Discount</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Balance</th>
                                        <th className="text-left font-bold px-5 py-3 text-[10px] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRecent.map(row => {
                                        const isPrinting = printingRowId === row.id;
                                        const isCancelled = row.status === 'CANCELLED';
                                        const detail = rowDetails[row.id];
                                        return (
                                            <tr key={row.id} className="hover:bg-slate-50/60 transition-colors align-top">
                                                <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatIst(row.date)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-200 shrink-0">
                                                            {row.patientName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800 truncate">{row.patientName}</p>
                                                            <p className="text-slate-400 font-mono text-[11px]">{row.patientIdDisplay}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 max-w-[260px]">
                                                    {!detail && detailsLoading ? (
                                                        <span className="text-slate-300 text-xs">Loading…</span>
                                                    ) : !detail || detail.particulars.length === 0 ? (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {detail.particulars.map((name, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 text-[10px] font-medium"
                                                                >
                                                                    <FlaskConical className="h-2.5 w-2.5" /> {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right tabular-nums font-bold text-slate-800 whitespace-nowrap">{inr(row.totalDebit ?? 0)}</td>
                                                <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                                                    {detail && detail.discountTotal > 0
                                                        ? <span className="text-amber-600 font-semibold">−{inr(detail.discountTotal)}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                                                    {(row.balance ?? 0) > 0
                                                        ? <span className="text-rose-600 font-bold">{inr(row.balance ?? 0)}</span>
                                                        : <span className="text-emerald-600 font-semibold">Paid</span>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            size="sm" variant="outline" className="h-8 px-2.5 text-[11px] gap-1 rounded-lg"
                                                            disabled={isCancelled}
                                                            onClick={() => openAddCharge(row)}
                                                        >
                                                            <Plus className="h-3 w-3" /> Add Charges
                                                        </Button>
                                                        <Button
                                                            size="sm" variant="outline" className="h-8 px-2.5 text-[11px] gap-1 rounded-lg"
                                                            disabled={isCancelled}
                                                            onClick={() => openAddPayment(row)}
                                                        >
                                                            <CreditCard className="h-3 w-3" /> Take Payment
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    size="sm" variant="ghost" className="h-8 px-2.5 text-[11px] gap-1 rounded-lg text-slate-500 hover:text-slate-800"
                                                                    disabled={isPrinting}
                                                                >
                                                                    {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />} Print <ChevronDown className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handlePrint(row, 'invoice', 'a4')}>
                                                                    <FileText className="h-3.5 w-3.5 mr-2" /> Invoice (A4)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handlePrint(row, 'invoice', 'thermal')}>
                                                                    <Printer className="h-3.5 w-3.5 mr-2" /> Invoice (Thermal)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem disabled={!detail?.hasPayments} onClick={() => handlePrint(row, 'receipt', 'a4')}>
                                                                    <ReceiptText className="h-3.5 w-3.5 mr-2" /> Payment Receipt (A4)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem disabled={!detail?.hasPayments} onClick={() => handlePrint(row, 'receipt', 'thermal')}>
                                                                    <Printer className="h-3.5 w-3.5 mr-2" /> Payment Receipt (Thermal)
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800">
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem disabled={isCancelled} onClick={() => setEditingRow(row)}>
                                                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Bill
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    disabled={isCancelled || !detail?.invoiceId}
                                                                    className="text-rose-600 focus:text-rose-600"
                                                                    onClick={() => setCancelTarget(row)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Cancel Bill
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!recentLoading && !recentError && searchedRecent.length > 0 && (
                        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
                            <div className="truncate">
                                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, searchedRecent.length)} of {searchedRecent.length}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="px-2 font-bold bg-white border rounded-lg tabular-nums whitespace-nowrap">
                                    {currentPage} / {totalPages}
                                </div>
                                <Button
                                    variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {actingRow && (
                <>
                    <AddChargesModal
                        open={actingAddCharge}
                        onOpenChange={setActingAddCharge}
                        encounterId={actingRow.id}
                        patientId={actingRow.patientId}
                        appliesToFilter="LAB"
                        onCharged={handleActingCharged}
                    />
                    <AddPaymentDialog
                        open={actingAddPayment}
                        onOpenChange={setActingAddPayment}
                        patientId={actingRow.patientId}
                        encounterId={actingRow.id}
                        netBalance={actingRow.balance ?? 0}
                        onSaved={handleActingPaid}
                    />
                </>
            )}

            <NewLabBillDrawer
                open={showNewBillDrawer}
                onOpenChange={setShowNewBillDrawer}
                onEncounterReady={handleEncounterReady}
            />

            {pendingChargesFor && (
                <AddChargesModal
                    open={true}
                    onOpenChange={(v) => { if (!v) setPendingChargesFor(null); }}
                    encounterId={pendingChargesFor.encounterId}
                    patientId={pendingChargesFor.patientId}
                    appliesToFilter="LAB"
                    onCharged={handlePendingCharged}
                />
            )}

            {editingRow && (
                <EditBillSheet
                    open={!!editingRow}
                    onOpenChange={(v) => { if (!v) setEditingRow(null); }}
                    encounterId={editingRow.id}
                    patientId={editingRow.patientId}
                    onChanged={handleBillEdited}
                />
            )}

            <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(''); } }}>
                <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-rose-500 to-rose-600">
                        <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Trash2 className="h-5 w-5 text-white" />
                        </div>
                        <AlertDialogTitle className="text-white text-base font-bold">Cancel this bill?</AlertDialogTitle>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                        <AlertDialogDescription className="text-sm text-slate-600">
                            This voids every charge on <span className="font-semibold text-slate-800">{cancelTarget?.patientName}</span>'s bill. Any money already collected against it becomes an unallocated credit — it is not automatically refunded.
                        </AlertDialogDescription>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Reason <span className="text-rose-500">*</span></label>
                            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="Why is this bill being cancelled?" className="text-sm" />
                        </div>
                    </div>
                    <AlertDialogFooter className="px-5 pb-5 pt-0">
                        <AlertDialogCancel disabled={cancelBusy} className="rounded-xl">Back</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCancelBill(); }} disabled={!cancelReason.trim() || cancelBusy} className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20">
                            {cancelBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling…</> : <><Trash2 className="h-4 w-4 mr-1.5" />Cancel Bill</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
