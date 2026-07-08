import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Stethoscope, Wallet } from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem } from '../services/admissionApi';

export const PAYER_TYPES = [
    { value: 'CASH', label: 'Cash' },
    { value: 'TPA', label: 'TPA / Insurance' },
    { value: 'SCHEME', label: 'Govt. scheme' },
];
export const REFERRING_FACILITY_TYPES = [
    { value: 'PHC', label: 'PHC' },
    { value: 'NURSING_HOME', label: 'Nursing home' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'OTHER', label: 'Other' },
];
export const ROOM_CATEGORIES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE'];

const SELECT_CLS = 'h-10 w-full text-sm border border-slate-200 rounded-xl px-3 bg-slate-50 outline-none transition-all duration-200 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 hover:border-slate-300';
const INPUT_CLS = 'h-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all duration-200 hover:border-slate-300';
const TEXTAREA_CLS = 'min-h-[80px] rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all duration-200 hover:border-slate-300 resize-none text-sm p-3';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
    <div className={className}>
        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</Label>
        <div className="mt-1.5">{children}</div>
    </div>
);

export interface DetailsFormState {
    primaryDoctorId: string;
    admissionReason: string;
    diagnosis: string;
    expectedDischargeAt: string;
    payerType: string;
    depositExpected: string;
    referralSource: string;
    referralName: string;
    referringFacilityName: string;
    referringFacilityType: string;
    referringFacilityContact: string;
    payerName: string;
    policyOrBeneficiaryNo: string;
    preAuthNo: string;
    packageCode: string;
    sanctionedAmount: string;
    entitledRoomCategory: string;
}

export const toFormState = (a: ActiveAdmissionItem): DetailsFormState => ({
    primaryDoctorId: a.primaryDoctorId ?? '',
    admissionReason: a.admissionReason ?? '',
    diagnosis: a.diagnosis ?? '',
    expectedDischargeAt: a.expectedDischargeAt ? a.expectedDischargeAt.slice(0, 10) : '',
    payerType: a.payerType,
    depositExpected: a.depositExpected != null ? String(a.depositExpected) : '',
    referralSource: a.referralSource ?? '',
    referralName: a.referralName ?? '',
    referringFacilityName: a.referringFacilityName ?? '',
    referringFacilityType: a.referringFacilityType ?? '',
    referringFacilityContact: a.referringFacilityContact ?? '',
    payerName: a.payerName ?? '',
    policyOrBeneficiaryNo: a.policyOrBeneficiaryNo ?? '',
    preAuthNo: a.preAuthNo ?? '',
    packageCode: a.packageCode ?? '',
    sanctionedAmount: a.sanctionedAmount != null ? String(a.sanctionedAmount) : '',
    entitledRoomCategory: a.entitledRoomCategory ?? '',
});

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admission: ActiveAdmissionItem | null;
    onUpdated: () => void;
}

