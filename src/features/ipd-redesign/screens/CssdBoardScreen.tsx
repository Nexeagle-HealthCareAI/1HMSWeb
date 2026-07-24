import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Plus, Loader2, Check, History } from 'lucide-react';
import {
    cssdApi, type InstrumentSet, type SterilizationCycle, type InstrumentSetMovementType,
} from '../services/cssdApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    onBack: () => void;
}

const STATUS_TONE: Record<string, string> = {
    AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_USE: 'bg-violet-50 text-violet-700 border-violet-200',
    RETURNED_SOILED: 'bg-amber-50 text-amber-700 border-amber-200',
    WASHING: 'bg-amber-50 text-amber-700 border-amber-200',
    PACKED: 'bg-sky-50 text-sky-700 border-sky-200',
    STERILIZING: 'bg-sky-50 text-sky-700 border-sky-200',
    STERILE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    QUARANTINED: 'bg-rose-50 text-rose-700 border-rose-200',
    RETIRED: 'bg-slate-100 text-slate-500',
};

// Movement options offered per current status — the natural next step(s) in the loop.
const NEXT_MOVEMENTS: Record<string, { type: InstrumentSetMovementType; label: string }[]> = {
    AVAILABLE: [{ type: 'ISSUE_TO_OT', label: 'Issue to OT' }],
    ISSUED: [{ type: 'RETURN', label: 'Return' }],
    IN_USE: [{ type: 'RETURN', label: 'Return' }],
    RETURNED_SOILED: [{ type: 'SEND_TO_WASH', label: 'Send to wash' }],
    WASHING: [{ type: 'PACK', label: 'Pack' }],
    PACKED: [{ type: 'QUARANTINE', label: 'Quarantine' }],
    STERILE: [{ type: 'RECEIVE_STERILE', label: 'Store (back to available)' }],
    QUARANTINED: [{ type: 'DISCARD', label: 'Discard' }],
};

/**
 * CSSD board — hospital-wide, not per-patient (sets aren't tied to one admission until issued),
 * same shape as BedBoardScreen. Set list grouped by status + sterilization cycle history. Issuing
 * a set to a specific surgery case happens from the OT case's own Intra-op panel, not here.
 */
