import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Droplets, TrendingUp, TrendingDown, Plus, RefreshCw, Loader2, AlertCircle,
    Activity, X, Save, ArrowUp, ArrowDown, Syringe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, BarChart, Bar, Legend,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, startOfDay } from 'date-fns';
import {
    monitoringService,
    type FluidEntry, type FluidTotals, type RecordFluidEntryRequest,
    type GlucoseReading, type GlucoseStats, type RecordGlucoseRequest,
    type GlucoseUnit, type GlucoseMethod, type GlucoseMealTag, type InsulinRoute,
} from '../services/monitoringService';
import { RiskScoresView } from './RiskScoresView';

// ─── Range selector (shared) ─────────────────────────────────────────────────

type RangeKey = '24h' | '48h' | '7d' | 'all';
const RANGE_LABELS: Record<RangeKey, string> = {
    '24h': 'Last 24h',
    '48h': 'Last 48h',
    '7d': 'Last 7 days',
    'all': 'All entries',
};
const fromIsoForRange = (r: RangeKey): string | undefined => {
    if (r === 'all') return undefined;
    const ms = r === '24h' ? 24 * 3600e3 : r === '48h' ? 48 * 3600e3 : 7 * 24 * 3600e3;
    return new Date(Date.now() - ms).toISOString();
};

// ─── Stat tile ───────────────────────────────────────────────────────────────

