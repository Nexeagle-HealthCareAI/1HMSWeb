import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Receipt, CreditCard, Loader2, Printer, FlaskConical,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
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
    'text-[10px] h-5 px-2 shrink-0 font-semibold rounded-full',
    status === 'FINAL' && 'border-emerald-300 text-emerald-700 bg-emerald-50',
    status === 'CANCELLED' && 'border-slate-300 text-slate-500 bg-slate-50',
    status === 'OPEN' && 'border-amber-300 text-amber-700 bg-amber-50',
);

interface RowDetail {
    particulars: string[];
    discountTotal: number;
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
    // net/paid/due totals, so each row's actual charge list is fetched separately once the row
    // list itself settles. Keyed by encounterId; re-fetched whenever `recent` changes. ─────
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
                    return [r.id, {
                        particulars: charges.map(c => c.displayName ?? c.categoryCode ?? 'Charge'),
                        discountTotal: charges.reduce((s, c) => s + (c.discountAmount ?? 0), 0),
                    }];
                } catch {
                    return [r.id, { particulars: [], discountTotal: 0 }];
                }
            }));
            setRowDetails(Object.fromEntries(entries));
        } finally {
            setDetailsLoading(false);
        }
    }, []);

    useEffect(() => { loadRowDetails(recent); }, [recent, loadRowDetails]);

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
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 border-b border-slate-100">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-800">Recent Transactions</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">One row per bill — act on it directly, no need to open it first.</p>
                    </div>
                    <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setShowNewBillDrawer(true)}>
                        <Plus className="h-3.5 w-3.5" /> New Bill
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {recentLoading ? (
                        <div className="p-6"><LoadingState rows={4} /></div>
                    ) : recentError ? (
                        <div className="p-6"><ErrorState message={recentError} onRetry={() => loadRecent()} /></div>
                    ) : dateFilteredRecent.length === 0 ? (
                        <div className="p-6"><EmptyState icon={<Receipt className="h-6 w-6" />} title="No transactions in this range." /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-400">
                                        <th className="text-left font-bold px-5 py-3 text-[10px] uppercase tracking-wider">Date</th>
                                        <th className="text-left font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Patient</th>
                                        <th className="text-left font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Particulars</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Net Amount</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Discount</th>
                                        <th className="text-right font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Balance</th>
                                        <th className="text-left font-bold px-4 py-3 text-[10px] uppercase tracking-wider">Status</th>
                                        <th className="text-left font-bold px-5 py-3 text-[10px] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dateFilteredRecent.map(row => {
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
                                                <td className="px-4 py-3.5">
                                                    <Badge variant="outline" className={statusBadgeClass(row.status)}>{row.status}</Badge>
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
                                                        <Button
                                                            size="sm" variant="ghost" className="h-8 px-2.5 text-[11px] gap-1 rounded-lg text-slate-500 hover:text-slate-800"
                                                            disabled={isPrinting}
                                                            onClick={() => handlePrintRow(row)}
                                                        >
                                                            {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />} Print
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
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
