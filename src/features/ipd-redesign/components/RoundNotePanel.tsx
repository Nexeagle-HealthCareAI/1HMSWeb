import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, MessageSquarePlus } from 'lucide-react';
import { roundNoteApi, type RoundNoteItem, type CreateRoundNoteFields } from '../services/roundNoteApi';
import { formatIstDateTime, toIstDate } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
}

const EDIT_LOCK_HOURS = 24;
const EMPTY_FORM: CreateRoundNoteFields = { subjective: '', objective: '', assessment: '', plan: '', diagnosis: '' };

export const RoundNotePanel: React.FC<Props> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    const [notes, setNotes] = useState<RoundNoteItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [newOpen, setNewOpen] = useState(false);
    const [addendumFor, setAddendumFor] = useState<RoundNoteItem | null>(null);
    const [form, setForm] = useState<CreateRoundNoteFields>({ ...EMPTY_FORM });
    const [addendumReason, setAddendumReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = () => {
        setLoading(true);
        roundNoteApi.getNotes(admissionId)
            .then(setNotes)
            .catch(() => toast({ title: 'Could not load round notes', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const isOlderThanLock = (notedAt: string) => (Date.now() - toIstDate(notedAt).getTime()) > EDIT_LOCK_HOURS * 60 * 60 * 1000;

    const openNew = () => { setForm({ ...EMPTY_FORM }); setNewOpen(true); };
    const openAddendum = (note: RoundNoteItem) => { setAddendumFor(note); setForm({ ...EMPTY_FORM }); setAddendumReason(''); };

    const canSubmit = !!(form.subjective || form.objective || form.assessment || form.plan || form.diagnosis);

    const submit = async () => {
        if (!canSubmit || submitting) {
            toast({ title: 'Incomplete', description: 'At least one section is required.', variant: 'destructive' });
            return;
        }
        if (addendumFor && !addendumReason.trim()) {
            toast({ title: 'Incomplete', description: 'Addendum reason is required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await roundNoteApi.create(admissionId, {
                ...form,
                parentNoteId: addendumFor?.roundNoteId,
                addendumReason: addendumFor ? addendumReason : undefined,
            });
            toast({ title: addendumFor ? 'Addendum added.' : 'Round note recorded.' });
            setNewOpen(false);
            setAddendumFor(null);
            load();
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const notesByParent = notes.reduce<Record<string, RoundNoteItem[]>>((acc, n) => {
        if (n.parentNoteId) (acc[n.parentNoteId] ??= []).push(n);
        return acc;
    }, {});
    const topLevel = notes.filter(n => !n.isAddendum);

    const dialogOpen = newOpen || !!addendumFor;
    const closeDialog = () => { setNewOpen(false); setAddendumFor(null); };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Round Notes</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openNew}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New note
                        </Button>
                    )}
                </div>
            </div>

            {loading && notes.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : topLevel.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No round notes yet.</div>
            ) : (
                <div className="space-y-3">
                    {topLevel.map(n => (
                        <div key={n.roundNoteId} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-xs font-bold text-slate-700">{formatIstDateTime(n.notedAt)}{n.doctorName ? ` · ${n.doctorName}` : ''}</span>
                                {isActive && (
                                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-brand-600" onClick={() => openAddendum(n)}>
                                        <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> Add addendum
                                    </Button>
                                )}
                            </div>
                            {n.diagnosis && <p className="text-sm font-semibold text-slate-800 mt-1.5">{n.diagnosis}</p>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[13px]">
                                {n.subjective && <div><span className="font-bold text-slate-500">S:</span> {n.subjective}</div>}
                                {n.objective && <div><span className="font-bold text-slate-500">O:</span> {n.objective}</div>}
                                {n.assessment && <div><span className="font-bold text-slate-500">A:</span> {n.assessment}</div>}
                                {n.plan && <div><span className="font-bold text-slate-500">P:</span> {n.plan}</div>}
                            </div>

                            {(notesByParent[n.roundNoteId] ?? []).length > 0 && (
                                <div className="mt-3 pl-3 border-l-2 border-slate-100 space-y-2">
                                    {notesByParent[n.roundNoteId].map(a => (
                                        <div key={a.roundNoteId} className="text-[13px]">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="text-[9px] font-bold bg-brand-50 text-brand-700 border-brand-200">ADDENDUM</Badge>
                                                <span className="text-[11px] text-slate-500">{formatIstDateTime(a.notedAt)}{a.doctorName ? ` · ${a.doctorName}` : ''}</span>
                                            </div>
                                            {a.addendumReason && <p className="text-[11px] text-slate-400 italic mt-0.5">{a.addendumReason}</p>}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                {a.subjective && <div><span className="font-bold text-slate-500">S:</span> {a.subjective}</div>}
                                                {a.objective && <div><span className="font-bold text-slate-500">O:</span> {a.objective}</div>}
                                                {a.assessment && <div><span className="font-bold text-slate-500">A:</span> {a.assessment}</div>}
                                                {a.plan && <div><span className="font-bold text-slate-500">P:</span> {a.plan}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isOlderThanLock(n.notedAt) && (
                                <p className="text-[10px] text-slate-400 mt-2">This note is more than 24h old — further changes are recorded as addendums.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{addendumFor ? 'Add addendum' : 'New round note'}</DialogTitle>
                        <DialogDescription>{addendumFor ? `Addendum to the note from ${formatIstDateTime(addendumFor.notedAt)}` : 'SOAP format.'}</DialogDescription>
                    </DialogHeader>
                    {addendumFor && (
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Addendum reason *</Label>
                            <Input value={addendumReason} onChange={e => setAddendumReason(e.target.value)} className="h-9 mt-1" placeholder="Why this addendum is needed" />
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Subjective</Label>
                            <Textarea rows={3} value={form.subjective ?? ''} onChange={e => setForm(f => ({ ...f, subjective: e.target.value }))} className="text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Objective</Label>
                            <Textarea rows={3} value={form.objective ?? ''} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} className="text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Assessment</Label>
                            <Textarea rows={3} value={form.assessment ?? ''} onChange={e => setForm(f => ({ ...f, assessment: e.target.value }))} className="text-sm mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Plan</Label>
                            <Textarea rows={3} value={form.plan ?? ''} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className="text-sm mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-[11px] font-semibold text-slate-600">Diagnosis</Label>
                        <Input value={form.diagnosis ?? ''} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} className="h-9 mt-1" placeholder="Optional" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button disabled={!canSubmit || submitting} onClick={submit} className={cn('bg-brand-600 hover:bg-brand-700')}>
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