const StatTile: React.FC<{
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    tone?: 'neutral' | 'emerald' | 'amber' | 'rose' | 'blue';
}> = ({ label, value, sub, icon, tone = 'neutral' }) => {
    const tones = {
        neutral: 'bg-white border-slate-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        amber: 'bg-amber-50 border-amber-200',
        rose: 'bg-rose-50 border-rose-200',
        blue: 'bg-blue-50 border-blue-200',
    } as const;
    return (
        <Card className={cn('border', tones[tone])}>
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-1 truncate">{value}</p>
                        {sub && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</p>}
                    </div>
                    <div className="text-slate-400 shrink-0">{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
};

// ─── Fluid Sub-view ──────────────────────────────────────────────────────────

const FLUID_IN_SUBTYPES = ['IV_FLUID', 'ORAL', 'NG_FEED', 'BLOOD_PRODUCT', 'OTHER'] as const;
const FLUID_OUT_SUBTYPES = ['URINE', 'DRAIN', 'STOMA', 'VOMIT', 'NG_ASPIRATE', 'STOOL', 'OTHER'] as const;

const FLUID_LABEL: Record<string, string> = {
    IV_FLUID: 'IV Fluid',
    ORAL: 'Oral',
    NG_FEED: 'NG Feed',
    BLOOD_PRODUCT: 'Blood Product',
    URINE: 'Urine',
    DRAIN: 'Drain',
    STOMA: 'Stoma',
    VOMIT: 'Vomit',
    NG_ASPIRATE: 'NG Aspirate',
    STOOL: 'Stool',
    OTHER: 'Other',
};

const RecordFluidSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    onRecorded: () => void;
}> = ({ open, onOpenChange, admissionId, onRecorded }) => {
    const { toast } = useToast();
    const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
    const [subtype, setSubtype] = useState<string>('IV_FLUID');
    const [volume, setVolume] = useState<string>('');
    const [description, setDescription] = useState('');
    const [routeOrSite, setRouteOrSite] = useState('');
    const [colour, setColour] = useState('');
    const [notes, setNotes] = useState('');
    const [recordedAt, setRecordedAt] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setDirection('IN');
        setSubtype('IV_FLUID');
        setVolume('');
        setDescription('');
        setRouteOrSite('');
        setColour('');
        setNotes('');
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        setRecordedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }, [open]);

    // When direction flips, default to a sensible subtype.
    useEffect(() => {
        setSubtype(direction === 'IN' ? 'IV_FLUID' : 'URINE');
    }, [direction]);

    const subtypes = direction === 'IN' ? FLUID_IN_SUBTYPES : FLUID_OUT_SUBTYPES;
    const volNum = Number(volume);
    const canSubmit = !submitting && volNum > 0 && volNum <= 20000;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const payload: RecordFluidEntryRequest = {
                admissionId,
                direction,
                subtype,
                volumeMl: volNum,
                description: description.trim() || undefined,
                routeOrSite: routeOrSite.trim() || undefined,
                colour: colour.trim() || undefined,
                notes: notes.trim() || undefined,
                recordedAt: recordedAt ? new Date(recordedAt).toISOString() : undefined,
            };
            const res = await monitoringService.recordFluid(payload);
            if (!res.success) throw new Error(res.message ?? 'Could not record');
            toast({ title: `${FLUID_LABEL[subtype] ?? subtype} · ${volNum} mL ${direction === 'IN' ? 'in' : 'out'}` });
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
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                            direction === 'IN' ? 'bg-blue-600' : 'bg-amber-600')}>
                            <Droplets className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Record Fluid {direction === 'IN' ? 'Intake' : 'Output'}</SheetTitle>
                            <SheetDescription className="text-xs">All volumes in mL.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Direction toggle */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Direction</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <button type="button" onClick={() => setDirection('IN')}
                                className={cn('h-10 rounded-md border-2 text-sm font-bold gap-1 flex items-center justify-center transition-all',
                                    direction === 'IN' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                                <ArrowDown className="h-4 w-4" /> Intake
                            </button>
                            <button type="button" onClick={() => setDirection('OUT')}
                                className={cn('h-10 rounded-md border-2 text-sm font-bold gap-1 flex items-center justify-center transition-all',
                                    direction === 'OUT' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                                <ArrowUp className="h-4 w-4" /> Output
                            </button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Type</Label>
                        <Select value={subtype} onValueChange={setSubtype}>
                            <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {subtypes.map(s => <SelectItem key={s} value={s}>{FLUID_LABEL[s] ?? s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Volume (mL) <span className="text-rose-500">*</span></Label>
                            <Input type="number" min={1} max={20000} step="1" value={volume} onChange={e => setVolume(e.target.value)} className="h-9 text-sm mt-1" autoFocus />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Recorded At</Label>
                            <Input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} className="h-9 text-sm mt-1" />
                        </div>
                    </div>

                    {direction === 'IN' && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Fluid / Description</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. 0.9% NS, RL, blood (PRBC)" className="h-9 text-sm mt-1" />
                        </div>
                    )}
                    {direction === 'OUT' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Site / Route</Label>
                                <Input value={routeOrSite} onChange={e => setRouteOrSite(e.target.value)} placeholder="e.g. IDC, JP drain L" className="h-9 text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Colour</Label>
                                <Input value={colour} onChange={e => setColour(e.target.value)} placeholder="e.g. clear, bilious" className="h-9 text-sm mt-1" />
                            </div>
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1 text-[11px] text-slate-400 text-right">
                        {!volume && 'Volume required'}
                    </div>
                    <Button onClick={handleSubmit} disabled={!canSubmit}
                        className={cn('h-10 px-5 font-semibold', direction === 'IN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700')}>
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

const FluidView: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const [entries, setEntries] = useState<FluidEntry[]>([]);
    const [totals, setTotals] = useState<FluidTotals>({
        totalInMl: 0, totalOutMl: 0, balanceMl: 0,
        last24hInMl: 0, last24hOutMl: 0, last24hBalanceMl: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<RangeKey>('24h');
    const [sheetOpen, setSheetOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await monitoringService.listFluid(admissionId, { fromUtc: fromIsoForRange(range) });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setEntries(res.items ?? []);
            setTotals(res.totals);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load fluid entries');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId, range]);

    useEffect(() => { load(); }, [load]);

    // Build cumulative balance series (ascending by time, with running net In - Out)
    const trendPoints = useMemo(() => {
        const asc = [...entries].sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
        let running = 0;
        return asc.map(e => {
            running += (e.direction === 'IN' ? 1 : -1) * e.volumeMl;
            return {
                label: format(new Date(e.recordedAt), 'dd HH:mm'),
                balance: Math.round(running),
                inMl: e.direction === 'IN' ? e.volumeMl : null,
                outMl: e.direction === 'OUT' ? e.volumeMl : null,
            };
        });
    }, [entries]);

    // Daily In/Out bars (grouped by calendar day)
    const dailyBars = useMemo(() => {
        const byDay = new Map<string, { day: string; in: number; out: number }>();
        for (const e of entries) {
            const dayKey = format(startOfDay(new Date(e.recordedAt)), 'dd MMM');
            const existing = byDay.get(dayKey) ?? { day: dayKey, in: 0, out: 0 };
            if (e.direction === 'IN') existing.in += e.volumeMl;
            else existing.out += e.volumeMl;
            byDay.set(dayKey, existing);
        }
        return Array.from(byDay.values()).reverse();
    }, [entries]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-600" /> Fluid Balance (I/O)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Running net balance, last-24h totals, and per-day breakdown.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={range} onValueChange={v => setRange(v as RangeKey)}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setSheetOpen(true)} className="h-9 bg-blue-600 hover:bg-blue-700 gap-1">
                        <Plus className="h-4 w-4" /> Record
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label="Last 24h In" value={`${Math.round(totals.last24hInMl)} mL`} icon={<TrendingDown className="h-5 w-5" />} tone="blue" />
                    <StatTile label="Last 24h Out" value={`${Math.round(totals.last24hOutMl)} mL`} icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
                    <StatTile
                        label="Last 24h Balance"
                        value={`${totals.last24hBalanceMl > 0 ? '+' : ''}${Math.round(totals.last24hBalanceMl)} mL`}
                        sub={Math.abs(totals.last24hBalanceMl) > 2000 ? 'Threshold crossed' : 'Within range'}
                        icon={<Activity className="h-5 w-5" />}
                        tone={Math.abs(totals.last24hBalanceMl) > 2000 ? 'rose' : 'emerald'}
                    />
                    <StatTile
                        label={`${RANGE_LABELS[range]} Balance`}
                        value={`${totals.balanceMl > 0 ? '+' : ''}${Math.round(totals.balanceMl)} mL`}
                        sub={`In ${Math.round(totals.totalInMl)} · Out ${Math.round(totals.totalOutMl)}`}
                        icon={<Droplets className="h-5 w-5" />}
                        tone="neutral"
                    />
                </div>
            )}

            {error && !loading && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load fluid entries</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
                </div>
            )}

            {!loading && entries.length >= 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Cumulative Balance (mL)</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={trendPoints} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                <CartesianGrid stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <ReferenceArea y1={-200} y2={200} fill="#dcfce7" fillOpacity={0.5} />
                                <Line type="monotone" dataKey="balance" name="Net Balance" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Daily In vs Out (mL)</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={dailyBars} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                <CartesianGrid stroke="#f1f5f9" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="in" name="Intake" fill="#3b82f6" />
                                <Bar dataKey="out" name="Output" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {!loading && entries.length === 0 && !error && (
                <div className="p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <Droplets className="h-8 w-8 text-blue-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No fluid entries yet</p>
                    <Button onClick={() => setSheetOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-1" /> Record the first entry
                    </Button>
                </div>
            )}

            {!loading && entries.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Time</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Direction</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Type</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">Volume</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden md:table-cell">Detail</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden lg:table-cell">By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map(e => (
                                <TableRow key={e.fluidEntryId}>
                                    <TableCell className="py-2 text-xs text-slate-600">{format(new Date(e.recordedAt), 'dd MMM HH:mm')}</TableCell>
                                    <TableCell className="py-2">
                                        <Badge variant="outline" className={cn('text-[10px] gap-1',
                                            e.direction === 'IN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                            {e.direction === 'IN' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                                            {e.direction}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-slate-700">{FLUID_LABEL[e.subtype] ?? e.subtype}</TableCell>
                                    <TableCell className="py-2 text-right text-sm font-bold text-slate-800">{e.volumeMl} mL</TableCell>
                                    <TableCell className="py-2 text-xs text-slate-500 hidden md:table-cell truncate max-w-[220px]">
                                        {[e.description, e.routeOrSite, e.colour].filter(Boolean).join(' · ') || '—'}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-slate-400 hidden lg:table-cell truncate max-w-[120px]">{e.recordedBy ?? '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RecordFluidSheet open={sheetOpen} onOpenChange={setSheetOpen} admissionId={admissionId} onRecorded={() => load(true)} />
        </div>
    );
};

// ─── Glucose Sub-view ────────────────────────────────────────────────────────

const MEAL_OPTIONS: GlucoseMealTag[] = ['FASTING', 'PRE_BREAKFAST', 'POST_BREAKFAST', 'PRE_LUNCH', 'POST_LUNCH', 'PRE_DINNER', 'POST_DINNER', 'BEDTIME', 'RANDOM'];
const METHOD_OPTIONS: GlucoseMethod[] = ['CBG', 'LAB', 'ABG', 'CGM'];
const INSULIN_ROUTE_OPTIONS: InsulinRoute[] = ['SC', 'IV', 'IM'];
const INSULIN_TYPES = ['Regular', 'NPH', 'Glargine', 'Aspart', 'Lispro', 'Mixed', 'Other'];

const RecordGlucoseSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    onRecorded: () => void;
}> = ({ open, onOpenChange, admissionId, onRecorded }) => {
    const { toast } = useToast();
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState<GlucoseUnit>('mg/dL');
    const [method, setMethod] = useState<GlucoseMethod>('CBG');
    const [mealTag, setMealTag] = useState<GlucoseMealTag>('RANDOM');
    const [insulinGiven, setInsulinGiven] = useState(false);
    const [insulinUnits, setInsulinUnits] = useState('');
    const [insulinType, setInsulinType] = useState<string>('Regular');
    const [insulinRoute, setInsulinRoute] = useState<InsulinRoute>('SC');
    const [recordedAt, setRecordedAt] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setValue('');
        setUnit('mg/dL');
        setMethod('CBG');
        setMealTag('RANDOM');
        setInsulinGiven(false);
        setInsulinUnits('');
        setInsulinType('Regular');
        setInsulinRoute('SC');
        setNotes('');
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        setRecordedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }, [open]);

    const valNum = Number(value);
    const insulinNum = Number(insulinUnits);
    const previewMgDl = unit === 'mmol/L' ? Math.round(valNum * 18.0182 * 10) / 10 : valNum;
    const previewHypo = previewMgDl > 0 && previewMgDl < 70;
    const previewHyper = previewMgDl > 200;
    const canSubmit = !submitting && valNum > 0 && (!insulinGiven || insulinNum > 0);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            const payload: RecordGlucoseRequest = {
                admissionId,
                value: valNum,
                unit,
                method,
                mealTag,
                insulinGiven,
                insulinUnits: insulinGiven ? insulinNum : undefined,
                insulinType: insulinGiven ? insulinType : undefined,
                insulinRoute: insulinGiven ? insulinRoute : undefined,
                recordedAt: recordedAt ? new Date(recordedAt).toISOString() : undefined,
                notes: notes.trim() || undefined,
            };
            const res = await monitoringService.recordGlucose(payload);
            if (!res.success) throw new Error(res.message ?? 'Could not record');
            const msg = res.isHypo
                ? `Hypoglycaemia! ${res.valueMgDl} mg/dL`
                : res.isHyper
                    ? `Hyperglycaemia: ${res.valueMgDl} mg/dL`
                    : `${res.valueMgDl} mg/dL recorded`;
            toast({
                title: msg,
                variant: res.isHypo ? 'destructive' : undefined,
            });
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
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                            <Syringe className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Record Glucose</SheetTitle>
                            <SheetDescription className="text-xs">Optionally log insulin given.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-slate-700">Value <span className="text-rose-500">*</span></Label>
                            <Input type="number" min={0} step="0.1" value={value} onChange={e => setValue(e.target.value)} className="h-9 text-sm mt-1" autoFocus />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Unit</Label>
                            <Select value={unit} onValueChange={v => setUnit(v as GlucoseUnit)}>
                                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mg/dL">mg/dL</SelectItem>
                                    <SelectItem value="mmol/L">mmol/L</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Live preview */}
                    {valNum > 0 && (
                        <div className={cn('rounded-lg border px-3 py-2 text-sm flex items-center justify-between',
                            previewHypo ? 'border-rose-300 bg-rose-50 text-rose-700' :
                            previewHyper ? 'border-amber-300 bg-amber-50 text-amber-700' :
                            'border-emerald-300 bg-emerald-50 text-emerald-700')}>
                            <span className="font-semibold">Canonical: {previewMgDl} mg/dL</span>
                            <span className="text-xs font-bold">
                                {previewHypo ? 'HYPO' : previewHyper ? 'HYPER' : 'IN RANGE'}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Method</Label>
                            <Select value={method} onValueChange={v => setMethod(v as GlucoseMethod)}>
                                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {METHOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Meal Tag</Label>
                            <Select value={mealTag} onValueChange={v => setMealTag(v as GlucoseMealTag)}>
                                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MEAL_OPTIONS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Recorded At</Label>
                            <Input type="datetime-local" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} className="h-9 text-sm mt-1" />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={insulinGiven} onChange={e => setInsulinGiven(e.target.checked)} className="h-4 w-4 accent-purple-600" />
                            <span className="text-xs font-semibold text-slate-700">Insulin administered with this reading</span>
                        </label>
                        {insulinGiven && (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-[10px]">Units <span className="text-rose-500">*</span></Label>
                                    <Input type="number" min={0} step="0.5" value={insulinUnits} onChange={e => setInsulinUnits(e.target.value)} className="h-9 text-sm mt-1" />
                                </div>
                                <div>
                                    <Label className="text-[10px]">Type</Label>
                                    <Select value={insulinType} onValueChange={setInsulinType}>
                                        <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {INSULIN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[10px]">Route</Label>
                                    <Select value={insulinRoute} onValueChange={v => setInsulinRoute(v as InsulinRoute)}>
                                        <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {INSULIN_ROUTE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1 text-[11px] text-slate-400 text-right">
                        {!value && 'Value required'}
                        {insulinGiven && !insulinUnits && ' · Units required'}
                    </div>
                    <Button onClick={handleSubmit} disabled={!canSubmit} className="h-10 px-5 bg-purple-600 hover:bg-purple-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

const GlucoseView: React.FC<{ admissionId: string }> = ({ admissionId }) => {
    const [readings, setReadings] = useState<GlucoseReading[]>([]);
    const [stats, setStats] = useState<GlucoseStats>({ count: 0, hypoCount: 0, hyperCount: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<RangeKey>('48h');
    const [sheetOpen, setSheetOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await monitoringService.listGlucose(admissionId, { fromUtc: fromIsoForRange(range) });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setReadings(res.items ?? []);
            setStats(res.stats);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load glucose readings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId, range]);

    useEffect(() => { load(); }, [load]);

    const chartPoints = useMemo(() => [...readings]
        .sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt))
        .map(r => ({
            label: format(new Date(r.recordedAt), 'dd HH:mm'),
            value: r.valueMgDl,
            insulin: r.insulinGiven && r.insulinUnits ? r.insulinUnits : null,
        })), [readings]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Syringe className="h-4 w-4 text-purple-600" /> Glucose Monitoring
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Adult thresholds: hypo &lt;70, hyper &gt;200 mg/dL.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={range} onValueChange={v => setRange(v as RangeKey)}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => <SelectItem key={k} value={k}>{RANGE_LABELS[k]}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setSheetOpen(true)} className="h-9 bg-purple-600 hover:bg-purple-700 gap-1">
                        <Plus className="h-4 w-4" /> Record
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatTile label="Last 24h Mean" value={stats.last24hMeanMgDl != null ? `${stats.last24hMeanMgDl} mg/dL` : '—'} icon={<Activity className="h-5 w-5" />} tone="neutral" />
                    <StatTile label={`${RANGE_LABELS[range]} Mean`} value={stats.meanMgDl != null ? `${stats.meanMgDl}` : '—'} sub={stats.minMgDl != null ? `Range ${stats.minMgDl}–${stats.maxMgDl}` : undefined} icon={<TrendingUp className="h-5 w-5" />} tone="blue" />
                    <StatTile label="Hypos / Hypers" value={`${stats.hypoCount} / ${stats.hyperCount}`} sub="in window" icon={<AlertCircle className="h-5 w-5" />} tone={stats.hypoCount > 0 ? 'rose' : stats.hyperCount > 0 ? 'amber' : 'emerald'} />
                    <StatTile label="Total Insulin" value={stats.totalInsulinUnits != null ? `${stats.totalInsulinUnits} U` : '0 U'} sub="in window" icon={<Syringe className="h-5 w-5" />} tone="neutral" />
                </div>
            )}

            {error && !loading && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load glucose readings</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
                </div>
            )}

            {!loading && readings.length >= 2 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Trend (mg/dL)</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartPoints} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} domain={[40, 400]} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <ReferenceArea y1={70} y2={140} fill="#dcfce7" fillOpacity={0.5} />
                            <ReferenceArea y1={0} y2={70} fill="#fee2e2" fillOpacity={0.4} />
                            <ReferenceArea y1={200} y2={400} fill="#fef3c7" fillOpacity={0.4} />
                            <Line type="monotone" dataKey="value" name="Glucose mg/dL" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!loading && readings.length === 0 && !error && (
                <div className="p-10 text-center space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <Syringe className="h-8 w-8 text-purple-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No glucose readings yet</p>
                    <Button onClick={() => setSheetOpen(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-1" /> Record the first reading
                    </Button>
                </div>
            )}

            {!loading && readings.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Time</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 text-right">Value</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Method</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden md:table-cell">Meal</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500">Insulin</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 hidden lg:table-cell">By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {readings.map(r => (
                                <TableRow key={r.glucoseReadingId} className={cn(r.isHypo && 'bg-rose-50/40', r.isHyper && 'bg-amber-50/40')}>
                                    <TableCell className="py-2 text-xs text-slate-600">{format(new Date(r.recordedAt), 'dd MMM HH:mm')}</TableCell>
                                    <TableCell className="py-2 text-right text-sm font-bold">
                                        <span className={cn(r.isHypo && 'text-rose-700', r.isHyper && 'text-amber-700')}>
                                            {r.valueMgDl} mg/dL
                                        </span>
                                        {r.isHypo && <span className="ml-2 text-[10px] text-rose-700 font-bold">HYPO</span>}
                                        {r.isHyper && <span className="ml-2 text-[10px] text-amber-700 font-bold">HYPER</span>}
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-slate-600">{r.method ?? '—'}</TableCell>
                                    <TableCell className="py-2 text-xs text-slate-600 hidden md:table-cell">{r.mealTag?.replace(/_/g, ' ') ?? '—'}</TableCell>
                                    <TableCell className="py-2 text-xs">
                                        {r.insulinGiven ? (
                                            <span className="text-slate-700 font-semibold">
                                                {r.insulinUnits}U {r.insulinType ?? ''} <span className="text-slate-400">{r.insulinRoute}</span>
                                            </span>
                                        ) : <span className="text-slate-400">—</span>}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-slate-400 hidden lg:table-cell truncate max-w-[120px]">{r.recordedBy ?? '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RecordGlucoseSheet open={sheetOpen} onOpenChange={setSheetOpen} admissionId={admissionId} onRecorded={() => load(true)} />
        </div>
    );
};

// ─── Main tab ────────────────────────────────────────────────────────────────

interface MonitoringTabProps {
    admissionId: string;
    isActive: boolean;
}

type SubView = 'fluid' | 'glucose' | 'risk';

const SUB_VIEW_LABEL: Record<SubView, string> = {
    fluid: 'Fluid I/O',
    glucose: 'Glucose',
    risk: 'Risk Scores',
};

export const MonitoringTab: React.FC<MonitoringTabProps> = ({ admissionId, isActive }) => {
    const [view, setView] = useState<SubView>('fluid');

    if (!isActive) {
        // Defer all data fetching until tab opened — child components fetch on mount.
        return null;
    }

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-600" /> Monitoring
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Continuous fluid balance, glucose, and standardised nursing risk scores.
                    </p>
                </div>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                    {(['fluid', 'glucose', 'risk'] as SubView[]).map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            className={cn(
                                'h-8 px-4 rounded-md text-xs font-semibold transition-all',
                                view === v
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            {SUB_VIEW_LABEL[v]}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'fluid' && <FluidView admissionId={admissionId} />}
            {view === 'glucose' && <GlucoseView admissionId={admissionId} />}
            {view === 'risk' && <RiskScoresView admissionId={admissionId} />}
        </div>
    );
};

export default MonitoringTab;
