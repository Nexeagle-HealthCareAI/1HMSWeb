import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Siren, Plus, Search, RefreshCw, Loader2, AlertCircle, AlertTriangle,
    Save, X, ShieldCheck, Trash2, Pencil,
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
    mlcService,
    type MlcListItem, type MlcRecordDetail, type InjuryMarkItem,
    type UpsertMlcRecordRequest, type UpsertInjuryMarkRequest,
    type MlcCaseType, type MlcOutcome, type MlcStatus,
    type InjuryRegion, type InjuryType, type InjurySeverity,
} from '../services/mlcService';

const CASE_TYPES: { value: MlcCaseType; label: string }[] = [
    { value: 'RTA',             label: 'RTA' },
    { value: 'ASSAULT',         label: 'Assault' },
    { value: 'BURN',            label: 'Burn' },
    { value: 'POISONING',       label: 'Poisoning' },
    { value: 'SEXUAL_ASSAULT',  label: 'Sexual assault' },
    { value: 'FALL',            label: 'Fall' },
    { value: 'SUICIDE_ATTEMPT', label: 'Suicide attempt' },
    { value: 'FIREARM',         label: 'Firearm' },
    { value: 'ELECTRIC_SHOCK',  label: 'Electric shock' },
    { value: 'DROWNING',        label: 'Drowning' },
    { value: 'OTHER',           label: 'Other' },
];

const OUTCOMES: { value: MlcOutcome; label: string }[] = [
    { value: 'UNDER_TREATMENT', label: 'Under treatment' },
    { value: 'ADMITTED',        label: 'Admitted' },
    { value: 'DISCHARGED',      label: 'Discharged' },
    { value: 'REFERRED',        label: 'Referred' },
    { value: 'DAMA',            label: 'DAMA' },
    { value: 'EXPIRED',         label: 'Expired' },
];

const REGIONS: { value: InjuryRegion; label: string }[] = [
    { value: 'HEAD',             label: 'Head' },
    { value: 'FACE',             label: 'Face' },
    { value: 'NECK',             label: 'Neck' },
    { value: 'CHEST',            label: 'Chest' },
    { value: 'ABDOMEN',          label: 'Abdomen' },
    { value: 'BACK',             label: 'Back' },
    { value: 'PELVIS',           label: 'Pelvis' },
    { value: 'GENITALS',         label: 'Genitals' },
    { value: 'UPPER_LIMB_LEFT',  label: 'Upper limb L' },
    { value: 'UPPER_LIMB_RIGHT', label: 'Upper limb R' },
    { value: 'LOWER_LIMB_LEFT',  label: 'Lower limb L' },
    { value: 'LOWER_LIMB_RIGHT', label: 'Lower limb R' },
    { value: 'MULTIPLE',         label: 'Multiple' },
    { value: 'OTHER',            label: 'Other' },
];

const INJURY_TYPES: { value: InjuryType; label: string }[] = [
    { value: 'ABRASION',   label: 'Abrasion' },
    { value: 'CONTUSION',  label: 'Contusion' },
    { value: 'LACERATION', label: 'Laceration' },
    { value: 'INCISED',    label: 'Incised' },
    { value: 'STAB',       label: 'Stab' },
    { value: 'PUNCTURE',   label: 'Puncture' },
    { value: 'BURN',       label: 'Burn' },
    { value: 'FIREARM',    label: 'Firearm' },
    { value: 'BITE',       label: 'Bite' },
    { value: 'FRACTURE',   label: 'Fracture' },
    { value: 'OTHER',      label: 'Other' },
];

