import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderSearch, Search, RefreshCw, Loader2, AlertCircle, ExternalLink,
    User, Calendar as CalendarIcon, X, FileSignature,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { mrdService, type MrdRecordItem, type MrdSearchParams } from '../services/mrdService';

const STATUS_TONE: Record<string, string> = {
    ADMITTED:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    DISCHARGED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    CANCELLED:  'bg-slate-100 text-slate-600 border-slate-300',
};

const initialFilters = (): MrdSearchParams => ({
    status: 'ALL',
    take: 200,
});

const MrdPage: React.FC = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<MrdSearchParams>(initialFilters());
    const [items, setItems] = useState<MrdRecordItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const set = <K extends keyof MrdSearchParams>(k: K, v: MrdSearchParams[K]) =>
        setFilters(prev => ({ ...prev, [k]: v }));

    const run = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cleaned: MrdSearchParams = { ...filters };
            // Strip blank strings for cleaner URLs
            (Object.keys(cleaned) as (keyof MrdSearchParams)[]).forEach(k => {
                const v = cleaned[k];
                if (typeof v === 'string' && v.trim() === '') (cleaned as any)[k] = undefined;
            });
            const res = await mrdService.search(cleaned);
            if (!res.success) throw new Error(res.message ?? 'Search failed');
            setItems(res.items ?? []);
            setTotal(res.totalMatches);
            setSearched(true);
        } catch (e: any) {
            setError(e?.message ?? 'Search failed');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Auto-run on page load with default filters to give the user something to look at.
    useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    const reset = () => {
        setFilters(initialFilters());
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') run();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <FolderSearch className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Medical Records · Search</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Find any past or current admission. Click a row to open the patient workspace.</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-2 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Search className="h-4 w-4 text-indigo-600" /> Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Patient name</Label>
                                <Input value={filters.patientName ?? ''} onChange={e => set('patientName', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1" placeholder="Full or partial" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Patient ID</Label>
                                <Input value={filters.patientId ?? ''} onChange={e => set('patientId', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1 font-mono" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Mobile</Label>
                                <Input value={filters.mobile ?? ''} onChange={e => set('mobile', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Admission #</Label>
                                <Input value={filters.admissionNo ?? ''} onChange={e => set('admissionNo', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1 font-mono" />
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Year</Label>
                                <Input type="number" min={1900} max={9999} value={filters.year ?? ''} onChange={e => set('year', e.target.value ? parseInt(e.target.value, 10) : undefined)} onKeyDown={onKeyDown} className="h-9 mt-1" placeholder="e.g. 2026" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">From</Label>
                                <Input type="date" value={filters.fromUtc?.slice(0, 10) ?? ''} onChange={e => set('fromUtc', e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">To</Label>
                                <Input type="date" value={filters.toUtc?.slice(0, 10) ?? ''} onChange={e => set('toUtc', e.target.value ? new Date(e.target.value + 'T23:59:59.999').toISOString() : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                                <select value={filters.status ?? 'ALL'} onChange={e => set('status', e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white">
                                    <option value="ALL">All</option>
                                    <option value="ADMITTED">Admitted</option>
                                    <option value="DISCHARGED">Discharged</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Ward</Label>
                                <Input value={filters.wardCode ?? ''} onChange={e => set('wardCode', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1 font-mono" placeholder="e.g. ICU, GEN" />
                            </div>
                            <div className="md:col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">Attending doctor ID</Label>
                                <Input value={filters.attendingDoctorId ?? ''} onChange={e => set('attendingDoctorId', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1 font-mono" placeholder="GUID — optional" />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Diagnosis contains</Label>
                                <Input value={filters.diagnosis ?? ''} onChange={e => set('diagnosis', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1" placeholder="Matches admitting and final diagnosis" />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Procedure contains</Label>
                                <Input value={filters.procedure ?? ''} onChange={e => set('procedure', e.target.value)} onKeyDown={onKeyDown} className="h-9 mt-1" placeholder="From discharge summary" />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button variant="ghost" size="sm" className="h-9" onClick={reset}>
                                <X className="h-3.5 w-3.5 mr-1.5" /> Reset
                            </Button>
                            <Button onClick={run} disabled={loading} className="h-9 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                                {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Searching…</> : <><Search className="h-3.5 w-3.5 mr-1.5" /> Search</>}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {error && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                )}

                {!loading && !error && searched && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                                {total === 0 ? 'No matches' : `${items.length} of ${total} match${total === 1 ? '' : 'es'}${total > items.length ? ' · refine filters to narrow' : ''}`}
                            </p>
                            <Button variant="outline" size="sm" className="h-8" onClick={run}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                            </Button>
                        </div>

                        {items.length === 0 ? (
                            <div className="p-12 text-center">
                                <FolderSearch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-base font-semibold text-slate-700">No records match the current filters</p>
                                <p className="text-sm text-slate-500 mt-1">Adjust filters and try again.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="text-left px-3 py-2.5 font-bold">Admission</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Admitted</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Discharged</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Ward/Bed</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Doctor</th>
                                        <th className="text-left px-3 py-2.5 font-bold">Diagnosis</th>
                                        <th className="text-right px-3 py-2.5 font-bold w-[80px]">Open</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(it => (
                                        <tr key={it.admissionId} className="border-t border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate(`/ipd/patient/${it.admissionId}`)}>
                                            <td className="px-3 py-2 text-xs font-mono font-bold text-indigo-700">{it.admissionNo ?? it.admissionId.slice(0, 8)}</td>
                                            <td className="px-3 py-2">
                                                <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-slate-400" /> {it.patientName ?? '—'}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {it.patientId}{it.ageYears != null ? ` · ${it.ageYears}y` : ''}{it.sex ? ` · ${it.sex}` : ''}{it.mobile ? ` · ${it.mobile}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                <CalendarIcon className="h-3 w-3 inline mr-1 text-slate-400" />
                                                {format(parseISO(it.admittedAt), 'd MMM yyyy')}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                {it.dischargedAt ? (
                                                    <>
                                                        {format(parseISO(it.dischargedAt), 'd MMM yyyy')}
                                                        {it.lengthOfStayDays != null && <span className="text-[10px] text-slate-400 ml-1">· {it.lengthOfStayDays}d</span>}
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>{it.status}</Badge>
                                                {it.status === 'DISCHARGED' && it.dischargeSummarySigned && (
                                                    <div className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-700">
                                                        <FileSignature className="h-2.5 w-2.5" /> Summary signed
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700">
                                                {it.wardCode ?? '—'}{it.bedCode ? ` · ${it.bedCode}` : ''}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700">{it.attendingDoctorName ?? '—'}</td>
                                            <td className="px-3 py-2 text-xs text-slate-700 max-w-[260px]">
                                                {it.finalDiagnosis || it.admissionDiagnosis || it.admissionReason || '—'}
                                                {it.proceduresPerformed && <div className="text-[10px] text-slate-500 mt-0.5">Proc: {it.proceduresPerformed}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <ExternalLink className="h-3.5 w-3.5 text-indigo-500 inline" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MrdPage;
