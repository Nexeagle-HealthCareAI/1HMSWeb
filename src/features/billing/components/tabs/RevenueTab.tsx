import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Calendar, ArrowRight, IndianRupee,
    ChevronLeft, ChevronRight, RefreshCw, Wallet, TrendingDown, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { ipdBillingService } from '../../services/ipdBillingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Visit } from '../../types';
import { KpiStat } from '../KpiStat';
import { LoadingState, EmptyState, ErrorState } from '../StatePanel';
import { inr } from '../../utils/money';

// A patient and their invoices, with aggregate totals (across non-cancelled visits).
type PatientGroup = {
    patientId: string;
    patientName: string;
    patientIdDisplay: string;
    visits: Visit[];
    billed: number;
    paid: number;
    due: number;
    hasOpen: boolean;
    latest: number;
    current?: Visit;   // the latest invoice = the "current bill"
    pastDue: number;   // outstanding across the patient's OTHER (older) invoices
};

const mapStatus = (s?: string | null, isCancelled?: boolean): 'OPEN' | 'FINAL' | 'CANCELLED' => {
    if (isCancelled) return 'CANCELLED';
    const upper = (s ?? '').toUpperCase();
    if (upper === 'FINALIZED' || upper === 'FINAL' || upper === 'PAID') return 'FINAL';
    if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
    return 'OPEN';
};