export const CssdBoardScreen: React.FC<Props> = ({ onBack }) => {
    const { toast } = useToast();
    const [sets, setSets] = useState<InstrumentSet[]>([]);
    const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [movingSetId, setMovingSetId] = useState<string | null>(null);

    const [showNewSet, setShowNewSet] = useState(false);
    const [setCode, setSetCode] = useState('');
    const [setName, setSetName] = useState('');
    const [setCategory, setSetCategory] = useState('');
    const [newSetBusy, setNewSetBusy] = useState(false);

    const [showCycle, setShowCycle] = useState(false);
    const [cycleNumber, setCycleNumber] = useState('');
    const [autoclaveLabel, setAutoclaveLabel] = useState('');
    const [cycleType, setCycleType] = useState<'STEAM' | 'ETO' | 'PLASMA'>('STEAM');
    const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
    const [bioResult, setBioResult] = useState<'PASS' | 'FAIL' | 'PENDING'>('PENDING');
    const [cycleBusy, setCycleBusy] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([cssdApi.getSets(), cssdApi.getCycleHistory(30)])
            .then(([s, c]) => { setSets(s); setCycles(c); })
            .catch(() => { setSets([]); setCycles([]); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const grouped = sets.reduce<Record<string, InstrumentSet[]>>((acc, s) => {
        (acc[s.currentStatus] ??= []).push(s);
        return acc;
    }, {});

    const runMovement = async (setId: string, type: InstrumentSetMovementType) => {
        setMovingSetId(setId);
        try {
            await cssdApi.recordMovement(setId, type);
            toast({ title: 'Movement recorded.' });
            load();
        } catch (err) {
            toast({ title: 'Could not record movement', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setMovingSetId(null);
        }
    };

    const submitNewSet = async () => {
        if (!setCode.trim() || !setName.trim()) {
            toast({ title: 'Set code and name are required', variant: 'destructive' });
            return;
        }
        setNewSetBusy(true);
        try {
            await cssdApi.createSet({ setCode: setCode.trim(), setName: setName.trim(), category: setCategory.trim() || undefined });
            toast({ title: 'Instrument set created.' });
            setShowNewSet(false);
            setSetCode(''); setSetName(''); setSetCategory('');
            load();
        } catch (err) {
            toast({ title: 'Could not create set', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setNewSetBusy(false);
        }
    };

    const submitCycle = async () => {
        if (!cycleNumber.trim() || selectedSetIds.size === 0) {
            toast({ title: 'Cycle number and at least one set are required', variant: 'destructive' });
            return;
        }
        setCycleBusy(true);
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
            setShowCycle(false);
            setCycleNumber(''); setAutoclaveLabel(''); setSelectedSetIds(new Set()); setBioResult('PENDING');
            load();
        } catch (err) {
            toast({ title: 'Could not record cycle', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setCycleBusy(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard</Button>
                    <div className="h-11 w-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900">CSSD Board</h1>
                        <p className="text-xs text-slate-500">Instrument set/tray tracking &amp; sterilization cycle log.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10" onClick={() => setShowCycle(o => !o)}>
                        <History className="h-4 w-4 mr-2" /> Record cycle
                    </Button>
                    <Button className="h-10 bg-brand-600 hover:bg-brand-700" onClick={() => setShowNewSet(o => !o)}>
                        <Plus className="h-4 w-4 mr-2" /> New set
                    </Button>
                </div>
            </div>

            {showNewSet && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">New instrument set</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><Label className="text-[11px] font-semibold text-slate-600">Set code</Label><Input value={setCode} onChange={e => setSetCode(e.target.value)} className="h-9 mt-1" /></div>
                        <div><Label className="text-[11px] font-semibold text-slate-600">Set name</Label><Input value={setName} onChange={e => setSetName(e.target.value)} className="h-9 mt-1" /></div>
                        <div><Label className="text-[11px] font-semibold text-slate-600">Category</Label><Input value={setCategory} onChange={e => setSetCategory(e.target.value)} placeholder="e.g. GENERAL, ORTHO" className="h-9 mt-1" /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowNewSet(false)}>Cancel</Button>
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={newSetBusy} onClick={submitNewSet}>
                            {newSetBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Create
                        </Button>
                    </div>
                </div>
            )}

            {showCycle && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Record sterilization cycle</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><Label className="text-[11px] font-semibold text-slate-600">Cycle number</Label><Input value={cycleNumber} onChange={e => setCycleNumber(e.target.value)} className="h-9 mt-1" /></div>
                        <div><Label className="text-[11px] font-semibold text-slate-600">Autoclave</Label><Input value={autoclaveLabel} onChange={e => setAutoclaveLabel(e.target.value)} className="h-9 mt-1" /></div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-650">Type</Label>
                            <Select value={cycleType} onValueChange={val => setCycleType(val as 'STEAM' | 'ETO' | 'PLASMA')}>
                                <SelectTrigger className="h-9 mt-1 w-full text-sm border border-slate-200 dark:border-zinc-800 rounded-xl px-3 bg-white dark:bg-zinc-900 outline-none text-left focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                    <SelectValue placeholder="Steam" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
                                    <SelectItem value="STEAM" className="rounded-lg cursor-pointer font-semibold text-xs py-2">Steam</SelectItem>
                                    <SelectItem value="ETO" className="rounded-lg cursor-pointer font-semibold text-xs py-2">ETO</SelectItem>
                                    <SelectItem value="PLASMA" className="rounded-lg cursor-pointer font-semibold text-xs py-2">Plasma</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Sets in this load (from Packed)</Label>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {(grouped.PACKED ?? []).length === 0 ? (
                                <p className="text-xs text-slate-400">No packed sets available.</p>
                            ) : (grouped.PACKED ?? []).map(s => (
                                <label key={s.instrumentSetId} className={cn('flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg border cursor-pointer',
                                    selectedSetIds.has(s.instrumentSetId) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600')}>
                                    <input type="checkbox" checked={selectedSetIds.has(s.instrumentSetId)} onChange={e => {
                                        const next = new Set(selectedSetIds);
                                        if (e.target.checked) next.add(s.instrumentSetId); else next.delete(s.instrumentSetId);
                                        setSelectedSetIds(next);
                                    }} className="h-3.5 w-3.5" />
                                    {s.setCode}
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                         <Label className="text-[11px] font-semibold text-slate-655">Biological indicator result</Label>
                         <Select value={bioResult} onValueChange={val => setBioResult(val as 'PASS' | 'FAIL' | 'PENDING')}>
                             <SelectTrigger className="h-9 mt-1 w-full sm:w-48 text-sm border border-slate-200 dark:border-zinc-800 rounded-xl px-3 bg-white dark:bg-zinc-900 outline-none text-left focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                 <SelectValue placeholder="Pending" />
                             </SelectTrigger>
                             <SelectContent className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl">
                                 <SelectItem value="PENDING" className="rounded-lg cursor-pointer font-semibold text-xs py-2">Pending</SelectItem>
                                 <SelectItem value="PASS" className="rounded-lg cursor-pointer font-semibold text-xs py-2">Pass</SelectItem>
                                 <SelectItem value="FAIL" className="rounded-lg cursor-pointer font-semibold text-xs py-2">Fail</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-9" onClick={() => setShowCycle(false)}>Cancel</Button>
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" disabled={cycleBusy} onClick={submitCycle}>
                            {cycleBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Record cycle
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
                <>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                            <h2 className="text-sm font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Instrument Set Queues</h2>
                        </div>
                        {sets.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-slate-400 dark:text-zinc-550">
                                No instrument sets yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {[
                                    {
                                        title: 'Soiled & Washing',
                                        subtitle: 'Decontamination & cleaning stage',
                                        statuses: ['RETURNED_SOILED', 'WASHING'],
                                        tone: 'amber' as const
                                    },
                                    {
                                        title: 'Packed & Sterilizing',
                                        subtitle: 'Autoclave loads & biological checks',
                                        statuses: ['PACKED', 'STERILIZING'],
                                        tone: 'sky' as const
                                    },
                                    {
                                        title: 'Sterile Stock & Active',
                                        subtitle: 'Ready to issue or in active clinical use',
                                        statuses: ['STERILE', 'AVAILABLE', 'ISSUED', 'IN_USE'],
                                        tone: 'emerald' as const
                                    }
                                ].map(q => {
                                    const queueSets = sets.filter(s => q.statuses.includes(s.currentStatus));
                                    const borderTone = {
                                        amber: 'border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/5',
                                        sky: 'border-sky-100 dark:border-sky-900/30 bg-sky-50/20 dark:bg-sky-950/5',
                                        emerald: 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/5'
                                    }[q.tone];
                                    const headerTone = {
                                        amber: 'text-amber-700 bg-amber-100/50 dark:bg-amber-950/30',
                                        sky: 'text-sky-700 bg-sky-100/50 dark:bg-sky-950/30',
                                        emerald: 'text-emerald-700 bg-emerald-100/50 dark:bg-emerald-950/30'
                                    }[q.tone];

                                    return (
                                        <div key={q.title} className={cn('rounded-2xl border p-4 flex flex-col space-y-4 min-h-[300px]', borderTone)}>
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', headerTone)}>{q.title}</span>
                                                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-zinc-500">{queueSets.length} sets</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">{q.subtitle}</p>
                                            </div>
                                            <div className="space-y-2.5 overflow-y-auto max-h-[450px] pr-1.5 hide-scrollbar">
                                                {queueSets.length === 0 ? (
                                                    <div className="text-xs text-slate-400 dark:text-zinc-650 italic py-8 text-center border border-dashed border-slate-100 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/50">
                                                        No sets in this stage
                                                    </div>
                                                ) : queueSets.map(s => (
                                                    <div key={s.instrumentSetId} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-805/80 rounded-xl p-3 shadow-sm flex flex-col gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all">
                                                        <div>
                                                            <div className="flex items-center justify-between gap-1.5">
                                                                <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm font-mono">{s.setCode}</span>
                                                                <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0 border', STATUS_TONE[s.currentStatus])}>{s.currentStatus.replace('_', ' ')}</Badge>
                                                            </div>
                                                            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">{s.setName}</p>
                                                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                                                {s.category && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-200/60 dark:border-zinc-850 text-slate-400">{s.category}</Badge>}
                                                                {s.currentLocation && <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{s.currentLocation}</span>}
                                                            </div>
                                                        </div>
                                                        {(NEXT_MOVEMENTS[s.currentStatus] ?? []).length > 0 && (
                                                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-50 dark:border-zinc-800/40">
                                                                {(NEXT_MOVEMENTS[s.currentStatus] ?? []).map(m => (
                                                                    <Button key={m.type} size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl w-full border-brand-100 hover:border-brand-200 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-brand-600 dark:text-brand-400 active:scale-[0.98] transition-all"
                                                                        disabled={movingSetId === s.instrumentSetId}
                                                                        onClick={() => runMovement(s.instrumentSetId, m.type)}>
                                                                        {movingSetId === s.instrumentSetId ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} {m.label}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {(() => {
                            const otherSets = sets.filter(s => !['RETURNED_SOILED', 'WASHING', 'PACKED', 'STERILIZING', 'STERILE', 'AVAILABLE', 'ISSUED', 'IN_USE'].includes(s.currentStatus));
                            if (otherSets.length === 0) return null;
                            return (
                                <div className="mt-4 p-4 rounded-2xl border border-rose-105 dark:border-rose-950/30 bg-rose-50/10 dark:bg-rose-950/5">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2">Retired or Quarantined Sets ({otherSets.length})</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {otherSets.map(s => (
                                            <div key={s.instrumentSetId} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <span className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm font-mono">{s.setCode}</span>
                                                    <Badge variant="outline" className={cn('text-[9px] font-bold px-1.5 py-0 border', STATUS_TONE[s.currentStatus])}>{s.currentStatus.replace('_', ' ')}</Badge>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{s.setName}</p>
                                                {(NEXT_MOVEMENTS[s.currentStatus] ?? []).length > 0 && (
                                                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-50 dark:border-zinc-800/40">
                                                        {(NEXT_MOVEMENTS[s.currentStatus] ?? []).map(m => (
                                                            <Button key={m.type} size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl w-full border-brand-100 hover:border-brand-200 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-brand-600 dark:text-brand-400 active:scale-[0.98] transition-all"
                                                                disabled={movingSetId === s.instrumentSetId}
                                                                onClick={() => runMovement(s.instrumentSetId, m.type)}>
                                                                {movingSetId === s.instrumentSetId ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null} {m.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Sterilization cycle history</h2>
                        {cycles.length === 0 ? (
                            <p className="text-sm text-slate-400">No cycles recorded yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {cycles.map(c => (
                                    <div key={c.sterilizationCycleId} className="p-2.5 rounded-lg border border-slate-100">
                                        <div className="flex items-center justify-between flex-wrap gap-1.5">
                                            <span className="text-sm font-bold text-slate-800">{c.cycleNumber} · {c.cycleType}{c.autoclaveLabel ? ` · ${c.autoclaveLabel}` : ''}</span>
                                            <span className="text-[11px] text-slate-500">{formatIstDateTime(c.startedAt)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Sets: {c.setCodes.join(', ') || '—'} · By {c.operatorName}
                                        </p>
                                        <Badge variant="outline" className={cn('mt-1 text-[10px] font-bold', c.biologicalIndicatorResult === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : c.biologicalIndicatorResult === 'FAIL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500')}>
                                            BI: {c.biologicalIndicatorResult}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
