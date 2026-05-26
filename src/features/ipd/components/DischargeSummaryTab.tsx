import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileSignature, Save, Lock, Printer, RefreshCw, Loader2, AlertCircle,
    CheckCircle2, Clock, User, Stethoscope, Calendar, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
    dischargeSummaryService, type DischargeSummaryData,
    type SaveDischargeSummaryRequest, type DischargeCondition,
} from '../services/dischargeSummaryService';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { buildDischargeBundleA4 } from '../utils/dischargeBundlePrint';
import { openPrintHtml } from '@/utils/printUtils';

const CONDITION_OPTIONS: { value: DischargeCondition; label: string; tone: string }[] = [
    { value: 'STABLE',    label: 'Stable',           tone: 'text-emerald-700' },
    { value: 'IMPROVED',  label: 'Improved',         tone: 'text-blue-700' },
    { value: 'RECOVERED', label: 'Fully Recovered',  tone: 'text-emerald-700' },
    { value: 'REFERRED',  label: 'Referred Out',     tone: 'text-amber-700' },
    { value: 'LAMA',      label: 'Left Against Advice', tone: 'text-orange-700' },
    { value: 'EXPIRED',   label: 'Expired',          tone: 'text-rose-700' },
];

interface DischargeSummaryTabProps {
    admissionId: string;
    isActive: boolean;
}

interface DraftForm {
    admittingDiagnosis: string;
    finalDiagnosis: string;
    chiefComplaint: string;
    historyOfPresentIllness: string;
    courseInHospital: string;
    proceduresPerformed: string;
    conditionAtDischarge: string;
    dischargeMedications: string;
    followUpInstructions: string;
    followUpDate: string;
    dietInstructions: string;
    activityRestrictions: string;
    additionalNotes: string;
}

const toForm = (d?: DischargeSummaryData | null): DraftForm => ({
    admittingDiagnosis: d?.admittingDiagnosis ?? '',
    finalDiagnosis: d?.finalDiagnosis ?? '',
    chiefComplaint: d?.chiefComplaint ?? '',
    historyOfPresentIllness: d?.historyOfPresentIllness ?? '',
    courseInHospital: d?.courseInHospital ?? '',
    proceduresPerformed: d?.proceduresPerformed ?? '',
    conditionAtDischarge: d?.conditionAtDischarge ?? '',
    dischargeMedications: d?.dischargeMedications ?? '',
    followUpInstructions: d?.followUpInstructions ?? '',
    followUpDate: d?.followUpDate ? d.followUpDate.split('T')[0] : '',
    dietInstructions: d?.dietInstructions ?? '',
    activityRestrictions: d?.activityRestrictions ?? '',
    additionalNotes: d?.additionalNotes ?? '',
});

const formsEqual = (a: DraftForm, b: DraftForm): boolean =>
    (Object.keys(a) as (keyof DraftForm)[]).every(k => a[k] === b[k]);

