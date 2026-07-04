import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateUuid } from '@/utils/uuid';
import {
    UserPlus, Check, X, Siren, CalendarClock, Loader2, CreditCard,
    Phone, MapPin, Stethoscope, RotateCcw, History, ShieldCheck, ArrowRight,
    User, CalendarCheck, Sun, LogOut, AlertTriangle, Users, Wallet, BedDouble,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    admissionApi, type AdmissionTypeCode, type AdmitPatientPayload,
    type AdmissionPatientDetail, type AdmissionHistoryItem,
    type DuplicateMatch, type DuplicateConfidence, type HospitalDoctorItem,
} from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { consentApi, type ConsentTemplateItem } from '../services/consentApi';
import { isAboveEntitlement } from '../utils/roomEntitlement';

const DUP_TONE: Record<DuplicateConfidence, { chip: string; label: string }> = {
    NEAR_CERTAIN: { chip: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Near-certain' },
    PROBABLE: { chip: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Probable' },
    POSSIBLE: { chip: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Possible' },
};

type WizardStep = 'admissionType' | 'personal' | 'advanceBed';
const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
    { key: 'admissionType', label: 'Admission Type' },
    { key: 'personal', label: 'Personal Information' },
    { key: 'advanceBed', label: 'Advance & Bed' },
];

const ADMISSION_TYPES: { value: AdmissionTypeCode; label: string; icon: React.ElementType; tone: string }[] = [
    { value: 'EMERGENCY', label: 'Emergency', icon: Siren, tone: 'border-rose-400 bg-rose-50 text-rose-700 ring-rose-200' },
    { value: 'ELECTIVE', label: 'Elective', icon: CalendarCheck, tone: 'border-brand-400 bg-brand-50 text-brand-700 ring-brand-200' },
    { value: 'DAYCARE', label: 'Day Care', icon: Sun, tone: 'border-sky-400 bg-sky-50 text-sky-700 ring-sky-200' },
    { value: 'LAMA', label: 'Left against advice', icon: LogOut, tone: 'border-amber-400 bg-amber-50 text-amber-700 ring-amber-200' },
];

const TYPE_LABEL: Record<string, string> = {
    EMERGENCY: 'Emergency', ELECTIVE: 'Elective', DAYCARE: 'Day Care', LAMA: 'Left against advice',
};

type PayerTypeCode = 'CASH' | 'TPA' | 'SCHEME';
const PAYER_TYPES: { value: PayerTypeCode; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'TPA', label: 'TPA / Insurance' },
    { value: 'SCHEME', label: 'Govt. scheme' },
];

const REFERRING_FACILITY_TYPES: { value: 'PHC' | 'NURSING_HOME' | 'HOSPITAL' | 'OTHER'; label: string }[] = [
    { value: 'PHC', label: 'PHC' },
    { value: 'NURSING_HOME', label: 'Nursing home' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'OTHER', label: 'Other' },
];

const ROOM_CATEGORIES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE'];

const synthesizeUnknownName = (sex: string, ageYears: string): string => {
    const label = sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Patient';
    const ageSuffix = ageYears ? `, ~${ageYears}y` : '';
    return `Unknown ${label}${ageSuffix}`;
};

const SELECT_CLS = 'h-10 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white outline-none transition focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400';
const INPUT_CLS = 'h-10 rounded-lg';

interface FormState {
    fullName: string; sex: string; ageYears: string; dateOfBirth: string;
    bloodGroup: string; religion: string; nationality: string;
    mobile: string; alternateMobile: string; email: string;
    emergencyContactName: string; emergencyContactRelation: string; emergencyContactPhone: string;
    flatHouse: string; street: string; city: string; district: string; state: string; pincode: string;
    aadhaarNumber: string; panNumber: string; abhaId: string;
    admissionType: AdmissionTypeCode; primaryDoctorId: string;
    admissionReason: string; diagnosis: string; expectedDischargeAt: string;
    isPreRegistration: boolean;
    referralSource: '' | 'SELF' | 'DOCTOR' | 'HOSPITAL'; referralName: string;
    referringFacilityName: string; referringFacilityType: '' | 'PHC' | 'NURSING_HOME' | 'HOSPITAL' | 'OTHER'; referringFacilityContact: string;

    payerType: PayerTypeCode; depositExpected: string; bedId: string;
    payerName: string; policyOrBeneficiaryNo: string; preAuthNo: string; packageCode: string; sanctionedAmount: string;
    entitledRoomCategory: string;

    consentObtained: boolean; consentSignedByName: string; consentSignerRelation: string;
}

const EMPTY_FORM: FormState = {
    fullName: '', sex: '', ageYears: '', dateOfBirth: '',
    bloodGroup: '', religion: '', nationality: 'India',
    mobile: '', alternateMobile: '', email: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
    flatHouse: '', street: '', city: '', district: '', state: '', pincode: '',
    aadhaarNumber: '', panNumber: '', abhaId: '',
    admissionType: 'EMERGENCY', primaryDoctorId: '',
    admissionReason: '', diagnosis: '', expectedDischargeAt: '',
    isPreRegistration: false,
    referralSource: '', referralName: '',
    referringFacilityName: '', referringFacilityType: '', referringFacilityContact: '',
    payerType: 'CASH', depositExpected: '', bedId: '',
    payerName: '', policyOrBeneficiaryNo: '', preAuthNo: '', packageCode: '', sanctionedAmount: '',
    entitledRoomCategory: '',
    consentObtained: false, consentSignedByName: '', consentSignerRelation: 'Self',
};

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onAdmitted: (admissionId: string) => void;
}

