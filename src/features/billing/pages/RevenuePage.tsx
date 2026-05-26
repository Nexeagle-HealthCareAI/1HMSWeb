import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    TrendingUp, RefreshCw, Loader2, AlertCircle, Calendar as CalendarIcon,
    Receipt, Banknote, Sparkles, Trophy, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
    BarChart, Bar,
} from 'recharts';
import {
    analyticsService,
    type GetRevenueAnalyticsResponse,
    type Granularity,
} from '../services/analyticsService';

const inr = (n: number | undefined | null) =>
    `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inrCompact = (n: number) => {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
    if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (n >= 1000)        return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toFixed(0)}`;
};

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

const RevenuePage: React.FC = () => {
    const today = new Date();
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 29);

    const [fromDate, setFromDate] = useState(toLocalIso(thirtyAgo));
    const [toDate, setToDate] = useState(toLocalIso(today));
    const [granularity, setGranularity] = useState<Granularity>('DAY');

    const [data, setData] = useState<GetRevenueAnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const fromUtc = new Date(`${fromDate}T00:00:00`).toISOString();
            const toUtc   = new Date(`${toDate}T23:59:59.999`).toISOString();
            const res = await analyticsService.revenue({ fromUtc, toUtc, granularity, topServicesLimit: 10 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setData(res);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load revenue analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fromDate, toDate, granularity]);

    useEffect(() => { load(); }, [load]);

    const seriesForChart = useMemo(() => (data?.series ?? []).map(p => ({
        label: granularity === 'MONTH'
            ? format(parseISO(p.periodStart), 'MMM yyyy')
            : format(parseISO(p.periodStart), 'd MMM'),
        gross: Math.round(p.grossCollected),
        refunds: Math.round(p.refundsIssued),
        net: Math.round(p.netCollected),
    })), [data, granularity]);

    const modeForChart = useMemo(() => (data?.byPaymentMode ?? []).map(b => ({
        label: b.key,
        amount: Math.round(b.amount),
    })), [data]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Revenue Analytics</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Collections, charges, and the mix that's driving them.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 w-40" />
                        <span className="text-slate-400 text-xs">to</span>
                        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 w-40" />
                        <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                            {(['DAY', 'WEEK', 'MONTH'] as Granularity[]).map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGranularity(g)}
                                    className={cn(
                                        'h-7 px-3 rounded-md text-xs font-semibold',
                                        granularity === g ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >{g}</button>
                            ))}
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
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KpiTile label="Net Collected" value={inr(data.kpis.netCollected)} sub={`${data.kpis.paymentCount} receipts · ${data.kpis.refundCount} refunds`} icon={<Banknote className="h-4 w-4" />} tone="bg-emerald-50 border-emerald-100" />
                            <KpiTile label="Charged Net" value={inr(data.kpis.chargedNet)} sub={`${data.kpis.chargeCount} charge events`} icon={<Receipt className="h-4 w-4" />} tone="bg-indigo-50 border-indigo-100" />
                            <KpiTile label="GST Collected" value={inr(data.kpis.chargedTax)} sub="Sum of CGST+SGST+IGST on charges" icon={<Sparkles className="h-4 w-4" />} tone="bg-amber-50 border-amber-100" />
                            <KpiTile label="Avg Invoice" value={inr(data.kpis.averageInvoiceNet)} sub={`${data.kpis.invoiceFinalizedCount} finalised`} icon={<Trophy className="h-4 w-4" />} />
                        </div>

                        {/* Time series */}
                        <Card>
                            <CardHeader className="pb-2 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-indigo-600" /> Collections over time · {granularity.toLowerCase()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {seriesForChart.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-10">No data in this range.</p>
                                ) : (
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <AreaChart data={seriesForChart}>
                                                <defs>
                                                    <linearGradient id="gnet" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="ggross" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inrCompact(v as number)} />
                                                <Tooltip
                                                    formatter={(v: number) => inr(v)}
                                                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Area type="monotone" dataKey="gross" name="Gross" stroke="#6366f1" strokeWidth={2} fill="url(#ggross)" />
                                                <Area type="monotone" dataKey="net"   name="Net"   stroke="#10b981" strokeWidth={2} fill="url(#gnet)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Mode + Source */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-emerald-600" /> By Payment Mode
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {modeForChart.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-10">No payments in this range.</p>
                                    ) : (
                                        <div style={{ width: '100%', height: 220 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={modeForChart}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inrCompact(v as number)} />
                                                    <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                                    <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-indigo-600" /> By Source Module
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2">
                                    {data.bySourceModule.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-10">No charges in this range.</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {data.bySourceModule.map(b => {
                                                const max = Math.max(...data.bySourceModule.map(x => x.amount), 1);
                                                const pct = (b.amount / max) * 100;
                                                return (
                                                    <div key={b.key} className="px-3 py-2.5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-semibold text-slate-700">{b.key.replace('_', ' ')}</p>
                                                            <p className="text-xs font-bold text-slate-900">{inr(b.amount)} <span className="text-[10px] text-slate-500 font-normal">· {b.count}</span></p>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Category + top services */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-slate-700" /> By Charge Category
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2">
                                    {data.byCategory.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-10">No charges in this range.</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {data.byCategory.map(b => {
                                                const max = Math.max(...data.byCategory.map(x => x.amount), 1);
                                                const pct = (b.amount / max) * 100;
                                                return (
                                                    <div key={b.key} className="px-3 py-2.5">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-xs font-semibold text-slate-700">{b.key}</p>
                                                            <p className="text-xs font-bold text-slate-900">{inr(b.amount)} <span className="text-[10px] text-slate-500 font-normal">· {b.count}</span></p>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                            <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-amber-600" /> Top Services
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {data.topServices.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-10">No charges in this range.</p>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                                <tr>
                                                    <th className="text-left px-3 py-2 font-bold">#</th>
                                                    <th className="text-left px-3 py-2 font-bold">Service</th>
                                                    <th className="text-right px-3 py-2 font-bold">Net</th>
                                                    <th className="text-right px-3 py-2 font-bold">Count</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.topServices.map((s, i) => (
                                                    <tr key={`${s.displayName}-${i}`} className="border-t border-slate-100">
                                                        <td className="px-3 py-2 text-xs text-slate-500 font-mono w-8">{i + 1}</td>
                                                        <td className="px-3 py-2">
                                                            <p className="text-xs font-semibold text-slate-900">{s.displayName}</p>
                                                            {s.categoryCode && (
                                                                <Badge variant="outline" className="mt-0.5 text-[9px] font-semibold bg-slate-50">{s.categoryCode}</Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-xs font-bold text-emerald-700">{inr(s.netAmount)}</td>
                                                        <td className="px-3 py-2 text-right text-xs text-slate-700">{s.chargeCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <p className="text-[11px] text-slate-400 text-right">
                            Window: {format(parseISO(data.fromUtc), 'd MMM HH:mm')} → {format(parseISO(data.toUtc), 'd MMM HH:mm')} UTC
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default RevenuePage;
