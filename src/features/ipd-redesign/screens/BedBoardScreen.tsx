import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { BedDouble, ArrowLeft, LogOut, ArrowLeftRight, Loader2, X, Check } from 'lucide-react';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { useAppStore } from '@/store/appStore';

const FREE_TONE: Record<string, string> = {
    AVAILABLE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    CLEANING: 'border-amber-200 bg-amber-50 text-amber-700',
    RESERVED: 'border-sky-200 bg-sky-50 text-sky-700',
    BLOCKED: 'border-slate-200 bg-slate-100 text-slate-500',
};
const OCCUPIED_TONE = 'border-rose-200 bg-rose-50 text-rose-700';

const BED_POLL_MS = 20000;
const FLASH_MS = 1800;

const LiveDot: React.FC<{ className?: string }> = ({ className }) => (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
);

const bedGridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.02 } },
};
const bedCardVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 6 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const AnimatedBedTile: React.FC<{ bed: BedBoardItem; occupied: boolean; flashing: boolean; onClick: () => void }> = ({ bed, occupied, flashing, onClick }) => {
    const { isLowBandwidthMode } = useAppStore();
    const statusCode = bed.statusCode ?? 'AVAILABLE';
    const isCleaning = statusCode === 'CLEANING';
    const isReserved = statusCode === 'RESERVED';
    
    const tone = occupied ? OCCUPIED_TONE : (FREE_TONE[statusCode] ?? FREE_TONE.AVAILABLE);

    return (
        <motion.button
            layout
            variants={bedCardVariants}
            initial="hidden"
            animate={flashing ? { opacity: 1, scale: [1, 1.1, 1], y: 0 } : 'show'}
            exit="exit"
            transition={flashing ? { duration: 0.5, ease: 'easeOut' } : undefined}
            whileHover={occupied ? { scale: 1.04 } : undefined}
            whileTap={occupied ? { scale: 0.96 } : undefined}
            onClick={onClick}
            disabled={!occupied}
            className={cn('w-full rounded-2xl border-2 p-3 text-left flex flex-col min-w-0 transition-all relative overflow-hidden', tone,
                occupied ? 'hover:shadow-md cursor-pointer active:scale-[0.97]' : 'cursor-default opacity-90',
                flashing && (occupied ? 'ring-4 ring-rose-400' : 'ring-4 ring-emerald-400'),
                !isLowBandwidthMode ? 'shadow-sm backdrop-blur-md' : ''
            )}>
            
            <div className="relative w-full h-24 mb-3 rounded-[1rem] border-4 border-black/10 bg-black/5 overflow-hidden flex flex-col items-center justify-start pt-2 shrink-0 shadow-inner">
                <div className="w-12 h-4 bg-white/90 rounded-full shadow-sm z-10" />
                {occupied && (
                    <div className="absolute top-3.5 w-8 h-8 bg-rose-200/90 rounded-full z-20 border-2 border-white/80 shadow-sm" />
                )}
                <motion.div 
                    animate={occupied && !isLowBandwidthMode ? { scaleY: [1, 1.05, 1], y: [0, -1, 0] } : {}}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                        "absolute bottom-0 w-full rounded-t-2xl z-30 border-t-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] origin-bottom",
                        occupied ? "bg-rose-400 border-rose-300 h-[65%]" : "bg-emerald-200 border-emerald-100 h-[50%]",
                        isCleaning && "bg-amber-200 border-amber-100",
                        isReserved && "bg-sky-200 border-sky-100"
                    )}>
                    <div className="w-full h-2.5 bg-white/20 mt-1" />
                </motion.div>
                {isCleaning && !isLowBandwidthMode && (
                    <motion.div 
                        animate={{ y: ["-100%", "300%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-x-0 h-12 z-40 bg-gradient-to-b from-transparent via-white/80 to-transparent" 
                    />
                )}
            </div>
            
            <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono text-[13px] font-black truncate text-slate-900">{bed.bedCode}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider shrink-0 opacity-80">{occupied ? 'OCCUPIED' : statusCode}</span>
            </div>
            
            {occupied ? (
                <div className="min-w-0 mt-1">
                    <p className="text-sm font-bold truncate leading-tight text-slate-900">{bed.patientName || '?'}</p>
                    <p className="text-[11px] opacity-75 truncate mt-0.5 font-medium">{bed.patientAge ?? ''}{bed.patientSex ?? ''} · {bed.admissionNo}</p>
                    {bed.admissionToken && <p className="text-[10px] font-bold text-rose-800 mt-1.5 truncate bg-rose-100/50 inline-block px-1.5 py-0.5 rounded-md border border-rose-200/50">Tkn: {bed.admissionToken}</p>}
                </div>
            ) : (
                <p className="text-[11px] mt-auto pt-1 opacity-70 font-semibold">₹{bed.effectiveDailyRate.toLocaleString('en-IN')}/day</p>
            )}
        </motion.button>
    );
};

const CensusTile: React.FC<{ label: string; value: number; tone: 'rose' | 'emerald' | 'slate' }> = ({ label, value, tone }) => {
    const tones: Record<string, string> = {
        rose: 'border-rose-100 bg-rose-50 text-rose-700',
        emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        slate: 'border-slate-200 bg-slate-50 text-slate-700',
    };
    return (
        <div className={cn('rounded-xl border px-3 py-2 shadow-sm', tones[tone])}>
            <p className="text-[10px] font-bold uppercase tracking-wider truncate opacity-80">{label}</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{value}</p>
        </div>
    );
};

type ActionMode = 'menu' | 'transfer' | 'discharge' | null;

interface Props {
    onBack: () => void;
}

export const BedBoardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<BedBoardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [wardFilter, setWardFilter] = useState('ALL');
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

    useEffect(() => { load(); }, []);

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
        () => items.filter(b => b.isActive && !b.admissionId && b.bedId !== selected?.bedId),
        [items, selected],
    );

    // Census over the currently-visible beds (respects the ward filter) — the mobile at-a-glance count.
    const census = useMemo(() => {
        const visible = Object.values(grouped).flat();
        const occupied = visible.filter(b => !!b.admissionId).length;
        return { total: visible.length, occupied, available: visible.length - occupied };
    }, [grouped]);

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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-10">
            <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="h-9 px-2.5 sm:px-3 shrink-0" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shrink-0">
                    <BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-black text-slate-900">Bed Board</h1>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider shrink-0">
                            <LiveDot /> Live
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 hidden sm:block">Every bed, live · transfer, release &amp; discharge.</p>
                </div>
            </div>

            {/* Census summary + ward filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="grid grid-cols-3 gap-2 flex-1">
                    <CensusTile label="Occupied" value={census.occupied} tone="rose" />
                    <CensusTile label="Available" value={census.available} tone="emerald" />
                    <CensusTile label="Total beds" value={census.total} tone="slate" />
                </div>
                <select value={wardFilter} onChange={e => setWardFilter(e.target.value)}
                    className="h-11 sm:h-10 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 bg-white shadow-sm w-full sm:w-auto shrink-0">
                    <option value="ALL">All wards</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {([
                    { label: 'Occupied', cls: 'bg-rose-400' },
                    { label: 'Available', cls: 'bg-emerald-400' },
                    { label: 'Cleaning', cls: 'bg-amber-400' },
                    { label: 'Reserved', cls: 'bg-sky-400' },
                    { label: 'Blocked', cls: 'bg-slate-400' },
                ] as const).map(({ label, cls }) => (
                    <span key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <span className={cn('h-2.5 w-2.5 rounded-full', cls)} /> {label}
                    </span>
                ))}
            </div>

            {loading && items.length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading bed board…</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="py-20 text-center text-sm text-slate-400">No beds found. Add beds under Bed Master first.</div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([ward, beds]) => {
                        const occ = beds.filter(b => !!b.admissionId).length;
                        return (
                            <motion.div key={ward} layout className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <p className="font-bold text-slate-900 text-sm sm:text-base truncate">{ward}</p>
                                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 shrink-0">{occ}/{beds.length} occupied</Badge>
                                </div>
                                <motion.div layout variants={bedGridVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                                    <AnimatePresence initial={false}>
                                        {beds.map(b => (
                                            <AnimatedBedTile 
                                                key={b.bedId} 
                                                bed={b} 
                                                occupied={!!b.admissionId} 
                                                flashing={flashIds.has(b.bedId)} 
                                                onClick={() => openBed(b)} 
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-md">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selected.patientName || 'Patient'} · {selected.bedCode}</DialogTitle>
                                <DialogDescription>
                                    {selected.admissionNo} · {selected.admissionType ?? ''} · {selected.payerType ?? 'CASH'}
                                    {selected.admissionToken && ` · Token: ${selected.admissionToken}`}
                                </DialogDescription>
                            </DialogHeader>

                            {actionMode === 'menu' && (
                                <div className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start h-11" onClick={() => setActionMode('transfer')}>
                                        <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer to another bed
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start h-11" disabled={busy}
                                        onClick={() => runAction(() => bedBoardApi.releaseBed(selected.admissionId!), 'Bed released.')}>
                                        <X className="h-4 w-4 mr-2" /> Release bed (keep admission)
                                    </Button>
                                    <Button className="w-full justify-start h-11 bg-amber-600 hover:bg-amber-700" onClick={() => setActionMode('discharge')}>
                                        <LogOut className="h-4 w-4 mr-2" /> Discharge patient
                                    </Button>
                                </div>
                            )}

                            {actionMode === 'transfer' && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">New bed</Label>
                                        <select value={newBedId} onChange={e => setNewBedId(e.target.value)} className="h-10 mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white">
                                            <option value="">Select a bed…</option>
                                            {freeBeds.map(b => (
                                                <option key={b.bedId} value={b.bedId}>{(b.wardName || b.wardCode)} · {b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={!newBedId || busy} className="bg-brand-600 hover:bg-brand-700"
                                            onClick={() => runAction(() => bedBoardApi.transferBed(selected.admissionId!, newBedId), 'Bed transferred.')}>
                                            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeftRight className="h-4 w-4 mr-2" />} Transfer
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {actionMode === 'discharge' && (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                                        This closes the admission to DISCHARGED and releases bed {selected.bedCode}.
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">Discharge notes</Label>
                                        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm mt-1" placeholder="Optional" />
                                    </div>
                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={() => setActionMode('menu')}>Back</Button>
                                        <Button disabled={busy} className="bg-amber-600 hover:bg-amber-700"
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


