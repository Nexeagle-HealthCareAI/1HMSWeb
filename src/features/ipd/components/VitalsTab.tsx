import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Activity, RefreshCw, Loader2, AlertCircle, X, Save,
    Thermometer, HeartPulse, Wind, Droplets, Brain, Smile,
    Scale, Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    vitalsService, type VitalReading, type RecordVitalsRequest,
} from '../services/vitalsService';

// ─── Thresholds (adult IPD defaults) ─────────────────────────────────────────

const THRESHOLDS = {
    tempC: { low: 36.0, high: 38.0 },
    pulse: { low: 50, high: 120 },
    sbp: { low: 90, high: 160 },
    dbp: { low: 50, high: 100 },
    spo2: { low: 90, high: 100 },
    rr: { low: 8, high: 25 },
    painHigh: 7,
};

const toCelsius = (t?: number, unit?: string) => {
    if (t == null) return null;
    return (unit ?? 'C').toUpperCase() === 'F' ? (t - 32) * 5 / 9 : t;
};

const isAbnormal = (v: VitalReading) => {
    const tC = toCelsius(v.temperature, v.temperatureUnit);
    if (tC != null && (tC < THRESHOLDS.tempC.low || tC > THRESHOLDS.tempC.high)) return true;
    if (v.pulse != null && (v.pulse < THRESHOLDS.pulse.low || v.pulse > THRESHOLDS.pulse.high)) return true;
    if (v.systolicBP != null && (v.systolicBP < THRESHOLDS.sbp.low || v.systolicBP > THRESHOLDS.sbp.high)) return true;
    if (v.diastolicBP != null && (v.diastolicBP < THRESHOLDS.dbp.low || v.diastolicBP > THRESHOLDS.dbp.high)) return true;
    if (v.spO2 != null && v.spO2 < THRESHOLDS.spo2.low) return true;
    if (v.respiratoryRate != null && (v.respiratoryRate < THRESHOLDS.rr.low || v.respiratoryRate > THRESHOLDS.rr.high)) return true;
    if (v.painScore != null && v.painScore >= THRESHOLDS.painHigh) return true;
    return false;
};

const cellTone = (warn: boolean) => warn ? 'text-rose-700 font-bold' : 'text-slate-700';

const fmt = (v: number | undefined | null, suffix = '') =>
    v == null ? '—' : `${Math.round(v * 10) / 10}${suffix}`;

// ─── Range options ───────────────────────────────────────────────────────────

type RangeKey = '24h' | '48h' | '7d' | 'all';
const RANGE_LABELS: Record<RangeKey, string> = {
    '24h': 'Last 24h',
    '48h': 'Last 48h',
    '7d': 'Last 7 days',
    'all': 'All readings',
};

const fromIsoForRange = (r: RangeKey): string | undefined => {
    if (r === 'all') return undefined;
    const ms = r === '24h' ? 24 * 3600e3 : r === '48h' ? 48 * 3600e3 : 7 * 24 * 3600e3;
    return new Date(Date.now() - ms).toISOString();
};

// ─── Mini latest-reading tile ────────────────────────────────────────────────

