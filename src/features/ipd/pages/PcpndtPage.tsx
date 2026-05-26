import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    FileCheck, Plus, RefreshCw, Loader2, AlertCircle, Search, X, Save, ShieldCheck, Calendar, AlertTriangle,
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
    pcpndtService,
    type PcpndtFormFListItem,
    type CreatePcpndtFormFRequest,
} from '../services/pcpndtService';

// ─── Constants ──────────────────────────────────────────────────────────────

const INDICATION_OPTIONS: { code: string; label: string }[] = [
    { code: 'ANC',                label: 'Routine antenatal scan' },
    { code: 'FETAL_ANOMALY',      label: 'Suspected fetal anomaly' },
    { code: 'IUGR',               label: 'Intrauterine growth restriction' },
    { code: 'POLYHYDRAMNIOS',     label: 'Polyhydramnios' },
    { code: 'OLIGOHYDRAMNIOS',    label: 'Oligohydramnios' },
    { code: 'VAGINAL_BLEEDING',   label: 'Vaginal bleeding' },
    { code: 'PAIN_ABDOMEN',       label: 'Pain in abdomen' },
    { code: 'PREVIOUS_LSCS',      label: 'Previous LSCS' },
    { code: 'MULTIPLE_GESTATION', label: 'Multiple gestation' },
    { code: 'OTHER',              label: 'Other (specify)' },
];

const PROCEDURE_OPTIONS = ['USG', 'DOPPLER', 'OTHER'] as const;
const ID_PROOF_OPTIONS = ['AADHAAR', 'VOTER_ID', 'PAN', 'PASSPORT', 'OTHER'] as const;

const STATUS_TONE: Record<string, string> = {
    DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
    FINALIZED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AMENDED:   'bg-violet-50 text-violet-700 border-violet-200',
};

const initialForm = (): CreatePcpndtFormFRequest => ({
    patientName: '',
    age: 0,
    address: '',
    indications: ['ANC'],
    procedureType: 'USG',
    performedLocation: '',
    sonologistName: '',
    sonologistQualification: '',
    sonologistRegistrationNumber: '',
    findings: '',
    previousPregnancies: 0,
    livingMaleChildren: 0,
    livingFemaleChildren: 0,
    abortions: 0,
});

// ─── Entry sheet ────────────────────────────────────────────────────────────

const PcpndtEntrySheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onCreated: () => void;
}> = ({ open, onOpenChange, onCreated }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<CreatePcpndtFormFRequest>(initialForm());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setForm(initialForm());
    }, [open]);

    const set = <K extends keyof CreatePcpndtFormFRequest>(k: K, v: CreatePcpndtFormFRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const toggleIndication = (code: string) => {
        setForm(prev => {
            const has = prev.indications.includes(code);
            return { ...prev, indications: has ? prev.indications.filter(c => c !== code) : [...prev.indications, code] };
        });
    };

    const handleSubmit = async (finalize: boolean) => {
        if (submitting) return;
        if (!form.patientName.trim()) { toast({ title: 'Patient name required', variant: 'destructive' }); return; }
        if (form.age <= 0 || form.age > 120) { toast({ title: 'Age must be 1-120', variant: 'destructive' }); return; }
        if (!form.address.trim())             { toast({ title: 'Address required', variant: 'destructive' }); return; }
        if (form.indications.length === 0)    { toast({ title: 'At least one indication required', variant: 'destructive' }); return; }
        if (form.indications.includes('OTHER') && !form.indicationOtherText?.trim()) {
            toast({ title: '"Other" indication needs detail', variant: 'destructive' }); return;
        }
        if (!form.performedLocation.trim())   { toast({ title: 'Performed location required', variant: 'destructive' }); return; }
        if (!form.sonologistName.trim())      { toast({ title: 'Sonologist name required', variant: 'destructive' }); return; }
        if (!form.sonologistQualification.trim()) { toast({ title: 'Sonologist qualification required', variant: 'destructive' }); return; }
        if (!form.sonologistRegistrationNumber.trim()) { toast({ title: 'Sonologist registration number required', variant: 'destructive' }); return; }
        if (!form.findings.trim())            { toast({ title: 'Findings required', variant: 'destructive' }); return; }

        if (finalize) {
            if (!form.doctorDeclarationGiven || !form.doctorDeclarationSignedBy?.trim()) {
                toast({ title: 'Doctor declaration required to finalize', variant: 'destructive' }); return;
            }
            if (!form.patientDeclarationGiven || !form.patientDeclarationSignedBy?.trim()) {
                toast({ title: 'Patient declaration required to finalize', variant: 'destructive' }); return;
            }
        }

        setSubmitting(true);
        try {
            const res = await pcpndtService.create({ ...form, finalize });
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({
                title: finalize ? 'Form F finalized' : 'Form F saved as draft',
                description: `Serial ${res.serialNumber}`,
            });
            onCreated();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <FileCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">PCPNDT Form F</SheetTitle>
                            <SheetDescription className="text-xs">
                                Statutory record under the PCPNDT Act. Once finalised, this record cannot be edited.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Patient identification */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Patient Identification</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Patient name *</Label>
                                <Input value={form.patientName} onChange={e => set('patientName', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Husband / Father name</Label>
                                <Input value={form.husbandOrFatherName ?? ''} onChange={e => set('husbandOrFatherName', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Age *</Label>
                                <Input type="number" min={1} max={120} value={form.age || ''} onChange={e => set('age', parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Address *</Label>
                                <Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} className="text-sm mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Mobile</Label>
                                <Input value={form.mobile ?? ''} onChange={e => set('mobile', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">ID type</Label>
                                    <select
                                        value={form.idProofType ?? ''}
                                        onChange={e => set('idProofType', e.target.value || undefined)}
                                        className="h-9 mt-1 w-full text-sm border border-slate-200 rounded-md px-2 bg-white"
                                    >
                                        <option value="">—</option>
                                        {ID_PROOF_OPTIONS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">ID number</Label>
                                    <Input value={form.idProofNumber ?? ''} onChange={e => set('idProofNumber', e.target.value)} className="h-9 mt-1" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Referral */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Referral</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Referred by (doctor)</Label>
                                <Input value={form.referredByName ?? ''} onChange={e => set('referredByName', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Referral slip #</Label>
                                <Input value={form.referralSlipNumber ?? ''} onChange={e => set('referralSlipNumber', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Referrer address</Label>
                                <Input value={form.referredByAddress ?? ''} onChange={e => set('referredByAddress', e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                    </section>

                    {/* Obstetric history */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Obstetric History</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">LMP</Label>
                                <Input type="date" value={form.lastMenstrualPeriod?.slice(0, 10) ?? ''} onChange={e => set('lastMenstrualPeriod', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Gestation (weeks)</Label>
                                <Input type="number" min={0} max={45} value={form.gestationalWeeks ?? ''} onChange={e => set('gestationalWeeks', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Gestation (days)</Label>
                                <Input type="number" min={0} max={6} value={form.gestationalDays ?? ''} onChange={e => set('gestationalDays', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Previous pregnancies</Label>
                                <Input type="number" min={0} value={form.previousPregnancies ?? 0} onChange={e => set('previousPregnancies', parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Living male</Label>
                                <Input type="number" min={0} value={form.livingMaleChildren ?? 0} onChange={e => set('livingMaleChildren', parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Living female</Label>
                                <Input type="number" min={0} value={form.livingFemaleChildren ?? 0} onChange={e => set('livingFemaleChildren', parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Abortions</Label>
                                <Input type="number" min={0} value={form.abortions ?? 0} onChange={e => set('abortions', parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                        </div>
                    </section>

                    {/* Indications */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Indications for scan *</h4>
                        <div className="grid grid-cols-2 gap-1.5">
                            {INDICATION_OPTIONS.map(opt => {
                                const selected = form.indications.includes(opt.code);
                                return (
                                    <button
                                        key={opt.code}
                                        type="button"
                                        onClick={() => toggleIndication(opt.code)}
                                        className={cn(
                                            'px-2.5 py-2 rounded-md border text-xs font-medium text-left transition-all',
                                            selected
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                        {form.indications.includes('OTHER') && (
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Other indication *</Label>
                                <Input value={form.indicationOtherText ?? ''} onChange={e => set('indicationOtherText', e.target.value)} className="h-9 mt-1" />
                            </div>
                        )}
                    </section>

                    {/* Procedure */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Procedure</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {PROCEDURE_OPTIONS.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => set('procedureType', p)}
                                    className={cn(
                                        'px-3 h-8 rounded-md border text-xs font-semibold',
                                        form.procedureType === p
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{p}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Performed at (datetime)</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.performedAt ? form.performedAt.slice(0, 16) : ''}
                                    onChange={e => set('performedAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                                    className="h-9 mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Performed location *</Label>
                                <Input value={form.performedLocation} onChange={e => set('performedLocation', e.target.value)} className="h-9 mt-1" placeholder="e.g. USG Room 1, Main Block" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Sonologist name *</Label>
                                <Input value={form.sonologistName} onChange={e => set('sonologistName', e.target.value)} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Sonologist qualification *</Label>
                                <Input value={form.sonologistQualification} onChange={e => set('sonologistQualification', e.target.value)} className="h-9 mt-1" placeholder="e.g. MD Radiology" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-slate-700">Sonologist registration number *</Label>
                                <Input value={form.sonologistRegistrationNumber} onChange={e => set('sonologistRegistrationNumber', e.target.value)} className="h-9 mt-1" />
                            </div>
                        </div>
                    </section>

                    {/* Findings */}
                    <section className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Findings *</h4>
                        <Textarea value={form.findings} onChange={e => set('findings', e.target.value)} rows={4} className="text-sm" placeholder="Describe findings strictly per the indications listed above." />
                    </section>

                    {/* Declarations */}
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Statutory Declarations (required to finalize)</h4>

                        <div className={cn('rounded-lg border-2 p-3', form.doctorDeclarationGiven ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white')}>
                            <button
                                type="button"
                                onClick={() => set('doctorDeclarationGiven', !form.doctorDeclarationGiven)}
                                className="flex items-start gap-3 w-full text-left"
                            >
                                <ShieldCheck className={cn('h-5 w-5 mt-0.5 shrink-0', form.doctorDeclarationGiven ? 'text-emerald-600' : 'text-slate-400')} />
                                <div className="flex-1">
                                    <p className={cn('text-xs font-bold', form.doctorDeclarationGiven ? 'text-emerald-900' : 'text-slate-700')}>
                                        Doctor's declaration
                                    </p>
                                    <p className="text-[11px] text-slate-600 mt-0.5 italic">
                                        "I have not detected the sex of the foetus during this examination, nor have I disclosed the sex of the foetus to anyone in any manner."
                                    </p>
                                </div>
                            </button>
                            {form.doctorDeclarationGiven && (
                                <div className="mt-3 pl-8">
                                    <Label className="text-xs font-semibold text-slate-700">Signed by *</Label>
                                    <Input value={form.doctorDeclarationSignedBy ?? ''} onChange={e => set('doctorDeclarationSignedBy', e.target.value)} className="h-9 mt-1 bg-white" placeholder="Full name of the doctor signing" />
                                </div>
                            )}
                        </div>

                        <div className={cn('rounded-lg border-2 p-3', form.patientDeclarationGiven ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white')}>
                            <button
                                type="button"
                                onClick={() => set('patientDeclarationGiven', !form.patientDeclarationGiven)}
                                className="flex items-start gap-3 w-full text-left"
                            >
                                <ShieldCheck className={cn('h-5 w-5 mt-0.5 shrink-0', form.patientDeclarationGiven ? 'text-emerald-600' : 'text-slate-400')} />
                                <div className="flex-1">
                                    <p className={cn('text-xs font-bold', form.patientDeclarationGiven ? 'text-emerald-900' : 'text-slate-700')}>
                                        Patient's declaration
                                    </p>
                                    <p className="text-[11px] text-slate-600 mt-0.5 italic">
                                        "I do not want to know the sex of my foetus. I understand that disclosing or seeking the sex of the foetus is an offence under the PCPNDT Act."
                                    </p>
                                </div>
                            </button>
                            {form.patientDeclarationGiven && (
                                <div className="mt-3 pl-8">
                                    <Label className="text-xs font-semibold text-slate-700">Signed by *</Label>
                                    <Input value={form.patientDeclarationSignedBy ?? ''} onChange={e => set('patientDeclarationSignedBy', e.target.value)} className="h-9 mt-1 bg-white" placeholder="Full name of the pregnant woman" />
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-800">
                                Use <strong>Save Draft</strong> to record partial information. <strong>Finalize</strong> requires both declarations and locks the record.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" className="h-10 px-4" onClick={() => handleSubmit(false)} disabled={submitting}>
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Draft</>}
                    </Button>
                    <Button onClick={() => handleSubmit(true)} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizing…</> : <><ShieldCheck className="h-4 w-4 mr-2" />Finalize</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const PcpndtPage: React.FC = () => {
    const [items, setItems] = useState<PcpndtFormFListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED'>('ALL');
    const [sheetOpen, setSheetOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await pcpndtService.list({ take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load PCPNDT records');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return items.filter(it => {
            if (statusFilter !== 'ALL' && it.status !== statusFilter) return false;
            if (!q) return true;
            return it.serialNumber.toLowerCase().includes(q)
                || it.patientName.toLowerCase().includes(q)
                || (it.mobile ?? '').toLowerCase().includes(q)
                || it.sonologistName.toLowerCase().includes(q);
        });
    }, [items, filter, statusFilter]);

    const counts = useMemo(() => ({
        total: items.length,
        draft: items.filter(i => i.status === 'DRAFT').length,
        finalized: items.filter(i => i.status === 'FINALIZED').length,
    }), [items]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <FileCheck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">PCPNDT Form F</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Statutory record for every prenatal ultrasound · per Pre-Conception and Pre-Natal Diagnostic Techniques Act.</p>
                        </div>
                    </div>
                    <Button onClick={() => setSheetOpen(true)} className="h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> New Form F
                    </Button>
                </div>

                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-3">
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
                </div>

                {/* Filter row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Search by serial, name, mobile, sonologist…"
                            className="h-9 text-sm pl-8 bg-white"
                        />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ALL', 'DRAFT', 'FINALIZED'] as const).map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    'h-7 px-3 rounded-md text-xs font-semibold',
                                    statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                )}
                            >{s}</button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {/* List */}
                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No PCPNDT records yet</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">A Form F must be filed for every prenatal ultrasound performed at this centre.</p>
                        <Button onClick={() => setSheetOpen(true)} className="h-10 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> Create First Form F
                        </Button>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No records match the current filters</p>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-bold">Serial</th>
                                    <th className="text-left px-4 py-2.5 font-bold">Patient</th>
                                    <th className="text-left px-4 py-2.5 font-bold">Procedure</th>
                                    <th className="text-left px-4 py-2.5 font-bold">Performed</th>
                                    <th className="text-left px-4 py-2.5 font-bold">Sonologist</th>
                                    <th className="text-left px-4 py-2.5 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => (
                                    <tr key={it.pcpndtFormFId} className="border-t border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-700">{it.serialNumber}</td>
                                        <td className="px-4 py-2.5">
                                            <p className="text-sm font-semibold text-slate-900">{it.patientName}</p>
                                            <p className="text-[11px] text-slate-500">{it.age} y{it.mobile && <> · {it.mobile}</>}</p>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-700">{it.procedureType}</td>
                                        <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                            <Calendar className="h-3 w-3 inline mr-1 text-slate-400" />
                                            {format(parseISO(it.performedAt), 'd MMM yyyy HH:mm')}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-700">{it.sonologistName}</td>
                                        <td className="px-4 py-2.5">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_TONE[it.status] ?? '')}>{it.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <PcpndtEntrySheet open={sheetOpen} onOpenChange={setSheetOpen} onCreated={() => load(true)} />
        </div>
    );
};

export default PcpndtPage;
