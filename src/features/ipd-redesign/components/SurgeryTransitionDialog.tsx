import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { surgeryCaseApi, type SurgeryStatus } from '../services/surgeryCaseApi';
import { otBookingApi, type OperationTheatre, type OtBoardCase } from '../services/otBookingApi';
import { WHO_CHECKLIST_PHASES, type ChecklistPhaseKey } from './surgeryChecklistItems';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    surgeryCase: OtBoardCase | null;
    toStatus: SurgeryStatus | null;
    onSuccess: (surgeryCaseId: string, toStatus: SurgeryStatus) => void;
}

// A checklist-phase sub-section used for both the In-Theatre (Sign-In) and Post-Op
// (Time-Out + Sign-Out) transitions -- collapses to a "done" summary once completed, otherwise
// shows the WHO items as checkboxes with its own submit button.
const ChecklistPhaseSection: React.FC<{
    surgeryCaseId: string;
    phase: ChecklistPhaseKey;
    done: boolean;
    onDone: () => void;
}> = ({ surgeryCaseId, phase, done, onDone }) => {
    const { toast } = useToast();
    const meta = WHO_CHECKLIST_PHASES.find(p => p.key === phase)!;
    const [items, setItems] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState(!done);

    const submit = async () => {
        setBusy(true);
        try {
            if (phase === 'signIn') await surgeryCaseApi.recordSignIn(surgeryCaseId, { items });
            else if (phase === 'timeOut') await surgeryCaseApi.recordTimeOut(surgeryCaseId, { items });
            else await surgeryCaseApi.recordSignOut(surgeryCaseId, { items });
            toast({ title: `${meta.label} recorded.` });
            setExpanded(false);
            onDone();
        } catch (err) {
            toast({ title: `Could not record ${meta.label}`, description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={cn('rounded-2xl border p-4 shadow-sm transition-all duration-200', done ? 'border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/15' : 'border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10')}>
            <button type="button" className="w-full flex items-center justify-between gap-2" onClick={() => setExpanded(o => !o)}>
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-200">
                    {done ? (
                        <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    ) : (
                        <span className="h-4 w-4 rounded-full border-2 border-amber-400 shrink-0" />
                    )}
                    {meta.label}
                </span>
                {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>
            {expanded && !done && (
                <div className="mt-3.5 space-y-2.5">
                    {meta.items.map(item => (
                        <label key={item.key} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-zinc-300 font-medium cursor-pointer">
                            <input type="checkbox" checked={!!items[item.key]} onChange={e => setItems({ ...items, [item.key]: e.target.checked })} className="h-4.5 w-4.5 rounded border-slate-205 dark:border-zinc-800 text-brand-600 focus:ring-brand-500/20 mt-0.5" />
                            <span>{item.label}</span>
                        </label>
                    ))}
                    <div className="flex justify-end pt-2">
                        <Button size="sm" className="h-10 rounded-xl text-xs bg-brand-600 hover:bg-brand-700 font-bold active:scale-[0.98] transition-all px-4" disabled={busy} onClick={submit}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Complete {meta.label.split(' ')[0]}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Opened when a card is dropped on a column whose transition needs data the board doesn't already
 * have (or that the backend gates) -- booking a theatre, the Pre-Op + WHO checklist gates before
 * In Theatre, the Time-Out/Sign-Out gates (+ optional intra-op notes) before Post-Op, a completion
 * confirm, or a cancellation reason. Ungated hops (Scheduled->Pre-Op) never open this; the board
 * calls updateStatus directly for those.
 */
export const SurgeryTransitionDialog: React.FC<Props> = ({ open, onOpenChange, surgeryCase, toStatus, onSuccess }) => {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    // Scheduling
    const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
    const [theatreId, setTheatreId] = useState('');
    const [scheduledStart, setScheduledStart] = useState('');
    const [scheduledEnd, setScheduledEnd] = useState('');

    // Pre-Op (only relevant for -> IN_THEATRE)
    const [preOpDone, setPreOpDone] = useState(false);
    const [preOpExpanded, setPreOpExpanded] = useState(true);
    const [asaGrade, setAsaGrade] = useState('');
    const [npoConfirmed, setNpoConfirmed] = useState(false);
    const [allergiesReviewed, setAllergiesReviewed] = useState(false);
    const [investigationsReviewed, setInvestigationsReviewed] = useState(false);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [preOpBusy, setPreOpBusy] = useState(false);

    // WHO checklist completion, tracked locally so the finalize button can react immediately
    const [signInDone, setSignInDone] = useState(false);
    const [timeOutDone, setTimeOutDone] = useState(false);
    const [signOutDone, setSignOutDone] = useState(false);

    // Optional intra-op (only relevant for -> POST_OP)
    const [anaesthesiaType, setAnaesthesiaType] = useState('');
    const [surgeryStartAt, setSurgeryStartAt] = useState('');
    const [surgeryEndAt, setSurgeryEndAt] = useState('');
    const [estimatedBloodLossMl, setEstimatedBloodLossMl] = useState('');
    const [findings, setFindings] = useState('');

    // Cancel
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (!open || !surgeryCase) return;
        setTheatreId(''); setScheduledStart(''); setScheduledEnd('');
        setPreOpDone(surgeryCase.preOpAssessmentComplete); setPreOpExpanded(!surgeryCase.preOpAssessmentComplete);
        setAsaGrade(''); setNpoConfirmed(false); setAllergiesReviewed(false); setInvestigationsReviewed(false); setConsentConfirmed(false);
        setSignInDone(surgeryCase.signInComplete);
        setTimeOutDone(surgeryCase.timeOutComplete);
        setSignOutDone(surgeryCase.signOutComplete);
        setAnaesthesiaType(''); setSurgeryStartAt(''); setSurgeryEndAt(''); setEstimatedBloodLossMl(''); setFindings('');
        setCancelReason('');
        if (toStatus === 'SCHEDULED') otBookingApi.getTheatres().then(setTheatres).catch(() => setTheatres([]));
    }, [open, surgeryCase, toStatus]);

    if (!surgeryCase || !toStatus) return null;

    const submitPreOp = async () => {
        setPreOpBusy(true);
        try {
            await surgeryCaseApi.recordPreOp(surgeryCase.surgeryCaseId, { asaGrade: asaGrade || undefined, npoConfirmed, allergiesReviewed, investigationsReviewed, consentConfirmed });
            toast({ title: 'Pre-op assessment saved.' });
            setPreOpDone(true);
            setPreOpExpanded(false);
        } catch (err) {
            toast({ title: 'Could not save pre-op assessment', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setPreOpBusy(false);
        }
    };

    const finalize = async () => {
        setSubmitting(true);
        try {
            if (toStatus === 'SCHEDULED') {
                if (!theatreId || !scheduledStart || !scheduledEnd) return;
                await otBookingApi.book(surgeryCase.surgeryCaseId, theatreId, new Date(scheduledStart).toISOString(), new Date(scheduledEnd).toISOString());
            } else if (toStatus === 'POST_OP') {
                const hasIntraOp = anaesthesiaType || surgeryStartAt || surgeryEndAt || estimatedBloodLossMl || findings;
                if (hasIntraOp) {
                    await surgeryCaseApi.saveIntraOp(surgeryCase.surgeryCaseId, {
                        anaesthesiaType: anaesthesiaType || undefined,
                        surgeryStartAt: surgeryStartAt ? new Date(surgeryStartAt).toISOString() : undefined,
                        surgeryEndAt: surgeryEndAt ? new Date(surgeryEndAt).toISOString() : undefined,
                        estimatedBloodLossMl: estimatedBloodLossMl ? Number(estimatedBloodLossMl) : undefined,
                        findings: findings || undefined,
                    });
                }
                await surgeryCaseApi.updateStatus(surgeryCase.surgeryCaseId, 'POST_OP');
            } else if (toStatus === 'CANCELLED') {
                if (!cancelReason.trim()) return;
                await surgeryCaseApi.updateStatus(surgeryCase.surgeryCaseId, 'CANCELLED', cancelReason.trim());
            } else {
                await surgeryCaseApi.updateStatus(surgeryCase.surgeryCaseId, toStatus);
            }
            toast({ title: `Moved to ${toStatus.replace('_', ' ')}.` });
            onSuccess(surgeryCase.surgeryCaseId, toStatus);
            onOpenChange(false);
        } catch (err) {
            toast({ title: 'Could not complete the move', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const canFinalize =
        toStatus === 'SCHEDULED' ? !!(theatreId && scheduledStart && scheduledEnd) :
        toStatus === 'IN_THEATRE' ? (preOpDone && signInDone) :
        toStatus === 'POST_OP' ? (timeOutDone && signOutDone) :
        toStatus === 'CANCELLED' ? !!cancelReason.trim() :
        true;

    const finalizeLabel = toStatus === 'SCHEDULED' ? 'Book & schedule'
        : toStatus === 'CANCELLED' ? 'Confirm cancellation'
        : toStatus === 'COMPLETED' ? 'Mark complete'
        : `Move to ${toStatus.replace('_', ' ')}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-800 dark:text-zinc-200">{surgeryCase.patientName || 'Patient'} — {toStatus.replace('_', ' ')}</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">{surgeryCase.procedureName}</DialogDescription>
                </DialogHeader>

                {toStatus === 'SCHEDULED' && (
                    <div className="space-y-4 my-2">
                        <div className="flex flex-col gap-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Theatre</Label>
                            <Select value={theatreId} onValueChange={setTheatreId}>
                                <SelectTrigger className="h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="Select Theatre..." /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {theatres.map(t => <SelectItem key={t.theatreId} value={t.theatreId}>{t.theatreName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Start Time</Label>
                                <Input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className="h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">End Time</Label>
                                <Input type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} className="h-10 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" />
                            </div>
                        </div>
                    </div>
                )}

                {toStatus === 'IN_THEATRE' && (
                    <div className="space-y-4 my-2">
                        <div className={cn('rounded-2xl border p-4 shadow-sm transition-all duration-200', preOpDone ? 'border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/15' : 'border-amber-200/80 bg-amber-50/20 dark:bg-amber-950/10')}>
                            <button type="button" className="w-full flex items-center justify-between gap-2" onClick={() => setPreOpExpanded(o => !o)}>
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-zinc-200">
                                    {preOpDone ? (
                                        <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    ) : (
                                        <span className="h-4 w-4 rounded-full border-2 border-amber-400 shrink-0" />
                                    )}
                                    Pre-Op Assessment
                                </span>
                                {preOpExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </button>
                            {preOpExpanded && !preOpDone && (
                                <div className="mt-3.5 space-y-3.5">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">ASA grade</Label>
                                        <Select value={asaGrade} onValueChange={setAsaGrade}>
                                            <SelectTrigger className="h-9 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {['I', 'II', 'III', 'IV', 'V', 'VI'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'NPO confirmed', val: npoConfirmed, set: setNpoConfirmed },
                                            { label: 'Allergies reviewed', val: allergiesReviewed, set: setAllergiesReviewed },
                                            { label: 'Investigations reviewed', val: investigationsReviewed, set: setInvestigationsReviewed },
                                            { label: 'Consent confirmed', val: consentConfirmed, set: setConsentConfirmed },
                                        ].map(({ label, val, set }) => (
                                            <label key={label} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer">
                                                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="h-4.5 w-4.5 rounded border-slate-205 dark:border-zinc-800 text-brand-600 focus:ring-brand-500/20" /> <span>{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <Button size="sm" className="h-10 rounded-xl text-xs bg-brand-600 hover:bg-brand-700 font-bold active:scale-[0.98] transition-all px-4" disabled={preOpBusy} onClick={submitPreOp}>
                                            {preOpBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />} Save assessment
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <ChecklistPhaseSection surgeryCaseId={surgeryCase.surgeryCaseId} phase="signIn" done={signInDone} onDone={() => setSignInDone(true)} />
                    </div>
                )}

                {toStatus === 'POST_OP' && (
                    <div className="space-y-4 my-2">
                        <ChecklistPhaseSection surgeryCaseId={surgeryCase.surgeryCaseId} phase="timeOut" done={timeOutDone} onDone={() => setTimeOutDone(true)} />
                        <ChecklistPhaseSection surgeryCaseId={surgeryCase.surgeryCaseId} phase="signOut" done={signOutDone} onDone={() => setSignOutDone(true)} />
                        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 p-4 space-y-3.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Intra-op notes (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Anaesthesia type</Label>
                                    <Select value={anaesthesiaType} onValueChange={setAnaesthesiaType}>
                                        <SelectTrigger className="h-9 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {['GA', 'SPINAL', 'EPIDURAL', 'LOCAL', 'SEDATION', 'REGIONAL'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Blood loss (ml)</Label>
                                    <Input type="number" min={0} value={estimatedBloodLossMl} onChange={e => setEstimatedBloodLossMl(e.target.value)} className="h-9 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all font-mono" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Surgery start</Label>
                                    <Input type="datetime-local" value={surgeryStartAt} onChange={e => setSurgeryStartAt(e.target.value)} className="h-9 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Surgery end</Label>
                                    <Input type="datetime-local" value={surgeryEndAt} onChange={e => setSurgeryEndAt(e.target.value)} className="h-9 mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-550">Findings</Label>
                                <Textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2} className="mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" />
                            </div>
                        </div>
                    </div>
                )}

                {toStatus === 'COMPLETED' && (
                    <p className="text-sm text-slate-650 dark:text-zinc-300 my-4 font-medium">Mark this case as complete? This closes out the theatre workflow for the case.</p>
                )}

                {toStatus === 'CANCELLED' && (
                    <div className="flex flex-col gap-1.5 my-3">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Reason for cancellation *</Label>
                        <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} className="mt-1 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 transition-all" placeholder="Enter cancellation details (Required)" />
                    </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 mt-2">
                    <Button variant="ghost" className="h-11 sm:h-10 rounded-xl active:scale-[0.98] transition-all text-slate-650" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        disabled={!canFinalize || submitting}
                        className={cn('h-11 sm:h-10 rounded-xl active:scale-[0.98] transition-all font-bold px-5 text-white', toStatus === 'CANCELLED' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700')}
                        onClick={finalize}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} {finalizeLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
