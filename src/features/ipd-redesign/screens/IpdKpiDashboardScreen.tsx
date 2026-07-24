import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gauge, Loader2, BedDouble, Clock, Repeat, ArrowLeftRight } from 'lucide-react';
import { ipdKpiApi, type IpdKpiDashboard } from '../services/ipdKpiApi';
import { useAppStore } from '@/store/appStore';

interface Props {
    onBack: () => void;
}

type RangePreset = '7' | '30' | '90' | 'custom';

const toDateKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const todayKey = () => toDateKey(new Date());
const daysAgoKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toDateKey(d); };

const SERIES_BLUE = '#6366f1';
const GRID = 'rgba(161, 161, 170, 0.15)';
const AXIS_INK = '#71717a';

const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-zinc-950/95 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-lg backdrop-blur-md">
                <p className="text-[9px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xs font-black text-slate-900 dark:text-zinc-50">
                    {payload[0].name}: <span className="font-mono text-brand-600 dark:text-brand-400">{payload[0].value}{suffix}</span>
                </p>
            </div>
        );
    }
    return null;
};

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'brand' | 'sky' | 'rose' | 'amber' | 'emerald' }> = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
    const { isLowBandwidthMode } = useAppStore();
    const colors = {
        brand: 'from-brand-500/5 to-brand-600/5 dark:from-brand-950/10 dark:to-brand-900/5 border-brand-100/60 dark:border-brand-900/40 text-brand-600 dark:text-brand-400',
        sky: 'from-sky-500/5 to-sky-600/5 dark:from-sky-950/10 dark:to-sky-900/5 border-sky-100/60 dark:border-sky-900/40 text-sky-600 dark:text-sky-400',
        rose: 'from-rose-500/5 to-rose-600/5 dark:from-rose-950/10 dark:to-rose-900/5 border-rose-100/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400',
        amber: 'from-amber-500/5 to-amber-600/5 dark:from-amber-950/10 dark:to-amber-900/5 border-amber-100/60 dark:border-amber-900/40 text-amber-600 dark:text-amber-400',
        emerald: 'from-emerald-500/5 to-emerald-600/5 dark:from-emerald-950/10 dark:to-emerald-900/5 border-emerald-100/60 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400'
    }[tone];

    return (
        <div className={cn(
            'rounded-2xl border p-5 min-w-[145px] sm:min-w-0 snap-start shrink-0 flex flex-col justify-between min-h-[110px] bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
            colors,
            !isLowBandwidthMode ? 'shadow-sm hover:shadow-md' : 'bg-white'
        )}>
            <div>
                <p className="text-3xl font-black text-slate-900 dark:text-zinc-50 leading-none font-mono">{value}</p>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-450 dark:text-zinc-450 uppercase tracking-wider mt-2.5">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                </div>
            </div>
            {sub && <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 bg-slate-100/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md w-fit font-mono">{sub}</p>}
        </div>
    );
};

/**
 * IPD operations KPI dashboard — hospital-wide, not per-patient, mirrors BedBoardScreen/
 * CssdBoardScreen's standalone-screen shape. 5 metrics: BOR, ALOS, bed turnaround, discharge TAT,
 * readmission rate — see GetIpdKpiDashboardHandler/IpdKpiCalculator for exact definitions.
 */
