import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { Pencil, Check, Loader2, Stethoscope, Wallet, User, Printer, Download } from 'lucide-react';
import { admissionApi, type ActiveAdmissionItem, type HospitalDoctorItem } from '../services/admissionApi';
import { usePatientProfile } from '@/features/patient/hooks/usePatientProfile';
import { formatIstDateTime } from '../utils/istDate';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { downloadHtmlAsPdf, openPrintHtml } from '@/utils/printUtils';
import { buildAdmissionConfirmationA4 } from '@/printTemplates/admissionConfirmationA4';
import { useHospitalApi } from '@/hooks/useApi';
import { EditAdmissionSheet } from './EditAdmissionSheet';

const INPUT_CLS = 'h-10 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
    <motion.div layout className={className}>
        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-zinc-550 ml-1">{label}</Label>
        <div className="mt-1.5">{children}</div>
    </motion.div>
);

const Item: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <motion.div layout className="bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-100 dark:border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-1 transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-900/50">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{label}</dt>
        <dd className="text-sm font-semibold text-slate-800 dark:text-zinc-200 break-words">{value ?? <span className="text-slate-300 dark:text-zinc-700 font-medium">—</span>}</dd>
    </motion.div>
);

interface Props {
    admission: ActiveAdmissionItem;
    isActive: boolean;
    onUpdated: () => void;
}

export const AdmissionDetailsPanel: React.FC<Props> = ({ admission, isActive, onUpdated }) => {
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const [editing, setEditing] = useState(false);
    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);

    const profile = usePatientProfile(hospitalId, admission.patientId ?? '');

    useEffect(() => {
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
    }, []);

    const doctorName = admission.primaryDoctorName ?? (doctors.find(d => d.doctorId === admission.primaryDoctorId)?.fullName);

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Admission Details</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none active:scale-[0.98] transition-all rounded-xl border-slate-200/60 dark:border-zinc-800" onClick={() => printConfirmation('print')}><Printer className="h-3.5 w-3.5 mr-1.5" /> Print</Button>
                    <Button variant="outline" size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none active:scale-[0.98] transition-all rounded-xl border-slate-200/60 dark:border-zinc-800" onClick={() => printConfirmation('download')}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
                    {isActive && (
                        <Button size="sm" className="h-10 sm:h-9 flex-1 sm:flex-none bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all rounded-xl text-white shadow-md shadow-brand-500/10" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</Button>
                    )}
                </div>
            </div>

            {/* ── Identity ── */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-450 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Identity</h3>
                    {isActive && <Button variant="ghost" size="sm" className="h-8 sm:h-7 text-[11px] rounded-lg active:scale-[0.97]" onClick={profile.handleEdit}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>}
                </div>
                {profile.isLoading ? (
                    <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
                ) : profile.patientProfile ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <Item label="Name" value={profile.patientProfile.fullName} />
                        <Item label="Mobile" value={profile.patientProfile.mobile} />
                        <Item label="Age / Sex" value={`${profile.patientProfile.ageYears ?? '—'}${profile.patientProfile.sex ?? ''}`} />
                        <Item label="Blood group" value={profile.patientProfile.bloodGroup} />
                        <Item label="Address" value={[profile.patientProfile.addressLine1, profile.patientProfile.city, profile.patientProfile.state].filter(Boolean).join(', ')} />
                        <Item label="Email" value={profile.patientProfile.email} />
                        <Item label="Attendant" value={profile.patientProfile.emergencyContactName} />
                        <Item label="Attendant phone" value={profile.patientProfile.emergencyContactPhone} />
                    </div>
                ) : (
                    <p className="text-xs text-slate-400">Could not load patient identity.</p>
                )}
            </div>

            {/* ── Admission / clinical / referral ── */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-450 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Clinical &amp; Referral</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <Item label="Admitted" value={formatIstDateTime(admission.admittedAt)} />
                    <Item label="Type" value={admission.admissionType} />
                    <Item label="Admitting consultant" value={doctorName} />
                    <Item label="Provisional diagnosis" value={admission.diagnosis} />
                    <Item label="Reason" value={admission.admissionReason} />
                    <Item label="Expected discharge" value={admission.expectedDischargeAt ? new Date(admission.expectedDischargeAt).toLocaleDateString('en-IN') : undefined} />
                    <Item label="Referred by" value={admission.referralSource} />
                    <Item label="Referrer name" value={admission.referralName} />
                    <Item label="Referring facility" value={admission.referringFacilityName ? `${admission.referringFacilityName}${admission.referringFacilityType ? ` (${admission.referringFacilityType})` : ''}` : undefined} />
                </div>
            </div>

            {/* ── Payer & coverage ── */}
            <div className="rounded-2xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-450 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Payer &amp; Coverage</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                </div>
            </div>

            <EditAdmissionSheet
                open={editing}
                onOpenChange={setEditing}
                admission={admission}
                onUpdated={onUpdated}
            />
            
            <IdentityEditForm profile={profile} />
        </div>
    );
};

