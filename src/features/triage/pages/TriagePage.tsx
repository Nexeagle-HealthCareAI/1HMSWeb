import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Ambulance, Plus, Search, RefreshCw, Loader2, AlertCircle, Save, X,
    PlayCircle, CheckCircle2, Clock, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    triageService,
    type TriageListItem, type TriageRecordDetail,
    type UpsertTriageRequest, type CompleteTriageRequest,
    type TriageStatus, type TriageDisposition, type TriageMode, type AcuityColor,
} from '../services/triageService';

const ACUITY: { level: number; label: string; color: AcuityColor; tone: string; tile: string; badge: string }[] = [
    { level: 1, label: 'Resuscitation', color: 'RED',    tone: 'Immediate, life-threatening',  tile: 'bg-rose-50 border-rose-200 text-rose-900',    badge: 'bg-rose-600 text-white border-rose-700' },
    { level: 2, label: 'Emergent',      color: 'ORANGE', tone: 'High risk, rapid intervention', tile: 'bg-orange-50 border-orange-200 text-orange-900', badge: 'bg-orange-500 text-white border-orange-600' },
    { level: 3, label: 'Urgent',        color: 'YELLOW', tone: 'Stable, needs care soon',       tile: 'bg-amber-50 border-amber-200 text-amber-900',  badge: 'bg-amber-500 text-white border-amber-600' },
    { level: 4, label: 'Less urgent',   color: 'GREEN',  tone: 'Stable, can wait',              tile: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600 text-white border-emerald-700' },
    { level: 5, label: 'Non-urgent',    color: 'BLUE',   tone: 'Routine, minor issue',          tile: 'bg-sky-50 border-sky-200 text-sky-900',         badge: 'bg-sky-600 text-white border-sky-700' },
];

const MODES: { value: TriageMode; label: string }[] = [
    { value: 'WALK_IN',   label: 'Walk-in' },
    { value: 'AMBULANCE', label: 'Ambulance' },
    { value: 'POLICE',    label: 'Police' },
    { value: 'REFERRED',  label: 'Referred' },
    { value: 'OTHER',     label: 'Other' },
];

const STATUS_TONE: Record<string, string> = {
    WAITING:                 'bg-amber-50 text-amber-700 border-amber-200',
    IN_PROGRESS:             'bg-sky-50 text-sky-700 border-sky-200',
    COMPLETED:               'bg-emerald-50 text-emerald-700 border-emerald-200',
    LEFT_WITHOUT_BEING_SEEN: 'bg-slate-100 text-slate-600 border-slate-200',
};

const DISPOSITIONS: { value: TriageDisposition; label: string }[] = [
    { value: 'FAST_TRACK_ADMISSION', label: 'Fast-track admission' },
    { value: 'OPD',                  label: 'Send to OPD' },
    { value: 'OBSERVATION',          label: 'Observation' },
    { value: 'DISCHARGE',            label: 'Discharge' },
    { value: 'REFERRED',             label: 'Referred out' },
    { value: 'EXPIRED',              label: 'Expired' },
];

const acuityFor = (level: number) => ACUITY.find(a => a.level === level) ?? ACUITY[2];

const initialTriage = (): UpsertTriageRequest => ({
    patientName: '',
    chiefComplaint: '',
    acuityLevel: 3,
    modeOfArrival: 'WALK_IN',
    arrivedAt: new Date().toISOString(),
});

const toLocal = (s?: string) => s ? s.slice(0, 16) : '';
const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

// ─── Entry sheet ────────────────────────────────────────────────────────────

const TriageSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editingId?: string | null;
    onSaved: () => void;
    onComplete: (record: TriageRecordDetail) => void;
}> = ({ open, onOpenChange, editingId, onSaved, onComplete }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertTriageRequest>(initialTriage());
    const [detail, setDetail] = useState<TriageRecordDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [markingInProgress, setMarkingInProgress] = useState(false);

    const locked = detail?.status === 'COMPLETED' || detail?.status === 'LEFT_WITHOUT_BEING_SEEN';

    const loadDetail = useCallback(async () => {
        if (!editingId) return;
        setLoading(true);
        try {
            const res = await triageService.getById(editingId);
            if (!res.success || !res.record) throw new Error(res.message ?? 'Failed to load');
            setDetail(res.record);
            setForm({
                triageRecordId: res.record.triageRecordId,
                patientId: res.record.patientId,
                patientName: res.record.patientName,
                age: res.record.age,
                sex: res.record.sex,
                mobile: res.record.mobile,
                address: res.record.address,
                attendant: res.record.attendant,
                attendantContact: res.record.attendantContact,
                modeOfArrival: res.record.modeOfArrival as TriageMode | undefined,
                arrivedAt: res.record.arrivedAt,
                chiefComplaint: res.record.chiefComplaint,
                historySummary: res.record.historySummary,
                vitalsSnapshot: res.record.vitalsSnapshot,
                painScore: res.record.painScore,
                allergies: res.record.allergies,
                acuityLevel: res.record.acuityLevel,
                triageNurse: res.record.triageNurse,
                triagedAt: res.record.triagedAt,
            });
        } catch (e: any) {
            toast({ title: 'Failed to load', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [editingId, toast]);

    useEffect(() => {
        if (!open) return;
        if (editingId) {
            loadDetail();
        } else {
            setDetail(null);
            setForm(initialTriage());
        }
    }, [open, editingId, loadDetail]);

    const set = <K extends keyof UpsertTriageRequest>(k: K, v: UpsertTriageRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        if (!form.patientName.trim()) { toast({ title: 'Patient name required', variant: 'destructive' }); return; }
        if (!form.chiefComplaint.trim()) { toast({ title: 'Chief complaint required', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await triageService.upsert(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: editingId ? 'Triage updated' : 'Triage saved', description: `${form.patientName} · ${acuityFor(form.acuityLevel).label}` });
            onSaved();
            if (!editingId) onOpenChange(false);
            else loadDetail();
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const markInProgress = async () => {
        if (!detail || markingInProgress) return;
        setMarkingInProgress(true);
        try {
            const res = await triageService.markInProgress(detail.triageRecordId);
            if (!res.success) throw new Error(res.message ?? 'Could not update');
            toast({ title: 'Marked in progress' });
            onSaved();
            loadDetail();
        } catch (e: any) {
            toast({ title: 'Could not update', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setMarkingInProgress(false);
        }
    };

    const startDisposition = () => {
        if (!detail) return;
        onComplete(detail);
    };

    const acu = acuityFor(form.acuityLevel);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', acu.badge)}>
                            <Ambulance className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-base font-bold flex items-center gap-2 flex-wrap">
                                {detail ? 'Triage record' : 'New triage'}
                                {detail && <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[detail.status] ?? '')}>{detail.status.replace(/_/g, ' ')}</Badge>}
                                {detail && detail.disposition !== 'NONE' && (
                                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">
                                        {detail.disposition.replace(/_/g, ' ')}
                                    </Badge>
                                )}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {locked ? 'This triage is closed — fields are read-only.' : 'Capture vitals + assign acuity. Complete with a disposition once seen.'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading && <Skeleton className="h-32 w-full" />}

                    {/* Patient block */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Patient</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Patient name *</Label>
                                <Input value={form.patientName} onChange={e => set('patientName', e.target.value)} className="h-9 mt-1" disabled={locked} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Age</Label>
                                <Input type="number" min={0} max={120} value={form.age ?? ''} onChange={e => set('age', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 mt-1" disabled={locked} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Sex</Label>
                                <select value={form.sex ?? ''} onChange={e => set('sex', e.target.value || undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={locked}>
                                    <option value="">—</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Mobile</Label>
                                <Input value={form.mobile ?? ''} onChange={e => set('mobile', e.target.value)} className="h-9 mt-1" disabled={locked} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Attendant</Label>
                                <Input value={form.attendant ?? ''} onChange={e => set('attendant', e.target.value)} className="h-9 mt-1" placeholder="Name" disabled={locked} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Attendant contact</Label>
                                <Input value={form.attendantContact ?? ''} onChange={e => set('attendantContact', e.target.value)} className="h-9 mt-1" disabled={locked} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Address</Label>
                                <Input value={form.address ?? ''} onChange={e => set('address', e.target.value)} className="h-9 mt-1" disabled={locked} />
                            </div>
                        </div>
                    </section>

                    {/* Arrival */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Arrival</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Arrived at</Label>
                                <Input type="datetime-local" value={toLocal(form.arrivedAt)} onChange={e => set('arrivedAt', toIso(e.target.value))} className="h-9 mt-1" disabled={locked} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Mode of arrival</Label>
                                <select value={form.modeOfArrival ?? ''} onChange={e => set('modeOfArrival', (e.target.value || undefined) as TriageMode | undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={locked}>
                                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Triage nurse</Label>
                                <Input value={form.triageNurse ?? ''} onChange={e => set('triageNurse', e.target.value)} className="h-9 mt-1" placeholder="Defaults to current user" disabled={locked} />
                            </div>
                        </div>
                    </section>

                    {/* Assessment */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Assessment</h4>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Chief complaint *</Label>
                            <Textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} rows={2} className="text-sm mt-1" placeholder="Presenting symptom(s) in patient's words" disabled={locked} />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">History summary</Label>
                            <Textarea value={form.historySummary ?? ''} onChange={e => set('historySummary', e.target.value)} rows={2} className="text-sm mt-1" placeholder="Onset, duration, mechanism…" disabled={locked} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Vitals snapshot</Label>
                                <Input value={form.vitalsSnapshot ?? ''} onChange={e => set('vitalsSnapshot', e.target.value)} className="h-9 mt-1" placeholder="BP / HR / RR / SpO₂ / Temp / GCS" disabled={locked} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Pain (0-10)</Label>
                                <Input value={form.painScore ?? ''} onChange={e => set('painScore', e.target.value)} className="h-9 mt-1" placeholder="e.g. 6/10" disabled={locked} />
                            </div>
                            <div className="md:col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">Allergies</Label>
                                <Input value={form.allergies ?? ''} onChange={e => set('allergies', e.target.value)} className="h-9 mt-1" placeholder="NKDA if none" disabled={locked} />
                            </div>
                        </div>
                    </section>

                    {/* Acuity picker */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ESI Acuity *</h4>
                        <div className="grid grid-cols-5 gap-2">
                            {ACUITY.map(a => {
                                const active = form.acuityLevel === a.level;
                                return (
                                    <button
                                        key={a.level}
                                        type="button"
                                        disabled={locked}
                                        onClick={() => set('acuityLevel', a.level)}
                                        className={cn(
                                            'rounded-lg border-2 p-2.5 text-left transition-all',
                                            active ? `${a.tile} ring-2 ring-offset-1 ring-current` : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700',
                                            locked && 'opacity-60 cursor-not-allowed'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded border', active ? a.badge : 'bg-slate-100 text-slate-600 border-slate-200')}>L{a.level}</span>
                                            <span className={cn('h-2.5 w-2.5 rounded-full', a.badge)} />
                                        </div>
                                        <p className="text-xs font-bold leading-tight">{a.label}</p>
                                        <p className="text-[10px] mt-0.5 opacity-80 leading-tight">{a.tone}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3 flex-wrap">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                    <div className="flex-1" />
                    {!locked && (
                        <>
                            {detail && detail.status === 'WAITING' && (
                                <Button variant="outline" className="h-10 px-4 border-sky-300 text-sky-700 hover:bg-sky-50" onClick={markInProgress} disabled={markingInProgress}>
                                    {markingInProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                                    Mark in progress
                                </Button>
                            )}
                            <Button variant="outline" className="h-10 px-4" onClick={submit} disabled={submitting}>
                                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                            </Button>
                            {detail && (
                                <Button onClick={startDisposition} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 font-semibold" disabled={submitting}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Complete…
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Disposition dialog ─────────────────────────────────────────────────────

const DispositionDialog: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    record: TriageRecordDetail | null;
    onCompleted: () => void;
}> = ({ open, onOpenChange, record, onCompleted }) => {
    const { toast } = useToast();
    const [disposition, setDisposition] = useState<TriageDisposition | 'LEFT_WITHOUT_BEING_SEEN'>('OPD');
    const [notes, setNotes] = useState('');
    const [referredTo, setReferredTo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setDisposition('OPD');
            setNotes('');
            setReferredTo('');
        }
    }, [open]);

    const submit = async () => {
        if (!record || submitting) return;
        if (disposition === 'REFERRED' && !referredTo.trim()) {
            toast({ title: 'Referred-to facility required', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const req: CompleteTriageRequest = {
                triageRecordId: record.triageRecordId,
                disposition,
                dispositionNotes: notes.trim() || undefined,
                referredTo: disposition === 'REFERRED' ? referredTo.trim() : undefined,
            };
            const res = await triageService.complete(req);
            if (!res.success) throw new Error(res.message ?? 'Could not complete');
            toast({
                title: disposition === 'LEFT_WITHOUT_BEING_SEEN' ? 'Marked LWBS' : 'Triage completed',
                description: `${record.patientName} · ${disposition.replace(/_/g, ' ')}`,
            });
            onCompleted();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not complete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Close triage
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Pick a disposition for {record?.patientName}. This closes the triage record.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {DISPOSITIONS.map(d => (
                            <button
                                key={d.value}
                                type="button"
                                onClick={() => setDisposition(d.value)}
                                className={cn(
                                    'rounded-lg border-2 p-2.5 text-left text-xs font-semibold transition-all',
                                    disposition === d.value ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setDisposition('LEFT_WITHOUT_BEING_SEEN')}
                            className={cn(
                                'col-span-2 rounded-lg border-2 p-2.5 text-left text-xs font-semibold transition-all',
                                disposition === 'LEFT_WITHOUT_BEING_SEEN' ? 'border-slate-500 bg-slate-100 text-slate-900' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            )}
                        >
                            Left without being seen
                        </button>
                    </div>
                    {disposition === 'REFERRED' && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Referred to *</Label>
                            <Input value={referredTo} onChange={e => setReferredTo(e.target.value)} className="h-9 mt-1" placeholder="Facility / unit name" />
                        </div>
                    )}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Optional context" />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Closing…</> : 'Close triage'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────────

type StatusFilter = 'ACTIVE' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL';

const TriagePage: React.FC = () => {
    const { toast } = useToast();
    const [items, setItems] = useState<TriageListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
    const [acuityFilter, setAcuityFilter] = useState<'ALL' | number>('ALL');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [dispositionOpen, setDispositionOpen] = useState(false);
    const [dispositionRecord, setDispositionRecord] = useState<TriageRecordDetail | null>(null);

    const [rowBusy, setRowBusy] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await triageService.queue({ status: statusFilter, take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load triage queue');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (acuityFilter !== 'ALL' && it.acuityLevel !== acuityFilter) return false;
            if (!q) return true;
            return it.patientName.toLowerCase().includes(q)
                || (it.mobile ?? '').toLowerCase().includes(q)
                || (it.chiefComplaint ?? '').toLowerCase().includes(q);
        });
    }, [items, search, acuityFilter]);

    const counts = useMemo(() => {
        const byAcuity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let waiting = 0, inProgress = 0;
        items.forEach(it => {
            byAcuity[it.acuityLevel] = (byAcuity[it.acuityLevel] ?? 0) + 1;
            if (it.status === 'WAITING') waiting++;
            else if (it.status === 'IN_PROGRESS') inProgress++;
        });
        return { byAcuity, waiting, inProgress, total: items.length };
    }, [items]);

    const quickInProgress = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (rowBusy) return;
        setRowBusy(id);
        try {
            const res = await triageService.markInProgress(id);
            if (!res.success) throw new Error(res.message ?? 'Could not update');
            toast({ title: 'Marked in progress' });
            load(true);
        } catch (err: any) {
            toast({ title: 'Could not update', description: err?.message ?? '', variant: 'destructive' });
        } finally {
            setRowBusy(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md">
                            <Ambulance className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Triage</h1>
                            <p className="text-sm text-slate-500 mt-0.5">ED queue · ESI acuity · disposition routing.</p>
                        </div>
                    </div>
                    <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> New triage
                    </Button>
                </div>

                {/* Stat tiles: status + acuity rollups */}
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Waiting</p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">{counts.waiting}</p>
                    </div>
                    <div className="bg-sky-50 rounded-xl border border-sky-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700">In progress</p>
                        <p className="text-2xl font-black text-sky-900 mt-0.5">{counts.inProgress}</p>
                    </div>
                    {ACUITY.map(a => (
                        <div key={a.level} className={cn('rounded-xl border p-4', a.tile)}>
                            <div className="flex items-center gap-1.5">
                                <span className={cn('h-2 w-2 rounded-full', a.badge)} />
                                <p className="text-[10px] font-bold uppercase tracking-widest">L{a.level} {a.color}</p>
                            </div>
                            <p className="text-2xl font-black mt-0.5">{counts.byAcuity[a.level]}</p>
                        </div>
                    ))}
                </div>

                {/* Filter strip */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, mobile, complaint" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ACTIVE', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'ALL'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                                'h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap',
                                statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}>{s.replace(/_/g, ' ')}</button>
                        ))}
                    </div>
                    <select value={acuityFilter} onChange={e => setAcuityFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All acuity</option>
                        {ACUITY.map(a => <option key={a.level} value={a.level}>L{a.level} · {a.label}</option>)}
                    </select>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {loading && (
                    <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                )}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <Ambulance className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No triage records</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Triage the first arriving patient.</p>
                        <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700">
                            <Plus className="h-4 w-4 mr-2" /> New triage
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">ESI</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Chief complaint</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Arrived</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Wait</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Nurse</th>
                                    <th className="text-right px-3 py-2.5 font-bold w-px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => {
                                    const a = acuityFor(it.acuityLevel);
                                    const slow = it.waitMinutes >= 30 && it.acuityLevel <= 3 && it.status === 'WAITING';
                                    return (
                                        <tr key={it.triageRecordId} className="border-t border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => { setEditingId(it.triageRecordId); setSheetOpen(true); }}>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn('h-3 w-3 rounded-full', a.badge)} />
                                                    <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded border', a.badge)}>L{it.acuityLevel}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <p className="text-sm font-semibold text-slate-900">{it.patientName}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {it.age != null ? `${it.age}y` : ''}
                                                    {it.sex ? ` · ${it.sex}` : ''}
                                                    {it.mobile ? ` · ${it.mobile}` : ''}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700 max-w-[260px] truncate" title={it.chiefComplaint ?? ''}>{it.chiefComplaint}</td>
                                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">{format(parseISO(it.arrivedAt), 'd MMM HH:mm')}</td>
                                            <td className={cn('px-3 py-2 text-right text-xs font-bold whitespace-nowrap', slow ? 'text-rose-700' : 'text-slate-700')}>
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3 opacity-60" />{it.waitMinutes}m
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? '')}>{it.status.replace(/_/g, ' ')}</Badge>
                                                {it.disposition !== 'NONE' && it.status === 'COMPLETED' && (
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{it.disposition.replace(/_/g, ' ')}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-600">{it.triageNurse}</td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                {it.status === 'WAITING' && (
                                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-sky-700 hover:bg-sky-50" onClick={(e) => quickInProgress(it.triageRecordId, e)} disabled={rowBusy === it.triageRecordId}>
                                                        {rowBusy === it.triageRecordId ? <Loader2 className="h-3 w-3 animate-spin" /> : <><PlayCircle className="h-3 w-3 mr-1" /> Start</>}
                                                    </Button>
                                                )}
                                                <ChevronRight className="h-3.5 w-3.5 text-slate-300 inline ml-1" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No triage records match the current filters</p>
                    </div>
                )}
            </div>

            <TriageSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                editingId={editingId}
                onSaved={() => load(true)}
                onComplete={(record) => { setDispositionRecord(record); setDispositionOpen(true); }}
            />
            <DispositionDialog
                open={dispositionOpen}
                onOpenChange={setDispositionOpen}
                record={dispositionRecord}
                onCompleted={() => { setSheetOpen(false); load(true); }}
            />
        </div>
    );
};

export default TriagePage;
