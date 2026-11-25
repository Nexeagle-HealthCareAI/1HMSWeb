import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LogOut, ArrowLeftRight, Loader2, X, Check, LayoutGrid, List, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { IpdSectionHeader, type IpdTab } from '../components/IpdSectionHeader';
import { BED_STATES, BED_STATE_LABEL, bedCounts, bedState, occupancyPercent, type BedState } from '../utils/rosterBoard';
import { formatIstDayLabel } from '../utils/istDate';

const STATE_TILE: Record<BedState, string> = {
    OCCUPIED: 'border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/60',
    AVAILABLE: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/60',
    CLEANING: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/60',
    RESERVED: 'border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900/60',
    BLOCKED: 'border-slate-200 bg-slate-100 dark:bg-zinc-800/60 dark:border-zinc-700',
};
const STATE_TEXT: Record<BedState, string> = {
    OCCUPIED: 'text-rose-700 dark:text-rose-400',
    AVAILABLE: 'text-emerald-700 dark:text-emerald-400',
    CLEANING: 'text-amber-700 dark:text-amber-400',
    RESERVED: 'text-sky-700 dark:text-sky-400',
    BLOCKED: 'text-slate-500 dark:text-zinc-400',
};
const STATE_DOT: Record<BedState, string> = {
    OCCUPIED: 'bg-rose-500', AVAILABLE: 'bg-emerald-500', CLEANING: 'bg-amber-500', RESERVED: 'bg-sky-500', BLOCKED: 'bg-slate-400',
};

const BED_POLL_MS = 20000;
const FLASH_MS = 1800;
const VIEW_KEY = 'ipd-bedboard-view';
type BoardView = 'tiles' | 'list';
const readView = (): BoardView => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'tiles'; } catch { return 'tiles'; } };
const saveView = (v: BoardView) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* preference only */ } };

const LiveDot: React.FC<{ className?: string }> = ({ className }) => (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
);

