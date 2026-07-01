import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Check } from 'lucide-react';
import { shiftHandoverApi, type ShiftHandoverNoteItem, type ShiftCode } from '../services/shiftHandoverApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
    isActive: boolean;
    outgoingNurseDefaultName?: string | null;
}

const SHIFTS: ShiftCode[] = ['MORNING', 'EVENING', 'NIGHT'];

const guessShift = (): ShiftCode => {
    const h = new Date().getHours();
    if (h >= 7 && h < 14) return 'MORNING';
    if (h >= 14 && h < 21) return 'EVENING';
    return 'NIGHT';
};

export const ShiftHandoverPanel: React.FC<Props> = ({ admissionId, isActive, outgoingNurseDefaultName }) => {
    const { toast } = useToast();
    const [notes, setNotes] = useState<ShiftHandoverNoteItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [newOpen, setNewOpen] = useState(false);
    const [mode, setMode] = useState<'structured' | 'freeText'>('structured');
    const [shiftCode, setShiftCode] = useState<ShiftCode>(guessShift());
    const [outgoingNurseName, setOutgoingNurseName] = useState('');
    const [incomingNurseName, setIncomingNurseName] = useState('');
    const [freeTextNote, setFreeTextNote] = useState('');
    const [situation, setSituation] = useState('');
    const [background, setBackground] = useState('');
    const [assessment, setAssessment] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [ackingId, setAckingId] = useState<string | null>(null);
    const [ackName, setAckName] = useState('');
    const [ackBusy, setAckBusy] = useState(false);

    const load = () => {
        setLoading(true);
        shiftHandoverApi.getNotes(admissionId)
            .then(setNotes)
            .catch(() => toast({ title: 'Could not load handovers', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const openNew = () => {
        setMode('structured');
        setShiftCode(guessShift());
        setOutgoingNurseName(outgoingNurseDefaultName ?? '');
        setIncomingNurseName('');
        setFreeTextNote('');
        setSituation(''); setBackground(''); setAssessment(''); setRecommendation('');
        setNewOpen(true);
    };

    const canSubmit = outgoingNurseName.trim().length > 0 && (mode === 'freeText' ? freeTextNote.trim().length > 0 : situation.trim().length > 0);

    const submit = async () => {
        if (!canSubmit || submitting) {
            toast({ title: 'Incomplete', description: mode === 'freeText' ? 'Free-text note is required.' : 'Situation is required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            await shiftHandoverApi.create(admissionId, {
                shiftCode,
                outgoingNurseName: outgoingNurseName.trim(),
                incomingNurseName: incomingNurseName || undefined,
                isFreeText: mode === 'freeText',
                freeTextNote: mode === 'freeText' ? freeTextNote.trim() : undefined,
                situation: mode === 'structured' ? situation.trim() : undefined,
                background: mode === 'structured' ? (background || undefined) : undefined,
                assessment: mode === 'structured' ? (assessment || undefined) : undefined,
                recommendation: mode === 'structured' ? (recommendation || undefined) : undefined,
            });
            toast({ title: 'Handover recorded.' });
            setNewOpen(false);
            load();
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const openAck = (note: ShiftHandoverNoteItem) => { setAckingId(note.shiftHandoverNoteId); setAckName(''); };

    const confirmAck = async () => {
        if (!ackingId || !ackName.trim()) return;
        setAckBusy(true);
        try {
            await shiftHandoverApi.acknowledge(ackingId, ackName.trim());
            toast({ title: 'Handover acknowledged.' });
            setAckingId(null);
            load();
        } catch (err) {
            toast({ title: 'Could not acknowledge', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setAckBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">SBAR Shift Handover</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
                        <RefreshCw className={loading ? 'h-3.5 w-3.5 mr-1.5 animate-spin' : 'h-3.5 w-3.5 mr-1.5'} /> Refresh
                    </Button>
                    {isActive && (
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700 font-semibold" onClick={openNew}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New handover
                        </Button>
                    )}
                </div>
            </div>

            {loading && notes.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : notes.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No shift handovers recorded yet.</div>
            ) : (
                <div className="space-y-3">
                    {notes.map(n => (
                        <div key={n.shiftHandoverNoteId} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-[9px] font-bold bg-brand-50 text-brand-700 border-brand-200">{n.shiftCode}</Badge>
                                    <span className="text-xs font-bold text-slate-700">{formatIstDateTime(n.handoverAt)}</span>
                                    <span className="text-[11px] text-slate-500">from {n.outgoingNurseName}</span>
                                </div>
                                {n.incomingAckAt ? (
                                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Acknowledged by {n.incomingNurseName}</span>
                                ) : isActive ? (
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openAck(n)}>Acknowledge</Button>
                                ) : null}
                            </div>
                            {n.isFreeText ? (
                                <p className="text-[13px] text-slate-700 mt-2 whitespace-pre-wrap">{n.freeTextNote}</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[13px]">
                                    {n.situation && <div><span className="font-bold text-slate-500">S:</span> {n.situation}</div>}
                                    {n.background && <div><span className="font-bold text-slate-500">B:</span> {n.background}</div>}
                                    {n.assessment && <div><span className="font-bold text-slate-500">A:</span> {n.assessment}</div>}
                                    {n.recommendation && <div><span className="font-bold text-slate-500">R:</span> {n.recommendation}</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New shift handover</DialogTitle>
                        <DialogDescription>Structured SBAR is the default — switch to free text any time; only Situation is ever required.</DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 w-fit">
                        <button type="button" onClick={() => setMode('structured')}
                            className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all', mode === 'structured' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            Structured (SBAR)
                        </button>
                        <button type="button" onClick={() => setMode('freeText')}
                            className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all', mode === 'freeText' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                            Free text
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Shift</Label>
                            <select value={shiftCode} onChange={e => setShiftCode(e.target.value as ShiftCode)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 bg-white">
                                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Outgoing nurse *</Label>
                            <Input value={outgoingNurseName} onChange={e => setOutgoingNurseName(e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Incoming nurse</Label>
                            <Input value={incomingNurseName} onChange={e => setIncomingNurseName(e.target.value)} className="h-9 mt-1" placeholder="Optional" />
                        </div>
                    </div>

                    {mode === 'freeText' ? (
                        <div>
                            <Label className="text-[11px] font-semibold text-slate-600">Handover note *</Label>
                            <Textarea rows={6} value={freeTextNote} onChange={e => setFreeTextNote(e.target.value)} className="text-sm mt-1" placeholder="Write the handover in your own words" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Situation *</Label>
                                <Textarea rows={3} value={situation} onChange={e => setSituation(e.target.value)} className="text-sm mt-1" placeholder="Why is the patient here, current status" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Background</Label>
                                <Textarea rows={3} value={background} onChange={e => setBackground(e.target.value)} className="text-sm mt-1" placeholder="Optional — allergies, comorbidities, precautions" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Assessment</Label>
                                <Textarea rows={3} value={assessment} onChange={e => setAssessment(e.target.value)} className="text-sm mt-1" placeholder="Optional — vitals, lines, drains, meds" />
                            </div>
                            <div>
                                <Label className="text-[11px] font-semibold text-slate-600">Recommendation</Label>
                                <Textarea rows={3} value={recommendation} onChange={e => setRecommendation(e.target.value)} className="text-sm mt-1" placeholder="Optional — plan for the next shift" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                        <Button disabled={!canSubmit || submitting} onClick={submit} className="bg-brand-600 hover:bg-brand-700">
                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!ackingId} onOpenChange={(o) => { if (!o) setAckingId(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Acknowledge handover</DialogTitle>
                        <DialogDescription>Confirm you've received this handover.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Your name *</Label>
                        <Input value={ackName} onChange={e => setAckName(e.target.value)} className="h-9 mt-1" autoFocus />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setAckingId(null)}>Cancel</Button>
                        <Button disabled={!ackName.trim() || ackBusy} className="bg-brand-600 hover:bg-brand-700" onClick={confirmAck}>
                            {ackBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Acknowledge
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
