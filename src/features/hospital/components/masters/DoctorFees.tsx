import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, AlertCircle, Stethoscope, Loader2, Check, Filter, Users, IndianRupee, BedDouble, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { doctorFeeService, type DoctorFeeRow } from '@/features/hospital/services/doctorFeeService';

type RowState = DoctorFeeRow & { dirty?: boolean; saving?: boolean };

const Stat: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <Card className={cn('relative overflow-hidden border-0 ring-1 ring-black/5 p-3.5 flex items-center gap-3 rounded-2xl bg-gradient-to-br shadow-lg shadow-brand-500/5', tone)}>
        <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="relative h-10 w-10 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center shrink-0">{icon}</div>
        <div className="relative min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-xl font-black tabular-nums">{value}</p>
        </div>
    </Card>
);

export const DoctorFees: React.FC = () => {
    const [rows, setRows] = useState<RowState[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState<string>('ALL');

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await doctorFeeService.list();
            setRows((res?.items ?? []).map(r => ({ ...r })));
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load doctor fees');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const departments = useMemo(() => {
        const set = new Set<string>();
        rows.forEach(r => { if (r.departmentName) set.add(r.departmentName); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            const matchesSearch = !q
                || (r.doctorName ?? '').toLowerCase().includes(q)
                || (r.departmentName ?? '').toLowerCase().includes(q);
            const matchesDept = deptFilter === 'ALL' || r.departmentName === deptFilter;
            return matchesSearch && matchesDept;
        });
    }, [rows, search, deptFilter]);

    const stats = useMemo(() => ({
        total: rows.length,
        opd: rows.filter(r => Number(r.opdConsultFee) > 0).length,
        ipd: rows.filter(r => Number(r.ipdVisitFee) > 0).length,
        emergency: rows.filter(r => Number(r.emergencyFee) > 0).length,
    }), [rows]);

    const setField = (doctorId: string, key: 'opdConsultFee' | 'ipdVisitFee' | 'emergencyFee', value: number) => {
        setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, [key]: value, dirty: true } : r));
    };

    const save = async (doctorId: string) => {
        const row = rows.find(r => r.doctorId === doctorId);
        if (!row) return;
        setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, saving: true } : r));
        try {
            await doctorFeeService.upsert({
                doctorId,
                opdConsultFee: Number(row.opdConsultFee) || 0,
                ipdVisitFee: Number(row.ipdVisitFee) || 0,
                emergencyFee: Number(row.emergencyFee) || 0,
            });
            setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, dirty: false, saving: false } : r));
            toast({ title: 'Fees saved', description: row.doctorName ?? '' });
        } catch (e: any) {
            setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, saving: false } : r));
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {/* Premium header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl px-4 py-3 shadow-lg shadow-brand-500/5 ring-1 ring-black/5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
                        <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">Doctor Fees</h2>
                        <p className="text-xs text-slate-500">Per-doctor OPD consultation, IPD visit and emergency charges.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="h-9 w-[190px] rounded-xl text-sm bg-white">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <SelectValue placeholder="All Departments" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Departments</SelectItem>
                            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search doctor / department…" className="pl-9 h-9 text-sm rounded-xl bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl" onClick={() => load(true)} disabled={refreshing || loading}>
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Doctors" value={loading ? '…' : stats.total} icon={<Users className="h-5 w-5 text-brand-600" />} tone="from-brand-50 to-brand-100/50 text-brand-900" />
                <Stat label="OPD Fee Set" value={loading ? '…' : stats.opd} icon={<IndianRupee className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
                <Stat label="IPD Fee Set" value={loading ? '…' : stats.ipd} icon={<BedDouble className="h-5 w-5 text-violet-600" />} tone="from-violet-50 to-fuchsia-100/50 text-violet-900" />
                <Stat label="Emergency Fee Set" value={loading ? '…' : stats.emergency} icon={<Siren className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
            </div>

            {/* DESKTOP TABLE */}
            <Card className="border-0 ring-1 ring-black/5 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-lg shadow-brand-500/5 max-lg:hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Doctor</TableHead>
                            <TableHead className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Department</TableHead>
                            <TableHead className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest w-[150px]">OPD Consult (₹)</TableHead>
                            <TableHead className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest w-[150px]">IPD Visit (₹)</TableHead>
                            <TableHead className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest w-[150px]">Emergency (₹)</TableHead>
                            <TableHead className="w-[90px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6} className="py-3"><Skeleton className="h-9 w-full rounded-lg" /></TableCell></TableRow>)
                        ) : error ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-40 text-rose-600">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center"><AlertCircle className="h-6 w-6" /></div>
                                    <p className="text-sm font-semibold">{error}</p>
                                    <Button size="sm" variant="outline" onClick={() => load(true)} className="mt-1 h-7 text-xs gap-1.5"><RefreshCw className="h-3 w-3" /> Retry</Button>
                                </div>
                            </TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-40 text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 flex items-center justify-center"><Stethoscope className="h-6 w-6" /></div>
                                    <p className="text-sm font-semibold text-slate-600">{rows.length === 0 ? 'No doctors found for this hospital' : 'No doctors match your filters'}</p>
                                </div>
                            </TableCell></TableRow>
                        ) : filtered.map(r => (
                            <TableRow key={r.doctorId} className={cn('border-b border-slate-50 dark:border-zinc-800/40 transition-colors hover:bg-brand-50/40 dark:hover:bg-zinc-800/20', r.dirty && 'bg-amber-50/40 dark:bg-amber-950/10')}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-100 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400">{(r.doctorName ?? '?').charAt(0).toUpperCase()}</div>
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{r.doctorName || '—'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{r.departmentName ? <Badge variant="outline" className="text-[10px] font-bold rounded-full bg-slate-50 dark:bg-zinc-950/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800/80">{r.departmentName}</Badge> : <span className="text-xs text-slate-400">—</span>}</TableCell>
                                <TableCell>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                                        <Input type="number" min={0} step="1" value={r.opdConsultFee} onChange={(e) => setField(r.doctorId, 'opdConsultFee', parseFloat(e.target.value || '0'))} className="h-8 pl-6 font-mono text-sm tabular-nums" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                                        <Input type="number" min={0} step="1" value={r.ipdVisitFee} onChange={(e) => setField(r.doctorId, 'ipdVisitFee', parseFloat(e.target.value || '0'))} className="h-8 pl-6 font-mono text-sm tabular-nums" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                                        <Input type="number" min={0} step="1" value={r.emergencyFee} onChange={(e) => setField(r.doctorId, 'emergencyFee', parseFloat(e.target.value || '0'))} className="h-8 pl-6 font-mono text-sm tabular-nums" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" className={cn('h-8 text-xs rounded-lg transition-all', r.dirty ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500')} disabled={!r.dirty || r.saving} onClick={() => save(r.doctorId)}>
                                        {r.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Save</>}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* MOBILE CARD LIST */}
            {loading ? (
                <div className="lg:hidden flex flex-col gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                    ))}
                </div>
            ) : error ? (
                <div className="lg:hidden text-center py-12 text-rose-600 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center"><AlertCircle className="h-6 w-6" /></div>
                        <p className="text-sm font-semibold">{error}</p>
                        <Button size="sm" variant="outline" onClick={() => load(true)} className="mt-1 h-7 text-xs gap-1.5"><RefreshCw className="h-3 w-3" /> Retry</Button>
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="lg:hidden text-center py-12 text-slate-400 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/40 flex items-center justify-center"><Stethoscope className="h-6 w-6" /></div>
                        <p className="text-sm font-semibold text-slate-650 dark:text-zinc-400">{rows.length === 0 ? 'No doctors found for this hospital' : 'No doctors match your filters'}</p>
                    </div>
                </div>
            ) : (
                <div className="lg:hidden flex flex-col gap-3.5 pb-24">
                    {filtered.map(r => (
                        <Card key={r.doctorId} className={cn(
                            "border border-slate-150 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 flex flex-col gap-3.5 shadow-sm",
                            r.dirty && "ring-1 ring-amber-500/20 bg-amber-50/[0.02]"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/60 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-400 shrink-0">
                                        {(r.doctorName ?? '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 text-xs truncate">{r.doctorName || '—'}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{r.departmentName || 'No Department'}</p>
                                    </div>
                                </div>
                                {r.departmentName && (
                                    <Badge variant="outline" className="text-[9px] font-bold rounded-full bg-slate-50 dark:bg-zinc-950/40 text-slate-500 dark:text-zinc-400 border-slate-205 dark:border-zinc-800/80 px-2 py-0.5 shrink-0">
                                        {r.departmentName}
                                    </Badge>
                                )}
                            </div>

                            {/* Fees Grid */}
                            <div className="grid grid-cols-3 gap-2.5 mt-1">
                                <div className="grid gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">OPD Consult</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                                        <Input 
                                            type="number" 
                                            min={0} 
                                            step="1" 
                                            value={r.opdConsultFee} 
                                            onChange={(e) => setField(r.doctorId, 'opdConsultFee', parseFloat(e.target.value || '0'))} 
                                            className="h-8.5 pl-5 pr-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200/80 dark:border-zinc-850 focus:bg-white dark:focus:bg-zinc-900 text-xs font-mono tabular-nums focus-visible:ring-1 focus-visible:ring-brand-500" 
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">IPD Visit</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                                        <Input 
                                            type="number" 
                                            min={0} 
                                            step="1" 
                                            value={r.ipdVisitFee} 
                                            onChange={(e) => setField(r.doctorId, 'ipdVisitFee', parseFloat(e.target.value || '0'))} 
                                            className="h-8.5 pl-5 pr-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200/80 dark:border-zinc-850 focus:bg-white dark:focus:bg-zinc-900 text-xs font-mono tabular-nums focus-visible:ring-1 focus-visible:ring-brand-500" 
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Emergency</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                                        <Input 
                                            type="number" 
                                            min={0} 
                                            step="1" 
                                            value={r.emergencyFee} 
                                            onChange={(e) => setField(r.doctorId, 'emergencyFee', parseFloat(e.target.value || '0'))} 
                                            className="h-8.5 pl-5 pr-1.5 rounded-lg bg-slate-50/50 dark:bg-zinc-950/40 border-slate-200/80 dark:border-zinc-850 focus:bg-white dark:focus:bg-zinc-900 text-xs font-mono tabular-nums focus-visible:ring-1 focus-visible:ring-brand-500" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end mt-1">
                                <Button 
                                    size="sm" 
                                    className={cn(
                                        'h-8 text-xs rounded-xl font-bold transition-all w-24 gap-1.5', 
                                        r.dirty 
                                            ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20' 
                                            : 'bg-slate-100 dark:bg-zinc-950 text-slate-400 dark:text-zinc-650 border border-slate-200/20 dark:border-zinc-850'
                                    )} 
                                    disabled={!r.dirty || r.saving} 
                                    onClick={() => save(r.doctorId)}
                                >
                                    {r.saving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <><Check className="h-3.5 w-3.5" /> Save</>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <p className="text-[11px] text-muted-foreground px-1">Tip: the OPD consult fee is charged on New / Old-with-fee appointments (per the prescription validity rule); IPD visit fee applies per doctor visit during admission; emergency fee is stored per doctor for use in ER billing.</p>
        </div>
    );
};

export default DoctorFees;