export const EditAdmissionSheet: React.FC<Props> = ({ open, onOpenChange, admission, onUpdated }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<DetailsFormState | null>(null);
    const set = <K extends keyof DetailsFormState>(k: K, v: DetailsFormState[K]) => setForm(f => f ? ({ ...f, [k]: v }) : null);
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);

    useEffect(() => {
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
    }, []);

    useEffect(() => {
        if (open && admission) {
            setForm(toFormState(admission));
        } else {
            setForm(null);
        }
    }, [open, admission]);

    const save = async () => {
        if (!admission || !form) return;
        setSaving(true);
        try {
            const t = (s: string) => { const v = s.trim(); return v.length ? v : undefined; };
            await Promise.all([
                admissionApi.updateDetails({
                    admissionId: admission.admissionId,
                    primaryDoctorId: form.primaryDoctorId || undefined,
                    admissionReason: t(form.admissionReason),
                    diagnosis: t(form.diagnosis),
                    expectedDischargeAt: t(form.expectedDischargeAt),
                    payerType: form.payerType,
                    depositExpected: form.depositExpected ? parseFloat(form.depositExpected) : undefined,
                    referralSource: t(form.referralSource),
                    referralName: t(form.referralName),
                    referringFacilityName: t(form.referringFacilityName),
                    referringFacilityType: t(form.referringFacilityType),
                    referringFacilityContact: t(form.referringFacilityContact),
                }),
                admissionApi.upsertCoverage({
                    admissionId: admission.admissionId,
                    payerName: t(form.payerName),
                    policyOrBeneficiaryNo: t(form.policyOrBeneficiaryNo),
                    preAuthNo: t(form.preAuthNo),
                    packageCode: t(form.packageCode),
                    sanctionedAmount: form.sanctionedAmount ? parseFloat(form.sanctionedAmount) : undefined,
                    entitledRoomCategory: t(form.entitledRoomCategory),
                }),
            ]);
            toast({ title: 'Admission details updated.' });
            onUpdated();
            onOpenChange(false);
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (!form) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[540px] overflow-y-auto p-0 border-l-slate-200">
                <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <SheetTitle className="text-lg font-bold">Edit Admission Details</SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-8 bg-slate-50/30">
                    {/* Clinical Form */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Clinical &amp; Referral</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Admitting consultant">
                                <select value={form.primaryDoctorId} onChange={e => set('primaryDoctorId', e.target.value)} className={SELECT_CLS}>
                                    <option value="">— Not specified —</option>
                                    {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.fullName || 'Unnamed'}{d.departmentName ? ` · ${d.departmentName}` : ''}</option>)}
                                </select>
                            </Field>
                            <Field label="Provisional diagnosis">
                                <Input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} className={INPUT_CLS} />
                            </Field>
                            <Field label="Expected discharge">
                                <Input type="date" value={form.expectedDischargeAt} onChange={e => set('expectedDischargeAt', e.target.value)} className={INPUT_CLS} />
                            </Field>
                            <Field label="Reason for admission" className="sm:col-span-2">
                                <Textarea value={form.admissionReason} onChange={e => set('admissionReason', e.target.value)} rows={2} className={TEXTAREA_CLS} />
                            </Field>
                            <Field label="Referred by">
                                <select value={form.referralSource} onChange={e => set('referralSource', e.target.value)} className={SELECT_CLS}>
                                    <option value="">— Not specified —</option>
                                    <option value="SELF">Self</option>
                                    <option value="DOCTOR">Doctor</option>
                                    <option value="HOSPITAL">Hospital</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </Field>
                            {(form.referralSource === 'DOCTOR' || form.referralSource === 'HOSPITAL' || form.referralSource === 'OTHER') && (
                                <Field label="Referrer name">
                                    <Input value={form.referralName} onChange={e => set('referralName', e.target.value)} className={INPUT_CLS} />
                                </Field>
                            )}
                            {form.referralSource === 'HOSPITAL' && (
                                <>
                                    <Field label="Facility type">
                                        <select value={form.referringFacilityType} onChange={e => set('referringFacilityType', e.target.value)} className={SELECT_CLS}>
                                            <option value="">— Select —</option>
                                            {REFERRING_FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Facility name">
                                        <Input value={form.referringFacilityName} onChange={e => set('referringFacilityName', e.target.value)} className={INPUT_CLS} />
                                    </Field>
                                    <Field label="Facility contact">
                                        <Input value={form.referringFacilityContact} onChange={e => set('referringFacilityContact', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} />
                                    </Field>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Payer Form */}
                    <div className="space-y-4 pt-4 border-t border-slate-200/60">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Payer &amp; Coverage</h4>
                        <div>
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">Payer type</Label>
                            <div className="grid grid-cols-3 gap-2 mt-1.5 mb-4">
                                {PAYER_TYPES.map(p => (
                                    <button key={p.value} type="button" onClick={() => set('payerType', p.value)}
                                        className={cn('rounded-xl border-2 py-2.5 px-1 text-xs font-bold transition-all duration-200 outline-none focus:ring-4',
                                            form.payerType === p.value ? 'border-brand-500 bg-brand-50/50 text-brand-700 ring-brand-500/10' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white focus:ring-slate-200')}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Deposit expected (₹)">
                                    <Input type="number" min={0} value={form.depositExpected} onChange={e => set('depositExpected', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
                                </Field>
                                <Field label="Entitled room category">
                                    <select value={form.entitledRoomCategory} onChange={e => set('entitledRoomCategory', e.target.value)} className={SELECT_CLS}>
                                        <option value="">— Not specified —</option>
                                        {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                    </select>
                                </Field>
                                {form.payerType !== 'CASH' && (
                                    <>
                                        <Field label={form.payerType === 'TPA' ? 'Insurer / TPA name' : 'Scheme name'}>
                                            <Input value={form.payerName} onChange={e => set('payerName', e.target.value)} className={INPUT_CLS} />
                                        </Field>
                                        <Field label={form.payerType === 'TPA' ? 'Policy number' : 'Beneficiary number'}>
                                            <Input value={form.policyOrBeneficiaryNo} onChange={e => set('policyOrBeneficiaryNo', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
                                        </Field>
                                        <Field label="Pre-auth number">
                                            <Input value={form.preAuthNo} onChange={e => set('preAuthNo', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
                                        </Field>
                                        <Field label="Package code">
                                            <Input value={form.packageCode} onChange={e => set('packageCode', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
                                        </Field>
                                        <Field label="Sanctioned amount (₹)">
                                            <Input type="number" min={0} value={form.sanctionedAmount} onChange={e => set('sanctionedAmount', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} />
                                        </Field>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="sticky bottom-0 p-4 border-t border-slate-100 bg-white/80 backdrop-blur flex justify-end gap-2">
                    <Button variant="ghost" className="rounded-xl h-10 px-6 font-semibold" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={saving} className="bg-brand-600 hover:bg-brand-700 rounded-xl h-10 px-8 font-semibold shadow-md shadow-brand-500/20" onClick={save}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
