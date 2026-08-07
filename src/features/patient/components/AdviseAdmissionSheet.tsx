import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BedDouble, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { otPlanApi, OTPlanItem } from '@/features/hospital/services/otPlanApi';
import { PackageTypePicker } from '@/features/hospital/components/masters/PackageTypePicker';
import { admissionReferralApi, CaseType } from '@/features/ipd-redesign/services/admissionReferralApi';

interface Props {
    hospitalId: string;
    doctorId: string;
    patientId: string;
    appointmentId?: string;
    // Custom trigger content (e.g. a compact row-action icon button) — falls back to the default
    // full-size button when not supplied.
    trigger?: React.ReactNode;
}

const CASE_TYPES: { value: CaseType; label: string }[] = [
    { value: 'PLANNED', label: 'Planned' },
    { value: 'URGENT', label: 'Urgent' },
    { value: 'EMERGENCY', label: 'Emergency' },
];

/** Advise Admission — a doctor flags that a patient needs to be admitted, optionally attaching
 *  an OT Plan; it shows up on the IPD board's Referred Admissions tab for front-desk follow-up. */
export const AdviseAdmissionSheet: React.FC<Props> = ({ hospitalId, doctorId, patientId, appointmentId, trigger }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [plans, setPlans] = useState<OTPlanItem[]>([]);
    const [plansLoaded, setPlansLoaded] = useState(false);

    const [otPlanId, setOtPlanId] = useState<string>('');
    const [packageTypeId, setPackageTypeId] = useState<string | null>(null);
    const [procedureName, setProcedureName] = useState('');
    const [probableAdmissionDate, setProbableAdmissionDate] = useState('');
    const [caseType, setCaseType] = useState<CaseType>('PLANNED');
    const [notes, setNotes] = useState('');

    // Set when this patient already has a PENDING advise-admission referral - the sheet prefills
    // from it and edits it in place on submit, instead of AdviseAdmissionHandler creating a
    // second, duplicate referral every time the doctor reopens this sheet.
    const [existingReferralId, setExistingReferralId] = useState<string | null>(null);
    const [checkingExisting, setCheckingExisting] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const reset = () => {
        setOtPlanId(''); setPackageTypeId(null); setProcedureName(''); setProbableAdmissionDate('');
        setCaseType('PLANNED'); setNotes(''); setSuccess(false); setExistingReferralId(null);
    };

    const fetchPlans = async () => {
        if (plansLoaded) return;
        try {
            const res = await otPlanApi.list({ hospitalId });
            setPlans(res?.plans ?? []);
        } catch {
            setPlans([]);
        } finally {
            setPlansLoaded(true);
        }
    };

    const fetchExistingAdvice = async () => {
        setCheckingExisting(true);
        try {
            const res = await admissionReferralApi.list({ hospitalId, patientId, statusCode: 'PENDING' });
            const existing = res?.referrals?.[0];
            if (existing) {
                setExistingReferralId(existing.referralId);
                setOtPlanId(existing.otPlanId || 'NONE');
                setPackageTypeId(existing.packageTypeId ?? null);
                setProcedureName(existing.procedureName ?? '');
                setProbableAdmissionDate(existing.probableAdmissionDate ? existing.probableAdmissionDate.slice(0, 10) : '');
                setCaseType(existing.caseType);
                setNotes(existing.notes ?? '');
            }
        } catch {
            // No existing advice found (or the lookup failed) - just start with a blank form.
        } finally {
            setCheckingExisting(false);
        }
    };

    const handlePlanChange = (value: string) => {
        setOtPlanId(value);
        if (value === 'NONE') return;
        const plan = plans.find(p => p.otPlanId === value);
        if (plan) setProcedureName(plan.procedureName);
    };

    const handleSubmit = async () => {
        if (!procedureName.trim()) {
            toast({ title: 'Procedure required', description: 'Enter a procedure name or pick an OT Plan.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                otPlanId: otPlanId && otPlanId !== 'NONE' ? otPlanId : undefined,
                packageTypeId: packageTypeId ?? undefined,
                procedureName: procedureName.trim(),
                probableAdmissionDate: probableAdmissionDate || undefined,
                caseType,
                notes: notes.trim() || undefined,
            };
            const res = existingReferralId
                ? await admissionReferralApi.updateDetails({ hospitalId, referralId: existingReferralId, ...payload })
                : await admissionReferralApi.adviseAdmission({ hospitalId, patientId, referringDoctorId: doctorId, appointmentId, ...payload });
            if (!res?.success) throw new Error(res?.message || 'Could not save the admission advice.');

            setSuccess(true);
            toast({
                title: existingReferralId ? 'Admission advice updated' : 'Admission advised',
                description: 'Visible on the IPD board’s Referred Admissions tab.',
            });
            setTimeout(() => { setOpen(false); reset(); }, 900);
        } catch (e: any) {
            toast({ title: 'Could not save the admission advice', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { fetchPlans(); fetchExistingAdvice(); } else reset(); }}>
            <SheetTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                        <BedDouble className="w-4 h-4" />
                        Advise Admission
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] sm:w-[480px] sm:max-w-none p-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-gray-200 dark:border-gray-800 [&>button]:right-6 [&>button]:top-4">
                <SheetHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/60 bg-white dark:bg-slate-900">
                    <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-brand-700 dark:text-brand-300">
                        <BedDouble className="h-5 w-5" /> Advise Admission
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {checkingExisting && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for an existing advice…
                        </div>
                    )}
                    {!checkingExisting && existingReferralId && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>This patient is already advised for admission with the details below. Change anything you need and save to update it.</span>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label>OT Plan (optional)</Label>
                        <Select value={otPlanId} onValueChange={handlePlanChange}>
                            <SelectTrigger><SelectValue placeholder="Pick a plan, or leave blank" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">No plan — free text below</SelectItem>
                                {plans.map(p => (
                                    <SelectItem key={p.otPlanId} value={p.otPlanId}>
                                        {p.planName}{p.departmentName ? ` (${p.departmentName})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Picking a plan fills the procedure name below — still editable.</p>
                    </div>

                    <PackageTypePicker hospitalId={hospitalId} value={packageTypeId} onChange={setPackageTypeId} />

                    <div className="grid gap-2">
                        <Label>Procedure <span className="text-red-500">*</span></Label>
                        <Input
                            placeholder="e.g. Percutaneous Nephrolithotomy"
                            value={procedureName}
                            onChange={e => setProcedureName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Probable admission date</Label>
                            <Input type="date" value={probableAdmissionDate} onChange={e => setProbableAdmissionDate(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Case type</Label>
                            <Select value={caseType} onValueChange={v => setCaseType(v as CaseType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CASE_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Anything the front desk / admitting team should know…"
                            className="resize-none h-24"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-900 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || success || checkingExisting} className="gap-1.5 bg-brand-600 hover:bg-brand-700">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : null}
                        {success
                            ? (existingReferralId ? 'Updated!' : 'Advised!')
                            : (existingReferralId ? 'Update Advice' : 'Advise Admission')}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AdviseAdmissionSheet;