export const IpdKpiDashboardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const { isLowBandwidthMode } = useAppStore();
    const [preset, setPreset] = useState<RangePreset>('30');
    const [fromDate, setFromDate] = useState(daysAgoKey(30));
    const [toDate, setToDate] = useState(todayKey());
    const [data, setData] = useState<IpdKpiDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    const applyPreset = (p: RangePreset) => {
        setPreset(p);
        if (p !== 'custom') {
            setFromDate(daysAgoKey(Number(p)));
            setToDate(todayKey());
        }
    };

    const load = () => {
        setLoading(true);
        ipdKpiApi.getDashboard(fromDate, toDate)
            .then(setData)
            .catch(() => toast({ title: 'Could not load KPI dashboard', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const borChartData = (data?.borTrend ?? []).map(p => ({ day: p.day.slice(5, 10), bor: p.borPercent }));
    const alosChartData = (data?.alosTrend ?? []).map(p => ({ week: p.weekStart.slice(5, 10), days: p.avgDays }));

    return (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-10">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-full border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-805" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                    <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/30 flex items-center justify-center shadow-inner shrink-0">
                        <Gauge className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-zinc-50 leading-tight">IPD KPI Dashboard</h1>
                        <p className="text-xs text-slate-500 hidden sm:block">Occupancy, length of stay, bed turnaround, discharge TAT, readmissions.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-zinc-950 backdrop-blur-sm w-full sm:w-auto overflow-x-auto hide-scrollbar border border-slate-200/40 dark:border-zinc-800">
                        {(['7', '30', '90'] as const).map(p => (
                            <button key={p} type="button" onClick={() => applyPreset(p)}
                                className={cn('h-10 sm:h-8 min-w-[60px] sm:min-w-[44px] px-4 rounded-full text-sm sm:text-xs font-black transition-all shrink-0', preset === p ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-250')}>
                                {p}d
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={fromDate} onChange={e => { setPreset('custom'); setFromDate(e.target.value); }} className="h-11 sm:h-9 flex-1 min-w-0 sm:w-36 sm:flex-none rounded-xl bg-white/80 backdrop-blur-sm border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 focus-visible:ring-brand-500/25 focus-visible:ring-2 focus-visible:border-brand-500 transition-all" />
                        <span className="text-slate-400 text-sm shrink-0">to</span>
                        <Input type="date" value={toDate} onChange={e => { setPreset('custom'); setToDate(e.target.value); }} className="h-11 sm:h-9 flex-1 min-w-0 sm:w-36 sm:flex-none rounded-xl bg-white/80 backdrop-blur-sm border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 focus-visible:ring-brand-500/25 focus-visible:ring-2 focus-visible:border-brand-500 transition-all" />
                    </div>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : data && (
                <>
                    <div className="flex sm:grid sm:grid-cols-5 overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0">
                        <StatTile icon={BedDouble} label="Current BOR" value={`${data.currentBorPercent}%`} tone="brand" />
                        <StatTile icon={Clock} label="ALOS" value={`${data.alosDays}d`} tone="sky" />
                        <StatTile icon={ArrowLeftRight} label="Bed Turnaround" value={`${data.avgBedTurnaroundHours}h`} tone="emerald" />
                        <StatTile icon={Clock} label="Discharge TAT" value={`${data.avgDischargeTatHours}h`} sub={`n=${data.dischargeTatSampleSize}`} tone="amber" />
                        <StatTile icon={Repeat} label="Readmission Rate" value={`${data.readmissionRatePercent}%`} sub={`${data.readmittedCount}/${data.totalIndexDischarges}`} tone="rose" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-2">
                        <div className={cn("rounded-2xl border border-zinc-200/60 dark:border-zinc-800 p-3 sm:p-4 shadow-sm", !isLowBandwidthMode ? 'bg-white/90 dark:bg-zinc-900 backdrop-blur-md' : 'bg-white')}>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Bed Occupancy Rate — daily</p>
                            {isLowBandwidthMode ? (
                                <div className="h-[220px] flex flex-col items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <Gauge className="h-8 w-8 mb-2 opacity-20" />
                                    <span>Chart disabled in Data Saver mode</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={borChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                        <CartesianGrid stroke={GRID} vertical={false} />
                                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={20} />
                                        <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip suffix="%" />} />
                                        <Line type="monotone" dataKey="bor" stroke={SERIES_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className={cn("rounded-2xl border border-zinc-200/60 dark:border-zinc-800 p-3 sm:p-4 shadow-sm", !isLowBandwidthMode ? 'bg-white/90 dark:bg-zinc-900 backdrop-blur-md' : 'bg-white')}>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Average Length of Stay — weekly</p>
                            {alosChartData.length === 0 ? (
                                <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Not enough discharges in this range yet.</div>
                            ) : isLowBandwidthMode ? (
                                <div className="h-[220px] flex flex-col items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                                    <span>Chart disabled in Data Saver mode</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={alosChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                        <CartesianGrid stroke={GRID} vertical={false} />
                                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={20} />
                                        <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={34} />
                                        <Tooltip content={<CustomTooltip suffix="d" />} />
                                        <Line type="monotone" dataKey="days" stroke={SERIES_BLUE} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
