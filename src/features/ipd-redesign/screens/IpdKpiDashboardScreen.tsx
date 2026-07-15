import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Gauge, Loader2, BedDouble, Clock, Repeat, ArrowLeftRight } from 'lucide-react';
import { ipdKpiApi, type IpdKpiDashboard } from '../services/ipdKpiApi';

interface Props {
    onBack: () => void;
}

type RangePreset = '7' | '30' | '90' | 'custom';

const SERIES_BLUE = '#2a78d6';
const GRID = '#e1e0d9';
const AXIS_INK = '#898781';
const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e1e0d9' };

const toDateKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const todayKey = () => toDateKey(new Date());
const daysAgoKey = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toDateKey(d); };

const StatTile: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string }> = ({ icon: Icon, label, value, sub }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-500">
            <Icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{label}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
);

/**
 * IPD operations KPI dashboard — hospital-wide, not per-patient, mirrors BedBoardScreen/
 * CssdBoardScreen's standalone-screen shape. 5 metrics: BOR, ALOS, bed turnaround, discharge TAT,
 * readmission rate — see GetIpdKpiDashboardHandler/IpdKpiCalculator for exact definitions.
 */
export const IpdKpiDashboardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
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
                    <Button variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 shrink-0" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Dashboard</span>
                    </Button>
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow shrink-0">
                        <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">IPD KPI Dashboard</h1>
                        <p className="text-xs text-slate-500 hidden sm:block">Occupancy, length of stay, bed turnaround, discharge TAT, readmissions.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 w-full sm:w-auto">
                        {(['7', '30', '90'] as const).map(p => (
                            <button key={p} type="button" onClick={() => applyPreset(p)}
                                className={cn('h-9 sm:h-8 flex-1 sm:flex-none px-3 rounded-lg text-xs font-bold transition-all', preset === p ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                {p}d
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={fromDate} onChange={e => { setPreset('custom'); setFromDate(e.target.value); }} className="h-10 sm:h-9 flex-1 min-w-0 sm:w-36 sm:flex-none rounded-xl" />
                        <span className="text-slate-400 text-sm shrink-0">to</span>
                        <Input type="date" value={toDate} onChange={e => { setPreset('custom'); setToDate(e.target.value); }} className="h-10 sm:h-9 flex-1 min-w-0 sm:w-36 sm:flex-none rounded-xl" />
                    </div>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : data && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        <StatTile icon={BedDouble} label="Current BOR" value={`${data.currentBorPercent}%`} />
                        <StatTile icon={Clock} label="ALOS" value={`${data.alosDays}d`} />
                        <StatTile icon={ArrowLeftRight} label="Bed Turnaround" value={`${data.avgBedTurnaroundHours}h`} />
                        <StatTile icon={Clock} label="Discharge TAT" value={`${data.avgDischargeTatHours}h`} sub={`n=${data.dischargeTatSampleSize}`} />
                        <StatTile icon={Repeat} label="Readmission Rate" value={`${data.readmissionRatePercent}%`} sub={`${data.readmittedCount}/${data.totalIndexDischarges}`} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                            <p className="text-[11px] font-bold text-slate-600 mb-2">Bed Occupancy Rate — daily</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={borChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                    <CartesianGrid stroke={GRID} vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={20} />
                                    <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={34} domain={[0, 100]} />
                                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 700, color: '#0b0b0b' }} formatter={(v: number) => [`${v}%`, 'BOR']} />
                                    <Line type="monotone" dataKey="bor" stroke={SERIES_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
                            <p className="text-[11px] font-bold text-slate-600 mb-2">Average Length of Stay — weekly</p>
                            {alosChartData.length === 0 ? (
                                <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">Not enough discharges in this range yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={alosChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                                        <CartesianGrid stroke={GRID} vertical={false} />
                                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={20} />
                                        <YAxis tick={{ fontSize: 10, fill: AXIS_INK }} axisLine={false} tickLine={false} width={34} />
                                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 700, color: '#0b0b0b' }} formatter={(v: number) => [`${v}d`, 'ALOS']} />
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
