import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BedDouble, CheckCircle2, Loader2 } from 'lucide-react';
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

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const reset = () => {
        setOtPlanId(''); setPackageTypeId(null); setProcedureName(''); setProbableAdmissionDate('');
        setCaseType('PLANNED'); setNotes(''); setSuccess(false);
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
            const res = await admissionReferralApi.adviseAdmission({
                hospitalId,
                patientId,
                referringDoctorId: doctorId,
                appointmentId,
                otPlanId: otPlanId && otPlanId !== 'NONE' ? otPlanId : undefined,
                packageTypeId: packageTypeId ?? undefined,
                procedureName: procedureName.trim(),
                probableAdmissionDate: probableAdmissionDate || undefined,
                caseType,
                notes: notes.trim() || undefined,
            });
            if (!res?.success) throw new Error(res?.message || 'Could not advise admission.');

            setSuccess(true);
            toast({ title: 'Admission advised', description: 'Visible on the IPD board’s Referred Admissions tab.' });
            setTimeout(() => { setOpen(false); reset(); }, 900);
        } catch (e: any) {
            toast({ title: 'Could not advise admission', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchPlans(); else reset(); }}>
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
                    <Button onClick={handleSubmit} disabled={submitting || success} className="gap-1.5 bg-brand-600 hover:bg-brand-700">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : null}
                        {success ? 'Advised!' : 'Advise Admission'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AdviseAdmissionSheet;