export const RevenueTab: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'FINAL' | 'CANCELLED'>('ALL');
    const [visitFilter, setVisitFilter] = useState<string>('ALL');
    // Default to TODAY so the dashboard opens on the day's billing (daily tracking).
    const [dateMode, setDateMode] = useState<'all' | 'day' | 'range'>('day');
    const [dayDate, setDayDate] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [billingData, setBillingData] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res: any = await ipdBillingService.dashboard();
            if (res && res.success === false) throw new Error(res.message ?? 'Could not load revenue');
            const rows: Visit[] = [];
            for (const patient of (res?.data ?? [])) {
                for (const enc of (patient.encounters ?? [])) {
                    rows.push({
                        id: enc.encounterId,
                        patientId: patient.patientId ?? '',
                        type: (enc.visitType as any) ?? 'OPD',
                        date: enc.invoiceDate ?? enc.updatedAt ?? new Date().toISOString(),
                        status: mapStatus(enc.status, enc.isCancelled),
                        doctorName: enc.doctorName ?? undefined,
                        cancelReason: enc.cancelReason ?? undefined,
                        patientName: patient.patientName ?? '—',
                        patientIdDisplay: patient.patientId ?? '',
                        totalDebit: Number(enc.netAmount ?? 0),
                        totalCredit: Number(enc.paidAmount ?? 0),
                        balance: Number(enc.dueAmount ?? 0),
                    });
                }
            }
            setBillingData(rows);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load revenue');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    // Open the billing ledger for a patient. The ledger loads the patient's full visit list and
    // defaults to the current bill — pass the current encounter to pre-select it when available.
    const openPatientLedger = useCallback((g: PatientGroup) => {
        const base = g.current?.id ? `/billing/${g.current.id}` : '/billing/ledger';
        navigate(g.patientId ? `${base}?patientId=${encodeURIComponent(g.patientId)}` : base);
    }, [navigate]);

    // Distinct visit types present in the data (for the Visit Type filter).
    const visitTypes = useMemo(() => {
        const set = new Set<string>();
        billingData.forEach(r => { if (r.type) set.add(String(r.type)); });
        return Array.from(set).sort();
    }, [billingData]);

    // Local calendar-day key (YYYY-MM-DD) for a row's date, for day/range comparison.
    const dayKey = (iso: string) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const filteredRows = useMemo(() => {
        return billingData.filter(row => {
            const matchesSearch =
                row.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.patientIdDisplay.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
            const matchesVisit = visitFilter === 'ALL' || String(row.type) === visitFilter;
            let matchesDate = true;
            if (dateMode === 'day' && dayDate) {
                matchesDate = dayKey(row.date) === dayDate;
            } else if (dateMode === 'range' && (rangeStart || rangeEnd)) {
                const k = dayKey(row.date);
                if (rangeStart && k < rangeStart) matchesDate = false;
                if (rangeEnd && k > rangeEnd) matchesDate = false;
            }
            return matchesSearch && matchesStatus && matchesVisit && matchesDate;
        }).sort((a, b) => {
            if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
            if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [billingData, searchTerm, statusFilter, visitFilter, dateMode, dayDate, rangeStart, rangeEnd]);

    // KPIs reflect the current view (date/status/search filters) — so with the default "today"
    // filter these are the day's billed / collected / unpaid totals.
    const kpis = useMemo(() => {
        let billed = 0, collected = 0, due = 0, bills = 0, unpaid = 0;
        for (const r of filteredRows) {
            if (r.status === 'CANCELLED') continue;
            billed += r.totalDebit;
            collected += r.totalCredit;
            const d = Math.max(0, r.balance);
            due += d;
            bills += 1;
            if (d > 0) unpaid += 1;
        }
        const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
        return { billed, collected, due, bills, unpaid, rate };
    }, [filteredRows]);

    // Human label for what the KPIs currently cover (drives the "scope" chip).
    const scopeLabel = useMemo(() => {
        if (dateMode === 'all') return 'All time';
        if (dateMode === 'range') return (rangeStart || rangeEnd) ? `${rangeStart || '…'} → ${rangeEnd || '…'}` : 'Date range';
        if (!dayDate) return 'Day';
        const d = new Date();
        const tk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dayDate === tk ? 'Today' : format(new Date(dayDate), 'dd MMM yyyy');
    }, [dateMode, dayDate, rangeStart, rangeEnd]);

    // Group the (filtered) invoices by patient, with per-patient roll-ups. A patient appears
    // once; their visits expand underneath. Sorted: patients with an open bill first, then recent.
    const groupedPatients = useMemo<PatientGroup[]>(() => {
        const map = new Map<string, PatientGroup>();
        for (const r of filteredRows) {
            const key = r.patientId || r.patientIdDisplay || r.id;
            let g = map.get(key);
            if (!g) {
                g = { patientId: r.patientId, patientName: r.patientName, patientIdDisplay: r.patientIdDisplay, visits: [], billed: 0, paid: 0, due: 0, hasOpen: false, latest: 0, pastDue: 0 };
                map.set(key, g);
            }
            g.visits.push(r);
            if (r.status !== 'CANCELLED') { g.billed += r.totalDebit; g.paid += r.totalCredit; g.due += Math.max(0, r.balance); }
            if (r.status === 'OPEN') g.hasOpen = true;
            const t = new Date(r.date).getTime();
            if (!Number.isNaN(t) && t > g.latest) g.latest = t;
        }
        // Per patient: the current bill = most recent invoice; past due = outstanding on the rest.
        const groups = Array.from(map.values());
        for (const g of groups) {
            const byDate = [...g.visits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            g.current = byDate[0];
            g.pastDue = byDate.slice(1).reduce((s, v) => s + (v.status !== 'CANCELLED' ? Math.max(0, v.balance) : 0), 0);
        }
        return groups.sort((a, b) => {
            if (a.hasOpen !== b.hasOpen) return a.hasOpen ? -1 : 1;
            return b.latest - a.latest;
        });
    }, [filteredRows]);

    const totalPages = Math.ceil(groupedPatients.length / itemsPerPage);
    const paginatedPatients = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return groupedPatients.slice(start, start + itemsPerPage);
    }, [groupedPatients, currentPage]);

    const groupKey = (g: PatientGroup) => g.patientId || g.patientIdDisplay || g.visits[0]?.id || '';

    const FILTERS = [
        { key: 'ALL', label: 'All', active: 'bg-slate-900 text-white shadow-sm' },
        { key: 'OPEN', label: 'Open', active: 'bg-emerald-600 text-white shadow-sm' },
        { key: 'FINAL', label: 'Finalized', active: 'bg-indigo-600 text-white shadow-sm' },
        { key: 'CANCELLED', label: 'Cancelled', active: 'bg-rose-600 text-white shadow-sm' },
    ] as const;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Overview — KPIs scoped to the current view, with a scope chip for context. */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Overview</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full shadow-sm">
                        <Calendar className="h-3 w-3" /> {scopeLabel}
                    </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiStat label="Billed" amount={kpis.billed} format={inr} hint={`${kpis.bills} ${kpis.bills === 1 ? 'bill' : 'bills'}`} icon={<IndianRupee className="h-5 w-5 text-indigo-600" />} tone="from-indigo-50 to-indigo-100/50 text-indigo-900" />
                    <KpiStat label="Collected" amount={kpis.collected} format={inr} hint={`${kpis.rate}% collected`} icon={<Wallet className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
                    <KpiStat label="Outstanding" amount={kpis.due} format={inr} hint={`${kpis.unpaid} unpaid ${kpis.unpaid === 1 ? 'bill' : 'bills'}`} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
                    <KpiStat label="Collection Rate" value={`${kpis.rate}%`} hint={`${inr(kpis.collected)} of ${inr(kpis.billed)}`} icon={<TrendingUp className="h-5 w-5 text-violet-600" />} tone="from-violet-50 to-fuchsia-100/50 text-violet-900" />
                </div>
            </div>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl flex flex-col flex-1 overflow-hidden bg-white shadow-lg shadow-indigo-500/5">
                <div className="p-3 border-b border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50/60">
                    <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                        {FILTERS.map(({ key, label, active }) => (
                            <button
                                key={key}
                                onClick={() => { setStatusFilter(key); setCurrentPage(1); }}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all',
                                    statusFilter === key ? active : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Visit type */}
                    <Select value={visitFilter} onValueChange={(v) => { setVisitFilter(v); setCurrentPage(1); }}>
                        <SelectTrigger className="h-9 w-[130px] rounded-xl bg-white text-xs"><SelectValue placeholder="Visit type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All visits</SelectItem>
                            {visitTypes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Date filter: All / Single day / Range */}
                    <Select value={dateMode} onValueChange={(v) => { setDateMode(v as any); setCurrentPage(1); }}>
                        <SelectTrigger className="h-9 w-[120px] rounded-xl bg-white text-xs">
                            <div className="flex items-center gap-1.5 min-w-0"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><SelectValue /></div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All dates</SelectItem>
                            <SelectItem value="day">Single day</SelectItem>
                            <SelectItem value="range">Date range</SelectItem>
                        </SelectContent>
                    </Select>
                    {dateMode === 'day' && (
                        <Input type="date" value={dayDate} onChange={(e) => { setDayDate(e.target.value); setCurrentPage(1); }} className="h-9 w-[150px] rounded-xl bg-white text-xs" />
                    )}
                    {dateMode === 'range' && (
                        <div className="flex items-center gap-1.5">
                            <Input type="date" value={rangeStart} onChange={(e) => { setRangeStart(e.target.value); setCurrentPage(1); }} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
                            <span className="text-xs text-slate-400">to</span>
                            <Input type="date" value={rangeEnd} onChange={(e) => { setRangeEnd(e.target.value); setCurrentPage(1); }} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                        <div className="relative w-full sm:w-52">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search by PTID or Name..." className="pl-9 bg-white text-sm rounded-xl" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl" onClick={() => loadDashboard(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button size="sm" className="h-9 gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs shadow-md shadow-indigo-500/20" onClick={() => navigate('/billing/ledger')}>
                            <Plus className="h-3.5 w-3.5" /> New Bill
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <LoadingState rows={5} />
                    ) : error ? (
                        <ErrorState message={error} onRetry={() => loadDashboard(true)} />
                    ) : paginatedPatients.length === 0 ? (
                        <EmptyState
                            icon={<Search className="h-6 w-6" />}
                            title={billingData.length === 0 ? 'No revenue records yet' : 'No records match your filters'}
                            hint={billingData.length === 0 ? 'Bills will appear here once visits are charged.' : 'Try a different status or search term.'}
                        />
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/80 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Patient</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Current Bill</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Billed</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Paid</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Due</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Past Due</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedPatients.map((g) => (
                                    <TableRow key={groupKey(g)} className="group border-b border-slate-100 cursor-pointer transition-colors hover:bg-indigo-50/50 bg-white" onClick={() => openPatientLedger(g)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">{g.patientName.charAt(0)}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{g.patientName}</span>
                                                    <span className="text-[10px] tracking-widest text-slate-500 font-mono">{g.patientIdDisplay}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {g.current && <span className="text-[11px] font-semibold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{g.current.type}</span>}
                                                <span className="text-[11px] text-slate-500">{g.current ? format(new Date(g.current.date), 'dd MMM') : '—'}</span>
                                                {g.visits.length > 1 && <span className="text-[10px] text-slate-400">· {g.visits.length} visits</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={cn('text-[10px] px-2 py-0.5 border font-bold uppercase rounded-full',
                                                g.current?.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                g.current?.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                'bg-slate-100 text-slate-600 border-slate-300')}>{g.current?.status ?? '—'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-slate-700 tabular-nums">{inr(g.current?.totalDebit ?? 0)}</TableCell>
                                        <TableCell className="text-right text-emerald-600 text-sm font-bold tabular-nums">{inr(g.current?.totalCredit ?? 0)}</TableCell>
                                        <TableCell className="text-right">
                                            {(g.current ? Math.max(0, g.current.balance) : 0) > 0 ? (
                                                <span className="font-bold text-rose-600 text-sm tabular-nums">{inr(Math.max(0, g.current!.balance))}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {g.pastDue > 0 ? (
                                                <span className="font-bold text-amber-600 text-sm tabular-nums">{inr(g.pastDue)}</span>
                                            ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60 uppercase transition-all group-hover:translate-x-0.5" onClick={(e) => { e.stopPropagation(); openPatientLedger(g); }}>
                                                Ledger <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                    <div>Showing {groupedPatients.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, groupedPatients.length)} of {groupedPatients.length} patients</div>
                    <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="px-3 font-bold bg-white border border-slate-200 rounded-lg tabular-nums">Page {currentPage} / {Math.max(1, totalPages)}</div>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default RevenueTab;
