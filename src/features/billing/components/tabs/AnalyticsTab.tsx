import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, Line, ComposedChart,
} from 'recharts';
import {
    Calendar, RefreshCw, IndianRupee, TrendingDown, TrendingUp, Wallet,
    Sparkles, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ipdBillingService } from '../../services/ipdBillingService';
import type { BillingAnalyticsSummaryResponse, BillingAiInsightsResponse } from '../../services/ipdBillingService';
import { KpiStat } from '../KpiStat';
import { LoadingState, EmptyState, ErrorState } from '../StatePanel';
import { inr } from '../../utils/money';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

const CATEGORY_LABEL = (c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Summary sub-tab ───────────────────────────────────────────────────────────

const SummaryPanel: React.FC = () => {
    const [dateMode, setDateMode] = useState<'all' | 'day' | 'range'>('day');
    const [dayDate, setDayDate] = useState(todayIso());
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [data, setData] = useState<BillingAnalyticsSummaryResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const startDate = dateMode === 'day' ? dayDate : dateMode === 'range' ? (rangeStart || undefined) : undefined;
            const endDate = dateMode === 'day' ? dayDate : dateMode === 'range' ? (rangeEnd || undefined) : undefined;
            const res = await ipdBillingService.getAnalyticsSummary({ startDate, endDate });
            if (res?.success === false) throw new Error(res?.message ?? 'Could not load analytics');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateMode, dayDate, rangeStart, rangeEnd]);

    useEffect(() => { load(); }, [load]);

    const scopeLabel = useMemo(() => {
        if (dateMode === 'all') return 'All time';
        if (dateMode === 'range') return (rangeStart || rangeEnd) ? `${rangeStart || '…'} → ${rangeEnd || '…'}` : 'Date range';
        return dayDate === todayIso() ? 'Today' : format(new Date(dayDate), 'dd MMM yyyy');
    }, [dateMode, dayDate, rangeStart, rangeEnd]);

    const chartData = useMemo(() => (data?.dailyTrend ?? []).map(p => ({
        date: format(new Date(p.date), 'dd MMM'),
        Revenue: p.revenue,
        Expense: p.expense,
    })), [data]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full shadow-sm w-fit">
                    <Calendar className="h-3 w-3" /> {scopeLabel}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={dateMode} onValueChange={(v) => setDateMode(v as any)}>
                        <SelectTrigger className="h-9 w-[130px] rounded-xl bg-white text-xs">
                            <div className="flex items-center gap-1.5 min-w-0"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /><SelectValue /></div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="day">Single day</SelectItem>
                            <SelectItem value="range">Date range</SelectItem>
                        </SelectContent>
                    </Select>
                    {dateMode === 'day' && (
                        <Input type="date" value={dayDate} max={todayIso()} onChange={(e) => setDayDate(e.target.value)} className="h-9 w-[150px] rounded-xl bg-white text-xs" />
                    )}
                    {dateMode === 'range' && (
                        <div className="flex items-center gap-1.5">
                            <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
                            <span className="text-xs text-slate-400">to</span>
                            <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="h-9 w-[140px] rounded-xl bg-white text-xs" />
                        </div>
                    )}
                    <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl px-3" onClick={() => load(true)} disabled={refreshing || loading}>
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <LoadingState rows={5} />
            ) : error ? (
                <ErrorState message={error} onRetry={() => load(true)} />
            ) : !data || (data.revenueByCategory.length === 0 && data.expenseByCategory.length === 0) ? (
                <EmptyState title="No billing data for this range" hint="Try widening the date filter." />
            ) : (
                <div className="flex-1 overflow-auto flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        <KpiStat label="Revenue" amount={data.totalRevenue} format={inr} icon={<IndianRupee className="h-5 w-5 text-brand-600" />} tone="from-brand-50 to-brand-100/50 text-brand-900" />
                        <KpiStat label="Expense" amount={data.totalExpense} format={inr} icon={<TrendingDown className="h-5 w-5 text-rose-600" />} tone="from-rose-50 to-orange-100/50 text-rose-900" />
                        <KpiStat label="Net" amount={data.netAmount} format={inr} icon={<Wallet className="h-5 w-5 text-emerald-600" />} tone="from-emerald-50 to-teal-100/50 text-emerald-900" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Revenue by category</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.revenueByCategory.map(c => ({ name: CATEGORY_LABEL(c.categoryCode), value: c.amount }))} layout="vertical" margin={{ left: 12 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(v) => inr(v)} fontSize={11} />
                                        <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                                        <Tooltip formatter={(v: number) => inr(v)} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                            {data.revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Expense by category</p>
                            <div className="h-64">
                                {data.expenseByCategory.length === 0 ? (
                                    <EmptyState title="No expenses logged for this range" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.expenseByCategory.map(c => ({ name: CATEGORY_LABEL(c.categoryCode), value: c.amount }))} layout="vertical" margin={{ left: 12 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => inr(v)} fontSize={11} />
                                            <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                                            <Tooltip formatter={(v: number) => inr(v)} />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                                {data.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </div>

                    <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Daily trend</p>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={11} />
                                    <YAxis tickFormatter={(v) => inr(v)} fontSize={11} />
                                    <Tooltip formatter={(v: number) => inr(v)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// ─── Nexeagle AI Predictive Analysis sub-tab ──────────────────────────────────

const AiPredictivePanel: React.FC = () => {
    const [data, setData] = useState<BillingAiInsightsResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await ipdBillingService.getAiInsights();
            if (res?.success === false) throw new Error(res?.message ?? 'Could not load AI insights');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load AI insights');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // AI insights hit an external model and don't meaningfully change minute-to-minute --
    // fetch once per visit to this tab rather than on every re-render.
    useEffect(() => { load(); }, [load]);

    const chartData = useMemo(() => {
        const hist = (data?.historicalTrend ?? []).slice(-30).map(p => ({
            date: format(new Date(p.date), 'dd MMM'),
            Actual: p.revenue,
            Projected: null as number | null,
        }));
        const proj = (data?.projectedTrend ?? []).map(p => ({
            date: format(new Date(p.date), 'dd MMM'),
            Actual: null as number | null,
            Projected: p.revenue,
        }));
        return [...hist, ...proj];
    }, [data]);

    if (loading) return <LoadingState rows={5} />;
    if (error) return <ErrorState message={error} onRetry={() => load(true)} />;
    if (!data) return <EmptyState title="No AI insights available yet" hint="Bill a few visits first so there's history to learn from." />;

    return (
        <div className="h-full overflow-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-600">
                    <Sparkles className="h-4 w-4" /> Nexeagle AI Predictive Analysis
                </div>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl px-3" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            <Card className="border-0 ring-1 ring-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-brand-50">
                <p className="text-sm text-slate-700">{data.outlook}</p>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <KpiStat
                    label="Predicted 30-day revenue"
                    amount={data.predictedNext30DayRevenue}
                    format={inr}
                    hint={`${data.monthOverMonthRevenueChangePercent >= 0 ? '+' : ''}${data.monthOverMonthRevenueChangePercent}% vs prior 30 days`}
                    icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
                    tone="from-brand-50 to-brand-100/50 text-brand-900"
                />
                <KpiStat
                    label="Predicted 30-day expense"
                    amount={data.predictedNext30DayExpense}
                    format={inr}
                    hint={`${data.monthOverMonthExpenseChangePercent >= 0 ? '+' : ''}${data.monthOverMonthExpenseChangePercent}% vs prior 30 days`}
                    icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
                    tone="from-rose-50 to-orange-100/50 text-rose-900"
                />
                <KpiStat
                    label="Projected net"
                    amount={data.predictedNext30DayNet}
                    format={inr}
                    hint="Next 30 days"
                    icon={<Wallet className="h-5 w-5 text-emerald-600" />}
                    tone="from-emerald-50 to-teal-100/50 text-emerald-900"
                />
            </div>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Revenue: last 30 days + next 30 days projected</p>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={10} interval={4} />
                            <YAxis tickFormatter={(v) => inr(v)} fontSize={11} />
                            <Tooltip formatter={(v: number | null) => v == null ? '—' : inr(v)} />
                            <Legend />
                            <Line type="monotone" dataKey="Actual" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls={false} />
                            <Line type="monotone" dataKey="Projected" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Insights</p>
                <div className="flex flex-col gap-2">
                    {data.insights.map((insight, i) => {
                        const isLeakMention = data.categoryTrends.some(c => c.isLeak && insight.toLowerCase().includes(c.categoryCode.toLowerCase()));
                        return (
                            <div key={i} className={cn(
                                'flex items-start gap-2.5 rounded-xl border p-3 text-sm',
                                isLeakMention ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                            )}>
                                {isLeakMention ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" /> : <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-brand-400" />}
                                <span>{insight}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {data.categoryTrends.length > 0 && (
                <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Category trend (month-over-month)</p>
                    <div className="flex flex-col gap-1.5">
                        {data.categoryTrends.map((c) => (
                            <div key={c.categoryCode} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                <span className="font-medium text-slate-700">{CATEGORY_LABEL(c.categoryCode)}</span>
                                <span className={cn('flex items-center gap-1 font-bold tabular-nums', c.changePercent >= 0 ? 'text-emerald-600' : c.isLeak ? 'text-rose-600' : 'text-amber-600')}>
                                    {c.changePercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                    {c.changePercent >= 0 ? '+' : ''}{c.changePercent}%
                                    {c.isLeak && <AlertTriangle className="h-3.5 w-3.5 ml-1" />}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

// ─── Main tab ──────────────────────────────────────────────────────────────────

export const AnalyticsTab: React.FC = () => {
    const [subTab, setSubTab] = useState('summary');

    return (
        <div className="flex flex-col gap-3 h-full">
            <Tabs value={subTab} onValueChange={setSubTab} className="flex flex-col flex-1 min-h-0">
                <TabsList className="w-fit gap-1 p-1 rounded-xl bg-slate-100">
                    <TabsTrigger value="summary" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Summary
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Nexeagle AI Predictive Analysis
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <SummaryPanel />
                </TabsContent>
                <TabsContent value="ai" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <AiPredictivePanel />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AnalyticsTab;
