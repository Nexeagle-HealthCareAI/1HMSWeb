import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, Plus, IndianRupee, Wallet, TrendingDown, X, FlaskConical, Receipt, CreditCard, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

import { patientService } from '@/features/billing/services/patientService';
import { ipdBillingService, type BillingChargeRow, type BillingPaymentRow } from '@/features/billing/services/ipdBillingService';
import { AddChargesModal } from '@/features/billing/components/AddChargesModal';
import { AddPaymentDialog } from '@/features/billing/components/dialogs/AddPaymentDialog';
import { LoadingState, EmptyState, ErrorState } from '@/features/billing/components/StatePanel';
import { inr } from '@/features/billing/utils/money';
import type { Patient, Visit, VisitStatus } from '@/features/billing/types';
import { offlineCachedRead, isReachable } from '@/offline';

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

type LabVisit = {
    encounterId: string;
    invoiceNo?: string;
    invoiceDate: string;
    status: string;
    isCancelled: boolean;
    totalBilled?: number;
    balance?: number;
    paymentStatus?: string;
};

export const PathologyBillingTab: React.FC = () => {
    const { toast } = useToast();

    // ─── Patient search ─────
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const debouncedSearch = useMemo(
        () => debounce(async (query: string) => {
            if (!query || query.length < 3) { setSearchResults([]); setIsSearching(false); return; }
            setIsSearching(true);
            let by: 'patientId' | 'name' | 'contact' = 'name';
            if (query.toUpperCase().startsWith('PT')) by = 'patientId';
            else if (/^\d{4,}$/.test(query)) by = 'contact';
            try {
                setSearchResults(await patientService.searchPatients(query, by));
            } catch {
                toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch patients.' });
            } finally {
                setIsSearching(false);
            }
        }, 500),
        [toast],
    );

    useEffect(() => {
        debouncedSearch(patientSearch);
        return () => { debouncedSearch.cancel(); };
    }, [patientSearch, debouncedSearch]);

    // ─── Patient's LAB visits ─────
    const [labVisits, setLabVisits] = useState<LabVisit[]>([]);
    const [visitsLoading, setVisitsLoading] = useState(false);
    const [visitsError, setVisitsError] = useState<string | null>(null);
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [creatingVisit, setCreatingVisit] = useState(false);

    const loadLabVisits = useCallback(async (patientId: string) => {
        setVisitsLoading(true);
        setVisitsError(null);
        try {
            const res: any = await ipdBillingService.getPatientEvents(patientId);
            if (res?.success === false) { setLabVisits([]); return; }
            const list: LabVisit[] = (res?.data?.encounters ?? [])
                .filter((e: any) => (e.encounterTypeCode ?? '').toUpperCase() === 'LAB')
                .map((e: any) => ({
                    encounterId: e.encounterId,
                    invoiceNo: e.invoiceNo ?? undefined,
                    invoiceDate: e.invoiceDate ?? new Date().toISOString(),
                    status: e.status ?? 'OPEN',
                    isCancelled: !!e.isCancelled,
                    totalBilled: typeof e.totalBilled === 'number' ? e.totalBilled : undefined,
                    balance: typeof e.balance === 'number' ? e.balance : undefined,
                    paymentStatus: e.paymentStatus ?? undefined,
                }))
                .sort((a: LabVisit, b: LabVisit) => b.invoiceDate.localeCompare(a.invoiceDate));
            setLabVisits(list);
            setSelectedEncounterId(list.find(v => !v.isCancelled)?.encounterId ?? list[0]?.encounterId ?? null);
        } catch (e: any) {
            setVisitsError(e?.message ?? 'Failed to load lab visits');
        } finally {
            setVisitsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedPatient) loadLabVisits(selectedPatient.patientId);
        else { setLabVisits([]); setSelectedEncounterId(null); }
    }, [selectedPatient, loadLabVisits]);

    const handleSelectPatient = (p: Patient) => {
        setSelectedPatient(p);
        setSearchResults([]);
        setPatientSearch('');
    };

    const handleNewLabVisit = async () => {
        if (!selectedPatient || creatingVisit) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Creating a lab visit requires an internet connection.', variant: 'destructive' }); return; }
        setCreatingVisit(true);
        try {
            const res = await ipdBillingService.createEncounter({ patientId: selectedPatient.patientId, encounterType: 'LAB' });
            if (!res?.success || !res.data?.encounterId) throw new Error(res?.message ?? 'Could not create visit');
            toast({ title: 'Lab visit created', description: 'Ready for billing' });
            await loadLabVisits(selectedPatient.patientId);
            setSelectedEncounterId(res.data.encounterId);
        } catch (e: any) {
            toast({ title: 'Could not create visit', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setCreatingVisit(false);
        }
    };

    // ─── Selected visit's ledger ─────
    const [eventsData, setEventsData] = useState<{ charges: BillingChargeRow[]; payments: BillingPaymentRow[]; totalBilledAmount: number; amountReceived: number; netBalance: number } | null>(null);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);

    const loadEvents = useCallback(async () => {
        if (!selectedPatient || !selectedEncounterId) { setEventsData(null); return; }
        setEventsLoading(true);
        setEventsError(null);
        try {
            const res = await ipdBillingService.getEncounterEvents(selectedEncounterId, selectedPatient.patientId);
            if (!res?.success) throw new Error(res?.message ?? 'Could not load ledger');
            setEventsData(res.data as any ?? null);
        } catch (e: any) {
            setEventsError(e?.message ?? 'Failed to load ledger');
        } finally {
            setEventsLoading(false);
        }
    }, [selectedPatient, selectedEncounterId]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    // Unified ledger: charges + payments interleaved chronologically (oldest first). Same pattern as BillingPage.
    const ledgerRows = useMemo(() => {
        const charges = (eventsData?.charges ?? []).map(c => ({ kind: 'charge' as const, ts: c.serviceDate, c }));
        const payments = (eventsData?.payments ?? []).map(p => ({ kind: 'payment' as const, ts: p.createdDateTime, p }));
        return [...charges, ...payments].sort((a, b) => (a.ts ?? '').localeCompare(b.ts ?? ''));
    }, [eventsData]);

    const netBalance = eventsData?.netBalance ?? 0;

    // ─── Recent Transactions: hospital-wide LAB visits, independent of the panels above ─────
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

    const refreshAll = () => {
        if (selectedPatient) loadLabVisits(selectedPatient.patientId);
        loadEvents();
        loadRecent(true);
    };

    const jumpToTransaction = async (row: Visit) => {
        try {
            const results = await patientService.searchPatients(row.patientId, 'patientId');
            if (results.length > 0) {
                setSelectedPatient(results[0]);
                setSelectedEncounterId(row.id);
            }
        } catch {
            toast({ variant: 'destructive', title: 'Could not open visit' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Left: Patient & Lab Visit ── */}
                <Card className="lg:col-span-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-brand-600" /> Patient &amp; Lab Visit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!selectedPatient ? (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by name, patient ID or mobile..."
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                                </div>
                                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                    {searchResults.map(p => (
                                        <button
                                            key={p.patientId}
                                            onClick={() => handleSelectPatient(p)}
                                            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-300 shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                                                <p className="text-[11px] text-slate-500 font-mono">{p.patientId} · {p.age}Y/{p.sex}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {patientSearch.length >= 3 && !isSearching && searchResults.length === 0 && (
                                        <p className="text-xs text-slate-400 text-center py-4">No patients found.</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                    <div className="h-9 w-9 rounded-full bg-cyan-50 flex items-center justify-center text-xs font-bold text-cyan-700 border border-cyan-300 shrink-0">
                                        {selectedPatient.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{selectedPatient.name}</p>
                                        <p className="text-[11px] text-slate-500 font-mono">{selectedPatient.patientId} · {selectedPatient.age}Y/{selectedPatient.sex}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-slate-400 hover:text-rose-600" onClick={() => setSelectedPatient(null)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {visitsLoading ? (
                                    <LoadingState rows={2} />
                                ) : visitsError ? (
                                    <ErrorState message={visitsError} onRetry={() => loadLabVisits(selectedPatient.patientId)} />
                                ) : (
                                    <div className="space-y-1.5">
                                        {labVisits.map(v => (
                                            <button
                                                key={v.encounterId}
                                                onClick={() => setSelectedEncounterId(v.encounterId)}
                                                className={cn(
                                                    'w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                                                    v.encounterId === selectedEncounterId ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:border-slate-300',
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-800">{v.invoiceNo ?? 'Draft visit'}</p>
                                                    <p className="text-[10px] text-slate-500">{formatIst(v.invoiceDate)}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-xs font-bold tabular-nums text-slate-700">{inr(v.totalBilled ?? 0)}</span>
                                                    <Badge variant="outline" className={statusBadgeClass(mapStatus(v.status, v.isCancelled))}>
                                                        {mapStatus(v.status, v.isCancelled)}
                                                    </Badge>
                                                </div>
                                            </button>
                                        ))}
                                        <Button
                                            variant="outline"
                                            className="w-full gap-1.5 border-dashed"
                                            onClick={handleNewLabVisit}
                                            disabled={creatingVisit}
                                        >
                                            {creatingVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                            New Lab Invoice
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* ── Right: Ledger ── */}
                <Card className="lg:col-span-8">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-brand-600" /> Ledger
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!selectedPatient || !selectedEncounterId ? (
                            <EmptyState
                                icon={<IndianRupee className="h-6 w-6" />}
                                title="No lab visit selected"
                                hint="Search for a patient and pick or create a lab visit to view its ledger."
                            />
                        ) : eventsLoading ? (
                            <LoadingState rows={4} />
                        ) : eventsError ? (
                            <ErrorState message={eventsError} onRetry={loadEvents} />
                        ) : (
                            <>
                                {netBalance < 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <Wallet className="h-5 w-5 text-emerald-700" />
                                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Patient in credit</p>
                                        </div>
                                        <span className="text-lg font-black tabular-nums text-emerald-700">{inr(Math.abs(netBalance), { decimals: true })}</span>
                                    </div>
                                )}
                                {netBalance > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <TrendingDown className="h-5 w-5 text-rose-700" />
                                            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Balance due</p>
                                        </div>
                                        <span className="text-lg font-black tabular-nums text-rose-700">{inr(netBalance, { decimals: true })}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <Button size="sm" className="gap-1.5" onClick={() => setShowAddCharge(true)}>
                                        <Plus className="h-3.5 w-3.5" /> Add Test
                                    </Button>
                                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddPayment(true)}>
                                        <CreditCard className="h-3.5 w-3.5" /> Take Payment
                                    </Button>
                                </div>

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
                                            {ledgerRows.length === 0 ? (
                                                <tr><td colSpan={4} className="text-center text-slate-400 py-8">No charges or payments yet.</td></tr>
                                            ) : ledgerRows.map(row => row.kind === 'charge' ? (
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
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Recent Transactions ── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentLoading ? (
                        <LoadingState rows={4} />
                    ) : recentError ? (
                        <ErrorState message={recentError} onRetry={() => loadRecent()} />
                    ) : recent.length === 0 ? (
                        <EmptyState icon={<Receipt className="h-6 w-6" />} title="No recent transactions to display." />
                    ) : (
                        <div className="border rounded-xl overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="text-left font-semibold px-3 py-2">Patient</th>
                                        <th className="text-left font-semibold px-3 py-2">Date</th>
                                        <th className="text-right font-semibold px-3 py-2">Billed</th>
                                        <th className="text-right font-semibold px-3 py-2">Balance</th>
                                        <th className="text-left font-semibold px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map(row => (
                                        <tr
                                            key={row.id}
                                            className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                            onClick={() => jumpToTransaction(row)}
                                        >
                                            <td className="px-3 py-2">
                                                <span className="font-semibold text-slate-800">{row.patientName}</span>
                                                <span className="text-slate-400 font-mono ml-1.5">{row.patientIdDisplay}</span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-500">{formatIst(row.date)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{inr(row.totalDebit ?? 0)}</td>
                                            <td className={cn('px-3 py-2 text-right tabular-nums', (row.balance ?? 0) > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500')}>{inr(row.balance ?? 0)}</td>
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className={statusBadgeClass(row.status)}>{row.status}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedPatient && selectedEncounterId && (
                <>
                    <AddChargesModal
                        open={showAddCharge}
                        onOpenChange={setShowAddCharge}
                        encounterId={selectedEncounterId}
                        patientId={selectedPatient.patientId}
                        appliesToFilter="LAB"
                        onCharged={() => { setShowAddCharge(false); refreshAll(); }}
                    />
                    <AddPaymentDialog
                        open={showAddPayment}
                        onOpenChange={setShowAddPayment}
                        patientId={selectedPatient.patientId}
                        encounterId={selectedEncounterId}
                        netBalance={netBalance}
                        onSaved={() => { setShowAddPayment(false); refreshAll(); }}
                    />
                </>
            )}
        </div>
    );
};
