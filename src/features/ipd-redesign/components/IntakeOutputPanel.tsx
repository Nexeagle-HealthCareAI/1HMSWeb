import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { fluidEntryApi, type FluidEntryItem, type FluidDayTotal, type FluidDirection } from '../services/fluidEntryApi';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const IN_SUBTYPES = ['IV', 'Oral'];
const OUT_SUBTYPES = ['Urine', 'Vomitus', 'RT_Aspirate', 'Drain_A', 'Drain_B', 'Stool'];

export const IntakeOutputPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [entries, setEntries] = useState<FluidEntryItem[]>([]);
    const [totals, setTotals] = useState<FluidDayTotal[]>([]);
    const [loading, setLoading] = useState(true);

    const [entryOpen, setEntryOpen] = useState(false);
    const [direction, setDirection] = useState<FluidDirection>('IN');
    const [subtype, setSubtype] = useState(IN_SUBTYPES[0]);
    const [volumeMl, setVolumeMl] = useState('');
    const [routeOrSite, setRouteOrSite] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        fluidEntryApi.getBalance(admissionId)
            .then(({ entries, dailyTotals }) => { setEntries(entries); setTotals(dailyTotals); })
            .catch(() => toast({ title: 'Could not load fluid balance', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openEntry = (dir: FluidDirection, initialSubtype?: string) => {
        if (isSubscriptionReadOnly) { blockAction('Recording fluid entries'); return; }
        setDirection(dir);
        setSubtype(initialSubtype ?? (dir === 'IN' ? IN_SUBTYPES[0] : OUT_SUBTYPES[0]));
        setVolumeMl('');
        setRouteOrSite('');
        setNotes('');
        setEntryOpen(true);
    };

    const submit = async () => {
        const vol = parseFloat(volumeMl);
        if (!vol || vol <= 0 || submitting) {
            toast({ title: 'Incomplete', description: 'Enter a valid volume.', variant: 'destructive' });
            return;
        }
        if (isSubscriptionReadOnly) { blockAction('Recording fluid entries'); return; }
        setSubmitting(true);
        try {
            await fluidEntryApi.record(admissionId, direction, subtype, vol, { routeOrSite: routeOrSite || undefined, notes: notes || undefined });
            toast({ title: 'Entry recorded.' });
            setEntryOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not record entry', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const today = totals[0];

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Intake / Output</h2>
                <Button variant="outline" size="sm" className="h-10 sm:h-9 self-start" onClick={load} disabled={loading}>
                    <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                </Button>
            </div>

            {today && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 sm:p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total In ({today.dayKey})</p>
                        <p className="text-lg font-black text-emerald-800">{today.totalInMl.toLocaleString('en-IN')} mL</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 sm:p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Total Out</p>
                        <p className="text-lg font-black text-amber-800">{today.totalOutMl.toLocaleString('en-IN')} mL</p>
                    </div>
                    <div className={cn('rounded-xl border p-2.5 sm:p-3', today.balanceMl >= 0 ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50')}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Balance</p>
                        <p className="text-lg font-black text-slate-800">{today.balanceMl.toLocaleString('en-IN')} mL</p>
                    </div>
                </div>
            )}

            {isActive && (
                <div className="flex flex-wrap gap-2">
                    {IN_SUBTYPES.map(s => (
                        <Button key={s} size="sm" variant="outline" className="h-10 sm:h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEntry('IN', s)} disabled={isSubscriptionReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> {s}
                        </Button>
                    ))}
                    {OUT_SUBTYPES.map(s => (
                        <Button key={s} size="sm" variant="outline" className="h-10 sm:h-9 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => openEntry('OUT', s)} disabled={isSubscriptionReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> {s.replace('_', ' ')}
                        </Button>
                    ))}
                </div>
            )}

            {loading && entries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : entries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No intake/output entries yet.</div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {entries.map(e => (
                        <div key={e.fluidEntryId} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div>
                                <span className={cn('text-xs font-bold', e.direction === 'IN' ? 'text-emerald-700' : 'text-amber-700')}>
                                    {e.direction === 'IN' ? '+' : '−'} {e.subtype.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-500 ml-2">{e.volumeMl.toLocaleString('en-IN')} mL</span>
                                {e.routeOrSite && <span className="text-[11px] text-slate-400 ml-2">· {e.routeOrSite}</span>}
                            </div>
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatIstDateTime(e.recordedAt)}</span>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-zinc-50">{direction === 'IN' ? 'Record intake' : 'Record output'} — {subtype.replace('_', ' ')}</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Volume in mL.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Volume (mL)</Label>
                            <Input type="number" min={1} max={20000} value={volumeMl} onChange={e => setVolumeMl(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" autoFocus />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Route / site</Label>
                            <Input value={routeOrSite} onChange={e => setRouteOrSite(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" placeholder="Optional" />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Notes</Label>
                            <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-10 mt-1.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" placeholder="Optional" />
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                        <Button variant="outline" className="h-11 sm:h-10 rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all w-full sm:w-auto" onClick={() => setEntryOpen(false)}>Cancel</Button>
                        <Button disabled={!volumeMl || submitting || isSubscriptionReadOnly} onClick={submit} className="h-11 sm:h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all w-full sm:w-auto shadow-md shadow-brand-600/10">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
