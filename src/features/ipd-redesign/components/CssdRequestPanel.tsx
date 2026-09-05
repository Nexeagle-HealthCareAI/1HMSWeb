import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { cssdApi, type InstrumentSet } from '../services/cssdApi';
import {
    Package, Search, Loader2, ArrowRight, RotateCcw, CheckCircle2,
    ShieldCheck, PackageOpen, Microscope, AlertCircle,
} from 'lucide-react';

interface Props {
    /** Patient admission ID — used to tag the location note on the movement */
    admissionId: string;
    /** Optional display name for the ward/location (e.g. "ICU Bed 4") */
    locationLabel?: string;
    /** Called after any movement so parent can refresh if needed */
    onActionComplete?: () => void;
}

type ViewMode = 'available' | 'inuse';

const STATUS_COLOR: Partial<Record<string, string>> = {
    STERILE:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    ISSUED:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
    IN_USE:    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50',
};

/**
 * CssdRequestPanel — embedded in the Nurse Quick Action dialog and ICU workspace.
 *
 * Two views:
 *  1. "Available" — shows STERILE/AVAILABLE sets the nurse can issue to this patient
 *  2. "In Use" — shows ISSUED/IN_USE sets currently out; nurse can return them to CSSD soiled
 */
export const CssdRequestPanel: React.FC<Props> = ({ admissionId, locationLabel = 'Ward', onActionComplete }) => {
    const { toast } = useToast();
    const [sets, setSets] = useState<InstrumentSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [movingId, setMovingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<ViewMode>('available');
    const [notes, setNotes] = useState('');

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await cssdApi.getSets();
            setSets(data);
        } catch {
            toast({ title: 'Could not load CSSD sets', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line

    const available = useMemo(() => {
        const q = search.toLowerCase();
        return sets.filter(s =>
            (s.currentStatus === 'STERILE' || s.currentStatus === 'AVAILABLE') &&
            (q ? s.setCode.toLowerCase().includes(q) || s.setName.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) : true)
        );
    }, [sets, search]);

    const inUse = useMemo(() => {
        const q = search.toLowerCase();
        return sets.filter(s =>
            (s.currentStatus === 'ISSUED' || s.currentStatus === 'IN_USE') &&
            (q ? s.setCode.toLowerCase().includes(q) || s.setName.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) : true)
        );
    }, [sets, search]);

    const issueSet = async (setId: string) => {
        setMovingId(setId);
        try {
            await cssdApi.recordMovement(setId, 'ISSUE_TO_OT', {
                location: locationLabel,
                notes: notes.trim() || `Issued for bedside procedure — ${locationLabel}`,
            });
            toast({ title: 'Set issued to ward successfully.' });
            setNotes('');
            load(true);
            onActionComplete?.();
        } catch (err) {
            toast({ title: 'Could not issue set', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        } finally {
            setMovingId(null);
        }
    };

    const returnSet = async (setId: string) => {
        setMovingId(setId);
        try {
            await cssdApi.recordMovement(setId, 'RETURN', {
                notes: `Returned soiled from ${locationLabel}`,
            });
            toast({ title: 'Set returned to CSSD for reprocessing.' });
            load(true);
            onActionComplete?.();
        } catch (err) {
            toast({ title: 'Could not return set', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
        } finally {
            setMovingId(null);
        }
    };

    const displayedSets = view === 'available' ? available : inUse;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2 text-base">
                        <Package className="h-4 w-4 text-violet-500" /> Sterile Instrument Sets
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Request or return CSSD instrument sets for bedside procedures</p>
                </div>
                {/* View toggle */}
                <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-xl p-1 gap-1 self-start sm:self-auto">
                    <button
                        onClick={() => setView('available')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            view === 'available'
                                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Available
                        {available.length > 0 && (
                            <span className={cn('text-[10px] font-black px-1.5 rounded-full', view === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>
                                {available.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('inuse')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            view === 'inuse'
                                ? 'bg-white dark:bg-zinc-900 text-violet-700 dark:text-violet-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <Microscope className="h-3.5 w-3.5" />
                        In Use
                        {inUse.length > 0 && (
                            <span className={cn('text-[10px] font-black px-1.5 rounded-full', view === 'inuse' ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600')}>
                                {inUse.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Notes field (shown only when issuing) */}
            {view === 'available' && (
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Procedure / Notes (optional)</Label>
                    <Input
                        placeholder="e.g. Central line insertion, Wound dressing..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="h-9 rounded-xl text-sm bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    />
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                    placeholder="Search by code, name or category..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                />
            </div>

            {/* Set list */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sets...
                </div>
            ) : displayedSets.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400">
                    {view === 'available' ? (
                        <>
                            <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="font-semibold text-sm">No sterile sets available</p>
                            <p className="text-xs mt-1">All sets are currently in use or being reprocessed in CSSD.</p>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="font-semibold text-sm">No sets currently issued</p>
                            <p className="text-xs mt-1">No instrument sets are currently out from CSSD.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {displayedSets.map((s, i) => {
                            const statusColor = STATUS_COLOR[s.currentStatus] ?? '';
                            const isBusy = movingId === s.instrumentSetId;
                            return (
                                <motion.div
                                    key={s.instrumentSetId}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <Card className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-sm font-mono text-slate-800 dark:text-zinc-100">{s.setCode}</span>
                                                    <Badge variant="outline" className={cn('text-[9px] font-bold rounded-full border', statusColor)}>
                                                        {s.currentStatus.replace('_', ' ')}
                                                    </Badge>
                                                    {s.category && (
                                                        <Badge variant="outline" className="text-[9px] rounded-full border-slate-200 text-slate-500">
                                                            {s.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{s.setName}</p>
                                                {s.currentLocation && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" /> {s.currentLocation}
                                                    </p>
                                                )}
                                            </div>

                                            {view === 'available' ? (
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 active:scale-[0.97] transition-all shadow-sm"
                                                    disabled={isBusy}
                                                    onClick={() => issueSet(s.instrumentSetId)}
                                                >
                                                    {isBusy
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <><ArrowRight className="h-3.5 w-3.5 mr-1" /> Issue</>
                                                    }
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-xl text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/30 shrink-0 active:scale-[0.97] transition-all"
                                                    disabled={isBusy}
                                                    onClick={() => returnSet(s.instrumentSetId)}
                                                >
                                                    {isBusy
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Return</>
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Info footer */}
            <p className="text-[10px] text-slate-400 text-center">
                {view === 'available'
                    ? 'Issuing a set moves it out of sterile stock. Return it after use so CSSD can reprocess it.'
                    : 'Returning a set sends it back to CSSD as soiled — it will be cleaned, packed and re-sterilized.'
                }
            </p>
        </div>
    );
};
