import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Receipt, CreditCard, Loader2, ChevronDown, Printer,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { ipdBillingService, type BillingChargeRow, type BillingPaymentRow } from '@/features/billing/services/ipdBillingService';
import { AddChargesModal } from '@/features/billing/components/AddChargesModal';
import { AddPaymentDialog } from '@/features/billing/components/dialogs/AddPaymentDialog';
import { LoadingState, EmptyState, ErrorState } from '@/features/billing/components/StatePanel';
import { inr } from '@/features/billing/utils/money';
import { mapEventsToInvoiceData, buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { openPrintHtml } from '@/utils/printUtils';
import { hospitalApi } from '@/features/hospital/services/hospitalApi';
import { useAuthStore } from '@/store/authStore';
import type { Visit, VisitStatus } from '@/features/billing/types';
import { offlineCachedRead } from '@/offline';
import { PathologyBillingOverview, type PathologyBillingDateMode } from './PathologyBillingOverview';
import { NewLabBillDrawer } from './NewLabBillDrawer';

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

const statusBadgeClass = (status: VisitStatus) => cn(
    'text-[10px] h-5 px-1.5 shrink-0',
    status === 'FINAL' && 'border-emerald-300 text-emerald-700 bg-emerald-50',
    status === 'CANCELLED' && 'border-slate-300 text-slate-500 bg-slate-50',
    status === 'OPEN' && 'border-amber-300 text-amber-700 bg-amber-50',
);

// Charges + payments interleaved chronologically (oldest first) -- feeds each Recent Transactions
// row's inline-expanded view-only ledger.
const interleaveLedger = (charges: BillingChargeRow[], payments: BillingPaymentRow[]) => {
    const c = charges.map(c => ({ kind: 'charge' as const, ts: c.serviceDate, c }));
    const p = payments.map(p => ({ kind: 'payment' as const, ts: p.createdDateTime, p }));
    return [...c, ...p].sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''));
};