/** One bed. Occupied beds open the transfer / release / discharge actions; free beds only inform. */
const BedTile: React.FC<{ bed: BedBoardItem; flashing: boolean; onClick: () => void }> = ({ bed, flashing, onClick }) => {
    const state = bedState(bed);
    const hasPatient = !!bed.admissionId;
    return (
        <motion.button
            type="button"
            animate={flashing ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            onClick={onClick}
            disabled={!hasPatient}
            aria-label={`${bed.bedCode ?? 'Bed'}, ${BED_STATE_LABEL[state]}${hasPatient && bed.patientName ? `, ${bed.patientName}` : ''}`}
            className={cn('w-full min-h-[76px] rounded-xl border px-2.5 py-2 text-left flex flex-col min-w-0 transition-shadow', STATE_TILE[state],
                hasPatient ? 'cursor-pointer hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500 outline-none' : 'cursor-default',
                flashing && (hasPatient ? 'ring-2 ring-rose-400' : 'ring-2 ring-emerald-400'))}>
            <div className="flex items-center justify-between gap-1.5">
                <span className="font-mono text-xs font-black truncate text-slate-900 dark:text-zinc-50">{bed.bedCode}</span>
                <span className={cn('text-[9px] font-bold uppercase tracking-wide shrink-0', STATE_TEXT[state])}>{BED_STATE_LABEL[state]}</span>
            </div>
            {hasPatient ? (
                <div className="min-w-0 mt-1.5">
                    <p className="text-xs font-bold truncate leading-tight text-slate-900 dark:text-zinc-50">{bed.patientName || 'Patient'}</p>
                    <p className="text-[10px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
                        {bed.patientAge ?? ''}{bed.patientSex ?? ''}{bed.admissionToken ? ` · Token ${bed.admissionToken}` : bed.admissionNo ? ` · ${bed.admissionNo}` : ''}
                    </p>
                </div>
            ) : (
                <p className="text-[10px] mt-auto pt-1.5 text-slate-600 dark:text-zinc-400 font-semibold">₹{bed.effectiveDailyRate.toLocaleString('en-IN')}/day</p>
            )}
        </motion.button>
    );
};

type ActionMode = 'menu' | 'transfer' | 'discharge' | null;

interface Props {
    onBack: () => void;
    /** Shows the shared IPD tabs when given. */
    onNavigate?: (tab: IpdTab) => void;
    onAdmit?: () => void;
    /** Bumped by the parent after an admission so the board reloads. */
    refreshSignal?: number;
}

export const BedBoardScreen: React.FC<Props> = ({ onBack, onNavigate, onAdmit, refreshSignal }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<BedBoardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [wardFilter, setWardFilter] = useState('ALL');
    const [stateFilter, setStateFilter] = useState<BedState | 'ALL'>('ALL');
    const [boardView, setBoardView] = useState<BoardView>(readView);
    const [selected, setSelected] = useState<BedBoardItem | null>(null);
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [newBedId, setNewBedId] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
    const prevOccupancyRef = useRef<Map<string, boolean>>(new Map());

    const applyItems = (bedItems: BedBoardItem[]) => {
        const prev = prevOccupancyRef.current;
        const changed = new Set<string>();
        for (const b of bedItems) {
            const wasOccupied = prev.get(b.bedId);
            const isOccupied = !!b.admissionId;
            if (wasOccupied !== undefined && wasOccupied !== isOccupied) changed.add(b.bedId);
        }
        prevOccupancyRef.current = new Map(bedItems.map(b => [b.bedId, !!b.admissionId]));
        setItems(bedItems);
        if (changed.size > 0) {
            setFlashIds(changed);
            setTimeout(() => setFlashIds(new Set()), FLASH_MS);
        }
    };

    const load = () => {
        setLoading(true);
        bedBoardApi.getBoard()
            .then(applyItems)
            .catch(() => toast({ title: 'Could not load the bed board', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [refreshSignal]); // eslint-disable-line react-hooks/exhaustive-deps

    // Silent background refresh — paused while an action dialog is open.
    useEffect(() => {
        if (selected) return;
        const id = setInterval(() => {
            bedBoardApi.getBoard().then(applyItems).catch(() => { /* silent */ });
        }, BED_POLL_MS);
        return () => clearInterval(id);
    }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

    const wards = useMemo(() => Array.from(new Set(items.map(i => i.wardName || i.wardCode || 'Other'))), [items]);

    const grouped = useMemo(() => {
        const groups: Record<string, BedBoardItem[]> = {};
        for (const b of items) {
            const key = b.wardName || b.wardCode || 'Other';
            if (wardFilter !== 'ALL' && key !== wardFilter) continue;
            (groups[key] ??= []).push(b);
        }
        return groups;
    }, [items, wardFilter]);

    // Candidates for "transfer to" — free beds, excluding the one currently selected.
    const freeBeds = useMemo(
        () => items.filter(b => b.isActive && !b.admissionId && (b.statusCode ?? 'AVAILABLE') === 'AVAILABLE' && b.bedId !== selected?.bedId),
        [items, selected],
    );

    // Counts respect the ward filter but not the state filter, so the legend always shows the
    // full picture for the ward being looked at.
    const wardBeds = useMemo(() => Object.values(grouped).flat(), [grouped]);
    const counts = useMemo(() => bedCounts(wardBeds), [wardBeds]);
    const visibleGroups = useMemo(
        () => Object.entries(grouped)
            .map(([ward, beds]) => ({ ward, all: beds, beds: stateFilter === 'ALL' ? beds : beds.filter(b => bedState(b) === stateFilter) }))
            .filter(g => g.beds.length > 0),
        [grouped, stateFilter],
    );
    const pickView = (v: BoardView) => { setBoardView(v); saveView(v); };

    const openBed = (b: BedBoardItem) => {
        if (!b.admissionId) return; // free beds are informational only — assign from the admissions list
        setSelected(b);
        setActionMode('menu');
        setNewBedId('');
        setNotes('');
    };

    const closeDialog = () => { setSelected(null); setActionMode(null); };

    const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
        setBusy(true);
        try {
            await fn();
            toast({ title: successMessage });
            closeDialog();
            load();
        } catch (err) {
            toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 pt-2 pb-10 space-y-4 bg-slate-50/50 dark:bg-zinc-950 min-h-screen">
            <IpdSectionHeader
                active="bedboard"
                subtitle={`${formatIstDayLabel(new Date())} · ${counts.OCCUPIED} of ${wardBeds.length} beds occupied (${occupancyPercent(wardBeds)}%)`}
                onNavigate={onNavigate}
                onAdmit={onAdmit}
                actions={
                    <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-200 uppercase tracking-wider bg-emerald-500/20 px-2 h-7 rounded-lg border border-emerald-400/30">
                        <LiveDot /> Live
                    </span>
                }
            />

            {/* Legend with counts — tap a state to show only those beds */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                <button type="button" onClick={() => setStateFilter('ALL')} aria-pressed={stateFilter === 'ALL'}
                    className={cn('h-9 px-3 rounded-full text-xs font-bold border shrink-0 transition-colors',
                        stateFilter === 'ALL' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 text-slate-600 dark:text-zinc-300')}>
                    All beds · {wardBeds.length}
                </button>
                {BED_STATES.map(st => (
                    <button key={st} type="button" onClick={() => setStateFilter(prev => (prev === st ? 'ALL' : st))} aria-pressed={stateFilter === st}
                        className={cn('h-9 px-3 rounded-full text-xs font-bold border shrink-0 flex items-center gap-1.5 transition-colors',
                            stateFilter === st ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300' : 'bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 text-slate-600 dark:text-zinc-300',
                            counts[st] === 0 && stateFilter !== st && 'opacity-60')}>
                        <span className={cn('h-2.5 w-2.5 rounded-full', STATE_DOT[st])} /> {BED_STATE_LABEL[st]} · {counts[st]}
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <Select value={wardFilter} onValueChange={setWardFilter}>
                    <SelectTrigger aria-label="Ward" className="h-10 text-xs font-semibold border-slate-200/70 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex-1 sm:flex-none sm:w-[200px] [&>span]:truncate">
                        <SelectValue placeholder="All wards" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="ALL" className="font-semibold text-xs">All wards</SelectItem>
                        {wards.map(w => (
                            <SelectItem key={w} value={w} className="font-semibold text-xs">{w}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div role="group" aria-label="View" className="flex items-center gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/40 dark:border-zinc-800 shrink-0">
                    {([['tiles', 'Tiles', LayoutGrid], ['list', 'List', List]] as const).map(([key, label, Icon]) => (
                        <button key={key} type="button" onClick={() => pickView(key)} aria-pressed={boardView === key}
                            className={cn('h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors',
                                boardView === key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-zinc-400')}>
                            <Icon className="h-3.5 w-3.5" /> {label}
                        </button>
                    ))}
                </div>
                <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh"
                    className="h-10 rounded-full px-3.5 text-xs font-bold shrink-0 border-slate-200/70 text-slate-600 dark:text-zinc-300 sm:ml-auto">
                    <RefreshCw className={cn('h-3.5 w-3.5 sm:mr-1.5', loading && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>

            {loading && items.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading bed board…</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No beds found. Add beds under Bed Master first.</div>
            ) : visibleGroups.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">No {stateFilter !== 'ALL' ? BED_STATE_LABEL[stateFilter].toLowerCase() : ''} beds here right now.</p>
                    <button type="button" onClick={() => setStateFilter('ALL')} className="mt-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline">Show all beds</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleGroups.map(({ ward, all, beds }) => {
                        const wardCounts = bedCounts(all);
                        return (
                            <section key={ward} className="rounded-2xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-zinc-800">
                                    <h2 className="font-bold text-slate-900 dark:text-zinc-100 text-sm truncate">{ward}</h2>
                                    <p className="text-[11px] font-semibold text-slate-500 shrink-0">
                                        {wardCounts.OCCUPIED} of {all.length} occupied · <span className="text-emerald-700 dark:text-emerald-400">{wardCounts.AVAILABLE} free</span>
                                    </p>
                                </div>
                                {boardView === 'tiles' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-3">
                                        {beds.map(b => <BedTile key={b.bedId} bed={b} flashing={flashIds.has(b.bedId)} onClick={() => openBed(b)} />)}
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-zinc-800">
                                        {beds.map(b => {
                                            const st = bedState(b);
                                            const hasPatient = !!b.admissionId;
                                            return (
                                                <li key={b.bedId}>
                                                    <button type="button" disabled={!hasPatient} onClick={() => openBed(b)}
                                                        className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 text-left', hasPatient ? 'hover:bg-brand-50/40 dark:hover:bg-zinc-800/40 cursor-pointer' : 'cursor-default',
                                                            flashIds.has(b.bedId) && 'bg-brand-50 dark:bg-brand-950/30')}>
                                                        <span className="font-mono text-xs font-black text-slate-900 dark:text-zinc-50 w-20 shrink-0 truncate">{b.bedCode}</span>
                                                        <span className={cn('flex items-center gap-1.5 text-[11px] font-bold w-24 shrink-0', STATE_TEXT[st])}>
                                                            <span className={cn('h-2 w-2 rounded-full', STATE_DOT[st])} /> {BED_STATE_LABEL[st]}
                                                        </span>
                                                        <span className="flex-1 min-w-0 text-xs truncate">
                                                            {hasPatient
                                                                ? <><span className="font-semibold text-slate-900 dark:text-zinc-50">{b.patientName || 'Patient'}</span><span className="text-slate-500"> · {b.patientAge ?? ''}{b.patientSex ?? ''}{b.admissionNo ? ` · ${b.admissionNo}` : ''}</span></>
                                                                : <span className="text-slate-400">—</span>}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 hidden sm:inline">₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-md rounded-[24px] border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl w-[calc(100%-2rem)] sm:w-full">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">{selected.patientName || 'Patient'} · {selected.bedCode}</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                                    {selected.admissionNo} · {selected.admissionType ?? ''} · {selected.payerType ?? 'CASH'}
                                    {selected.admissionToken && ` · Token: ${selected.admissionToken}`}
                                </DialogDescription>
                            </DialogHeader>

                            {actionMode === 'menu' && (
                                <div className="space-y-2.5 pt-2">
                                    <Button variant="outline" className="w-full justify-start h-11 rounded-xl px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-305 font-bold active:scale-[0.98] transition-all" onClick={() => setActionMode('transfer')}>
                                        <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer to another bed
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start h-11 rounded-xl px-4 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 font-bold active:scale-[0.98] transition-all" disabled={busy}
                                        onClick={() => runAction(() => bedBoardApi.releaseBed(selected.admissionId!), 'Bed released.')}>
                                        <X className="h-4 w-4 mr-2" /> Release bed (keep admission)
                                    </Button>
                                    <Button className="w-full justify-start h-11 rounded-xl px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold active:scale-[0.98] transition-all" onClick={() => setActionMode('discharge')}>
                                        <LogOut className="h-4 w-4 mr-2" /> Discharge patient
                                    </Button>
                                </div>
                            )}

                            {actionMode === 'transfer' && (
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">New bed</Label>
                                        <Select value={newBedId} onValueChange={setNewBedId}>
                                            <SelectTrigger className="h-10 mt-1.5 w-full rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-left">
                                                <SelectValue placeholder="Select a bed…" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[250px] overflow-y-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
                                                {freeBeds.map(b => (
                                                    <SelectItem key={b.bedId} value={b.bedId} className="rounded-lg focus:bg-brand-50 dark:focus:bg-brand-950/30 focus:text-brand-700 dark:focus:text-brand-300 font-semibold cursor-pointer">
                                                        {(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={!newBedId || busy} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white active:scale-[0.98] transition-all"
                                            onClick={() => runAction(() => bedBoardApi.transferBed(selected.admissionId!, newBedId), 'Bed transferred.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />} Transfer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {actionMode === 'discharge' && (
                                <div className="space-y-4 pt-2">
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 font-semibold leading-relaxed">
                                        This closes the admission to DISCHARGED and releases bed {selected.bedCode}.
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Discharge notes</Label>
                                        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-brand-500/20 focus-visible:ring-2 focus-visible:border-brand-500 transition-all p-3 resize-none w-full" placeholder="Optional discharge notes..." />
                                    </div>
                                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={busy} className="h-11 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98] transition-all"
                                            onClick={() => runAction(() => bedBoardApi.dischargeAdmission(selected.admissionId!, notes || undefined), 'Patient discharged.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm discharge
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};


