import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import {
    RefreshCw, Users, CalendarClock, Sparkles, TrendingUp, ArrowUpRight, ArrowDownRight, Flame, Stethoscope, AlertTriangle, CalendarDays, UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fetchPatientVolumeForecast, type PatientVolumeForecastResponse, type DoctorLoadForecastItem } from '../services/patientVolumeForecastApi';
import { KpiStat } from '@/features/billing/components/KpiStat';
import { LoadingState, EmptyState, ErrorState } from '@/features/billing/components/StatePanel';

const count = (n: number) => Math.round(n).toLocaleString();

type Horizon = 'tomorrow' | 'week' | 'month';

const HORIZONS: { key: Horizon; label: string }[] = [
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
];

interface Props {
    hospitalId: string;
}

export const PatientVolumeForecastPanel: React.FC<Props> = ({ hospitalId }) => {
    const [data, setData] = useState<PatientVolumeForecastResponse['data'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Defaults to "week" -- the most useful horizon for a clinic planning the next few days,
    // versus tomorrow (too narrow for staffing decisions) or the month (too far out to act on daily).
    const [horizon, setHorizon] = useState<Horizon>('week');

    const load = useCallback(async (silent = false) => {
        if (!hospitalId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await fetchPatientVolumeForecast(hospitalId);
            if (res?.success === false) throw new Error(res?.message ?? 'Could not load the patient volume forecast');
            setData(res.data ?? null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load the patient volume forecast');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hospitalId]);

    // AI insights hit an external model and don't meaningfully change minute-to-minute --
    // fetch once per mount rather than on every dashboard re-render.
    useEffect(() => { load(); }, [load]);

    const chartData = useMemo(() => {
        const hist = (data?.historicalTrend ?? []).slice(-30).map(p => ({
            date: format(new Date(p.date), 'dd MMM'),
            Actual: p.totalAppointments,
            Projected: null as number | null,
        }));
        const proj = (data?.projectedTrend ?? []).map(p => ({
            date: format(new Date(p.date), 'dd MMM'),
            Actual: null as number | null,
            Projected: p.totalAppointments,
        }));
        return [...hist, ...proj];
    }, [data]);

    const busiestDay = useMemo(() => {
        if (!data?.projectedTrend?.length) return null;
        return data.projectedTrend.reduce((a, b) => (b.totalAppointments > a.totalAppointments ? b : a));
    }, [data]);

    // Sub-sums of the same day-by-day projection the chart already uses -- picking a horizon just
    // changes which pre-computed number the tiles/doctor list read, nothing is recomputed client-side.
    const horizonStats = useMemo(() => {
        if (!data) return null;
        if (horizon === 'tomorrow') {
            return { appointments: data.predictedTomorrowAppointments, uniquePatients: data.predictedTomorrowUniquePatients, expectedAttending: data.expectedAttendingTomorrow };
        }
        if (horizon === 'week') {
            return { appointments: data.predictedNext7DayAppointments, uniquePatients: data.predictedNext7DayUniquePatients, expectedAttending: data.expectedAttendingNext7Days };
        }
        return { appointments: data.predictedNext30DayAppointments, uniquePatients: data.predictedNext30DayUniquePatients, expectedAttending: data.expectedAttendingNext30Days };
    }, [data, horizon]);

    const doctorAppointmentsForHorizon = (d: DoctorLoadForecastItem) =>
        horizon === 'tomorrow' ? d.predictedTomorrowAppointments : horizon === 'week' ? d.predictedNext7DayAppointments : d.predictedNext30DayAppointments;

    if (loading) return <LoadingState rows={5} />;
    if (error) return <ErrorState message={error} onRetry={() => load(true)} />;
    if (!data || !horizonStats) return <EmptyState title="No forecast available yet" hint="Book a few appointments first so there's history to learn from." />;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-600">
                    <Sparkles className="h-4 w-4" /> Nexeagle AI Predictive Analysis — Patient Volume Forecast
                </div>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs rounded-xl px-3" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
                {HORIZONS.map((h) => (
                    <button
                        key={h.key}
                        onClick={() => setHorizon(h.key)}
                        className={cn(
                            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                            horizon === h.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        {h.label}
                    </button>
                ))}
            </div>

            <Card className="border-0 ring-1 ring-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-brand-50">
                <p className="text-sm text-slate-700">{data.outlook}</p>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <KpiStat
                    label={`Predicted appointments (${HORIZONS.find(h => h.key === horizon)?.label.toLowerCase()})`}
                    amount={horizonStats.appointments}
                    format={count}
                    hint={`${data.monthOverMonthAppointmentChangePercent >= 0 ? '+' : ''}${data.monthOverMonthAppointmentChangePercent}% vs prior 30 days`}
                    icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
                    tone="from-brand-50 to-brand-100/50 text-brand-900"
                />
                <KpiStat
                    label={`Predicted unique patients (${HORIZONS.find(h => h.key === horizon)?.label.toLowerCase()})`}
                    amount={horizonStats.uniquePatients}
                    format={count}
                    hint={`${data.monthOverMonthUniquePatientChangePercent >= 0 ? '+' : ''}${data.monthOverMonthUniquePatientChangePercent}% vs prior 30 days`}
                    icon={<Users className="h-5 w-5 text-emerald-600" />}
                    tone="from-emerald-50 to-teal-100/50 text-emerald-900"
                />
                <KpiStat
                    label="Expected attending"
                    amount={horizonStats.expectedAttending}
                    format={count}
                    hint={`~${Math.round(data.noShowRate * 100)}% historical no-show rate`}
                    icon={<UserCheck className="h-5 w-5 text-teal-600" />}
                    tone="from-teal-50 to-cyan-100/50 text-teal-900"
                />
                <KpiStat
                    label="Busiest predicted day"
                    value={busiestDay ? format(new Date(busiestDay.date), 'EEE, dd MMM') : '--'}
                    hint={busiestDay ? `${count(busiestDay.totalAppointments)} appointments expected (next 30 days)` : undefined}
                    icon={<CalendarClock className="h-5 w-5 text-amber-600" />}
                    tone="from-amber-50 to-orange-100/50 text-amber-900"
                />
            </div>

            <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Appointments: last 30 days + next 30 days projected</p>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={10} interval={4} />
                            <YAxis fontSize={11} allowDecimals={false} />
                            <Tooltip formatter={(v: number | null) => v == null ? '—' : count(v)} />
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
                        const isSurgeMention = data.specialtyTrends.some(s => s.isSurging && insight.toLowerCase().includes(s.specialtyName.toLowerCase()));
                        return (
                            <div key={i} className={cn(
                                'flex items-start gap-2.5 rounded-xl border p-3 text-sm',
                                isSurgeMention ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                            )}>
                                {isSurgeMention ? <Flame className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" /> : <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-brand-400" />}
                                <span>{insight}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {data.specialtyTrends.length > 0 && (
                <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Specialty trend (month-over-month)</p>
                    <div className="flex flex-col gap-1.5">
                        {data.specialtyTrends.map((s) => (
                            <div key={s.specialtyName} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                <span className="font-medium text-slate-700">{s.specialtyName}</span>
                                <span className={cn('flex items-center gap-1 font-bold tabular-nums', s.isSurging ? 'text-amber-600' : s.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                    {s.changePercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent}%
                                    {s.isSurging && <Flame className="h-3.5 w-3.5 ml-1" />}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {data.doctorLoadForecast.length > 0 && (
                <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                        Doctor load forecast ({HORIZONS.find(h => h.key === horizon)?.label.toLowerCase()})
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {data.doctorLoadForecast.map((d) => (
                            <div key={d.doctorId} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <Stethoscope className="h-3.5 w-3.5 text-slate-400" /> {d.doctorName}
                                </span>
                                <span className={cn('flex items-center gap-1 font-bold tabular-nums', d.isOverloaded ? 'text-amber-600' : 'text-slate-600')}>
                                    {count(doctorAppointmentsForHorizon(d))} appointments
                                    {d.isOverloaded && (
                                        <span title="Predicted next 30 days is well above this doctor's typical month">
                                            <Flame className="h-3.5 w-3.5 ml-1" />
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {data.anomalies.length > 0 && (
                <Card className="border-0 ring-1 ring-rose-200 rounded-2xl p-4 bg-rose-50/40">
                    <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-3">This week vs. normal</p>
                    <div className="flex flex-col gap-1.5">
                        {data.anomalies.map((a) => (
                            <div key={a.metricName} className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white p-3 text-sm">
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />
                                <span className="text-slate-700">
                                    <span className="font-semibold">{a.metricName}</span> is {a.direction === 'UP' ? 'unusually high' : 'unusually low'} this
                                    week at <span className="font-bold tabular-nums">{a.recentValue}</span> vs. a typical <span className="font-bold tabular-nums">{a.baselineMean}</span> ({Math.abs(a.zScore)}σ from normal).
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {data.monthlySeasonalFactors.some(m => m.isNotable) && (
                <Card className="border-0 ring-1 ring-black/5 rounded-2xl p-4 bg-white shadow-lg shadow-brand-500/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Seasonal pattern by month (from full history)</p>
                    <div className="flex flex-col gap-1.5">
                        {data.monthlySeasonalFactors.filter(m => m.isNotable).map((m) => (
                            <div key={m.month} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {m.monthName}
                                </span>
                                <span className={cn('flex items-center gap-1 font-bold tabular-nums', m.index > 1 ? 'text-emerald-600' : 'text-rose-600')}>
                                    {m.index > 1 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                    {m.index > 1 ? '+' : ''}{Math.round((m.index - 1) * 100)}% vs. average
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PatientVolumeForecastPanel;
