import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Calendar, ArrowRight, AlertCircle, IndianRupee,
    ChevronLeft, ChevronRight, RefreshCw, TrendingUp, Wallet, TrendingDown,
} from 'lucide-react';
import { ipdBillingService } from '../../services/ipdBillingService';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Visit } from '../../types';

const mapStatus = (s?: string | null, isCancelled?: boolean): 'OPEN' | 'FINAL' | 'CANCELLED' => {
    if (isCancelled) return 'CANCELLED';
    const upper = (s ?? '').toUpperCase();
    if (upper === 'FINALIZED' || upper === 'FINAL' || upper === 'PAID') return 'FINAL';
    if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
    return 'OPEN';
};

const inr = (n: number) => `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const KpiCard: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <Card className={cn('border p-4 flex items-center gap-3', tone)}>
        <div className="h-10 w-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-xl font-black truncate">{value}</p>
        </div>
    </Card>
);

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

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiCard label="Total Billed" value={inr(kpis.billed)} icon={<IndianRupee className="h-5 w-5 text-indigo-600" />} tone="border-indigo-100 bg-indigo-50 text-indigo-900" />
                <KpiCard label="Collected" value={inr(kpis.collected)} icon={<Wallet className="h-5 w-5 text-emerald-600" />} tone="border-emerald-100 bg-emerald-50 text-emerald-900" />
                <KpiCard label="Outstanding" value={inr(kpis.due)} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="border-rose-100 bg-rose-50 text-rose-900" />
            </div>

            <Card className="border border-slate-200 flex flex-col flex-1 overflow-hidden bg-white">
                <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                        {(['ALL', 'OPEN', 'FINAL', 'CANCELLED'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all',
                                    statusFilter === status
                                        ? status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                          : status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                          : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                )}
                            >
                                {status === 'ALL' ? 'ALL' : status === 'OPEN' ? 'OPEN' : status === 'FINAL' ? 'FINALIZED' : 'CANCELLED'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search by PTID or Name..." className="pl-9 bg-white text-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => loadDashboard(true)} disabled={refreshing || loading}>
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                        <Button size="sm" className="h-9 gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs" onClick={() => navigate('/billing/ledger')}>
                            <Plus className="h-3.5 w-3.5" /> New Bill
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white/50">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <TableRow className="border-none">
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Patient</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Visit</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Date</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Billed</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Paid</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Due</TableHead>
                                <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={`sk-${i}`}><TableCell colSpan={8} className="py-3"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                ))
                            ) : error ? (
                                <TableRow><TableCell colSpan={8} className="text-center h-40 text-rose-600">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle className="h-8 w-8" />
                                        <p className="text-xs uppercase font-semibold">{error}</p>
                                        <Button size="sm" variant="outline" onClick={() => loadDashboard(true)} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                                    </div>
                                </TableCell></TableRow>
                            ) : paginatedRows.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center h-40 text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="h-8 w-8 opacity-20 text-indigo-500" />
                                        <p className="text-xs uppercase tracking-wider">{billingData.length === 0 ? 'No revenue records yet' : 'No records match your filters'}</p>
                                    </div>
                                </TableCell></TableRow>
                            ) : (
                                paginatedRows.map((row) => (
                                    <TableRow key={row.id} className="group hover:bg-indigo-50/50 border-b border-slate-100 cursor-pointer" onClick={() => navigate(`/billing/${row.id}`)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{row.patientName.charAt(0)}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{row.patientName}</span>
                                                    <span className="text-[10px] tracking-widest text-slate-500">{row.patientIdDisplay}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-semibold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{row.type}</span>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase"><Calendar className="h-3.5 w-3.5 text-slate-400" />{format(new Date(row.date), 'dd MMM')}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={cn('text-xs px-2 py-0.5 border font-semibold uppercase rounded',
                                                row.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                row.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                'bg-slate-100 text-slate-600 border-slate-300')}>{row.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-slate-700">{inr(row.totalDebit)}</TableCell>
                                        <TableCell className="text-right text-emerald-600 text-sm font-bold">{inr(row.totalCredit)}</TableCell>
                                        <TableCell className="text-right">
                                            {row.balance > 0 ? <span className="font-bold text-rose-600 text-sm">{inr(row.balance)}</span>
                                                : <span className="text-xs font-semibold text-slate-400 uppercase border border-slate-200 px-2 py-0.5 rounded bg-slate-50">Settled</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-semibold border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100/50 uppercase" onClick={(e) => { e.stopPropagation(); navigate(`/billing/${row.id}`); }}>
                                                <ArrowRight className="h-3 w-3 mr-1" /> Bill
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
                    <div>Showing {filteredRows.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length}</div>
                    <div className="flex gap-2 items-center">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="px-3 font-bold bg-white border border-slate-200 rounded">Page {currentPage} / {Math.max(1, totalPages)}</div>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default RevenueTab;