const SEVERITIES: { value: InjurySeverity; label: string; tone: string }[] = [
    { value: 'SIMPLE',     label: 'Simple',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'GRIEVOUS',   label: 'Grievous',   tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'DANGEROUS',  label: 'Dangerous',  tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'FATAL',      label: 'Fatal',      tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    { value: 'NOT_OPINED', label: 'Not opined', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
];

const STATUS_TONE: Record<string, string> = {
    DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
    FINALIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AMENDED:   'bg-violet-50 text-violet-700 border-violet-200',
};

const initialMlc = (): UpsertMlcRecordRequest => ({
    patientName: '',
    caseType: 'OTHER',
    outcome: 'UNDER_TREATMENT',
    arrivedAt: new Date().toISOString(),
    policeIntimated: false,
});

const initialInjury = (): UpsertInjuryMarkRequest => ({
    mlcRecordId: '',
    region: 'OTHER',
    injuryType: 'OTHER',
    severity: 'NOT_OPINED',
    sortOrder: 0,
});

const toLocal = (s?: string) => s ? s.slice(0, 16) : '';
const toIso = (s: string) => s ? new Date(s).toISOString() : undefined;

// ─── Injury sub-form ────────────────────────────────────────────────────────

const InjuryEditor: React.FC<{
    mlcRecordId: string;
    existing: InjuryMarkItem | null;
    onSaved: () => void;
    onCancel: () => void;
    disabled?: boolean;
}> = ({ mlcRecordId, existing, onSaved, onCancel, disabled }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertInjuryMarkRequest>(initialInjury());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (existing) {
            setForm({
                injuryMarkId: existing.injuryMarkId,
                mlcRecordId,
                sortOrder: existing.sortOrder,
                region: existing.region,
                side: existing.side,
                surface: existing.surface,
                xPercent: existing.xPercent,
                yPercent: existing.yPercent,
                view: existing.view,
                injuryType: existing.injuryType,
                sizeLengthCm: existing.sizeLengthCm,
                sizeBreadthCm: existing.sizeBreadthCm,
                depthCm: existing.depthCm,
                severity: existing.severity,
                ageOfInjury: existing.ageOfInjury,
                causativeAgent: existing.causativeAgent,
                description: existing.description,
            });
        } else {
            setForm({ ...initialInjury(), mlcRecordId });
        }
    }, [existing, mlcRecordId]);

    const set = <K extends keyof UpsertInjuryMarkRequest>(k: K, v: UpsertInjuryMarkRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await mlcService.upsertInjury(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: existing ? 'Injury updated' : 'Injury added' });
            onSaved();
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Region *</Label>
                    <select value={form.region} onChange={e => set('region', e.target.value)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Type *</Label>
                    <select value={form.injuryType} onChange={e => set('injuryType', e.target.value)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        {INJURY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Severity *</Label>
                    <select value={form.severity} onChange={e => set('severity', e.target.value)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Side</Label>
                    <select value={form.side ?? ''} onChange={e => set('side', e.target.value || undefined)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        <option value="">—</option>
                        <option value="LEFT">Left</option>
                        <option value="RIGHT">Right</option>
                        <option value="MIDLINE">Midline</option>
                    </select>
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Age of injury</Label>
                    <select value={form.ageOfInjury ?? ''} onChange={e => set('ageOfInjury', e.target.value || undefined)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        <option value="">—</option>
                        <option value="FRESH">Fresh</option>
                        <option value="RECENT">Recent</option>
                        <option value="OLD">Old</option>
                    </select>
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">View</Label>
                    <select value={form.view ?? ''} onChange={e => set('view', e.target.value || undefined)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        <option value="">—</option>
                        <option value="ANTERIOR">Anterior</option>
                        <option value="POSTERIOR">Posterior</option>
                        <option value="LATERAL_LEFT">Lateral L</option>
                        <option value="LATERAL_RIGHT">Lateral R</option>
                    </select>
                </div>

                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">L (cm)</Label>
                    <Input type="number" min={0} step="0.1" value={form.sizeLengthCm ?? ''} onChange={e => set('sizeLengthCm', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 mt-0.5 text-xs" disabled={disabled} />
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">B (cm)</Label>
                    <Input type="number" min={0} step="0.1" value={form.sizeBreadthCm ?? ''} onChange={e => set('sizeBreadthCm', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 mt-0.5 text-xs" disabled={disabled} />
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Depth (cm)</Label>
                    <Input type="number" min={0} step="0.1" value={form.depthCm ?? ''} onChange={e => set('depthCm', e.target.value ? parseFloat(e.target.value) : undefined)} className="h-8 mt-0.5 text-xs" disabled={disabled} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Causative agent</Label>
                    <Input value={form.causativeAgent ?? ''} onChange={e => set('causativeAgent', e.target.value)} className="h-8 mt-0.5 text-xs" placeholder="blunt / sharp / fire / etc." disabled={disabled} />
                </div>
                <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Surface</Label>
                    <select value={form.surface ?? ''} onChange={e => set('surface', e.target.value || undefined)} className="h-8 mt-0.5 w-full text-xs border border-slate-200 rounded-md px-2 bg-white" disabled={disabled}>
                        <option value="">—</option>
                        <option value="ANTERIOR">Anterior</option>
                        <option value="POSTERIOR">Posterior</option>
                        <option value="LATERAL">Lateral</option>
                    </select>
                </div>
            </div>

            <div>
                <Label className="text-[11px] font-semibold text-slate-700">Description</Label>
                <Textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2} className="text-xs mt-0.5" placeholder="Free-form clinical description" disabled={disabled} />
            </div>

            <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel} disabled={submitting || disabled}>
                    <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={submitting || disabled}>
                    {submitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    {existing ? 'Update injury' : 'Add injury'}
                </Button>
            </div>
        </div>
    );
};

// ─── MLC entry sheet ────────────────────────────────────────────────────────

const MlcSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editingId?: string | null;
    onSaved: () => void;
}> = ({ open, onOpenChange, editingId, onSaved }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertMlcRecordRequest>(initialMlc());
    const [detail, setDetail] = useState<MlcRecordDetail | null>(null);
    const [injuries, setInjuries] = useState<InjuryMarkItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [injuryEditOpen, setInjuryEditOpen] = useState(false);
    const [editingInjury, setEditingInjury] = useState<InjuryMarkItem | null>(null);
    const [busyInjuryId, setBusyInjuryId] = useState<string | null>(null);

    const finalised = detail?.status === 'FINALIZED';

    const loadDetail = useCallback(async () => {
        if (!editingId) return;
        setLoading(true);
        try {
            const res = await mlcService.getById(editingId);
            if (!res.success || !res.record) throw new Error(res.message ?? 'Failed to load');
            setDetail(res.record);
            setInjuries(res.injuries ?? []);
            setForm({
                mlcRecordId: res.record.mlcRecordId,
                patientId: res.record.patientId,
                admissionId: res.record.admissionId,
                encounterId: res.record.encounterId,
                patientName: res.record.patientName,
                guardianName: res.record.guardianName,
                age: res.record.age,
                sex: res.record.sex,
                address: res.record.address,
                idProofType: res.record.idProofType,
                idProofNumber: res.record.idProofNumber,
                broughtBy: res.record.broughtBy,
                broughtByRelation: res.record.broughtByRelation,
                broughtByContact: res.record.broughtByContact,
                arrivedAt: res.record.arrivedAt,
                modeOfArrival: res.record.modeOfArrival,
                caseType: res.record.caseType,
                allegedHistory: res.record.allegedHistory,
                incidentAt: res.record.incidentAt,
                incidentPlace: res.record.incidentPlace,
                policeStation: res.record.policeStation,
                firNumber: res.record.firNumber,
                diaryEntryNumber: res.record.diaryEntryNumber,
                policeInformedAt: res.record.policeInformedAt,
                policeInformedBy: res.record.policeInformedBy,
                policeIntimated: res.record.policeIntimated,
                generalCondition: res.record.generalCondition,
                vitalsSnapshot: res.record.vitalsSnapshot,
                smellOfAlcohol: res.record.smellOfAlcohol,
                samplesCollected: res.record.samplesCollected,
                examinedBy: res.record.examinedBy,
                examinedAt: res.record.examinedAt,
                outcome: res.record.outcome,
                outcomeNotes: res.record.outcomeNotes,
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
            setInjuries([]);
            setForm(initialMlc());
        }
        setInjuryEditOpen(false);
        setEditingInjury(null);
    }, [open, editingId, loadDetail]);

    const set = <K extends keyof UpsertMlcRecordRequest>(k: K, v: UpsertMlcRecordRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const submit = async (finalize: boolean) => {
        if (submitting) return;
        if (!form.patientName.trim()) { toast({ title: 'Patient name required', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await mlcService.upsert({ ...form, finalize });
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({
                title: finalize ? 'MLC finalized' : 'MLC saved',
                description: `${res.mlcNumber} · ${form.patientName}`,
            });
            // If we just created it, switch into edit mode to allow adding injuries.
            if (!editingId && res.mlcRecordId) {
                set('mlcRecordId', res.mlcRecordId);
                // Refresh detail by setting editing id externally? Simplest: close + parent reload + reopen.
                onSaved();
                onOpenChange(false);
                return;
            }
            onSaved();
            if (finalize) onOpenChange(false);
            else loadDetail();
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const removeInjury = async (id: string) => {
        if (busyInjuryId) return;
        if (!window.confirm('Delete this injury entry?')) return;
        setBusyInjuryId(id);
        try {
            const res = await mlcService.deleteInjury(id);
            if (!res.success) throw new Error(res.message ?? 'Could not delete');
            toast({ title: 'Injury deleted' });
            loadDetail();
        } catch (e: any) {
            toast({ title: 'Could not delete', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyInjuryId(null);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                            <Siren className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <SheetTitle className="text-base font-bold flex items-center gap-2">
                                {detail ? `MLC ${detail.mlcNumber}` : 'New MLC'}
                                {detail && <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[detail.status] ?? '')}>{detail.status}</Badge>}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {finalised ? 'This MLC is finalised — fields are read-only.' : 'Save as draft to add injuries, then finalise once complete.'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {loading && <Skeleton className="h-32 w-full" />}

                    {/* Patient block */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Patient Identification</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Patient name *</Label>
                                <Input value={form.patientName} onChange={e => set('patientName', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Age</Label>
                                <Input type="number" min={0} max={120} value={form.age ?? ''} onChange={e => set('age', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Sex</Label>
                                <select value={form.sex ?? ''} onChange={e => set('sex', e.target.value || undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={finalised}>
                                    <option value="">—</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Guardian / informant</Label>
                                <Input value={form.guardianName ?? ''} onChange={e => set('guardianName', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div className="md:col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">Address</Label>
                                <Textarea value={form.address ?? ''} onChange={e => set('address', e.target.value)} rows={2} className="text-sm mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">ID type</Label>
                                <Input value={form.idProofType ?? ''} onChange={e => set('idProofType', e.target.value)} className="h-9 mt-1" placeholder="AADHAAR / VOTER_ID …" disabled={finalised} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">ID number</Label>
                                <Input value={form.idProofNumber ?? ''} onChange={e => set('idProofNumber', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                        </div>
                    </section>

                    {/* Arrival + case classification */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Arrival & Case</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Arrived at</Label>
                                <Input type="datetime-local" value={toLocal(form.arrivedAt)} onChange={e => set('arrivedAt', toIso(e.target.value))} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Mode</Label>
                                <select value={form.modeOfArrival ?? ''} onChange={e => set('modeOfArrival', e.target.value || undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={finalised}>
                                    <option value="">—</option>
                                    <option value="WALK_IN">Walk-in</option>
                                    <option value="AMBULANCE">Ambulance</option>
                                    <option value="POLICE">Police</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Brought by</Label>
                                <Input value={form.broughtBy ?? ''} onChange={e => set('broughtBy', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Contact</Label>
                                <Input value={form.broughtByContact ?? ''} onChange={e => set('broughtByContact', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Case type *</Label>
                                <select value={form.caseType} onChange={e => set('caseType', e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={finalised}>
                                    {CASE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Incident at</Label>
                                <Input type="datetime-local" value={toLocal(form.incidentAt)} onChange={e => set('incidentAt', toIso(e.target.value))} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Incident place</Label>
                                <Input value={form.incidentPlace ?? ''} onChange={e => set('incidentPlace', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div className="md:col-span-4">
                                <Label className="text-xs font-semibold text-slate-700">Alleged history</Label>
                                <Textarea value={form.allegedHistory ?? ''} onChange={e => set('allegedHistory', e.target.value)} rows={2} className="text-sm mt-1" placeholder="Narrative as given by patient / attendant" disabled={finalised} />
                            </div>
                        </div>
                    </section>

                    {/* Police */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Police Intimation</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input type="checkbox" checked={!!form.policeIntimated} onChange={e => set('policeIntimated', e.target.checked)} disabled={finalised} />
                                    Police intimated
                                </label>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Station</Label>
                                <Input value={form.policeStation ?? ''} onChange={e => set('policeStation', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">FIR #</Label>
                                <Input value={form.firNumber ?? ''} onChange={e => set('firNumber', e.target.value)} className="h-9 mt-1 font-mono" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Diary entry #</Label>
                                <Input value={form.diaryEntryNumber ?? ''} onChange={e => set('diaryEntryNumber', e.target.value)} className="h-9 mt-1 font-mono" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Informed at</Label>
                                <Input type="datetime-local" value={toLocal(form.policeInformedAt)} onChange={e => set('policeInformedAt', toIso(e.target.value))} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div className="md:col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">Informed by</Label>
                                <Input value={form.policeInformedBy ?? ''} onChange={e => set('policeInformedBy', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                        </div>
                    </section>

                    {/* Examination */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Examination</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Examined by</Label>
                                <Input value={form.examinedBy ?? ''} onChange={e => set('examinedBy', e.target.value)} className="h-9 mt-1" placeholder="Defaults to current user" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Examined at</Label>
                                <Input type="datetime-local" value={toLocal(form.examinedAt)} onChange={e => set('examinedAt', toIso(e.target.value))} className="h-9 mt-1" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Smell of alcohol</Label>
                                <select value={form.smellOfAlcohol ?? ''} onChange={e => set('smellOfAlcohol', e.target.value || undefined)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={finalised}>
                                    <option value="">—</option>
                                    <option value="YES">Yes</option>
                                    <option value="NO">No</option>
                                    <option value="SUSPECT">Suspect</option>
                                    <option value="NOT_TESTED">Not tested</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <Label className="text-xs font-semibold text-slate-700">General condition</Label>
                                <Textarea value={form.generalCondition ?? ''} onChange={e => set('generalCondition', e.target.value)} rows={2} className="text-sm mt-1" disabled={finalised} />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Vitals snapshot</Label>
                                <Input value={form.vitalsSnapshot ?? ''} onChange={e => set('vitalsSnapshot', e.target.value)} className="h-9 mt-1" placeholder="BP / HR / RR / Temp / GCS" disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Samples collected</Label>
                                <Input value={form.samplesCollected ?? ''} onChange={e => set('samplesCollected', e.target.value)} className="h-9 mt-1" placeholder="Blood ethanol, urine, etc." disabled={finalised} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Outcome</Label>
                                <select value={form.outcome} onChange={e => set('outcome', e.target.value)} className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white" disabled={finalised}>
                                    {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Outcome notes</Label>
                                <Input value={form.outcomeNotes ?? ''} onChange={e => set('outcomeNotes', e.target.value)} className="h-9 mt-1" disabled={finalised} />
                            </div>
                        </div>
                    </section>

                    {/* Injuries */}
                    {detail && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Injuries ({injuries.length})</h4>
                                {!finalised && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingInjury(null); setInjuryEditOpen(true); }}>
                                        <Plus className="h-3 w-3 mr-1" /> Add injury
                                    </Button>
                                )}
                            </div>

                            {injuryEditOpen && (
                                <InjuryEditor
                                    mlcRecordId={detail.mlcRecordId}
                                    existing={editingInjury}
                                    disabled={finalised}
                                    onCancel={() => { setInjuryEditOpen(false); setEditingInjury(null); }}
                                    onSaved={() => { setInjuryEditOpen(false); setEditingInjury(null); loadDetail(); }}
                                />
                            )}

                            {injuries.length === 0 && !injuryEditOpen && (
                                <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                                    No injuries recorded yet.
                                </div>
                            )}

                            {injuries.length > 0 && (
                                <div className="space-y-2">
                                    {injuries.map(inj => {
                                        const sev = SEVERITIES.find(s => s.value === inj.severity);
                                        return (
                                            <div key={inj.injuryMarkId} className="rounded-lg border border-slate-200 bg-white p-2.5 flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-slate-900">{REGIONS.find(r => r.value === inj.region)?.label ?? inj.region}{inj.side ? ` · ${inj.side}` : ''}</p>
                                                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">{inj.injuryType}</Badge>
                                                        {sev && <Badge variant="outline" className={cn('text-[10px] font-bold', sev.tone)}>{sev.label}</Badge>}
                                                        {inj.ageOfInjury && <span className="text-[10px] text-slate-500">{inj.ageOfInjury}</span>}
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-0.5">
                                                        {[inj.sizeLengthCm, inj.sizeBreadthCm, inj.depthCm].filter(v => v != null).length > 0
                                                            ? `${inj.sizeLengthCm ?? '—'} × ${inj.sizeBreadthCm ?? '—'} × ${inj.depthCm ?? '—'} cm`
                                                            : null}
                                                        {inj.causativeAgent && <span> · {inj.causativeAgent}</span>}
                                                    </p>
                                                    {inj.description && <p className="text-[11px] text-slate-500 mt-0.5">{inj.description}</p>}
                                                </div>
                                                {!finalised && (
                                                    <div className="flex items-center gap-1">
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingInjury(inj); setInjuryEditOpen(true); }}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => removeInjury(inj.injuryMarkId)} disabled={busyInjuryId === inj.injuryMarkId}>
                                                            {busyInjuryId === inj.injuryMarkId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {!detail && !editingId && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-800">Save as draft first to start adding injuries.</p>
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                    <div className="flex-1" />
                    {!finalised && (
                        <>
                            <Button variant="outline" className="h-10 px-4" onClick={() => submit(false)} disabled={submitting}>
                                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Draft</>}
                            </Button>
                            <Button onClick={() => submit(true)} disabled={submitting} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 font-semibold">
                                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizing…</> : <><ShieldCheck className="h-4 w-4 mr-2" />Finalize MLC</>}
                            </Button>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main MLC page ──────────────────────────────────────────────────────────

const MlcPage: React.FC = () => {
    const [items, setItems] = useState<MlcListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | MlcStatus>('ALL');
    const [caseFilter, setCaseFilter] = useState<'ALL' | MlcCaseType>('ALL');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await mlcService.list({ take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load MLC records');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (statusFilter !== 'ALL' && it.status !== statusFilter) return false;
            if (caseFilter !== 'ALL' && it.caseType !== caseFilter) return false;
            if (!q) return true;
            return it.mlcNumber.toLowerCase().includes(q)
                || it.patientName.toLowerCase().includes(q)
                || (it.firNumber ?? '').toLowerCase().includes(q);
        });
    }, [items, search, statusFilter, caseFilter]);

    const counts = useMemo(() => ({
        total: items.length,
        draft: items.filter(i => i.status === 'DRAFT').length,
        finalized: items.filter(i => i.status === 'FINALIZED').length,
        policeNot: items.filter(i => !i.policeIntimated && i.status !== 'FINALIZED').length,
    }), [items]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md">
                            <Siren className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Medico-Legal Cases</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Statutory MLC register · police intimation · injury map.</p>
                        </div>
                    </div>
                    <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> New MLC
                    </Button>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Drafts</p>
                        <p className="text-2xl font-black text-amber-900 mt-0.5">{counts.draft}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Finalized</p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">{counts.finalized}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.policeNot > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.policeNot > 0 ? 'text-rose-700' : 'text-slate-400')}>Police pending</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.policeNot > 0 ? 'text-rose-900' : 'text-slate-700')}>{counts.policeNot}</p>
                    </div>
                </div>

                {/* Filter strip */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search MLC #, patient, FIR" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ALL', 'DRAFT', 'FINALIZED'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                                'h-7 px-3 rounded-md text-xs font-semibold',
                                statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            )}>{s}</button>
                        ))}
                    </div>
                    <select value={caseFilter} onChange={e => setCaseFilter(e.target.value as 'ALL' | MlcCaseType)} className="h-9 text-xs border border-slate-200 rounded-md px-2 bg-white">
                        <option value="ALL">All case types</option>
                        {CASE_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
                        <Siren className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No MLC records yet</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Create the first medico-legal case.</p>
                        <Button onClick={() => { setEditingId(null); setSheetOpen(true); }} className="h-10 bg-rose-600 hover:bg-rose-700">
                            <Plus className="h-4 w-4 mr-2" /> New MLC
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">MLC #</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Patient</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Case</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Arrived</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Status</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Police</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Inj.</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Examined by</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => (
                                    <tr key={it.mlcRecordId} className="border-t border-slate-100 hover:bg-slate-50/50 cursor-pointer" onClick={() => { setEditingId(it.mlcRecordId); setSheetOpen(true); }}>
                                        <td className="px-3 py-2 font-mono text-xs font-bold text-rose-700">{it.mlcNumber}</td>
                                        <td className="px-3 py-2">
                                            <p className="text-sm font-semibold text-slate-900">{it.patientName}</p>
                                            <p className="text-[11px] text-slate-500">{it.age != null ? `${it.age}y` : ''}{it.sex ? ` · ${it.sex}` : ''}</p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700 border-slate-200">
                                                {CASE_TYPES.find(c => c.value === it.caseType)?.label ?? it.caseType}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">{format(parseISO(it.arrivedAt), 'd MMM HH:mm')}</td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? '')}>{it.status}</Badge>
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                            {it.policeIntimated
                                                ? <span className="text-emerald-700 font-semibold">{it.firNumber ?? 'Intimated'}</span>
                                                : <span className="text-rose-700 font-semibold">Pending</span>}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-bold text-slate-800">{it.injuryCount}</td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{it.examinedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No MLC records match the current filters</p>
                    </div>
                )}
            </div>

            <MlcSheet open={sheetOpen} onOpenChange={setSheetOpen} editingId={editingId} onSaved={() => load(true)} />
        </div>
    );
};

export default MlcPage;
