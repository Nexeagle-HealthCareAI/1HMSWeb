import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Droplet, Plus, Search, RefreshCw, Loader2, AlertCircle, AlertTriangle,
    UserCheck, Undo2, Trash2, Activity, X, Save,
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
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import {
    bloodBankService,
    type BloodBag,
    type BloodComponent,
    type BloodGroup,
    type BloodBagStatus,
    type UpsertBloodBagRequest,
    type RecordTransfusionRequest,
} from '../services/bloodBankService';

const COMPONENTS: { value: BloodComponent; label: string }[] = [
    { value: 'WHOLE',    label: 'Whole Blood' },
    { value: 'PRBC',     label: 'PRBC' },
    { value: 'FFP',      label: 'FFP' },
    { value: 'PLATELET', label: 'Platelets' },
    { value: 'CRYO',     label: 'Cryoprecipitate' },
];

const GROUPS: { value: BloodGroup; label: string }[] = [
    { value: 'O_POS', label: 'O+' }, { value: 'O_NEG', label: 'O−' },
    { value: 'A_POS', label: 'A+' }, { value: 'A_NEG', label: 'A−' },
    { value: 'B_POS', label: 'B+' }, { value: 'B_NEG', label: 'B−' },
    { value: 'AB_POS', label: 'AB+' }, { value: 'AB_NEG', label: 'AB−' },
];

const STATUS_TONE: Record<string, string> = {
    AVAILABLE:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    RESERVED:   'bg-amber-50 text-amber-700 border-amber-200',
    TRANSFUSED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DISCARDED:  'bg-slate-100 text-slate-600 border-slate-300',
};

const inr = (n: number | undefined | null) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const groupLabel = (g: string) => GROUPS.find(x => x.value === g)?.label ?? g.replace('_POS', '+').replace('_NEG', '−');

// ─── Add/edit bag sheet ─────────────────────────────────────────────────────

const initialBag = (): UpsertBloodBagRequest => ({
    bagNumber: '',
    component: 'PRBC',
    bloodGroup: 'O_POS',
    volumeMl: 350,
    collectedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    isTaxable: false,
});

const BagSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing?: BloodBag | null;
    onSaved: () => void;
}> = ({ open, onOpenChange, editing, onSaved }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertBloodBagRequest>(initialBag());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                bloodBagId: editing.bloodBagId,
                bagNumber: editing.bagNumber,
                component: editing.component,
                bloodGroup: editing.bloodGroup,
                volumeMl: editing.volumeMl,
                donorRef: editing.donorRef,
                collectedAt: editing.collectedAt,
                expiresAt: editing.expiresAt,
                storageLocation: editing.storageLocation,
                unitRate: editing.unitRate,
                gstSlabPercent: editing.gstSlabPercent,
                isTaxable: editing.isTaxable,
            });
        } else {
            setForm(initialBag());
        }
    }, [open, editing]);

    const set = <K extends keyof UpsertBloodBagRequest>(k: K, v: UpsertBloodBagRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        if (!form.bagNumber.trim()) { toast({ title: 'Bag number required', variant: 'destructive' }); return; }
        if (form.volumeMl <= 0)     { toast({ title: 'Volume must be positive', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await bloodBankService.upsertBag(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: editing ? 'Bag updated' : 'Bag added', description: `${form.bagNumber} · ${form.component} ${groupLabel(form.bloodGroup as string)}` });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const toIsoDate = (s: string) => s ? new Date(s).toISOString() : '';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                            <Droplet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">{editing ? 'Edit Blood Bag' : 'New Blood Bag'}</SheetTitle>
                            <SheetDescription className="text-xs">Bag-level inventory. Reserved bags are linked to an admission until transfused.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Bag # *</Label>
                            <Input value={form.bagNumber} onChange={e => set('bagNumber', e.target.value)} className="h-9 mt-1 font-mono" disabled={!!editing} />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Donor ref</Label>
                            <Input value={form.donorRef ?? ''} onChange={e => set('donorRef', e.target.value)} className="h-9 mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Component *</Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {COMPONENTS.map(c => (
                                <button key={c.value} type="button" onClick={() => set('component', c.value)} className={cn(
                                    'px-2.5 h-8 rounded-md border text-xs font-semibold',
                                    form.component === c.value
                                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                )}>{c.label}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Blood group *</Label>
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {GROUPS.map(g => (
                                <button key={g.value} type="button" onClick={() => set('bloodGroup', g.value)} className={cn(
                                    'px-2.5 h-8 rounded-md border text-xs font-bold',
                                    form.bloodGroup === g.value
                                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                )}>{g.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Volume (mL) *</Label>
                            <Input type="number" min={1} step="1" value={form.volumeMl} onChange={e => set('volumeMl', parseFloat(e.target.value || '0'))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Storage</Label>
                            <Input value={form.storageLocation ?? ''} onChange={e => set('storageLocation', e.target.value)} className="h-9 mt-1" placeholder="e.g. Blood bank shelf B2" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Collected *</Label>
                            <Input type="datetime-local" value={form.collectedAt ? form.collectedAt.slice(0, 16) : ''} onChange={e => set('collectedAt', toIsoDate(e.target.value))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Expires *</Label>
                            <Input type="datetime-local" value={form.expiresAt ? form.expiresAt.slice(0, 16) : ''} onChange={e => set('expiresAt', toIsoDate(e.target.value))} className="h-9 mt-1" />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Billing</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Unit rate (₹)</Label>
                                <Input type="number" min={0} step="0.01" value={form.unitRate ?? ''} onChange={e => set('unitRate', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">HSN/SAC</Label>
                                <Input value={form.hsnSacCode ?? ''} onChange={e => set('hsnSacCode', e.target.value)} className="h-9 mt-1 font-mono" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">GST %</Label>
                                <Input type="number" min={0} max={100} step="0.01" value={form.gstSlabPercent ?? ''} onChange={e => set('gstSlabPercent', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 mt-1" />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={!!form.isTaxable} onChange={e => set('isTaxable', e.target.checked)} />
                            Taxable on transfusion
                        </label>
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Bag</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Reserve sheet ──────────────────────────────────────────────────────────

const ReserveSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    bag: BloodBag | null;
    onDone: () => void;
}> = ({ open, onOpenChange, bag, onDone }) => {
    const { toast } = useToast();
    const [admissionId, setAdmissionId] = useState('');
    const [encounterId, setEncounterId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [crossmatch, setCrossmatch] = useState<'COMPATIBLE' | 'INCOMPATIBLE' | 'NOT_DONE'>('COMPATIBLE');
    const [crossmatchBy, setCrossmatchBy] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setAdmissionId(''); setEncounterId(''); setPatientId('');
        setCrossmatch('COMPATIBLE'); setCrossmatchBy('');
    }, [open]);

    if (!bag) return null;

    const submit = async () => {
        if (submitting) return;
        if (!admissionId.trim() || !encounterId.trim()) {
            toast({ title: 'Admission and encounter IDs are required', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await bloodBankService.reserve({
                bloodBagId: bag.bloodBagId,
                admissionId, encounterId, patientId: patientId || undefined,
                crossmatchResult: crossmatch,
                crossmatchBy: crossmatchBy || undefined,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not reserve');
            toast({ title: 'Bag reserved', description: `${bag.bagNumber} · ${groupLabel(bag.bloodGroup)}` });
            onDone();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not reserve', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
                            <UserCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Reserve Bag</SheetTitle>
                            <SheetDescription className="text-xs">{bag.bagNumber} · {bag.component} · {groupLabel(bag.bloodGroup)} · {bag.volumeMl} mL</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Patient ID</Label>
                        <Input value={patientId} onChange={e => setPatientId(e.target.value)} className="h-9 mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Admission ID *</Label>
                        <Input value={admissionId} onChange={e => setAdmissionId(e.target.value)} className="h-9 mt-1 font-mono" placeholder="GUID" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Encounter ID *</Label>
                        <Input value={encounterId} onChange={e => setEncounterId(e.target.value)} className="h-9 mt-1 font-mono" placeholder="GUID" />
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Crossmatch result</Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {(['COMPATIBLE', 'INCOMPATIBLE', 'NOT_DONE'] as const).map(c => (
                                <button key={c} type="button" onClick={() => setCrossmatch(c)} className={cn(
                                    'px-2.5 h-8 rounded-md border text-xs font-semibold',
                                    crossmatch === c
                                        ? (c === 'INCOMPATIBLE'
                                            ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                                            : 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200')
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                )}>{c.replace('_', ' ')}</button>
                            ))}
                        </div>
                        {crossmatch === 'INCOMPATIBLE' && (
                            <p className="text-[11px] text-rose-700 mt-1">INCOMPATIBLE bags cannot be reserved — discard instead.</p>
                        )}
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Crossmatch by</Label>
                        <Input value={crossmatchBy} onChange={e => setCrossmatchBy(e.target.value)} className="h-9 mt-1" placeholder="Defaults to current user" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting || crossmatch === 'INCOMPATIBLE'} className="h-10 px-5 bg-amber-600 hover:bg-amber-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reserving…</> : <><UserCheck className="h-4 w-4 mr-2" />Reserve</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Transfuse sheet ────────────────────────────────────────────────────────

const TransfuseSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    bag: BloodBag | null;
    onDone: () => void;
}> = ({ open, onOpenChange, bag, onDone }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<RecordTransfusionRequest>({
        bloodBagId: '', admissionId: '', volumeGivenMl: 0, reaction: 'NONE', witnessName: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !bag) return;
        const now = new Date().toISOString();
        setForm({
            bloodBagId: bag.bloodBagId,
            admissionId: bag.reservedForAdmissionId ?? '',
            patientId: bag.reservedForPatientId,
            volumeGivenMl: bag.volumeMl,
            startedAt: now,
            reaction: 'NONE',
            witnessName: '',
        });
    }, [open, bag]);

    if (!bag) return null;

    const set = <K extends keyof RecordTransfusionRequest>(k: K, v: RecordTransfusionRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        if (!form.admissionId.trim()) { toast({ title: 'Admission ID required', variant: 'destructive' }); return; }
        if (form.volumeGivenMl <= 0)  { toast({ title: 'Volume must be positive', variant: 'destructive' }); return; }
        if (!form.witnessName.trim()) { toast({ title: 'Witness name required', variant: 'destructive' }); return; }
        if (form.reaction !== 'NONE' && !form.reactionNotes?.trim()) {
            toast({ title: 'Reaction notes required when a reaction is recorded', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await bloodBankService.recordTransfusion(form);
            if (!res.success) throw new Error(res.message ?? 'Could not record');
            toast({
                title: 'Transfusion recorded',
                description: `${bag.bagNumber} · ${form.volumeGivenMl} mL${res.chargeEventId ? ' · billed' : ''}`,
                variant: form.reaction === 'SEVERE' || form.reaction === 'ANAPHYLAXIS' ? 'destructive' : undefined,
            });
            onDone();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not record', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Record Transfusion</SheetTitle>
                            <SheetDescription className="text-xs">{bag.bagNumber} · {bag.component} · {groupLabel(bag.bloodGroup)} · {bag.volumeMl} mL</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    {bag.isExpired && (
                        <div className="rounded-lg border-2 border-rose-300 bg-rose-50 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-rose-800">This bag has <strong>expired</strong>. Transfusion will be rejected.</p>
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Admission ID *</Label>
                        <Input value={form.admissionId} onChange={e => set('admissionId', e.target.value)} className="h-9 mt-1 font-mono" placeholder="GUID" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Volume given (mL) *</Label>
                            <Input type="number" min={1} max={bag.volumeMl} step="1" value={form.volumeGivenMl} onChange={e => set('volumeGivenMl', parseFloat(e.target.value || '0'))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Patient ID</Label>
                            <Input value={form.patientId ?? ''} onChange={e => set('patientId', e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Started</Label>
                            <Input type="datetime-local" value={form.startedAt ? form.startedAt.slice(0, 16) : ''} onChange={e => set('startedAt', toIso(e.target.value))} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Ended</Label>
                            <Input type="datetime-local" value={form.endedAt ? form.endedAt.slice(0, 16) : ''} onChange={e => set('endedAt', toIso(e.target.value))} className="h-9 mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Vitals before</Label>
                        <Input value={form.vitalsBefore ?? ''} onChange={e => set('vitalsBefore', e.target.value)} className="h-9 mt-1" placeholder="e.g. BP 110/70, HR 88, Temp 37.0" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Vitals after</Label>
                        <Input value={form.vitalsAfter ?? ''} onChange={e => set('vitalsAfter', e.target.value)} className="h-9 mt-1" />
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Reaction</Label>
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {(['NONE', 'MILD', 'SEVERE', 'ANAPHYLAXIS'] as const).map(r => (
                                <button key={r} type="button" onClick={() => set('reaction', r)} className={cn(
                                    'px-2 h-8 rounded-md border text-xs font-semibold',
                                    form.reaction === r
                                        ? (r === 'NONE'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                                            : 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200')
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                )}>{r}</button>
                            ))}
                        </div>
                    </div>

                    {form.reaction !== 'NONE' && (
                        <div>
                            <Label className="text-xs font-semibold text-rose-700">Reaction notes *</Label>
                            <Textarea value={form.reactionNotes ?? ''} onChange={e => set('reactionNotes', e.target.value)} rows={2} className="text-sm mt-1 border-rose-300" />
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Witness nurse name *</Label>
                        <Input value={form.witnessName} onChange={e => set('witnessName', e.target.value)} className="h-9 mt-1" placeholder="Two-person verification" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={submit} disabled={submitting} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : <><Activity className="h-4 w-4 mr-2" />Record Transfusion</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────────

const BloodBankPage: React.FC = () => {
    const { toast } = useToast();
    const [bags, setBags] = useState<BloodBag[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | BloodBagStatus>('ALL');
    const [componentFilter, setComponentFilter] = useState<'ALL' | BloodComponent>('ALL');
    const [groupFilter, setGroupFilter] = useState<'ALL' | BloodGroup>('ALL');

    const [bagSheetOpen, setBagSheetOpen] = useState(false);
    const [editing, setEditing] = useState<BloodBag | null>(null);

    const [reserveCtx, setReserveCtx] = useState<BloodBag | null>(null);
    const [transfuseCtx, setTransfuseCtx] = useState<BloodBag | null>(null);
    const [discardCtx, setDiscardCtx] = useState<BloodBag | null>(null);
    const [discardReason, setDiscardReason] = useState('');
    const [discarding, setDiscarding] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await bloodBankService.listBags({ take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setBags(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load blood bags');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return bags.filter(b => {
            if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
            if (componentFilter !== 'ALL' && b.component !== componentFilter) return false;
            if (groupFilter !== 'ALL' && b.bloodGroup !== groupFilter) return false;
            if (!q) return true;
            return b.bagNumber.toLowerCase().includes(q) || (b.donorRef ?? '').toLowerCase().includes(q);
        });
    }, [bags, search, statusFilter, componentFilter, groupFilter]);

    const counts = useMemo(() => ({
        total: bags.length,
        available: bags.filter(b => b.status === 'AVAILABLE').length,
        reserved: bags.filter(b => b.status === 'RESERVED').length,
        expiring: bags.filter(b => b.isExpiringSoon && b.status === 'AVAILABLE').length,
        expired: bags.filter(b => b.isExpired && b.status !== 'TRANSFUSED' && b.status !== 'DISCARDED').length,
    }), [bags]);

    // Inventory by group/component for quick overview
    const groupSummary = useMemo(() => {
        const buckets = new Map<string, number>();
        bags.filter(b => b.status === 'AVAILABLE' && !b.isExpired).forEach(b => {
            const key = `${b.bloodGroup}|${b.component}`;
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
        });
        return Array.from(buckets.entries()).map(([k, v]) => {
            const [grp, comp] = k.split('|');
            return { group: grp, component: comp, count: v };
        }).sort((a, b) => a.group.localeCompare(b.group));
    }, [bags]);

    const submitRelease = async (bag: BloodBag) => {
        try {
            const res = await bloodBankService.release({ bloodBagId: bag.bloodBagId });
            if (!res.success) throw new Error(res.message ?? 'Could not release');
            toast({ title: 'Bag released', description: `${bag.bagNumber} back in pool` });
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not release', description: e?.message ?? '', variant: 'destructive' });
        }
    };

    const submitDiscard = async () => {
        if (!discardCtx) return;
        if (!discardReason.trim()) { toast({ title: 'Reason required', variant: 'destructive' }); return; }
        setDiscarding(true);
        try {
            const res = await bloodBankService.discard({ bloodBagId: discardCtx.bloodBagId, reason: discardReason });
            if (!res.success) throw new Error(res.message ?? 'Could not discard');
            toast({ title: 'Bag discarded', description: `${discardCtx.bagNumber} · ${discardReason}` });
            setDiscardCtx(null); setDiscardReason('');
            load(true);
        } catch (e: any) {
            toast({ title: 'Could not discard', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setDiscarding(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md">
                            <Droplet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Blood Bank</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Bag inventory, crossmatch reservations, and transfusion records.</p>
                        </div>
                    </div>
                    <Button onClick={() => { setEditing(null); setBagSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> New Bag
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Available</p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">{counts.available}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Reserved</p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">{counts.reserved}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.expiring > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.expiring > 0 ? 'text-amber-700' : 'text-slate-400')}>Expiring &lt; 48h</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.expiring > 0 ? 'text-amber-900' : 'text-slate-700')}>{counts.expiring}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.expired > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.expired > 0 ? 'text-rose-700' : 'text-slate-400')}>Expired</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.expired > 0 ? 'text-rose-900' : 'text-slate-700')}>{counts.expired}</p>
                    </div>
                </div>

                {/* Inventory by group */}
                {groupSummary.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Available stock by group · component</p>
                        <div className="flex flex-wrap gap-1.5">
                            {groupSummary.map(g => (
                                <button
                                    key={`${g.group}-${g.component}`}
                                    type="button"
                                    onClick={() => { setGroupFilter(g.group as BloodGroup); setComponentFilter(g.component as BloodComponent); setStatusFilter('AVAILABLE'); }}
                                    className="px-2.5 py-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs"
                                >
                                    <span className="font-bold text-rose-700">{groupLabel(g.group)}</span>
                                    <span className="text-slate-500 mx-1">·</span>
                                    <span className="text-slate-700">{g.component}</span>
                                    <span className="ml-1.5 font-black text-rose-700">×{g.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by bag # or donor" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ALL', 'AVAILABLE', 'RESERVED', 'TRANSFUSED', 'DISCARDED'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                                'h-7 px-3 rounded-md text-xs font-semibold',
                                statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}>{s}</button>
                        ))}
                    </div>
                    <select value={componentFilter} onChange={e => setComponentFilter(e.target.value as 'ALL' | BloodComponent)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All components</option>
                        {COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={groupFilter} onChange={e => setGroupFilter(e.target.value as 'ALL' | BloodGroup)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All groups</option>
                        {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {/* Bag list */}
                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && bags.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <Droplet className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No blood bags yet</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Add your first bag to start tracking.</p>
                        <Button onClick={() => { setEditing(null); setBagSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700">
                            <Plus className="h-4 w-4 mr-2" /> New Bag
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">Bag #</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Component</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Group</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Volume</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Expires</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                                    <th className="text-right px-3 py-2.5 font-bold w-[240px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(b => {
                                    const tone = STATUS_TONE[b.status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                                    return (
                                        <tr key={b.bloodBagId} className={cn('border-t border-slate-100 hover:bg-slate-50/50', b.isExpired && 'opacity-70')}>
                                            <td className="px-3 py-2 font-mono text-xs font-bold text-rose-700">
                                                <button type="button" onClick={() => { setEditing(b); setBagSheetOpen(true); }} className="hover:underline">
                                                    {b.bagNumber}
                                                </button>
                                                {b.donorRef && <div className="text-[10px] text-slate-400 font-sans">{b.donorRef}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-700">{b.component}</td>
                                            <td className="px-3 py-2 text-sm font-bold text-rose-700">{groupLabel(b.bloodGroup)}</td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{b.volumeMl} mL</td>
                                            <td className="px-3 py-2 text-xs">
                                                <span className={cn(b.isExpired ? 'text-rose-700 font-bold' : b.isExpiringSoon ? 'text-amber-700 font-semibold' : 'text-slate-700')}>
                                                    {format(parseISO(b.expiresAt), 'd MMM HH:mm')}
                                                </span>
                                                <div className="text-[10px] text-slate-400">
                                                    {b.isExpired ? 'expired' : `in ${formatDistanceToNowStrict(parseISO(b.expiresAt))}`}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{b.status}</Badge>
                                                {b.status === 'RESERVED' && b.reservedForPatientId && (
                                                    <div className="text-[10px] text-amber-700 mt-0.5">for {b.reservedForPatientId}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(b.unitRate)}</td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="inline-flex gap-1">
                                                    {b.status === 'AVAILABLE' && !b.isExpired && (
                                                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => setReserveCtx(b)}>
                                                            <UserCheck className="h-3 w-3 mr-1" /> Reserve
                                                        </Button>
                                                    )}
                                                    {b.status === 'RESERVED' && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => submitRelease(b)}>
                                                                <Undo2 className="h-3 w-3 mr-1" /> Release
                                                            </Button>
                                                            <Button size="sm" className="h-7 px-2 text-[11px] bg-rose-600 hover:bg-rose-700" onClick={() => setTransfuseCtx(b)} disabled={b.isExpired}>
                                                                <Activity className="h-3 w-3 mr-1" /> Transfuse
                                                            </Button>
                                                        </>
                                                    )}
                                                    {(b.status === 'AVAILABLE' || b.status === 'RESERVED') && (
                                                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => { setDiscardCtx(b); setDiscardReason(''); }}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && bags.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No bags match the current filters</p>
                    </div>
                )}
            </div>

            <BagSheet open={bagSheetOpen} onOpenChange={setBagSheetOpen} editing={editing} onSaved={() => load(true)} />
            <ReserveSheet open={!!reserveCtx} onOpenChange={open => { if (!open) setReserveCtx(null); }} bag={reserveCtx} onDone={() => load(true)} />
            <TransfuseSheet open={!!transfuseCtx} onOpenChange={open => { if (!open) setTransfuseCtx(null); }} bag={transfuseCtx} onDone={() => load(true)} />

            <AlertDialog open={!!discardCtx} onOpenChange={open => { if (!open) { setDiscardCtx(null); setDiscardReason(''); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard bag {discardCtx?.bagNumber}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Discarded bags cannot be re-used. Provide a reason for audit (expired, leakage, broken seal, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Reason *</Label>
                        <Textarea value={discardReason} onChange={e => setDiscardReason(e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={discarding}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); submitDiscard(); }} disabled={discarding} className="bg-rose-600 hover:bg-rose-700">
                            {discarding ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Discarding…</> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Discard</>}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BloodBankPage;
