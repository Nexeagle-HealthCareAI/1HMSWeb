import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Activity, BedDouble, Calendar as CalendarIcon, RefreshCw, Loader2, AlertCircle,
    Hotel, Stethoscope, Timer, Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { analyticsService, type GetIpdAnalyticsResponse } from '../services/analyticsService';

const toLocalIso = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const KpiTile: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode; tone?: string }> = ({ label, value, sub, icon, tone }) => (
    <div className={cn('rounded-xl border p-4 bg-white shadow-sm', tone ?? 'border-slate-100')}>
        <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">{icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        </div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
);

const occupancyTone = (pct: number) =>
    pct >= 90 ? 'bg-rose-50 border-rose-200' :
    pct >= 75 ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-100';

const IpdAnalyticsPage: React.FC = () => {
    const today = new Date();
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29);

    const [fromDate, setFromDate] = useState(toLocalIso(thirtyAgo));
    const [toDate, setToDate] = useState(toLocalIso(today));
    const [readmDays, setReadmDays] = useState(30);

    const [data, setData] = useState<GetIpdAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const fromUtc = new Date(`${fromDate}T00:00:00`).toISOString();
            const toUtc   = new Date(`${toDate}T23:59:59.999`).toISOString();
            const res = await analyticsService.ipd({ fromUtc, toUtc, readmissionWindowDays: readmDays });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setData(res);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load IPD analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fromDate, toDate, readmDays]);

    useEffect(() => { load(); }, [load]);

    const seriesForChart = useMemo(() => (data?.admissionSeries ?? []).map(p => ({
        label: format(parseISO(p.periodStart), 'd MMM'),
        admissions: p.admissions,
        discharges: p.discharges,
    })), [data]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <Activity className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">IPD Operations</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Live occupancy, ALOS, and readmission %. Occupancy is a snapshot — counts are for the date range.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 w-40" />
                        <span className="text-slate-400 text-xs">to</span>
                        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 w-40" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Readm.</span>
                            <Input
                                type="number" min={1} max={365} value={readmDays}
                                onChange={e => setReadmDays(parseInt(e.target.value || '30', 10))}
                                className="h-9 w-16 text-center"
                            />
                            <span className="text-[11px] text-slate-500">d</span>
                        </div>
                        <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                ) : data && (
                    <>
                        {/* Snapshot KPIs */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Live snapshot</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KpiTile
                                    label="Occupancy"
                                    value={`${data.kpis.occupancyPercent}%`}
                                    sub={`${data.kpis.occupiedBeds} / ${data.kpis.totalBeds} beds`}
                                    icon={<BedDouble className="h-4 w-4" />}
                                    tone={occupancyTone(Number(data.kpis.occupancyPercent))}
                                />
                                <KpiTile label="Currently admitted" value={data.kpis.currentlyAdmitted.toString()} sub={`${data.kpis.availableBeds} beds available`} icon={<Hotel className="h-4 w-4" />} />
                                <KpiTile label="ALOS (range)" value={`${data.kpis.averageLengthOfStayDays}d`} sub={`median ${data.kpis.medianLengthOfStayDays}d · ${data.kpis.dischargesInRange} discharges`} icon={<Timer className="h-4 w-4" />} />
                                <KpiTile
                                    label={`Readmission ${data.readmissionWindowDays}d`}
                                    value={`${data.kpis.readmissionPercent}%`}
                                    sub={`${data.kpis.readmittedPatients} of ${data.kpis.readmissionDenominator} discharged patients`}
                                    icon={<Repeat className="h-4 w-4" />}
                                    tone={data.kpis.readmissionPercent >= 20 ? 'bg-rose-50 border-rose-200' : data.kpis.readmissionPercent >= 10 ? 'bg-amber-50 border-amber-200' : undefined}
                                />
                            </div>
                        </div>

                        {/* Range counts */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Admissions in range</p>
                                <p className="text-2xl font-black text-emerald-900 mt-0.5">{data.kpis.admissionsInRange}</p>
                            </div>
                            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Discharges in range</p>
                                <p className="text-2xl font-black text-indigo-900 mt-0.5">{data.kpis.dischargesInRange}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cancelled in range</p>
                                <p className="text-2xl font-black text-slate-700 mt-0.5">{data.kpis.cancelledInRange}</p>
                            </div>
                        </div>

                        {/* Admission/Discharge series */}
                        <Card>
                            <CardHeader className="pb-2 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-600" /> Admissions vs Discharges · daily
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {seriesForChart.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-10">No data in this range.</p>
                                ) : (
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={seriesForChart}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Bar dataKey="admissions" name="Admissions" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="discharges" name="Discharges" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ward occupancy */}
                        <Card>
                            <CardHeader className="pb-2 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-indigo-600" /> Ward Occupancy
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3">
                                {data.wardOccupancy.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-10">No active beds configured.</p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {data.wardOccupancy.map(w => (
                                            <div key={w.wardCode} className="px-3 py-2.5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                                        {w.wardCode}
                                                        <Badge variant="outline" className={cn(
                                                            'text-[10px] font-bold',
                                                            w.occupancyPercent >= 90 ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                : w.occupancyPercent >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        )}>
                                                            {w.occupancyPercent}%
                                                        </Badge>
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-900">
                                                        {w.occupiedBeds} / {w.totalBeds}
                                                        <span className="text-[10px] text-slate-500 font-normal ml-1">· {w.availableBeds} free</span>
                                                    </p>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            'h-full',
                                                            w.occupancyPercent >= 90 ? 'bg-rose-500'
                                                                : w.occupancyPercent >= 75 ? 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                        )}
                                                        style={{ width: `${Math.min(100, w.occupancyPercent)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <p className="text-[11px] text-slate-400 text-right">
                            Window: {format(parseISO(data.fromUtc), 'd MMM HH:mm')} → {format(parseISO(data.toUtc), 'd MMM HH:mm')} UTC
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default IpdAnalyticsPage;
