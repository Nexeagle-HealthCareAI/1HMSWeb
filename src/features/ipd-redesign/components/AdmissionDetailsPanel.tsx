import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { Pencil, Check, X, Loader2, Stethoscope, Wallet, User, Printer, Download } from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem } from '../services/admissionApi';
import { usePatientProfile } from '@/features/patient/hooks/usePatientProfile';
import { formatIstDateTime } from '../utils/istDate';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { downloadHtmlAsPdf, openPrintHtml } from '@/utils/printUtils';
import { buildAdmissionConfirmationA4 } from '@/printTemplates/admissionConfirmationA4';
import { useHospitalApi } from '@/hooks/useApi';

const PAYER_TYPES = [
    { value: 'CASH', label: 'Cash' },
    { value: 'TPA', label: 'TPA / Insurance' },
    { value: 'SCHEME', label: 'Govt. scheme' },
];
const REFERRING_FACILITY_TYPES = [
    { value: 'PHC', label: 'PHC' },
    { value: 'NURSING_HOME', label: 'Nursing home' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'OTHER', label: 'Other' },
];
const ROOM_CATEGORIES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE'];

const SELECT_CLS = 'h-10 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white outline-none transition focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400';
const INPUT_CLS = 'h-10 rounded-lg';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
    <div className={className}>
        <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
        <div className="mt-1">{children}</div>
    </div>
);

const Item: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className="text-sm text-slate-800 mt-0.5">{value ?? <span className="text-slate-300">—</span>}</dd>
    </div>
);

