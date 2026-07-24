import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Check, X } from 'lucide-react';
import { nursingCarePlanApi, type NursingCarePlanItemModel } from '../services/nursingCarePlanApi';
import { formatIstDateTime } from '../utils/istDate';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface Props {
    admissionId: string;
    isActive: boolean;
}

export const NursingCarePlanPanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [items, setItems] = useState<NursingCarePlanItemModel[]>([]);
    const [loading, setLoading] = useState(true);

    const [newOpen, setNewOpen] = useState(false);
    const [diagnosis, setDiagnosis] = useState('');
    const [goal, setGoal] = useState('');
    const [interventions, setInterventions] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [resolving, setResolving] = useState<{ item: NursingCarePlanItemModel; status: 'RESOLVED' | 'DISCONTINUED' } | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolveBusy, setResolveBusy] = useState(false);

    const load = () => {
        setLoading(true);
        nursingCarePlanApi.getItems(admissionId)
            .then(setItems)
            .catch(() => toast({ title: 'Could not load care plan', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openNew = () => {
        if (isSubscriptionReadOnly) { blockAction('Adding care plan items'); return; }
        setDiagnosis(''); setGoal(''); setInterventions(''); setNewOpen(true);
    };

    const submit = async () => {
        if (!diagnosis.trim() || submitting) {
            toast({ title: 'Incomplete', description: 'Nursing diagnosis is required.', variant: 'destructive' });
            return;
        }
        if (isSubscriptionReadOnly) { blockAction('Adding care plan items'); return; }
        setSubmitting(true);
        try {
            await nursingCarePlanApi.create(admissionId, diagnosis.trim(), goal || undefined, interventions || undefined);
            toast({ title: 'Care plan item added.' });
            setNewOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not add item', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const confirmResolve = async () => {
        if (!resolving) return;
        if (isSubscriptionReadOnly) { blockAction('Resolving care plan items'); return; }
        setResolveBusy(true);
        try {
            await nursingCarePlanApi.resolve(resolving.item.carePlanItemId, resolving.status, resolutionNotes || undefined);
            toast({ title: resolving.status === 'RESOLVED' ? 'Marked resolved.' : 'Discontinued.' });
            setResolving(null);
            setResolutionNotes('');
            load();
        } catch (err) {
            toast({ title: 'Could not update', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setResolveBusy(false);
        }
    };

    const active = items.filter(i => i.statusCode === 'ACTIVE');
    const past = items.filter(i => i.statusCode !== 'ACTIVE');

    const renderItem = (item: NursingCarePlanItemModel) => (
        <div key={item.carePlanItemId} className="rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <p className="font-semibold text-slate-900 dark:text-zinc-100">{item.nursingDiagnosis}</p>
                    {item.goal && <p className="text-[13px] text-slate-600 dark:text-zinc-300 mt-1"><span className="font-bold text-slate-500 dark:text-zinc-450">Goal:</span> {item.goal}</p>}
                    {item.plannedInterventions && <p className="text-[13px] text-slate-600 dark:text-zinc-300 mt-1"><span className="font-bold text-slate-500 dark:text-zinc-450">Interventions:</span> {item.plannedInterventions}</p>}
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-medium">Opened {formatIstDateTime(item.createdAt)}{item.createdBy ? ` · ${item.createdBy}` : ''}</p>
                    {item.statusCode !== 'ACTIVE' && (
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                            <Badge variant="outline" className={cn('text-[9px] font-bold mr-1.5 rounded-full', item.statusCode === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30' : 'bg-slate-105 text-slate-500 border-slate-200 dark:bg-zinc-850 dark:text-zinc-400 dark:border-zinc-750')}>
                                {item.statusCode}
                            </Badge>
                            {item.resolvedAt ? formatIstDateTime(item.resolvedAt) : ''}{item.resolutionNotes ? ` — ${item.resolutionNotes}` : ''}
                        </p>
                    )}
                </div>
                {isActive && item.statusCode === 'ACTIVE' && (
                    <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/35 rounded-xl active:scale-[0.98] transition-all" disabled={isSubscriptionReadOnly} onClick={() => { if (isSubscriptionReadOnly) { blockAction('Resolving care plan items'); return; } setResolving({ item, status: 'RESOLVED' }); setResolutionNotes(''); }}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Resolve
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 sm:h-8 text-xs text-slate-455 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-455 rounded-xl active:scale-[0.98] transition-all" disabled={isSubscriptionReadOnly} onClick={() => { if (isSubscriptionReadOnly) { blockAction('Resolving care plan items'); return; } setResolving({ item, status: 'DISCONTINUED' }); setResolutionNotes(''); }}>
                            <X className="h-3.5 w-3.5 mr-1" /> Discontinue
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Nursing Care Plan</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none rounded-xl active:scale-[0.98] transition-all" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 font-semibold rounded-xl active:scale-[0.98] transition-all" onClick={openNew} disabled={isSubscriptionReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add diagnosis
                        </Button>
                    )}
                </div>
            </div>

            {loading && items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No nursing care plan items yet.</div>
            ) : (
                <div className="space-y-4">
                    {active.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Active</h3>
                            {active.map(renderItem)}
                        </div>
                    )}
                    {past.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Resolved / Discontinued</h3>
                            {past.map(renderItem)}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl bg-white dark:bg-zinc-950">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">Add nursing diagnosis</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">Free text — not a coded taxonomy.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Nursing diagnosis *</Label>
                            <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all dark:text-zinc-150" placeholder="e.g. Risk for falls related to decreased mobility" autoFocus />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Goal</Label>
                            <Textarea rows={2} value={goal} onChange={e => setGoal(e.target.value)} className="text-sm mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 transition-all p-3 resize-none w-full dark:bg-zinc-900 dark:text-zinc-150" placeholder="Optional" />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Planned interventions</Label>
                            <Textarea rows={3} value={interventions} onChange={e => setInterventions(e.target.value)} className="text-sm mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 transition-all p-3 resize-none w-full dark:bg-zinc-900 dark:text-zinc-150" placeholder="Optional" />
                        </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                        <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200 dark:border-zinc-800" onClick={() => setNewOpen(false)}>Cancel</Button>
                        <Button disabled={!diagnosis.trim() || submitting || isSubscriptionReadOnly} onClick={submit} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white shadow-md shadow-brand-500/10">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!resolving} onOpenChange={(o) => { if (!o) setResolving(null); }}>
                <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm rounded-[24px] border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-xl bg-white dark:bg-zinc-950">
                    {resolving && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-zinc-50">{resolving.status === 'RESOLVED' ? 'Mark resolved' : 'Discontinue'}?</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">{resolving.item.nursingDiagnosis}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 my-2">
                                <div>
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 dark:text-zinc-550">Notes</Label>
                                    <Textarea rows={2} value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="text-sm mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 transition-all p-3 resize-none w-full dark:bg-zinc-900 dark:text-zinc-150" placeholder="Optional notes..." />
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800/80 mt-4">
                                <Button variant="outline" className="h-11 rounded-xl font-bold active:scale-[0.98] transition-all border-slate-200 dark:border-zinc-800" onClick={() => setResolving(null)}>Cancel</Button>
                                <Button disabled={resolveBusy || isSubscriptionReadOnly} className="h-11 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white shadow-md shadow-brand-500/10" onClick={confirmResolve}>
                                    {resolveBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Confirm
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
