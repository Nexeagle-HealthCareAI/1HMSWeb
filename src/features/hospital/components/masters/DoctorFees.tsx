import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, AlertCircle, Stethoscope, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { doctorFeeService, type DoctorFeeRow } from '@/features/hospital/services/doctorFeeService';

type RowState = DoctorFeeRow & { dirty?: boolean; saving?: boolean };

export const DoctorFees: React.FC = () => {
    const [rows, setRows] = useState<RowState[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            (r.doctorName ?? '').toLowerCase().includes(q) || (r.departmentName ?? '').toLowerCase().includes(q));
    }, [rows, search]);

    const setField = (doctorId: string, key: 'opdConsultFee' | 'ipdVisitFee', value: number) => {
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
            });
            setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, dirty: false, saving: false } : r));
            toast({ title: 'Fees saved', description: row.doctorName ?? '' });
        } catch (e: any) {
            setRows(prev => prev.map(r => r.doctorId === doctorId ? { ...r, saving: false } : r));
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200"><Stethoscope className="h-5 w-5 text-blue-600" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Doctor Fees</h2>
                        <p className="text-xs text-muted-foreground">Per-doctor OPD consultation and IPD visit charges.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search doctor / department…" className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => load(true)} disabled={refreshing || loading}>
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            </div>

            <Card className="border border-slate-200 bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="border-none">
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Doctor</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Department</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest w-[160px]">OPD Consult (₹)</TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-widest w-[160px]">IPD Visit (₹)</TableHead>
                            <TableHead className="w-[90px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="py-3"><Skeleton className="h-9 w-full" /></TableCell></TableRow>)
                        ) : error ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-32 text-rose-600">
                                <div className="flex flex-col items-center gap-2">
                                    <AlertCircle className="h-7 w-7" />
                                    <p className="text-xs uppercase font-semibold">{error}</p>
                                    <Button size="sm" variant="outline" onClick={() => load(true)} className="mt-1 h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Retry</Button>
                                </div>
                            </TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-32 text-slate-400 text-xs uppercase tracking-wider">{rows.length === 0 ? 'No doctors found for this hospital' : 'No doctors match your search'}</TableCell></TableRow>
                        ) : filtered.map(r => (
                            <TableRow key={r.doctorId} className="border-b border-slate-100 hover:bg-blue-50/30">
                                <TableCell className="font-semibold text-slate-800">{r.doctorName || '—'}</TableCell>
                                <TableCell className="text-xs text-slate-500">{r.departmentName || '—'}</TableCell>
                                <TableCell>
                                    <Input type="number" min={0} step="1" value={r.opdConsultFee} onChange={(e) => setField(r.doctorId, 'opdConsultFee', parseFloat(e.target.value || '0'))} className="h-8 font-mono text-sm" />
                                </TableCell>
                                <TableCell>
                                    <Input type="number" min={0} step="1" value={r.ipdVisitFee} onChange={(e) => setField(r.doctorId, 'ipdVisitFee', parseFloat(e.target.value || '0'))} className="h-8 font-mono text-sm" />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs" disabled={!r.dirty || r.saving} onClick={() => save(r.doctorId)}>
                                        {r.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Save</>}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
            <p className="text-[11px] text-muted-foreground">Tip: the OPD consult fee is charged on New / Old-with-fee appointments (per the prescription validity rule); IPD visit fee applies per doctor visit during admission.</p>
        </div>
    );
};

export default DoctorFees;