interface DetailsFormState {
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

const toFormState = (a: ActiveAdmissionItem): DetailsFormState => ({
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
    admission: ActiveAdmissionItem;
    isActive: boolean;
    onUpdated: () => void;
}

export const AdmissionDetailsPanel: React.FC<Props> = ({ admission, isActive, onUpdated }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<DetailsFormState>(toFormState(admission));
    const set = <K extends keyof DetailsFormState>(k: K, v: DetailsFormState[K]) => setForm(f => ({ ...f, [k]: v }));
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);

    const profile = usePatientProfile(hospitalId, admission.patientId ?? '');

    useEffect(() => {
        if (!editing) setForm(toFormState(admission));
    }, [admission, editing]);

    useEffect(() => {
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
    }, []);

    const startEdit = () => { setForm(toFormState(admission)); setEditing(true); };
    const cancelEdit = () => { setForm(toFormState(admission)); setEditing(false); };

    const save = async () => {
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
            setEditing(false);
            onUpdated();
        } catch (err) {
            toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const doctorName = admission.primaryDoctorName ?? (form.primaryDoctorId ? doctors.find(d => d.doctorId === form.primaryDoctorId)?.fullName : undefined);

    const printConfirmation = (mode: 'print' | 'download') => {
        const settings = buildPrintSettingsFromHospital(hospitalData);
        const html = buildAdmissionConfirmationA4({
            admissionNo: admission.admissionNo,
            admittedAt: admission.admittedAt,
            patientName: admission.patientName || admission.patientId || '',
            patientId: admission.patientId || '',
            ageGender: admission.patientAge != null ? `${admission.patientAge}${admission.patientSex ?? ''}` : '',
            admissionType: admission.admissionType,
            wardBed: admission.bedCode ? `${admission.wardName ? admission.wardName + ' · ' : ''}${admission.bedCode}` : undefined,
            admittingDoctorName: doctorName,
            provisionalDiagnosis: admission.diagnosis || admission.admissionReason,
            payerType: admission.payerType,
            depositExpected: admission.depositExpected,
            attendantName: undefined,
            attendantPhone: undefined,
        }, settings);
        if (mode === 'download') downloadHtmlAsPdf(html, `admission-confirmation-${admission.admissionNo}.pdf`);
        else openPrintHtml(html);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admission Details</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => printConfirmation('print')}><Printer className="h-3.5 w-3.5 mr-1.5" /> Print</Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => printConfirmation('download')}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
                    {isActive && !editing && (
                        <Button size="sm" className="h-9 bg-brand-600 hover:bg-brand-700" onClick={startEdit}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</Button>
                    )}
                </div>
            </div>

            {/* ── Identity (via existing patient-profile edit surface) ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Identity</h3>
                    {isActive && !profile.isEditing && <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={profile.handleEdit}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>}
                </div>
                {profile.isLoading ? (
                    <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
                ) : profile.patientProfile && !profile.isEditing ? (
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Item label="Name" value={profile.patientProfile.fullName} />
                        <Item label="Mobile" value={profile.patientProfile.mobile} />
                        <Item label="Age / Sex" value={`${profile.patientProfile.ageYears ?? '—'}${profile.patientProfile.sex ?? ''}`} />
                        <Item label="Blood group" value={profile.patientProfile.bloodGroup} />
                        <Item label="Address" value={[profile.patientProfile.addressLine1, profile.patientProfile.city, profile.patientProfile.state].filter(Boolean).join(', ')} />
                        <Item label="Email" value={profile.patientProfile.email} />
                        <Item label="Attendant" value={profile.patientProfile.emergencyContactName} />
                        <Item label="Attendant phone" value={profile.patientProfile.emergencyContactPhone} />
                    </dl>
                ) : profile.patientProfile && profile.isEditing ? (
                    <IdentityEditForm profile={profile} />
                ) : (
                    <p className="text-xs text-slate-400">Could not load patient identity.</p>
                )}
            </div>

            {/* ── Admission / clinical / referral ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Clinical &amp; Referral</h3>
                {!editing ? (
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Item label="Admitted" value={formatIstDateTime(admission.admittedAt)} />
                        <Item label="Type" value={admission.admissionType} />
                        <Item label="Admitting consultant" value={doctorName} />
                        <Item label="Provisional diagnosis" value={admission.diagnosis} />
                        <Item label="Reason" value={admission.admissionReason} />
                        <Item label="Expected discharge" value={admission.expectedDischargeAt ? new Date(admission.expectedDischargeAt).toLocaleDateString('en-IN') : undefined} />
                        <Item label="Referred by" value={admission.referralSource} />
                        <Item label="Referrer name" value={admission.referralName} />
                        <Item label="Referring facility" value={admission.referringFacilityName ? `${admission.referringFacilityName}${admission.referringFacilityType ? ` (${admission.referringFacilityType})` : ''}` : undefined} />
                    </dl>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <Textarea value={form.admissionReason} onChange={e => set('admissionReason', e.target.value)} rows={2} className="text-sm rounded-lg" />
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
                )}
            </div>

            {/* ── Payer & coverage ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Payer &amp; Coverage</h3>
                {!editing ? (
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Item label="Payer type" value={admission.payerType} />
                        <Item label="Deposit expected" value={admission.depositExpected != null ? `₹${admission.depositExpected.toLocaleString('en-IN')}` : undefined} />
                        <Item label="Entitled room category" value={admission.entitledRoomCategory?.replace('_', ' ')} />
                        {admission.payerType !== 'CASH' && (
                            <>
                                <Item label={admission.payerType === 'TPA' ? 'Insurer / TPA' : 'Scheme name'} value={admission.payerName} />
                                <Item label="Policy / beneficiary no." value={admission.policyOrBeneficiaryNo} />
                                <Item label="Pre-auth no." value={admission.preAuthNo} />
                                <Item label="Package code" value={admission.packageCode} />
                                <Item label="Sanctioned amount" value={admission.sanctionedAmount != null ? `₹${admission.sanctionedAmount.toLocaleString('en-IN')}` : undefined} />
                            </>
                        )}
                    </dl>
                ) : (
                    <>
                        <Label className="text-[11px] font-semibold text-slate-600">Payer type</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3">
                            {PAYER_TYPES.map(p => (
                                <button key={p.value} type="button" onClick={() => set('payerType', p.value)}
                                    className={cn('rounded-xl border-2 py-2.5 px-1 text-xs font-bold transition-all',
                                        form.payerType === p.value ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </>
                )}
            </div>

            {editing && (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    <Button disabled={saving} className="bg-brand-600 hover:bg-brand-700" onClick={save}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save
                    </Button>
                </div>
            )}
        </div>
    );
};

// Small inline edit form for the existing patient-profile surface (PUT /patient-profile) — kept
// separate since it owns its own field state independent of the admission-details form above.
const IdentityEditForm: React.FC<{ profile: ReturnType<typeof usePatientProfile> }> = ({ profile }) => {
    const p = profile.patientProfile!;
    const [fullName, setFullName] = useState(p.fullName);
    const [mobile, setMobile] = useState(p.mobile);
    const [bloodGroup, setBloodGroup] = useState(p.bloodGroup ?? '');
    const [email, setEmail] = useState(p.email ?? '');
    const [addressLine1, setAddressLine1] = useState(p.addressLine1);
    const [city, setCity] = useState(p.city);
    const [emergencyContactName, setEmergencyContactName] = useState(p.emergencyContactName ?? '');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(p.emergencyContactPhone ?? '');

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name"><Input value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="Mobile"><Input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} /></Field>
                <Field label="Blood group"><Input value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="Email"><Input value={email} onChange={e => setEmail(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="Address"><Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="City"><Input value={city} onChange={e => setCity(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="Attendant name"><Input value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} className={INPUT_CLS} /></Field>
                <Field label="Attendant phone"><Input value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} /></Field>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={profile.handleCancel}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                <Button size="sm" disabled={profile.isUpdating} className="bg-brand-600 hover:bg-brand-700" onClick={() => profile.handleSave({
                    hospitalId: p.hospitalId, patientId: p.patientId,
                    fullName, mobile, ageYears: p.ageYears, sex: p.sex,
                    addressLine1, city, state: p.state ?? '', country: p.country, pincode: p.pincode,
                    insuranceId: p.insuranceId ?? '', paymentMode: p.paymentMode ?? '',
                    bloodGroup, email, emergencyContactName, emergencyContactPhone,
                })}>
                    {profile.isUpdating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />} Save
                </Button>
            </div>
        </div>
    );
};
