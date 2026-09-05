import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatIstDateTime } from '../utils/istDate';
import {
    cssdApi,
    type InstrumentSet,
    type SterilizationCycle,
    type InstrumentSetMovementType,
    type InstrumentSetStatus,
} from '../services/cssdApi';
import {
    ArrowLeft, Package, Plus, Loader2, Check, History, Search, RefreshCw,
    X, Droplets, Wind, Zap, ChevronRight, FlaskConical, BadgeCheck, Flame,
    PackageOpen, Microscope, ShieldCheck, AlertCircle,
} from 'lucide-react';

// ─── Metadata ───────────────────────────────────────────────────────────────

const STATUS_META: Record<InstrumentSetStatus, { label: string; color: string; bg: string; border: string }> = {
    AVAILABLE:       { label: 'Available',       color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50' },
    ISSUED:          { label: 'Issued',           color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-200 dark:border-blue-900/50' },
    IN_USE:          { label: 'In Use',           color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-900/50' },
    RETURNED_SOILED: { label: 'Returned Soiled',  color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-900/50' },
    WASHING:         { label: 'Washing',          color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-200 dark:border-amber-900/50' },
    PACKED:          { label: 'Packed',           color: 'text-sky-700 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-950/30',       border: 'border-sky-200 dark:border-sky-900/50' },
    STERILIZING:     { label: 'Sterilizing',      color: 'text-sky-700 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-950/30',       border: 'border-sky-200 dark:border-sky-900/50' },
    STERILE:         { label: 'Sterile',          color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50' },
    QUARANTINED:     { label: 'Quarantined',      color: 'text-rose-700 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-950/30',     border: 'border-rose-200 dark:border-rose-900/50' },
    RETIRED:         { label: 'Retired',          color: 'text-slate-500 dark:text-zinc-500',    bg: 'bg-slate-100 dark:bg-zinc-800',      border: 'border-slate-200 dark:border-zinc-700' },
};

const NEXT_MOVEMENTS: Partial<Record<InstrumentSetStatus, { type: InstrumentSetMovementType; label: string; color: string }[]>> = {
    AVAILABLE:       [{ type: 'ISSUE_TO_OT',     label: 'Issue to OT',        color: 'text-violet-600 border-violet-100 hover:bg-violet-50' }],
    ISSUED:          [{ type: 'RETURN',           label: 'Return',             color: 'text-amber-600 border-amber-100 hover:bg-amber-50' }],
    IN_USE:          [{ type: 'RETURN',           label: 'Return / Done',      color: 'text-amber-600 border-amber-100 hover:bg-amber-50' }],
    RETURNED_SOILED: [{ type: 'SEND_TO_WASH',     label: 'Send to Wash',       color: 'text-sky-600 border-sky-100 hover:bg-sky-50' }],
    WASHING:         [{ type: 'PACK',             label: 'Mark Packed',        color: 'text-sky-600 border-sky-100 hover:bg-sky-50' }],
    STERILE:         [{ type: 'RECEIVE_STERILE',  label: 'Store (Available)',  color: 'text-emerald-600 border-emerald-100 hover:bg-emerald-50' }],
    QUARANTINED:     [{ type: 'DISCARD',          label: 'Discard',            color: 'text-rose-600 border-rose-100 hover:bg-rose-50' }],
};

const CYCLE_TYPE_META = {
    STEAM:  { label: 'Steam',  icon: Droplets, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    ETO:    { label: 'ETO',    icon: Wind,     color: 'text-violet-600 bg-violet-50 border-violet-200' },
    PLASMA: { label: 'Plasma', icon: Zap,      color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

const BI_META = {
    PASS:    { label: 'Pass',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    FAIL:    { label: 'Failed',  color: 'bg-rose-50 text-rose-700 border-rose-200' },
    PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

// Kanban pipeline columns
const PIPELINE_COLUMNS = [
    {
        key: 'decon',
        title: 'Decontamination',
        subtitle: 'Soiled & Washing',
        statuses: ['RETURNED_SOILED', 'WASHING'] as InstrumentSetStatus[],
        accent: 'amber' as const,
        icon: Flame,
    },
    {
        key: 'prep',
        title: 'Prep & Packing',
        subtitle: 'Packed & Sterilizing',
        statuses: ['PACKED', 'STERILIZING'] as InstrumentSetStatus[],
        accent: 'sky' as const,
        icon: PackageOpen,
    },
    {
        key: 'sterile',
        title: 'Sterile Stock',
        subtitle: 'Sterile & Available',
        statuses: ['STERILE', 'AVAILABLE'] as InstrumentSetStatus[],
        accent: 'emerald' as const,
        icon: ShieldCheck,
    },
    {
        key: 'active',
        title: 'Active / Issued',
        subtitle: 'In OT or clinical use',
        statuses: ['ISSUED', 'IN_USE'] as InstrumentSetStatus[],
        accent: 'violet' as const,
        icon: Microscope,
    },
];

const ACCENT_STYLES = {
    amber:   { col: 'border-amber-200/70 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10',  head: 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', dot: 'bg-amber-400' },
    sky:     { col: 'border-sky-200/70 dark:border-sky-900/30 bg-sky-50/30 dark:bg-sky-950/10',          head: 'bg-sky-100/70 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',         dot: 'bg-sky-400' },
    emerald: { col: 'border-emerald-200/70 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10', head: 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-400' },
    violet:  { col: 'border-violet-200/70 dark:border-violet-900/30 bg-violet-50/30 dark:bg-violet-950/10', head: 'bg-violet-100/70 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300', dot: 'bg-violet-400' },
};

interface Props { onBack?: () => void; embedded?: boolean; }

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const CssdBoardScreen: React.FC<Props> = ({ onBack, embedded = false }) => {
    const { toast } = useToast();
    const [sets, setSets] = useState<InstrumentSet[]>([]);
    const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [movingSetId, setMovingSetId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [newSetOpen, setNewSetOpen] = useState(false);
    const [cycleOpen, setCycleOpen] = useState(false);

    const load = async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const [s, c] = await Promise.all([cssdApi.getSets(), cssdApi.getCycleHistory(30)]);
            setSets(s); setCycles(c);
        } catch {
            toast({ title: 'Could not load CSSD data', variant: 'destructive' });
        } finally {
            setLoading(false); setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line

    const grouped = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = q ? sets.filter(s => s.setCode.toLowerCase().includes(q) || s.setName.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)) : sets;
        return filtered.reduce<Record<string, InstrumentSet[]>>((acc, s) => {
            (acc[s.currentStatus] ??= []).push(s);
            return acc;
        }, {});
    }, [sets, search]);

    const quarantinedRetired = useMemo(() =>
        sets.filter(s => ['QUARANTINED', 'RETIRED'].includes(s.currentStatus)), [sets]);

    const runMovement = async (setId: string, type: InstrumentSetMovementType) => {
        setMovingSetId(setId);
        try {
            await cssdApi.recordMovement(setId, type);
            toast({ title: 'Status updated.' });
            load(true);
        } catch (err) {
            toast({ title: 'Could not update status', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        } finally {
            setMovingSetId(null);
        }
    };

    const stats = useMemo(() => ({
        total: sets.filter(s => s.isActive).length,
        sterile: (grouped['STERILE']?.length ?? 0) + (grouped['AVAILABLE']?.length ?? 0),
        decon: (grouped['RETURNED_SOILED']?.length ?? 0) + (grouped['WASHING']?.length ?? 0),
        active: (grouped['ISSUED']?.length ?? 0) + (grouped['IN_USE']?.length ?? 0),
    }), [grouped, sets]);

    return (
        <div className={cn('space-y-5', !embedded && 'max-w-7xl mx-auto px-4 sm:px-6 py-6')}>
            {/* Header */}
            {!embedded && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0 active:scale-[0.98] transition-all" onClick={onBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100 tracking-tight">CSSD Board</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Instrument tracking & sterilization cycle log</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl active:scale-[0.98] transition-all" onClick={() => load(true)} disabled={refreshing}>
                            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                        </Button>
                        <Button variant="outline" className="h-9 rounded-xl font-bold text-sm active:scale-[0.98] transition-all" onClick={() => setCycleOpen(true)}>
                            <FlaskConical className="h-4 w-4 mr-1.5" /> Record Cycle
                        </Button>
                        <Button className="h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-500/20 active:scale-[0.98] transition-all" onClick={() => setNewSetOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5" /> New Set
                        </Button>
                    </div>
                </div>
            )}

            {/* Embedded header */}
            {embedded && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                            <Package className="h-5 w-5 text-violet-500" /> Sterile Instruments
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Instrument set tracking & sterilization cycles</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl active:scale-[0.98] transition-all" onClick={() => load(true)} disabled={refreshing}>
                            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                        </Button>
                        <Button variant="outline" className="h-9 rounded-xl font-bold text-sm active:scale-[0.98] transition-all" onClick={() => setCycleOpen(true)}>
                            <FlaskConical className="h-4 w-4 mr-1.5" /> Cycle
                        </Button>
                        <Button className="h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-500/20 active:scale-[0.98] transition-all" onClick={() => setNewSetOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5" /> New Set
                        </Button>
                    </div>
                </div>
            )}

            {/* Stats row */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Active Sets', value: stats.total, color: 'text-slate-700 dark:text-zinc-200', bg: 'bg-white dark:bg-zinc-900', icon: Package },
                        { label: 'Ready / Sterile', value: stats.sterile, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: ShieldCheck },
                        { label: 'Decontamination', value: stats.decon, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: Flame },
                        { label: 'Issued / In Use', value: stats.active, color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', icon: Microscope },
                    ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                                <Card className={cn('p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm', s.bg)}>
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn('h-4 w-4 shrink-0', s.color)} />
                                        <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1 font-medium">{s.label}</p>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Tabs: Kanban / Cycle History */}
            <Tabs defaultValue="kanban">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <TabsList className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-1 rounded-xl shadow-sm h-auto inline-flex">
                        <TabsTrigger value="kanban" className="rounded-lg px-4 py-2 data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-violet-950/50 data-[state=active]:text-violet-700 font-bold text-sm">
                            Set Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg px-4 py-2 data-[state=active]:bg-violet-50 dark:data-[state=active]:bg-violet-950/50 data-[state=active]:text-violet-700 font-bold text-sm">
                            Cycle History
                        </TabsTrigger>
                    </TabsList>
                    {/* Search */}
                    <div className="relative w-full sm:w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search sets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        />
                    </div>
                </div>

                {/* ── Kanban Tab ─────────────────────────────────────────────── */}
                <TabsContent value="kanban" className="mt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading sets...
                        </div>
                    ) : sets.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No instrument sets yet</p>
                            <p className="text-sm mt-1">Create your first set to start tracking the sterilization pipeline.</p>
                            <Button onClick={() => setNewSetOpen(true)} className="mt-4 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                                <Plus className="h-4 w-4 mr-1.5" /> Add First Set
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile: horizontal scroll kanban */}
                            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
                                {PIPELINE_COLUMNS.map((col, ci) => {
                                    const colSets = col.statuses.flatMap(st => grouped[st] ?? []);
                                    const styles = ACCENT_STYLES[col.accent];
                                    const Icon = col.icon;
                                    return (
                                        <motion.div
                                            key={col.key}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: ci * 0.06 }}
                                            className={cn('rounded-2xl border flex flex-col min-w-[260px] sm:min-w-0 sm:flex-1', styles.col)}
                                        >
                                            {/* Column header */}
                                            <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-2xl', styles.head)}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4" />
                                                    <div>
                                                        <p className="text-xs font-black tracking-tight">{col.title}</p>
                                                        <p className="text-[10px] opacity-70">{col.subtitle}</p>
                                                    </div>
                                                </div>
                                                <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', styles.head)}>
                                                    {colSets.length}
                                                </span>
                                            </div>

                                            {/* Cards */}
                                            <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[420px] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                                                {colSets.length === 0 ? (
                                                    <div className="text-center py-8 text-xs text-slate-400 dark:text-zinc-600 italic border border-dashed border-slate-200/70 dark:border-zinc-800/60 rounded-xl bg-white/30 dark:bg-zinc-900/30">
                                                        No sets in this stage
                                                    </div>
                                                ) : (
                                                    <AnimatePresence>
                                                        {colSets.map(s => {
                                                            const statusMeta = STATUS_META[s.currentStatus];
                                                            const moves = NEXT_MOVEMENTS[s.currentStatus] ?? [];
                                                            return (
                                                                <motion.div
                                                                    key={s.instrumentSetId}
                                                                    layout
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                                    className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-3 shadow-sm hover:shadow-md transition-all"
                                                                >
                                                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                                                        <div className="min-w-0">
                                                                            <span className="font-black text-slate-800 dark:text-zinc-200 text-sm font-mono block truncate">{s.setCode}</span>
                                                                            <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate">{s.setName}</span>
                                                                        </div>
                                                                        <Badge variant="outline" className={cn('text-[9px] font-bold rounded-full shrink-0 border', statusMeta.color, statusMeta.bg, statusMeta.border)}>
                                                                            {statusMeta.label}
                                                                        </Badge>
                                                                    </div>
                                                                    {(s.category || s.currentLocation) && (
                                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                                            {s.category && <Badge variant="outline" className="text-[9px] rounded-full border-slate-200 text-slate-500">{s.category}</Badge>}
                                                                            {s.currentLocation && <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider self-center">{s.currentLocation}</span>}
                                                                        </div>
                                                                    )}
                                                                    {moves.length > 0 && (
                                                                        <div className="pt-2 border-t border-slate-50 dark:border-zinc-800/50">
                                                                            {moves.map(m => (
                                                                                <Button
                                                                                    key={m.type}
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className={cn('h-7 text-[11px] font-bold rounded-lg w-full border transition-all active:scale-[0.98]', m.color)}
                                                                                    disabled={movingSetId === s.instrumentSetId}
                                                                                    onClick={() => runMovement(s.instrumentSetId, m.type)}
                                                                                >
                                                                                    {movingSetId === s.instrumentSetId
                                                                                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                                        : <ChevronRight className="h-3 w-3 mr-1" />
                                                                                    }
                                                                                    {m.label}
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </AnimatePresence>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Quarantined / Retired section */}
                            {quarantinedRetired.length > 0 && (
                                <div className="mt-4 p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                            Quarantined / Retired ({quarantinedRetired.length})
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {quarantinedRetired.map(s => {
                                            const moves = NEXT_MOVEMENTS[s.currentStatus] ?? [];
                                            const statusMeta = STATUS_META[s.currentStatus];
                                            return (
                                                <div key={s.instrumentSetId} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <span className="font-black text-sm font-mono text-slate-800 dark:text-zinc-200">{s.setCode}</span>
                                                        <Badge variant="outline" className={cn('text-[9px] font-bold rounded-full border', statusMeta.color, statusMeta.bg, statusMeta.border)}>{statusMeta.label}</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-2">{s.setName}</p>
                                                    {moves.map(m => (
                                                        <Button key={m.type} size="sm" variant="outline" className={cn('h-7 text-[11px] font-bold rounded-lg w-full border active:scale-[0.98]', m.color)} disabled={movingSetId === s.instrumentSetId} onClick={() => runMovement(s.instrumentSetId, m.type)}>
                                                            {movingSetId === s.instrumentSetId ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} {m.label}
                                                        </Button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                {/* ── Cycle History Tab ──────────────────────────────────────── */}
                <TabsContent value="history" className="mt-4">
                    {cycles.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400">
                            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No cycles recorded yet</p>
                            <p className="text-sm mt-1">Record your first sterilization cycle using the button above.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cycles.map((c, i) => {
                                const ctMeta = CYCLE_TYPE_META[c.cycleType];
                                const biMeta = BI_META[c.biologicalIndicatorResult];
                                const CIcon = ctMeta.icon;
                                return (
                                    <motion.div
                                        key={c.sterilizationCycleId}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <Card className="p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-black text-slate-800 dark:text-zinc-100 text-sm font-mono">{c.cycleNumber}</span>
                                                        {c.autoclaveLabel && <span className="text-xs text-slate-500">· {c.autoclaveLabel}</span>}
                                                        <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full border flex items-center gap-1', ctMeta.color)}>
                                                            <CIcon className="h-3 w-3" /> {ctMeta.label}
                                                        </Badge>
                                                        <Badge variant="outline" className={cn('text-[10px] font-bold rounded-full border', biMeta.color)}>
                                                            BI: {biMeta.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        By <span className="font-semibold text-slate-700 dark:text-zinc-300">{c.operatorName}</span>
                                                        {c.setCodes.length > 0 && <> · Sets: <span className="font-mono">{c.setCodes.join(', ')}</span></>}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-slate-400 shrink-0">{formatIstDateTime(c.startedAt)}</span>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ── New Set Sheet ──────────────────────────────────────────────── */}
            <NewSetSheet open={newSetOpen} onClose={() => setNewSetOpen(false)} onSuccess={() => { setNewSetOpen(false); load(true); }} />

            {/* ── Record Cycle Dialog ───────────────────────────────────────── */}
            <RecordCycleDialog open={cycleOpen} packedSets={grouped['PACKED'] ?? []} onClose={() => setCycleOpen(false)} onSuccess={() => { setCycleOpen(false); load(true); }} />
        </div>
    );
};

// ─── New Set Sheet ────────────────────────────────────────────────────────────
const NewSetSheet: React.FC<{ open: boolean; onClose: () => void; onSuccess: () => void }> = ({ open, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [location, setLocation] = useState('');
    const [composition, setComposition] = useState('');

    const reset = () => { setCode(''); setName(''); setCategory(''); setLocation(''); setComposition(''); };

    const submit = async () => {
        if (!code.trim() || !name.trim()) {
            toast({ title: 'Set code and name are required', variant: 'destructive' });
            return;
        }
        setBusy(true);
        try {
            await cssdApi.createSet({ setCode: code.trim(), setName: name.trim(), category: category.trim() || undefined, currentLocation: location.trim() || undefined, itemComposition: composition.trim() || undefined });
            toast({ title: 'Instrument set created.' });
            reset(); onSuccess();
        } catch (err) {
            toast({ title: 'Could not create set', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={o => !o && onClose()}>
            <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col overflow-y-auto">
                <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 p-5">
                    <SheetHeader>
                        <div className="flex items-center justify-between">
                            <SheetTitle className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                                <Package className="h-5 w-5 text-violet-500" /> New Instrument Set
                            </SheetTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <SheetDescription>Register a new instrument set or tray into the CSSD pipeline.</SheetDescription>
                    </SheetHeader>
                </div>
                <div className="flex-1 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Set Code *</Label>
                            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="LAPARO-01" className="h-9 rounded-xl font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Category</Label>
                            <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="GENERAL, ORTHO…" className="h-9 rounded-xl text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Set Name *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Laparoscopy Set A" className="h-9 rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Initial Location</Label>
                        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="CSSD Store, OT-1…" className="h-9 rounded-xl text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Item Composition / Notes</Label>
                        <textarea
                            className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                            placeholder="List of instruments in this set…"
                            value={composition}
                            onChange={e => setComposition(e.target.value)}
                        />
                    </div>
                </div>
                <div className="sticky bottom-0 p-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2 bg-white dark:bg-zinc-900">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={submit} disabled={busy} className="h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold active:scale-[0.98] transition-all">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />} Create Set
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Record Sterilization Cycle Dialog ───────────────────────────────────────
const RecordCycleDialog: React.FC<{
    open: boolean;
    packedSets: InstrumentSet[];
    onClose: () => void;
    onSuccess: () => void;
}> = ({ open, packedSets, onClose, onSuccess }) => {
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const [cycleNumber, setCycleNumber] = useState('');
    const [autoclaveLabel, setAutoclaveLabel] = useState('');
    const [cycleType, setCycleType] = useState<'STEAM' | 'ETO' | 'PLASMA'>('STEAM');
    const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
    const [bioResult, setBioResult] = useState<'PASS' | 'FAIL' | 'PENDING'>('PENDING');

    const toggleSet = (id: string) => {
        const next = new Set(selectedSetIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedSetIds(next);
    };

    const submit = async () => {
        if (!cycleNumber.trim() || selectedSetIds.size === 0) {
            toast({ title: 'Cycle number and at least one set are required', variant: 'destructive' });
            return;
        }
        setBusy(true);
        try {
            await cssdApi.recordCycle({
                cycleNumber: cycleNumber.trim(),
                autoclaveLabel: autoclaveLabel.trim() || undefined,
                cycleType,
                startedAt: new Date().toISOString(),
                biologicalIndicatorResult: bioResult,
                instrumentSetIds: Array.from(selectedSetIds),
            });
            toast({ title: 'Sterilization cycle recorded.' });
            setCycleNumber(''); setAutoclaveLabel(''); setSelectedSetIds(new Set()); setBioResult('PENDING');
            onSuccess();
        } catch (err) {
            toast({ title: 'Could not record cycle', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={o => !o && onClose()}>
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b border-slate-100 dark:border-zinc-800">
                    <DialogTitle className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-violet-500" /> Record Sterilization Cycle
                    </DialogTitle>
                    <DialogDescription>Log an autoclave or sterilization run for packed instrument sets.</DialogDescription>
                </DialogHeader>
                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Cycle Number *</Label>
                            <Input value={cycleNumber} onChange={e => setCycleNumber(e.target.value)} placeholder="CYC-2024-001" className="h-9 rounded-xl font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Autoclave / Machine</Label>
                            <Input value={autoclaveLabel} onChange={e => setAutoclaveLabel(e.target.value)} placeholder="Autoclave A" className="h-9 rounded-xl text-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Cycle Type</Label>
                            <Select value={cycleType} onValueChange={v => setCycleType(v as any)}>
                                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="STEAM">Steam</SelectItem>
                                    <SelectItem value="ETO">ETO</SelectItem>
                                    <SelectItem value="PLASMA">Plasma</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-600 uppercase">Biological Indicator</Label>
                            <Select value={bioResult} onValueChange={v => setBioResult(v as any)}>
                                <SelectTrigger className="h-9 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="PASS">Pass</SelectItem>
                                    <SelectItem value="FAIL">Fail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Select Packed Sets for this Load *</Label>
                        {packedSets.length === 0 ? (
                            <p className="text-sm text-slate-400 py-2">No packed sets available. Move sets to Packed status first.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {packedSets.map(s => (
                                    <button
                                        key={s.instrumentSetId}
                                        onClick={() => toggleSet(s.instrumentSetId)}
                                        className={cn(
                                            'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-[0.98]',
                                            selectedSetIds.has(s.instrumentSetId)
                                                ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50'
                                                : 'border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400 hover:border-violet-200 hover:bg-violet-50/50'
                                        )}
                                    >
                                        {selectedSetIds.has(s.instrumentSetId) && <Check className="h-3 w-3" />}
                                        {s.setCode}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-zinc-950/20">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={submit} disabled={busy || packedSets.length === 0} className="h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold active:scale-[0.98] transition-all">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />} Save Cycle
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CssdBoardScreen;