const CHIP_TONES: Record<string, string> = {
    indigo: 'bg-brand-100 text-brand-600',
    sky: 'bg-sky-100 text-sky-600',
    violet: 'bg-violet-100 text-violet-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-100 text-rose-600',
};

const SectionCard: React.FC<{
    icon: React.ReactNode; title: string; subtitle?: string; tone?: keyof typeof CHIP_TONES;
    right?: React.ReactNode; children: React.ReactNode;
}> = ({ icon, title, subtitle, tone = 'indigo', right, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', CHIP_TONES[tone])}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">{title}</p>
                {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
            </div>
            {right}
        </div>
        <div className="p-4">{children}</div>
    </section>
);

const OptionalPill = () => (
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">Optional</span>
);

const Field: React.FC<{ label: string; required?: boolean; className?: string; children: React.ReactNode }> = ({ label, required, className, children }) => (
    <div className={className}>
        <Label className="text-[11px] font-semibold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}</Label>
        <div className="mt-1">{children}</div>
    </div>
);

const initials = (name?: string | null) => {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const AdmitPatientSheet: React.FC<Props> = ({ open, onOpenChange, onAdmitted }) => {
    const { toast } = useToast();

    const [step, setStep] = useState<WizardStep>('admissionType');
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

    // Set once staff picks a live-duplicate-detection match — from then on this is a known,
    // existing patient (no more "new vs returning" mode; there's just one flow).
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientDetail, setPatientDetail] = useState<AdmissionPatientDetail | null>(null);
    const [history, setHistory] = useState<AdmissionHistoryItem[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<{ admissionNo?: string; patientId?: string; isNewPatient?: boolean; admissionId?: string; statusCode?: string } | null>(null);

    // Live duplicate detection — replaces the old separate "Returning: search" step. Runs
    // continuously as name/mobile/DOB/Aadhaar are typed, unless an existing patient is already
    // selected below.
    const [dupMatches, setDupMatches] = useState<DuplicateMatch[]>([]);
    const [dupChecking, setDupChecking] = useState(false);
    const [dupDismissed, setDupDismissed] = useState(false);
    const [confirmNotDup, setConfirmNotDup] = useState(false);

    // Available beds for the optional bed picker.
    const [availableBeds, setAvailableBeds] = useState<BedBoardItem[]>([]);
    // Admitting-consultant picker.
    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);
    // Active GENERAL_ADMISSION consent template, if the hospital has configured one — the consent
    // checkbox only renders when this is non-null (never blocks admission on missing config).
    const [generalConsentTemplate, setGeneralConsentTemplate] = useState<ConsentTemplateItem | null>(null);

    // Offline-resync idempotency key: one per admit attempt, reused across retries of the same
    // submission so a retried network call can't create a duplicate admission.
    const clientRequestIdRef = useRef<string>(generateUuid());

    const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load the live bed picker, doctor list, and general-consent template whenever the sheet opens.
    useEffect(() => {
        if (!open) return;
        bedBoardApi.getBoard()
            .then(items => setAvailableBeds(items.filter(b => b.isActive && !b.admissionId)))
            .catch(() => setAvailableBeds([]));
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
        consentApi.getTemplates('GENERAL_ADMISSION')
            .then(templates => setGeneralConsentTemplate(templates.find(t => t.isActive) ?? null))
            .catch(() => setGeneralConsentTemplate(null));
    }, [open]);

    // Debounced duplicate probe while typing name/mobile/DOB/Aadhaar — stops once an existing
    // patient has been picked below (selectedPatientId set).
    useEffect(() => {
        if (selectedPatientId) { setDupMatches([]); setDupChecking(false); return; }
        if (dupTimer.current) clearTimeout(dupTimer.current);
        const name = form.fullName.trim();
        if (name.length < 3) { setDupMatches([]); setDupChecking(false); return; }
        setDupChecking(true);
        dupTimer.current = setTimeout(async () => {
            const matches = await admissionApi.checkDuplicates({
                fullName: name,
                mobile: form.mobile.trim() || undefined,
                dateOfBirth: form.dateOfBirth || undefined,
                aadhaarNumber: form.aadhaarNumber.trim() || undefined,
            });
            setDupMatches(matches);
            setConfirmNotDup(false);
            setDupDismissed(false);
            setDupChecking(false);
        }, 450);
        return () => { if (dupTimer.current) clearTimeout(dupTimer.current); };
    }, [selectedPatientId, form.fullName, form.mobile, form.dateOfBirth, form.aadhaarNumber]);

    const selectPatient = async (patientId: string) => {
        setDupMatches([]); setDupDismissed(false); setConfirmNotDup(false);
        setSelectedPatientId(patientId);
        setLoadingDetail(true);
        try {
            const res = await admissionApi.getPatientAdmissions(patientId);
            setPatientDetail(res.patient ?? null);
            setHistory(res.admissions ?? []);
            if (res.patient) prefillFrom(res.patient);
        } catch {
            toast({ title: 'Could not load patient', description: 'Please try again.', variant: 'destructive' });
        } finally {
            setLoadingDetail(false);
        }
    };

    const prefillFrom = (p: AdmissionPatientDetail) => {
        setForm(f => ({
            ...f,
            fullName: p.fullName ?? '', sex: p.sex ?? '',
            ageYears: p.ageYears != null ? String(p.ageYears) : '',
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
            bloodGroup: p.bloodGroup ?? '', religion: p.religion ?? '', nationality: p.nationality ?? 'India',
            mobile: p.mobile ?? '', alternateMobile: p.alternateMobile ?? '', email: p.email ?? '',
            emergencyContactName: p.emergencyContactName ?? '', emergencyContactRelation: p.emergencyContactRelation ?? '',
            emergencyContactPhone: p.emergencyContactPhone ?? '',
            flatHouse: p.flatHouse ?? '', street: p.street ?? '', city: p.city ?? '',
            district: p.district ?? '', state: p.state ?? '', pincode: p.pincode ?? '',
            panNumber: p.panNumber ?? '', abhaId: p.abhaId ?? '',
        }));
    };

    const clearSelection = () => {
        setSelectedPatientId(null); setPatientDetail(null); setHistory([]);
        setForm(EMPTY_FORM);
    };

    const reset = () => {
        setStep('admissionType'); setForm(EMPTY_FORM); setSelectedPatientId(null);
        setPatientDetail(null); setHistory([]); setSuccess(null);
        setDupMatches([]); setDupDismissed(false); setConfirmNotDup(false);
        clientRequestIdRef.current = generateUuid();
    };

    const bedsByWard = useMemo(() => {
        const groups: Record<string, BedBoardItem[]> = {};
        for (const b of availableBeds) {
            const key = b.wardName || b.wardCode || 'Other';
            (groups[key] ??= []).push(b);
        }
        return groups;
    }, [availableBeds]);

    const hasNearCertainDup = !selectedPatientId && dupMatches.some(m => m.confidence === 'NEAR_CERTAIN');
    // Emergency/casualty: an unidentified patient must never be blocked at the door — Sex +
    // approximate age are the only two things required; name/mobile are backfilled later.
    // Doesn't apply once an existing patient has been picked — their identity is already known.
    const isEmergencyQuickAdmit = !selectedPatientId && form.admissionType === 'EMERGENCY';
    const namePreview = isEmergencyQuickAdmit && !form.fullName.trim() ? synthesizeUnknownName(form.sex, form.ageYears) : null;
    const pickedBed = useMemo(() => availableBeds.find(b => b.bedId === form.bedId), [availableBeds, form.bedId]);
    const showsEntitlementWarning = form.payerType !== 'CASH' && !!form.entitledRoomCategory
        && isAboveEntitlement(pickedBed?.wardType, form.entitledRoomCategory);
    // Gates both "Next" out of the Personal Information step and the final submit — identical
    // requirement either way, since nothing on the Advance & Bed step is ever required.
    const canSubmit = useMemo(() => {
        if (selectedPatientId) return true;
        if (isEmergencyQuickAdmit) {
            if (!form.sex || (!form.ageYears.trim() && !form.dateOfBirth)) return false;
        } else if (!form.fullName.trim() || !form.mobile.trim()) {
            return false;
        }
        // A near-certain duplicate must be explicitly acknowledged before a second UHID is created.
        if (hasNearCertainDup && !confirmNotDup) return false;
        return true;
    }, [selectedPatientId, isEmergencyQuickAdmit, form.fullName, form.mobile, form.sex, form.ageYears, form.dateOfBirth, hasNearCertainDup, confirmNotDup]);

    const submit = async () => {
        if (!canSubmit || submitting) {
            if (isEmergencyQuickAdmit) toast({ title: 'Incomplete', description: 'Sex and approximate age are required.', variant: 'destructive' });
            else toast({ title: 'Incomplete', description: 'Patient name and mobile are required.', variant: 'destructive' });
            return;
        }
        const t = (s: string) => { const v = s.trim(); return v.length ? v : undefined; };
        const isPreRegistration = form.admissionType === 'ELECTIVE' && form.isPreRegistration;
        const payload: AdmitPatientPayload = {
            patientId: selectedPatientId ?? undefined,
            fullName: t(form.fullName), mobile: t(form.mobile),
            ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
            dateOfBirth: t(form.dateOfBirth), sex: t(form.sex),
            bloodGroup: t(form.bloodGroup), religion: t(form.religion), nationality: t(form.nationality),
            flatHouse: t(form.flatHouse), street: t(form.street), city: t(form.city),
            district: t(form.district), state: t(form.state), pincode: t(form.pincode), country: 'India',
            alternateMobile: t(form.alternateMobile), email: t(form.email),
            emergencyContactName: t(form.emergencyContactName), emergencyContactRelation: t(form.emergencyContactRelation),
            emergencyContactPhone: t(form.emergencyContactPhone),
            // Aadhaar is only captured for a brand-new patient; for an existing one it is left untouched.
            aadhaarNumber: selectedPatientId ? undefined : t(form.aadhaarNumber),
            panNumber: t(form.panNumber), abhaId: t(form.abhaId),
            admissionType: form.admissionType,
            primaryDoctorId: form.primaryDoctorId || undefined,
            admissionReason: t(form.admissionReason), diagnosis: t(form.diagnosis),
            expectedDischargeAt: t(form.expectedDischargeAt),
            isPreRegistration,
            referralSource: form.referralSource || undefined,
            referralName: t(form.referralName),
            ...(form.referralSource === 'HOSPITAL' ? {
                referringFacilityName: t(form.referringFacilityName),
                referringFacilityType: form.referringFacilityType || undefined,
                referringFacilityContact: t(form.referringFacilityContact),
            } : {}),
            clientRequestId: clientRequestIdRef.current,
            payerType: form.payerType,
            depositExpected: form.depositExpected ? parseFloat(form.depositExpected) : undefined,
            bedId: form.bedId || undefined,
            ...(form.payerType !== 'CASH' ? {
                payerName: t(form.payerName),
                policyOrBeneficiaryNo: t(form.policyOrBeneficiaryNo),
                preAuthNo: t(form.preAuthNo),
                packageCode: t(form.packageCode),
                sanctionedAmount: form.sanctionedAmount ? parseFloat(form.sanctionedAmount) : undefined,
                entitledRoomCategory: form.entitledRoomCategory || undefined,
            } : {}),
        };
        setSubmitting(true);
        try {
            const res = await admissionApi.admit(payload);
            if (res.success) {
                setSuccess({ admissionNo: res.admissionNo, patientId: res.patientId, isNewPatient: res.isNewPatient, admissionId: res.admissionId, statusCode: res.statusCode });
                toast({ title: isPreRegistration ? 'Patient pre-registered' : 'Patient admitted', description: `${res.admissionNo} · Patient ID ${res.patientId}` });
                // Best-effort general consent capture — never blocks or undoes an admission that
                // already succeeded. Skipped entirely for a pre-registration (patient not yet
                // physically present); captured instead at confirm-arrival time.
                if (!isPreRegistration && form.consentObtained && generalConsentTemplate && res.admissionId) {
                    try {
                        await consentApi.sign(res.admissionId, generalConsentTemplate.consentTemplateId, {
                            signedByName: form.consentSignedByName.trim() || form.fullName.trim() || 'Patient',
                            signerRelation: form.consentSignerRelation.trim() || 'Self',
                        });
                    } catch {
                        // Non-fatal — admission stands either way.
                    }
                }
            } else {
                toast({ title: 'Could not admit', description: res.message ?? 'Please try again.', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Could not admit', description: 'Network or server error. Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const closeAll = () => { reset(); onOpenChange(false); };
    const finishToWorkspace = () => {
        const id = success?.admissionId;
        reset();
        if (id) onAdmitted(id); else onOpenChange(false);
    };

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden bg-slate-50">
                {/* Premium gradient header */}
                <SheetHeader className="px-5 sm:px-6 pt-5 pb-4 shrink-0 bg-gradient-to-br from-brand-600 to-violet-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center backdrop-blur-sm">
                            <UserPlus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold text-white">Admit Patient</SheetTitle>
                            <SheetDescription className="text-xs text-brand-100">The patient ID and admission number are created for you.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {success ? (
                    /* ── Success ───────────────────────────────────────────── */
                    <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 ring-8 ring-emerald-50 flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{success.statusCode === 'PRE_ADMIT' ? 'Patient pre-registered' : 'Admission created'}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {success.statusCode === 'PRE_ADMIT'
                                ? 'Bed/pre-auth can be arranged ahead of arrival — confirm arrival from the dashboard once the patient reaches the hospital.'
                                : success.isNewPatient ? 'New patient registered and admitted.' : 'Returning patient admitted.'}
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-3 w-full max-w-sm">
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Admission No.</p>
                                <p className="text-base font-bold text-brand-700 font-mono mt-0.5">{success.admissionNo}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Patient ID</p>
                                <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{success.patientId}</p>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center gap-3">
                            <Button variant="outline" className="h-10" onClick={reset}><RotateCcw className="h-4 w-4 mr-1.5" /> Admit another</Button>
                            <Button className="h-10 bg-brand-600 hover:bg-brand-700" onClick={finishToWorkspace}>Done <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Step indicator */}
                        <div className="px-5 sm:px-6 pt-4 pb-1 shrink-0">
                            <div className="flex items-center gap-2">
                                {WIZARD_STEPS.map((s, i) => {
                                    const stepIndex = WIZARD_STEPS.findIndex(x => x.key === step);
                                    const isCurrent = s.key === step;
                                    const isVisited = i < stepIndex;
                                    const canJump = i <= stepIndex || (i === stepIndex + 1 && canSubmit);
                                    return (
                                        <React.Fragment key={s.key}>
                                            {i > 0 && <div className={cn('h-0.5 flex-1 rounded-full', isVisited || isCurrent ? 'bg-brand-400' : 'bg-slate-200')} />}
                                            <button type="button" disabled={!canJump} onClick={() => canJump && setStep(s.key)}
                                                className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-all shrink-0',
                                                    isCurrent ? 'bg-brand-600 text-white shadow' : isVisited ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400',
                                                    canJump && !isCurrent && 'cursor-pointer hover:bg-brand-100')}>
                                                <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[10px]',
                                                    isCurrent ? 'bg-white/20' : isVisited ? 'bg-brand-200' : 'bg-slate-200')}>{i + 1}</span>
                                                <span className="hidden sm:inline">{s.label}</span>
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                            {/* ══ Step 1: Admission Type ══════════════════════════ */}
                            {step === 'admissionType' && (
                                <SectionCard icon={<Stethoscope className="h-4 w-4" />} title="Admission type" subtitle="Choose the route this patient is coming through" tone="amber">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {ADMISSION_TYPES.map(t => {
                                            const Icon = t.icon;
                                            const active = form.admissionType === t.value;
                                            return (
                                                <button key={t.value} type="button" onClick={() => set('admissionType', t.value)}
                                                    className={cn('rounded-xl border-2 py-2.5 px-1 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1',
                                                        active ? cn(t.tone, 'ring-2') : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                                    <Icon className="h-4 w-4" />{t.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {form.admissionType === 'EMERGENCY' && (
                                        <p className="mt-3 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                                            Emergency/casualty: the next step only requires Sex + approximate age — name, mobile and everything else can be backfilled once the patient is stabilised.
                                        </p>
                                    )}

                                    {form.admissionType === 'ELECTIVE' && (
                                        <label className="flex items-start gap-2 text-xs text-slate-600 mt-3 p-2.5 rounded-lg border border-brand-200 bg-brand-50/50 cursor-pointer">
                                            <input type="checkbox" checked={form.isPreRegistration} onChange={e => set('isPreRegistration', e.target.checked)} className="mt-0.5" />
                                            <span><span className="font-semibold text-slate-800">Patient not yet arrived — pre-register.</span> Bed/pre-auth can still be arranged now; confirm arrival later from the dashboard.</span>
                                        </label>
                                    )}
                                </SectionCard>
                            )}

                            {/* ══ Step 2: Personal Information ═══════════════════ */}
                            {step === 'personal' && (
                                <>
                            {/* ── Duplicate warning — live-detected while typing name/mobile ── */}
                            {!selectedPatientId && dupMatches.length > 0 && (!dupDismissed || hasNearCertainDup) && (
                                <div className={cn('rounded-2xl border shadow-sm overflow-hidden',
                                    hasNearCertainDup ? 'border-rose-300 bg-rose-50/60' : 'border-amber-300 bg-amber-50/50')}>
                                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-black/5">
                                        <AlertTriangle className={cn('h-5 w-5 shrink-0', hasNearCertainDup ? 'text-rose-600' : 'text-amber-600')} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900">
                                                {hasNearCertainDup ? 'This looks like an existing patient' : 'Possible existing patient'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">{dupMatches.length} match{dupMatches.length > 1 ? 'es' : ''} found — reuse to avoid creating a duplicate record.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {dupMatches.map(m => (
                                            <div key={m.patientId} className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{initials(m.fullName)}</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-900 truncate">{m.fullName || '—'}</p>
                                                        <Badge variant="outline" className={cn('text-[11px] font-bold border', DUP_TONE[m.confidence].chip)}>{DUP_TONE[m.confidence].label}</Badge>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-mono truncate">
                                                        {m.patientId}{m.ageYears != null ? ` · ${m.ageYears}${m.sex ?? ''}` : m.sex ? ` · ${m.sex}` : ''}{m.mobile ? ` · ${m.mobile}` : ''} · {Math.round(m.similarity * 100)}% name
                                                    </p>
                                                </div>
                                                <Button size="sm" onClick={() => selectPatient(m.patientId)} className="h-8 text-xs bg-brand-600 hover:bg-brand-700 shrink-0">
                                                    <Users className="h-3.5 w-3.5 mr-1" /> Use this
                                                </Button>
                                            </div>
                                        ))}
                                        {hasNearCertainDup ? (
                                            <label className="flex items-start gap-2 text-[11px] text-slate-600 px-1 pt-1 cursor-pointer">
                                                <input type="checkbox" checked={confirmNotDup} onChange={e => setConfirmNotDup(e.target.checked)} className="mt-0.5" />
                                                <span>I confirm this is a <span className="font-semibold">different person</span> — create a new patient record anyway.</span>
                                            </label>
                                        ) : (
                                            <div className="flex justify-end pt-0.5">
                                                <Button size="sm" variant="ghost" onClick={() => setDupDismissed(true)} className="h-7 text-[11px] text-slate-500">Not this patient</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!selectedPatientId && dupChecking && dupMatches.length === 0 && form.fullName.trim().length >= 3 && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking for existing patients…</p>
                            )}

                            {/* ── Selected existing patient: identity card ──────── */}
                            {!!selectedPatientId && (
                                <>
                                    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white shadow-sm p-4 flex items-start gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-base font-bold shrink-0 shadow">
                                            {initials(patientDetail?.fullName || form.fullName)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-900 text-[15px] leading-tight">{patientDetail?.fullName || form.fullName || '—'}</p>
                                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                {selectedPatientId}{form.ageYears ? ` · ${form.ageYears}${form.sex}` : form.sex ? ` · ${form.sex}` : ''}{form.bloodGroup ? ` · ${form.bloodGroup}` : ''}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <Badge variant="outline" className="text-[10px] bg-white text-brand-700 border-brand-200">Existing patient</Badge>
                                                {patientDetail?.aadhaarMasked && <Badge variant="outline" className="text-[10px] bg-white text-slate-500 gap-1"><ShieldCheck className="h-3 w-3" /> {patientDetail.aadhaarMasked}</Badge>}
                                                {patientDetail?.abhaId && <Badge variant="outline" className="text-[10px] bg-white text-slate-500 gap-1"><CreditCard className="h-3 w-3" /> ABHA</Badge>}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8 text-xs shrink-0 text-slate-500 hover:text-slate-900"><X className="h-3.5 w-3.5 mr-1" /> Not this patient</Button>
                                    </div>

                                    {(loadingDetail || history.length > 0) && (
                                        <SectionCard icon={<History className="h-4 w-4" />} title="Previous admissions"
                                            subtitle={loadingDetail ? 'Loading…' : `${history.length} on record`} tone="slate"
                                            right={history.length > 0 ? <Badge variant="outline" className="text-[10px] bg-slate-50">{history.length}</Badge> : undefined}>
                                            {loadingDetail ? (
                                                <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {history.map(h => (
                                                        <div key={h.admissionId} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-mono text-xs font-bold text-brand-700">{h.admissionNo}</span>
                                                                <Badge variant="outline" className={cn('text-[10px]', h.statusCode === 'ADMITTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500')}>
                                                                    {h.statusCode}{h.admissionType ? ` · ${TYPE_LABEL[h.admissionType] ?? h.admissionType}` : ''}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-1">
                                                                {new Date(h.admittedAt).toLocaleDateString('en-IN')}
                                                                {h.dischargedAt ? ` → ${new Date(h.dischargedAt).toLocaleDateString('en-IN')}` : ' → (current)'}
                                                            </p>
                                                            {(h.diagnosis || h.admissionReason) && <p className="text-xs text-slate-700 mt-1">{h.diagnosis || h.admissionReason}</p>}
                                                            {h.dischargeNotesPreview && <p className="text-[11px] text-slate-500 mt-1 italic">“{h.dischargeNotesPreview}”</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </SectionCard>
                                    )}
                                </>
                            )}

                            {/* ── Demographics ───────────────────────────────── */}
                                    <SectionCard icon={<User className="h-4 w-4" />} title="Identity"
                                        subtitle={isEmergencyQuickAdmit ? 'Sex and approximate age are required — name can be backfilled later' : !selectedPatientId ? 'Name is required' : 'Pre-filled — edit if needed'} tone="indigo">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Full name" required={!selectedPatientId && !isEmergencyQuickAdmit} className="sm:col-span-2">
                                                <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} className={INPUT_CLS} placeholder={isEmergencyQuickAdmit ? 'Unknown — leave blank if not identifiable' : 'Patient full name'} />
                                                {namePreview && <p className="text-[11px] text-slate-400 mt-1">Will admit as: <span className="font-semibold text-slate-600">{namePreview}</span></p>}
                                            </Field>
                                            <Field label="Sex" required={isEmergencyQuickAdmit}>
                                                <select value={form.sex} onChange={e => set('sex', e.target.value)} className={SELECT_CLS}>
                                                    <option value="">Select…</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                                                </select>
                                            </Field>
                                            <Field label="Blood group">
                                                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className={SELECT_CLS}>
                                                    <option value="">Unknown</option>
                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Age (years)" required={isEmergencyQuickAdmit}>
                                                <Input type="number" min={0} max={130} value={form.ageYears} onChange={e => set('ageYears', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="e.g. 42 (approximate is fine)" />
                                            </Field>
                                            <Field label="Date of birth">
                                                <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={INPUT_CLS} />
                                            </Field>
                                            <Field label="Religion">
                                                <Input value={form.religion} onChange={e => set('religion', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="Nationality">
                                                <Input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={INPUT_CLS} />
                                            </Field>
                                        </div>
                                    </SectionCard>

                                    <SectionCard icon={<Phone className="h-4 w-4" />} title="Contact"
                                        subtitle={isEmergencyQuickAdmit ? 'Optional in Emergency mode' : !selectedPatientId ? 'Mobile is required' : undefined} tone="sky">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Patient mobile" required={!selectedPatientId && !isEmergencyQuickAdmit}>
                                                <Input value={form.mobile} onChange={e => set('mobile', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="10-digit mobile" />
                                            </Field>
                                            <Field label="Attendant / next-of-kin phone">
                                                <Input value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Often more reachable than the patient's own" />
                                            </Field>
                                            <Field label="Attendant / next-of-kin name">
                                                <Input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} className={INPUT_CLS} placeholder="Name" />
                                            </Field>
                                            <Field label="Relation to patient">
                                                <Input value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} className={INPUT_CLS} placeholder="e.g. Son" />
                                            </Field>
                                            <Field label="Alternate mobile">
                                                <Input value={form.alternateMobile} onChange={e => set('alternateMobile', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                            </Field>
                                            <Field label="Email">
                                                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                        </div>
                                    </SectionCard>

                                    <SectionCard icon={<MapPin className="h-4 w-4" />} title="Address" tone="violet" right={<OptionalPill />}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Flat / house">
                                                <Input value={form.flatHouse} onChange={e => set('flatHouse', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="Street">
                                                <Input value={form.street} onChange={e => set('street', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="City">
                                                <Input value={form.city} onChange={e => set('city', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="District">
                                                <Input value={form.district} onChange={e => set('district', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="State">
                                                <Input value={form.state} onChange={e => set('state', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="PIN code">
                                                <Input value={form.pincode} onChange={e => set('pincode', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                            </Field>
                                        </div>
                                    </SectionCard>

                                    <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="Government ID" tone="emerald" right={<OptionalPill />}>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {!selectedPatientId ? (
                                                <Field label="Aadhaar">
                                                    <Input value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="12 digits" />
                                                </Field>
                                            ) : (
                                                <Field label="Aadhaar">
                                                    <Input value={patientDetail?.aadhaarMasked ?? '—'} readOnly disabled className={cn(INPUT_CLS, 'font-mono bg-slate-50')} />
                                                </Field>
                                            )}
                                            <Field label="PAN">
                                                <Input value={form.panNumber} onChange={e => set('panNumber', e.target.value)} className={cn(INPUT_CLS, 'font-mono uppercase')} placeholder="Optional" />
                                            </Field>
                                            <Field label="ABHA ID">
                                                <Input value={form.abhaId} onChange={e => set('abhaId', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                            </Field>
                                        </div>
                                    </SectionCard>

                                    {/* ── Clinical & referral details ───────────────── */}
                                    <SectionCard icon={<Stethoscope className="h-4 w-4" />} title="Clinical & referral details" subtitle="Consultant, diagnosis & referral" tone="amber">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Admitting consultant">
                                                <select value={form.primaryDoctorId} onChange={e => set('primaryDoctorId', e.target.value)} className={SELECT_CLS}>
                                                    <option value="">— Not specified —</option>
                                                    {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.fullName || 'Unnamed'}{d.departmentName ? ` · ${d.departmentName}` : ''}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Provisional diagnosis">
                                                <Input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} className={INPUT_CLS} placeholder="e.g. Pneumonia" />
                                            </Field>
                                            <Field label="Expected discharge">
                                                <div className="relative">
                                                    <Input type="date" value={form.expectedDischargeAt} onChange={e => set('expectedDischargeAt', e.target.value)} className={INPUT_CLS} />
                                                    <CalendarClock className="h-3.5 w-3.5 text-slate-300 absolute right-2.5 top-3 pointer-events-none" />
                                                </div>
                                            </Field>
                                            <Field label="Reason for admission" className="sm:col-span-2">
                                                <Textarea value={form.admissionReason} onChange={e => set('admissionReason', e.target.value)} rows={2} className="text-sm rounded-lg" placeholder="Chief complaint / notes" />
                                            </Field>
                                            <Field label="Referred by">
                                                <select value={form.referralSource} onChange={e => set('referralSource', e.target.value as FormState['referralSource'])} className={SELECT_CLS}>
                                                    <option value="">— Not specified —</option>
                                                    <option value="SELF">Self</option>
                                                    <option value="DOCTOR">Doctor</option>
                                                    <option value="HOSPITAL">Hospital</option>
                                                </select>
                                            </Field>
                                            {(form.referralSource === 'DOCTOR' || form.referralSource === 'HOSPITAL') && (
                                                <Field label="Referrer name" className="text-slate-500">
                                                    <Input value={form.referralName} onChange={e => set('referralName', e.target.value)} className={INPUT_CLS} placeholder="Doctor / hospital name (for MIS/commission)" />
                                                </Field>
                                            )}
                                        </div>

                                        {form.referralSource === 'HOSPITAL' && (
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-[11px] font-semibold text-slate-500 mb-2">Transfer-in facility <span className="font-normal text-slate-400">(for referral records — PM-JAY rules &amp; your referral-network analytics)</span></p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <Field label="Facility type">
                                                        <select value={form.referringFacilityType} onChange={e => set('referringFacilityType', e.target.value as FormState['referringFacilityType'])} className={SELECT_CLS}>
                                                            <option value="">— Select —</option>
                                                            {REFERRING_FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                        </select>
                                                    </Field>
                                                    <Field label="Facility name">
                                                        <Input value={form.referringFacilityName} onChange={e => set('referringFacilityName', e.target.value)} className={INPUT_CLS} placeholder="e.g. Sub-District Hospital" />
                                                    </Field>
                                                    <Field label="Facility contact">
                                                        <Input value={form.referringFacilityContact} onChange={e => set('referringFacilityContact', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                                    </Field>
                                                </div>
                                            </div>
                                        )}
                                    </SectionCard>

                                    {generalConsentTemplate && !(form.admissionType === 'ELECTIVE' && form.isPreRegistration) && (
                                        <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="General consent" subtitle="Optional — can also be captured later" tone="emerald">
                                            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                                                <input type="checkbox" checked={form.consentObtained} onChange={e => set('consentObtained', e.target.checked)} className="mt-0.5" />
                                                <span>General admission &amp; treatment consent obtained from the patient/attendant.</span>
                                            </label>
                                            {form.consentObtained && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                                    <Field label="Signed by">
                                                        <Input value={form.consentSignedByName} onChange={e => set('consentSignedByName', e.target.value)} className={INPUT_CLS} placeholder={form.fullName || 'Patient name'} />
                                                    </Field>
                                                    <Field label="Relation to patient">
                                                        <Input value={form.consentSignerRelation} onChange={e => set('consentSignerRelation', e.target.value)} className={INPUT_CLS} placeholder="Self" />
                                                    </Field>
                                                </div>
                                            )}
                                        </SectionCard>
                                    )}
                                </>
                            )}

                            {/* ══ Step 3: Advance & Bed (optional) ════════════════ */}
                            {step === 'advanceBed' && (
                                <>
                                    <p className="text-[11px] text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
                                        This step is optional — you can admit now and add deposit/bed details later from the dashboard.
                                    </p>
                                    {/* ── Payer & bed ────────────────────────────────── */}
                                    <SectionCard icon={<Wallet className="h-4 w-4" />} title="Payer & bed" subtitle="Billing branch, deposit & bed assignment" tone="rose">
                                        <Label className="text-[11px] font-semibold text-slate-600">Payer type</Label>
                                        <div className="grid grid-cols-3 gap-2 mt-1.5 mb-4">
                                            {PAYER_TYPES.map(p => {
                                                const active = form.payerType === p.value;
                                                return (
                                                    <button key={p.value} type="button" onClick={() => set('payerType', p.value)}
                                                        className={cn('rounded-xl border-2 py-2.5 px-1 text-xs font-bold transition-all',
                                                            active ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                                        {p.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Deposit expected (₹)">
                                                <Input type="number" min={0} value={form.depositExpected} onChange={e => set('depositExpected', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                            </Field>
                                            <Field label="Bed">
                                                <div className="relative">
                                                    <select value={form.bedId} onChange={e => set('bedId', e.target.value)} className={SELECT_CLS}>
                                                        <option value="">— Assign later —</option>
                                                        {Object.entries(bedsByWard).map(([ward, beds]) => (
                                                            <optgroup key={ward} label={ward}>
                                                                {beds.map(b => (
                                                                    <option key={b.bedId} value={b.bedId}>{b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                    <BedDouble className="h-3.5 w-3.5 text-slate-300 absolute right-8 top-3 pointer-events-none" />
                                                </div>
                                                {availableBeds.length === 0 && <p className="text-[11px] text-slate-400 mt-1">No free beds right now — can be assigned later from the bed board.</p>}
                                            </Field>
                                        </div>

                                        {form.payerType !== 'CASH' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                                                <Field label={form.payerType === 'TPA' ? 'Insurer / TPA name' : 'Scheme name'}>
                                                    <Input value={form.payerName} onChange={e => set('payerName', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                                </Field>
                                                <Field label={form.payerType === 'TPA' ? 'Policy number' : 'Beneficiary number'}>
                                                    <Input value={form.policyOrBeneficiaryNo} onChange={e => set('policyOrBeneficiaryNo', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                                </Field>
                                                <Field label="Pre-auth number">
                                                    <Input value={form.preAuthNo} onChange={e => set('preAuthNo', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                                </Field>
                                                <Field label="Package code">
                                                    <Input value={form.packageCode} onChange={e => set('packageCode', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="e.g. PM-JAY HBP code" />
                                                </Field>
                                                <Field label="Entitled room category">
                                                    <select value={form.entitledRoomCategory} onChange={e => set('entitledRoomCategory', e.target.value)} className={SELECT_CLS}>
                                                        <option value="">— Not specified —</option>
                                                        {ROOM_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                                    </select>
                                                </Field>
                                                <Field label="Sanctioned amount (₹)">
                                                    <Input type="number" min={0} value={form.sanctionedAmount} onChange={e => set('sanctionedAmount', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                                </Field>
                                            </div>
                                        )}

                                        {showsEntitlementWarning && (
                                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                                <p className="text-[11px] text-amber-800">
                                                    Patient is entitled to <span className="font-semibold">{form.entitledRoomCategory.replace('_', ' ')}</span> — the picked bed ({pickedBed?.wardType}) is above that. The differential will show as non-payable at discharge unless the patient/family accepts the upgrade.
                                                </p>
                                            </div>
                                        )}
                                    </SectionCard>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-4 bg-white border-t border-slate-200 flex items-center gap-3">
                            <Button variant="outline" className="h-10 px-4" onClick={step === 'admissionType' ? closeAll : () => setStep(WIZARD_STEPS[WIZARD_STEPS.findIndex(s => s.key === step) - 1].key)}>
                                {step === 'admissionType' ? <><X className="h-4 w-4 mr-1" /> Cancel</> : 'Back'}
                            </Button>
                            <div className="flex-1 min-w-0">
                                {step === 'personal' && !canSubmit && (
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {isEmergencyQuickAdmit ? 'Sex and approximate age are required to continue.' : 'Name and mobile are required to continue.'}
                                    </p>
                                )}
                                {!!selectedPatientId && step !== 'admissionType' && <p className="text-[11px] text-slate-400 truncate">Re-admitting <span className="font-mono">{selectedPatientId}</span></p>}
                            </div>
                            {step === 'admissionType' && (
                                <Button onClick={() => setStep('personal')} className="h-10 px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                    Next <ArrowRight className="h-4 w-4 ml-1.5" />
                                </Button>
                            )}
                            {step === 'personal' && (
                                <>
                                    <Button variant="outline" disabled={!canSubmit || submitting} onClick={submit} className="h-10 px-4">
                                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Skip &amp; admit
                                    </Button>
                                    <Button onClick={() => setStep('advanceBed')} disabled={!canSubmit} className="h-10 px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                        Next <ArrowRight className="h-4 w-4 ml-1.5" />
                                    </Button>
                                </>
                            )}
                            {step === 'advanceBed' && (
                                <Button onClick={submit} disabled={!canSubmit || submitting} className="h-10 px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    {form.admissionType === 'ELECTIVE' && form.isPreRegistration ? 'Pre-register patient' : 'Admit patient'}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};