export const DischargeSummaryTab: React.FC<DischargeSummaryTabProps> = ({ admissionId, isActive }) => {
    const { toast } = useToast();
    // Hospital name comes from the patient's hospital — not on the auth store today.
    // Falls back to a generic header in the bundle template.
    const hospitalName: string | null = null;
    const [data, setData] = useState<DischargeSummaryData | null>(null);
    const [form, setForm] = useState<DraftForm>(toForm(null));
    const [savedForm, setSavedForm] = useState<DraftForm>(toForm(null));
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [signing, setSigning] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [signConfirmOpen, setSignConfirmOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await dischargeSummaryService.get(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load discharge summary');
            const d = res.data ?? null;
            setData(d);
            const f = toForm(d);
            setForm(f);
            setSavedForm(f);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load discharge summary');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadedOnce(true);
        }
    }, [admissionId]);

    useEffect(() => {
        if (isActive && !loadedOnce) load();
    }, [isActive, loadedOnce, load]);

    const isSigned = !!data?.isSigned;
    const readOnly = isSigned;
    const isDirty = !formsEqual(form, savedForm);
    const isDischarged = data?.admission?.statusCode === 'DISCHARGED';
    const nabhBreach = !!data?.nabhBreach && !isSigned;

    const set = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => {
        if (readOnly) return;
        setForm(prev => ({ ...prev, [k]: v }));
    };

    const handleSave = async () => {
        if (readOnly || saving) return;
        setSaving(true);
        try {
            const payload: SaveDischargeSummaryRequest = {
                admissionId,
                admittingDiagnosis: form.admittingDiagnosis || undefined,
                finalDiagnosis: form.finalDiagnosis || undefined,
                chiefComplaint: form.chiefComplaint || undefined,
                historyOfPresentIllness: form.historyOfPresentIllness || undefined,
                courseInHospital: form.courseInHospital || undefined,
                proceduresPerformed: form.proceduresPerformed || undefined,
                conditionAtDischarge: form.conditionAtDischarge || undefined,
                dischargeMedications: form.dischargeMedications || undefined,
                followUpInstructions: form.followUpInstructions || undefined,
                followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
                dietInstructions: form.dietInstructions || undefined,
                activityRestrictions: form.activityRestrictions || undefined,
                additionalNotes: form.additionalNotes || undefined,
            };
            const res = await dischargeSummaryService.save(payload);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: 'Discharge summary saved' });
            setSavedForm(form);
            await load(true);
        } catch (e: any) {
            toast({ title: 'Save failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleSign = async () => {
        setSigning(true);
        try {
            // If dirty, save first
            if (isDirty) {
                const saveRes = await dischargeSummaryService.save({
                    admissionId,
                    admittingDiagnosis: form.admittingDiagnosis || undefined,
                    finalDiagnosis: form.finalDiagnosis || undefined,
                    chiefComplaint: form.chiefComplaint || undefined,
                    historyOfPresentIllness: form.historyOfPresentIllness || undefined,
                    courseInHospital: form.courseInHospital || undefined,
                    proceduresPerformed: form.proceduresPerformed || undefined,
                    conditionAtDischarge: form.conditionAtDischarge || undefined,
                    dischargeMedications: form.dischargeMedications || undefined,
                    followUpInstructions: form.followUpInstructions || undefined,
                    followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
                    dietInstructions: form.dietInstructions || undefined,
                    activityRestrictions: form.activityRestrictions || undefined,
                    additionalNotes: form.additionalNotes || undefined,
                });
                if (!saveRes.success) throw new Error(saveRes.message ?? 'Could not save before sign');
            }
            const res = await dischargeSummaryService.sign({ admissionId });
            if (!res.success) throw new Error(res.message ?? 'Could not sign');
            toast({ title: 'Discharge summary signed and locked' });
            setSignConfirmOpen(false);
            await load(true);
        } catch (e: any) {
            toast({ title: 'Sign failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSigning(false);
        }
    };

    const handlePrintBundle = async () => {
        if (!data) return;
        setPrinting(true);
        try {
            let bill = null;
            try {
                if (data.admission.patientId && data.admission.encounterId) {
                    const billRes = await ipdBillingService.getEncounterEvents(
                        data.admission.encounterId,
                        data.admission.patientId,
                    );
                    if (billRes.success) bill = billRes.data ?? null;
                }
            } catch {
                // A bundle without the bill page is still useful.
            }

            const html = buildDischargeBundleA4({
                summary: data,
                bill,
                hospital: { hospitalName: hospitalName ?? 'Hospital', address: '' },
            });
            openPrintHtml(html);
        } finally {
            setPrinting(false);
        }
    };

    const sections = useMemo(() => ([
        { key: 'admittingDiagnosis',      label: 'Admitting Diagnosis',          rows: 2, required: false },
        { key: 'finalDiagnosis',          label: 'Final Diagnosis ★',            rows: 2, required: true },
        { key: 'chiefComplaint',          label: 'Chief Complaint',              rows: 2, required: false },
        { key: 'historyOfPresentIllness', label: 'History of Present Illness',   rows: 3, required: false },
        { key: 'courseInHospital',        label: 'Course in Hospital',           rows: 5, required: false },
        { key: 'proceduresPerformed',     label: 'Procedures Performed',         rows: 3, required: false },
        { key: 'dischargeMedications',    label: 'Discharge Medications',        rows: 4, required: false },
        { key: 'followUpInstructions',    label: 'Follow-up Instructions',       rows: 3, required: false },
        { key: 'dietInstructions',        label: 'Diet Instructions',            rows: 2, required: false },
        { key: 'activityRestrictions',    label: 'Activity Restrictions',        rows: 2, required: false },
        { key: 'additionalNotes',         label: 'Additional Notes',             rows: 3, required: false },
    ] as const), []);

    if (loading) {
        return (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3 mt-4">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-700">Could not load discharge summary</p>
                    <p className="text-xs text-rose-600">{error}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-4">

            {/* Header / status bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-indigo-600" /> Discharge Summary
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                            {isSigned ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> SIGNED
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 gap-1">
                                    <Clock className="h-3 w-3" /> DRAFT
                                </Badge>
                            )}
                            {!isDischarged && !isSigned && (
                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                    Patient not yet discharged
                                </Badge>
                            )}
                            {nabhBreach && (
                                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 gap-1">
                                    <AlertCircle className="h-3 w-3" /> NABH 24h breach
                                </Badge>
                            )}
                            {data?.nabhDueAt && !isSigned && isDischarged && !nabhBreach && (
                                <span className="text-[11px] text-slate-500">
                                    NABH deadline {formatDistanceToNow(new Date(data.nabhDueAt), { addSuffix: true })}
                                </span>
                            )}
                            {isSigned && data?.signedAt && (
                                <span className="text-[11px] text-slate-500">
                                    Signed {format(new Date(data.signedAt), 'dd MMM yyyy · HH:mm')}
                                    {data.signedByDoctorName && ` · by ${data.signedByDoctorName}`}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={handlePrintBundle} disabled={printing} className="h-9 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                            {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Print Bundle</span>
                        </Button>
                        {!isSigned && (
                            <>
                                <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || saving} className="h-9 text-xs gap-1">
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setSignConfirmOpen(true)}
                                    disabled={!isDischarged || !form.finalDiagnosis.trim() || !form.conditionAtDischarge}
                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 gap-1"
                                    title={!isDischarged ? 'Discharge the patient first' : (!form.finalDiagnosis.trim() ? 'Final diagnosis required' : !form.conditionAtDischarge ? 'Condition required' : '')}
                                >
                                    <Lock className="h-4 w-4" /> Sign & Lock
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Admission context strip */}
            {data?.admission && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <ContextTile icon={<User className="h-4 w-4" />} label="Patient" value={`${data.admission.patientName ?? '—'}${data.admission.patientId ? ` · ${data.admission.patientId}` : ''}`} sub={`${data.admission.patientAgeYears ?? '—'}y / ${data.admission.patientSex ?? '—'}`} />
                    <ContextTile icon={<Stethoscope className="h-4 w-4" />} label="Attending" value={data.admission.attendingDoctorName ?? '—'} />
                    <ContextTile icon={<Calendar className="h-4 w-4" />} label="Stay" value={`${data.admission.lengthOfStayDays ?? '—'} day(s)`} sub={`${format(new Date(data.admission.admittedAt), 'dd MMM')} → ${data.admission.dischargedAt ? format(new Date(data.admission.dischargedAt), 'dd MMM') : '—'}`} />
                    <ContextTile icon={<Package className="h-4 w-4" />} label="Ward / Bed" value={`${data.admission.wardName ?? '—'} · ${data.admission.bedCode ?? '—'}`} />
                </div>
            )}

            {/* Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                {readOnly && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        This summary is signed and locked. Print copies for the patient or use the bundle PDF for WhatsApp delivery.
                    </div>
                )}

                {/* Condition + Follow-up date — special row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">
                            Condition at Discharge <span className="text-rose-500">★</span>
                        </Label>
                        <Select
                            value={form.conditionAtDischarge}
                            onValueChange={v => set('conditionAtDischarge', v)}
                            disabled={readOnly}
                        >
                            <SelectTrigger className="h-9 text-sm mt-1">
                                <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map(c => (
                                    <SelectItem key={c.value} value={c.value}>
                                        <span className={c.tone}>{c.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Follow-up Date</Label>
                        <Input
                            type="date"
                            value={form.followUpDate}
                            onChange={e => set('followUpDate', e.target.value)}
                            disabled={readOnly}
                            className="h-9 text-sm mt-1"
                        />
                    </div>
                </div>

                {/* SOAP-like sections */}
                {sections.map(s => (
                    <div key={s.key}>
                        <Label className="text-xs font-semibold text-slate-700">
                            {s.label}
                        </Label>
                        <Textarea
                            value={form[s.key as keyof DraftForm]}
                            onChange={e => set(s.key as keyof DraftForm, e.target.value)}
                            disabled={readOnly}
                            rows={s.rows}
                            className="text-sm mt-1 resize-y"
                            placeholder={readOnly ? '—' : 'Type or auto-filled from chart…'}
                        />
                    </div>
                ))}
            </div>

            {/* Sign confirm */}
            <AlertDialog open={signConfirmOpen} onOpenChange={setSignConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sign discharge summary?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Signing locks this summary. Future amendments require a separate addendum
                            (NABH requirement). The patient can be handed the printed bundle right after.
                            {isDirty && <span className="block mt-2 text-amber-700">Unsaved edits will be saved first.</span>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={signing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleSign(); }}
                            disabled={signing}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {signing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                            Sign & Lock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

const ContextTile: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {icon}<span>{label}</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</p>}
    </div>
);

export default DischargeSummaryTab;