const MiniTile: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    warn?: boolean;
}> = ({ icon, label, value, sub, warn }) => (
    <Card className={cn('border', warn ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white')}>
        <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className={cn('text-xl font-extrabold mt-1 truncate', warn ? 'text-rose-700' : 'text-slate-900')}>{value}</p>
                    {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
                </div>
                <div className={cn('shrink-0', warn ? 'text-rose-500' : 'text-slate-400')}>{icon}</div>
            </div>
        </CardContent>
    </Card>
);

// ─── Trend chart ─────────────────────────────────────────────────────────────

interface ChartPoint {
    ts: number;
    label: string;
    pulse?: number;
    spO2?: number;
    rr?: number;
    tempC?: number;
    sbp?: number;
    dbp?: number;
}

const VitalsTrendChart: React.FC<{ points: ChartPoint[] }> = ({ points }) => {
    if (points.length < 2) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                Need at least 2 readings in this range to draw a trend.
            </div>
        );
    }
    return (
        <div className="space-y-4">
            {/* HR / SpO2 / RR */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Heart rate · SpO₂ · Respiratory rate</p>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={points} margin={{ top: 4, right: 14, left: -8, bottom: 0 }}>
                        <CartesianGrid stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[80, 100]} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line yAxisId="left"  type="monotone" dataKey="pulse" name="HR (bpm)"   stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        <Line yAxisId="left"  type="monotone" dataKey="rr"    name="RR (/min)"  stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        <Line yAxisId="right" type="monotone" dataKey="spO2"  name="SpO₂ (%)"   stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Temp + BP */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Temperature (°C)</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[34, 42]} />
                            <Tooltip />
                            <ReferenceArea y1={36} y2={38} fill="#dcfce7" fillOpacity={0.5} />
                            <Line type="monotone" dataKey="tempC" name="Temp °C" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Blood pressure (mmHg)</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={points} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[40, 200]} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <ReferenceArea y1={90} y2={120} fill="#dcfce7" fillOpacity={0.4} />
                            <Line type="monotone" dataKey="sbp" name="Systolic"  stroke="#7c3aed" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                            <Line type="monotone" dataKey="dbp" name="Diastolic" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// ─── Quick-record sheet ──────────────────────────────────────────────────────

const QuickRecordSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    onRecorded: () => void;
}> = ({ open, onOpenChange, admissionId, onRecorded }) => {
    const { toast } = useToast();
    const [recordedAt, setRecordedAt] = useState('');
    const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
    const [form, setForm] = useState<RecordVitalsRequest>({ admissionId });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            const now = new Date();
            const pad = (n: number) => n.toString().padStart(2, '0');
            setRecordedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
            setForm({ admissionId });
            setTempUnit('C');
        }
    }, [open, admissionId]);

    const setNum = <K extends keyof RecordVitalsRequest>(k: K, raw: string) => {
        const v = raw === '' ? undefined : Number(raw);
        setForm(prev => ({ ...prev, [k]: v as RecordVitalsRequest[K] }));
    };

    const hasAny = !!(form.temperature || form.pulse || form.systolicBP || form.diastolicBP || form.respiratoryRate
        || form.spO2 || form.weightKg || form.heightCm || form.gcsEye || form.gcsVerbal || form.gcsMotor || form.painScore);

    const gcsTotal = (form.gcsEye && form.gcsVerbal && form.gcsMotor)
        ? form.gcsEye + form.gcsVerbal + form.gcsMotor : null;
    const bmi = (form.weightKg && form.heightCm && form.heightCm > 0)
        ? Math.round((form.weightKg / Math.pow(form.heightCm / 100, 2)) * 10) / 10 : null;

    const handleSubmit = async () => {
        if (!hasAny || submitting) return;
        setSubmitting(true);
        try {
            const payload: RecordVitalsRequest = {
                ...form,
                admissionId,
                recordedAt: recordedAt ? new Date(recordedAt).toISOString() : undefined,
                temperatureUnit: form.temperature != null ? tempUnit : undefined,
            };
            const res = await vitalsService.record(payload);
            if (!res.success) throw new Error(res.message ?? 'Could not record vitals');
            toast({ title: 'Vitals recorded' });
            onRecorded();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Record Vitals</SheetTitle>
                            <SheetDescription className="text-xs">All fields optional — fill what's measured.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Recorded At</Label>
                        <Input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} className="h-9 text-sm" />
                    </div>

                    {/* Cardiopulmonary */}
                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cardiopulmonary</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs"><Thermometer className="h-3 w-3 inline mr-1 text-amber-600" />Temperature</Label>
                                <div className="flex gap-1.5 mt-1">
                                    <Input type="number" step="0.1" placeholder="e.g. 37.2" value={form.temperature ?? ''} onChange={e => setNum('temperature', e.target.value)} className="h-9 text-sm flex-1" />
                                    <Select value={tempUnit} onValueChange={v => setTempUnit(v as 'C' | 'F')}>
                                        <SelectTrigger className="w-16 h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="C">°C</SelectItem>
                                            <SelectItem value="F">°F</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs"><HeartPulse className="h-3 w-3 inline mr-1 text-rose-600" />Pulse (bpm)</Label>
                                <Input type="number" placeholder="e.g. 82" value={form.pulse ?? ''} onChange={e => setNum('pulse', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs">Blood Pressure (mmHg)</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input type="number" placeholder="Systolic" value={form.systolicBP ?? ''} onChange={e => setNum('systolicBP', e.target.value)} className="h-9 text-sm" />
                                    <span className="text-slate-400">/</span>
                                    <Input type="number" placeholder="Diastolic" value={form.diastolicBP ?? ''} onChange={e => setNum('diastolicBP', e.target.value)} className="h-9 text-sm" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs"><Wind className="h-3 w-3 inline mr-1 text-sky-600" />Resp. Rate</Label>
                                <Input type="number" placeholder="/min" value={form.respiratoryRate ?? ''} onChange={e => setNum('respiratoryRate', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs"><Droplets className="h-3 w-3 inline mr-1 text-emerald-600" />SpO₂ (%)</Label>
                                <Input type="number" step="0.1" placeholder="e.g. 98" value={form.spO2 ?? ''} onChange={e => setNum('spO2', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Anthropometrics */}
                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Anthropometrics</p>
                            {bmi != null && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                    BMI {bmi}
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs"><Scale className="h-3 w-3 inline mr-1 text-slate-600" />Weight (kg)</Label>
                                <Input type="number" step="0.1" value={form.weightKg ?? ''} onChange={e => setNum('weightKg', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs"><Ruler className="h-3 w-3 inline mr-1 text-slate-600" />Height (cm)</Label>
                                <Input type="number" step="0.1" value={form.heightCm ?? ''} onChange={e => setNum('heightCm', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Neuro + Pain */}
                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <Brain className="h-3 w-3 inline mr-1 text-purple-600" /> GCS · Pain
                            </p>
                            {gcsTotal != null && (
                                <Badge variant="outline" className={cn(
                                    'text-[10px]',
                                    gcsTotal <= 8 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    gcsTotal <= 12 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                )}>
                                    GCS {gcsTotal}/15
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            <div>
                                <Label className="text-[10px]">Eye (1-4)</Label>
                                <Input type="number" min={1} max={4} value={form.gcsEye ?? ''} onChange={e => setNum('gcsEye', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-[10px]">Verbal (1-5)</Label>
                                <Input type="number" min={1} max={5} value={form.gcsVerbal ?? ''} onChange={e => setNum('gcsVerbal', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-[10px]">Motor (1-6)</Label>
                                <Input type="number" min={1} max={6} value={form.gcsMotor ?? ''} onChange={e => setNum('gcsMotor', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-[10px]"><Smile className="h-3 w-3 inline mr-1" />Pain (0-10)</Label>
                                <Input type="number" min={0} max={10} value={form.painScore ?? ''} onChange={e => setNum('painScore', e.target.value)} className="h-9 text-sm mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any observations or context…" rows={2} className="text-sm" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1 text-[11px] text-slate-400 text-right">
                        {!hasAny && 'Fill at least one vital'}
                    </div>
                    <Button onClick={handleSubmit} disabled={!hasAny || submitting} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main tab ────────────────────────────────────────────────────────────────

interface VitalsTabProps {
    admissionId: string;
    isActive: boolean;
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ admissionId, isActive }) => {
    const [readings, setReadings] = useState<VitalReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [range, setRange] = useState<RangeKey>('24h');
    const [recordOpen, setRecordOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await vitalsService.list(admissionId, { fromUtc: fromIsoForRange(range) });
            if (!res.success) throw new Error(res.message ?? 'Failed to load vitals');
            setReadings(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load vitals');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadedOnce(true);
        }
    }, [admissionId, range]);

    useEffect(() => {
        if (isActive) load();
    }, [isActive, range, load]);

    const latest = readings[0];
    const latestWarn = latest ? isAbnormal(latest) : false;

    const chartPoints: ChartPoint[] = useMemo(() => {
        // ascending for chart
        return [...readings].sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt))
            .map(r => ({
                ts: +new Date(r.recordedAt),
                label: format(new Date(r.recordedAt), 'dd MMM HH:mm'),
                pulse: r.pulse,
                spO2: r.spO2,
                rr: r.respiratoryRate,
                tempC: toCelsius(r.temperature, r.temperatureUnit) ?? undefined,
                sbp: r.systolicBP,
                dbp: r.diastolicBP,
            }));
    }, [readings]);

    return (
        <div className="space-y-4 pt-4">

            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600" /> Vitals
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Continuous monitoring. Abnormal values highlighted in red.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={range} onValueChange={v => setRange(v as RangeKey)}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
                                <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setRecordOpen(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700 gap-1">
                        <Plus className="h-4 w-4" /> Record
                    </Button>
                </div>
            </div>

            {/* Latest snapshot */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {latest ? `Latest reading · ${format(new Date(latest.recordedAt), 'dd MMM HH:mm')}${latest.recordedBy ? ' · by ' + latest.recordedBy : ''}` : 'Latest reading'}
                </p>
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
                    </div>
                ) : !latest ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-3">
                        <div className="h-12 w-12 mx-auto bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Activity className="h-6 w-6 text-emerald-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No vitals recorded yet</p>
                        <Button size="sm" onClick={() => setRecordOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-1" /> Record the first reading
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <MiniTile
                            icon={<Thermometer className="h-5 w-5" />}
                            label="Temp"
                            value={fmt(latest.temperature, latest.temperature != null ? `°${(latest.temperatureUnit ?? 'C').toUpperCase()}` : '')}
                            warn={(() => { const tC = toCelsius(latest.temperature, latest.temperatureUnit); return tC != null && (tC < THRESHOLDS.tempC.low || tC > THRESHOLDS.tempC.high); })()}
                        />
                        <MiniTile
                            icon={<HeartPulse className="h-5 w-5" />}
                            label="HR"
                            value={latest.pulse != null ? `${latest.pulse} bpm` : '—'}
                            warn={latest.pulse != null && (latest.pulse < THRESHOLDS.pulse.low || latest.pulse > THRESHOLDS.pulse.high)}
                        />
                        <MiniTile
                            icon={<Activity className="h-5 w-5" />}
                            label="BP"
                            value={latest.systolicBP != null && latest.diastolicBP != null ? `${latest.systolicBP}/${latest.diastolicBP}` : '—'}
                            sub="mmHg"
                            warn={(latest.systolicBP != null && (latest.systolicBP < THRESHOLDS.sbp.low || latest.systolicBP > THRESHOLDS.sbp.high))
                               || (latest.diastolicBP != null && (latest.diastolicBP < THRESHOLDS.dbp.low || latest.diastolicBP > THRESHOLDS.dbp.high))}
                        />
                        <MiniTile
                            icon={<Droplets className="h-5 w-5" />}
                            label="SpO₂"
                            value={latest.spO2 != null ? `${Math.round(latest.spO2 * 10) / 10}%` : '—'}
                            warn={latest.spO2 != null && latest.spO2 < THRESHOLDS.spo2.low}
                        />
                        <MiniTile
                            icon={<Wind className="h-5 w-5" />}
                            label="RR"
                            value={latest.respiratoryRate != null ? `${latest.respiratoryRate}` : '—'}
                            sub="/min"
                            warn={latest.respiratoryRate != null && (latest.respiratoryRate < THRESHOLDS.rr.low || latest.respiratoryRate > THRESHOLDS.rr.high)}
                        />
                        <MiniTile
                            icon={<Brain className="h-5 w-5" />}
                            label="GCS"
                            value={latest.gcsTotal != null ? `${latest.gcsTotal}/15` : '—'}
                            sub={latest.painScore != null ? `Pain ${latest.painScore}/10` : undefined}
                            warn={(latest.gcsTotal != null && latest.gcsTotal <= 12)
                               || (latest.painScore != null && latest.painScore >= THRESHOLDS.painHigh)}
                        />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && !loading && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load vitals</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
                </div>
            )}

            {/* Trend chart */}
            {!loading && readings.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Trend · {RANGE_LABELS[range]}</p>
                    <VitalsTrendChart points={chartPoints} />
                </div>
            )}

            {/* History table */}
            {!loading && readings.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">History ({readings.length})</p>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Time</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">Temp</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">HR</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">BP</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">SpO₂</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">RR</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right hidden md:table-cell">GCS</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right hidden md:table-cell">Pain</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden lg:table-cell">By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {readings.map(r => {
                                    const warn = isAbnormal(r);
                                    const tC = toCelsius(r.temperature, r.temperatureUnit);
                                    return (
                                        <TableRow key={r.vitalReadingId} className={cn(warn && 'bg-rose-50/40')}>
                                            <TableCell className="py-2 text-xs text-slate-600">
                                                {format(new Date(r.recordedAt), 'dd MMM HH:mm')}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs', cellTone(tC != null && (tC < THRESHOLDS.tempC.low || tC > THRESHOLDS.tempC.high)))}>
                                                {r.temperature != null ? `${r.temperature}°${(r.temperatureUnit ?? 'C').toUpperCase()}` : '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs', cellTone(r.pulse != null && (r.pulse < THRESHOLDS.pulse.low || r.pulse > THRESHOLDS.pulse.high)))}>
                                                {r.pulse ?? '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs', cellTone(
                                                (r.systolicBP != null && (r.systolicBP < THRESHOLDS.sbp.low || r.systolicBP > THRESHOLDS.sbp.high))
                                                || (r.diastolicBP != null && (r.diastolicBP < THRESHOLDS.dbp.low || r.diastolicBP > THRESHOLDS.dbp.high))
                                            ))}>
                                                {r.systolicBP != null && r.diastolicBP != null ? `${r.systolicBP}/${r.diastolicBP}` : '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs', cellTone(r.spO2 != null && r.spO2 < THRESHOLDS.spo2.low))}>
                                                {r.spO2 != null ? `${Math.round(r.spO2 * 10) / 10}%` : '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs', cellTone(r.respiratoryRate != null && (r.respiratoryRate < THRESHOLDS.rr.low || r.respiratoryRate > THRESHOLDS.rr.high)))}>
                                                {r.respiratoryRate ?? '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs hidden md:table-cell', cellTone(r.gcsTotal != null && r.gcsTotal <= 12))}>
                                                {r.gcsTotal != null ? `${r.gcsTotal}/15` : '—'}
                                            </TableCell>
                                            <TableCell className={cn('py-2 text-right text-xs hidden md:table-cell', cellTone(r.painScore != null && r.painScore >= THRESHOLDS.painHigh))}>
                                                {r.painScore ?? '—'}
                                            </TableCell>
                                            <TableCell className="py-2 text-[11px] text-slate-400 hidden lg:table-cell truncate max-w-[120px]">
                                                {r.recordedBy ?? '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <QuickRecordSheet
                open={recordOpen}
                onOpenChange={setRecordOpen}
                admissionId={admissionId}
                onRecorded={() => load(true)}
            />
        </div>
    );
};

export default VitalsTab;