// Small inline edit form for the existing patient-profile surface (PUT /patient-profile) — kept
// separate since it owns its own field state independent of the admission-details form above.
const IdentityEditForm: React.FC<{ profile: ReturnType<typeof usePatientProfile> }> = ({ profile }) => {
    const p = profile.patientProfile;
    const [fullName, setFullName] = useState(p?.fullName ?? '');
    const [mobile, setMobile] = useState(p?.mobile ?? '');
    const [bloodGroup, setBloodGroup] = useState(p?.bloodGroup ?? '');
    const [email, setEmail] = useState(p?.email ?? '');
    const [addressLine1, setAddressLine1] = useState(p?.addressLine1 ?? '');
    const [city, setCity] = useState(p?.city ?? '');
    const [emergencyContactName, setEmergencyContactName] = useState(p?.emergencyContactName ?? '');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState(p?.emergencyContactPhone ?? '');

    useEffect(() => {
        if (p) {
            setFullName(p.fullName ?? '');
            setMobile(p.mobile ?? '');
            setBloodGroup(p.bloodGroup ?? '');
            setEmail(p.email ?? '');
            setAddressLine1(p.addressLine1 ?? '');
            setCity(p.city ?? '');
            setEmergencyContactName(p.emergencyContactName ?? '');
            setEmergencyContactPhone(p.emergencyContactPhone ?? '');
        }
    }, [p]);

    if (!p) return null;

    return (
        <Sheet open={profile.isEditing} onOpenChange={(open) => !open && profile.handleCancel()}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[480px] rounded-l-[32px] sm:rounded-l-[32px] flex flex-col p-0 border-l border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                <SheetHeader className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10 shrink-0">
                    <SheetTitle className="text-lg font-bold text-slate-900 dark:text-zinc-50">Edit Identity</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Name"><Input value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT_CLS} /></Field>
                        <Field label="Mobile"><Input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} /></Field>
                        <Field label="Blood group"><Input value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className={INPUT_CLS} /></Field>
                        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT_CLS} /></Field>
                        <Field label="Address" className="sm:col-span-2">
                            <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="Building, street, area" className={INPUT_CLS} />
                        </Field>
                        <Field label="City"><Input value={city} onChange={e => setCity(e.target.value)} className={INPUT_CLS} /></Field>
                        <Field label="Emergency contact name"><Input value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} className={INPUT_CLS} /></Field>
                        <Field label="Emergency contact phone"><Input value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} /></Field>
                    </div>
                </div>
                <div className="sticky bottom-0 p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur flex justify-end gap-2 shrink-0">
                    <Button variant="ghost" className="rounded-xl h-10 px-6 font-semibold active:scale-[0.98] transition-all" onClick={profile.handleCancel}>Cancel</Button>
                    <Button disabled={profile.isUpdating} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl h-10 px-8 font-semibold shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all" onClick={() => profile.handleSave({
                        hospitalId: p.hospitalId, patientId: p.patientId,
                        fullName, mobile, ageYears: p.ageYears, sex: p.sex,
                        addressLine1, city, state: p.state ?? '', country: p.country, pincode: p.pincode,
                        insuranceId: p.insuranceId ?? '', paymentMode: p.paymentMode ?? '',
                        bloodGroup, email, emergencyContactName, emergencyContactPhone,
                    })}>
                        {profile.isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Save Changes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