const LedgerRowsTable: React.FC<{ rows: ReturnType<typeof interleaveLedger> }> = ({ rows }) => (
    <div className="border rounded-xl overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                    <th className="text-left font-semibold px-3 py-2">Date</th>
                    <th className="text-left font-semibold px-3 py-2">Particular</th>
                    <th className="text-right font-semibold px-3 py-2">Charge</th>
                    <th className="text-right font-semibold px-3 py-2">Paid</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-slate-400 py-8">No charges or payments yet.</td></tr>
                ) : rows.map(row => row.kind === 'charge' ? (
                    <tr key={`c-${row.c.chargeEventId}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{formatIst(row.c.serviceDate)}</td>
                        <td className="px-3 py-2 text-slate-800">{row.c.displayName ?? row.c.categoryCode ?? 'Charge'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-800">{inr(row.c.netAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-300">—</td>
                    </tr>
                ) : (
                    <tr key={`p-${row.p.paymentId}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{formatIst(row.p.createdDateTime)}</td>
                        <td className="px-3 py-2 text-slate-800">{row.p.paymentDescription ?? row.p.paymentMode ?? 'Payment'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-300">—</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{inr(row.p.amount)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

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

    // ─── Row-level actions: Add Charges / Take Payment fire straight from the Actions column,
    // no expand-first step required. `actingRow` is whichever row those two dialogs are currently
    // open for. ─────
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

    const handlePrintRow = async (row: Visit) => {
        setPrintingRowId(row.id);
        try {
            const hospitalId = useAuthStore.getState().getHospitalId();
            const [events, hospital] = await Promise.all([
                ipdBillingService.getEncounterEvents(row.id, row.patientId),
                hospitalApi.getHospitalById(hospitalId),
            ]);
            if (!events.success || !events.data) throw new Error(events.message ?? 'Could not load this bill.');
            const invoiceData = mapEventsToInvoiceData(events.data, {
                patientName: row.patientName,
                patientId: row.patientIdDisplay,
            });
            const settings = buildPrintSettingsFromHospital(hospital);
            const html = buildInvoiceA4(invoiceData, settings);
            openPrintHtml(html);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Could not print', description: e?.message ?? '' });
        } finally {
            setPrintingRowId(null);
        }
    };

    // ─── Recent Transactions: inline-expand a row for a read-only look at its ledger --
    // the encounterId + patientId are already on the row, so this skips a round-trip to a
    // separate patient-search panel entirely. ─────
    const [expandedRow, setExpandedRow] = useState<Visit | null>(null);
    const [expandedEvents, setExpandedEvents] = useState<{ charges: BillingChargeRow[]; payments: BillingPaymentRow[]; netBalance: number } | null>(null);
    const [expandedLoading, setExpandedLoading] = useState(false);
    const [expandedError, setExpandedError] = useState<string | null>(null);

    const loadExpandedEvents = useCallback(async (row: Visit) => {
        setExpandedLoading(true);
        setExpandedError(null);
        try {
            const res = await ipdBillingService.getEncounterEvents(row.id, row.patientId);
            if (!res?.success) throw new Error(res?.message ?? 'Could not load ledger');
            setExpandedEvents(res.data as any ?? null);
        } catch (e: any) {
            setExpandedError(e?.message ?? 'Failed to load ledger');
        } finally {
            setExpandedLoading(false);
        }
    }, []);

    const toggleExpandRow = (row: Visit) => {
        if (expandedRow?.id === row.id) {
            setExpandedRow(null);
            setExpandedEvents(null);
            return;
        }
        setExpandedRow(row);
        setExpandedEvents(null);
        loadExpandedEvents(row);
    };

    const expandedLedgerRows = useMemo(
        () => interleaveLedger(expandedEvents?.charges ?? [], expandedEvents?.payments ?? []),
        [expandedEvents],
    );

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
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Recent Transactions</CardTitle>
                    <Button size="sm" className="gap-1.5" onClick={() => setShowNewBillDrawer(true)}>
                        <Plus className="h-3.5 w-3.5" /> New Bill
                    </Button>
                </CardHeader>
                <CardContent>
                    {recentLoading ? (
                        <LoadingState rows={4} />
                    ) : recentError ? (
                        <ErrorState message={recentError} onRetry={() => loadRecent()} />
                    ) : dateFilteredRecent.length === 0 ? (
                        <EmptyState icon={<Receipt className="h-6 w-6" />} title="No transactions in this range." />
                    ) : (
                        <div className="border rounded-xl overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="w-6 px-3 py-2" />
                                        <th className="text-left font-semibold px-3 py-2">Patient</th>
                                        <th className="text-left font-semibold px-3 py-2">Date</th>
                                        <th className="text-right font-semibold px-3 py-2">Billed</th>
                                        <th className="text-right font-semibold px-3 py-2">Balance</th>
                                        <th className="text-left font-semibold px-3 py-2">Status</th>
                                        <th className="text-left font-semibold px-3 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dateFilteredRecent.map(row => {
                                        const isExpanded = expandedRow?.id === row.id;
                                        const isPrinting = printingRowId === row.id;
                                        const isCancelled = row.status === 'CANCELLED';
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-400 cursor-pointer" onClick={() => toggleExpandRow(row)}>
                                                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                                                    </td>
                                                    <td className="px-3 py-2 cursor-pointer" onClick={() => toggleExpandRow(row)}>
                                                        <span className="font-semibold text-slate-800">{row.patientName}</span>
                                                        <span className="text-slate-400 font-mono ml-1.5">{row.patientIdDisplay}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">{formatIst(row.date)}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums text-slate-800">{inr(row.totalDebit ?? 0)}</td>
                                                    <td className={cn('px-3 py-2 text-right tabular-nums', (row.balance ?? 0) > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500')}>{inr(row.balance ?? 0)}</td>
                                                    <td className="px-3 py-2">
                                                        <Badge variant="outline" className={statusBadgeClass(row.status)}>{row.status}</Badge>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1"
                                                                disabled={isCancelled}
                                                                onClick={() => openAddCharge(row)}
                                                            >
                                                                <Plus className="h-3 w-3" /> Add Charges
                                                            </Button>
                                                            <Button
                                                                size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1"
                                                                disabled={isCancelled}
                                                                onClick={() => openAddPayment(row)}
                                                            >
                                                                <CreditCard className="h-3 w-3" /> Take Payment
                                                            </Button>
                                                            <Button
                                                                size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1"
                                                                disabled={isPrinting}
                                                                onClick={() => handlePrintRow(row)}
                                                            >
                                                                {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />} Print
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="border-t border-slate-100 bg-slate-50/60">
                                                        <td colSpan={7} className="px-3 py-3">
                                                            {expandedLoading ? (
                                                                <LoadingState rows={2} />
                                                            ) : expandedError ? (
                                                                <ErrorState message={expandedError} onRetry={() => loadExpandedEvents(row)} />
                                                            ) : (
                                                                <div className="space-y-2.5">
                                                                    {(expandedEvents?.netBalance ?? 0) > 0 && (
                                                                        <p className="text-[11px] font-semibold text-rose-600">
                                                                            Due: {inr(expandedEvents?.netBalance ?? 0)}
                                                                        </p>
                                                                    )}
                                                                    <LedgerRowsTable rows={expandedLedgerRows} />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
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
        </div>
    );
};
