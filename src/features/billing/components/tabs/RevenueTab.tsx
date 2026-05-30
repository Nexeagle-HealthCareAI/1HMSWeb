import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Calendar, ArrowRight, IndianRupee,
    ChevronLeft, ChevronRight, RefreshCw, Wallet, TrendingDown, CheckCircle2,
} from 'lucide-react';
import { ipdBillingService } from '../../services/ipdBillingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Visit } from '../../types';
import { KpiStat } from '../KpiStat';
import { LoadingState, EmptyState, ErrorState } from '../StatePanel';
import { inr } from '../../utils/money';

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

    // Open a bill in the ledger. The ledger needs the patient (to load the visit list
    // and its events) plus the encounter to pre-select — pass both.
    const openBill = useCallback((row: Visit) => {
        const path = `/billing/${row.id}`;
        navigate(row.patientId ? `${path}?patientId=${encodeURIComponent(row.patientId)}` : path);
    }, [navigate]);

    // KPIs across all non-cancelled bills
    const kpis = useMemo(() => {
        let billed = 0, collected = 0, due = 0;
        for (const r of billingData) {
            if (r.status === 'CANCELLED') continue;
            billed += r.totalDebit;
            collected += r.totalCredit;
            due += Math.max(0, r.balance);
        }
        return { billed, collected, due };
    }, [billingData]);

    const filteredRows = useMemo(() => {
        return billingData.filter(row => {
            const matchesSearch =
                row.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.patientIdDisplay.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
            if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }, [billingData, searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredRows.slice(start, start + itemsPerPage);
    }, [filteredRows, currentPage]);

    const FILTERS = [
        { key: 'ALL', label: 'All', active: 'bg-slate-900 text-white shadow-sm' },
        { key: 'OPEN', label: 'Open', active: 'bg-emerald-600 text-white shadow-sm' },
        { key: 'FINAL', label: 'Finalized', active: 'bg-indigo-600 text-white shadow-sm' },
        { key: 'CANCELLED', label: 'Cancelled', active: 'bg-rose-600 text-white shadow-sm' },
    ] as const;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiStat label="Total Billed" amount={kpis.billed} format={inr} icon={<IndianRupee className="h-5 w-5 text-indigo-600" />} tone="from-indigo-50 to-indigo-100/50 text-indigo-900" />
                <KpiStat label="Collected" amount={kpis.collected} format={inr} icon={<Wallet className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
                <KpiStat label="Outstanding" amount={kpis.due} format={inr} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
            </div>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl flex flex-col flex-1 overflow-hidden bg-white shadow-lg shadow-indigo-500/5">
                <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
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
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
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
                    ) : paginatedRows.length === 0 ? (
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
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Visit</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Billed</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Paid</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Due</TableHead>
                                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedRows.map((row) => (
                                    <TableRow key={row.id} className="group border-b border-slate-50 cursor-pointer transition-colors hover:bg-indigo-50/50" onClick={() => openBill(row)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">{row.patientName.charAt(0)}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{row.patientName}</span>
                                                    <span className="text-[10px] tracking-widest text-slate-500 font-mono">{row.patientIdDisplay}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[11px] font-semibold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{row.type}</span>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            <div className="flex items-center gap-1.5 text-[11px] uppercase"><Calendar className="h-3.5 w-3.5 text-slate-400" />{format(new Date(row.date), 'dd MMM')}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={cn('text-[10px] px-2 py-0.5 border font-bold uppercase rounded-full',
                                                row.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                row.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                'bg-slate-100 text-slate-600 border-slate-300')}>{row.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-slate-700 tabular-nums">{inr(row.totalDebit)}</TableCell>
                                        <TableCell className="text-right text-emerald-600 text-sm font-bold tabular-nums">{inr(row.totalCredit)}</TableCell>
                                        <TableCell className="text-right">
                                            {row.balance > 0 ? (
                                                <span className="font-bold text-rose-600 text-sm tabular-nums">{inr(row.balance)}</span>
                                            ) : row.status !== 'CANCELLED' && row.totalCredit > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
                                                    <CheckCircle2 className="h-3 w-3" /> Paid
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 uppercase border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50">Settled</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-semibold rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60 uppercase transition-all group-hover:translate-x-0.5" onClick={(e) => { e.stopPropagation(); openBill(row); }}>
                                                <ArrowRight className="h-3 w-3 mr-1" /> Bill
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                    <div>Showing {filteredRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length}</div>
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
