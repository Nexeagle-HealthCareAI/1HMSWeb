import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    User, CalendarCheck, Sun, LogOut, AlertTriangle, Wallet, BedDouble,
    Printer, Download, Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    admissionApi, type AdmissionTypeCode, type AdmitPatientPayload,
    type AdmissionPatientDetail, type AdmissionHistoryItem,
    type HospitalDoctorItem,
    type PatientSearchResult,
} from '../services/admissionApi';
import { bedBoardApi, type BedBoardItem } from '../services/bedBoardApi';
import { consentApi, type ConsentTemplateItem } from '../services/consentApi';
import { isAboveEntitlement } from '../utils/roomEntitlement';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { buildPrintSettingsFromHospital } from '@/features/billing/utils/opdDocuments';
import { downloadHtmlAsPdf, openPrintHtml } from '@/utils/printUtils';
import { buildAdmissionConfirmationA4 } from '@/printTemplates/admissionConfirmationA4';
import { ipdBillingService, type PaymentMode } from '@/features/billing/services/ipdBillingService';
import { otPlanApi, type OTPlanItem } from '@/features/hospital/services/otPlanApi';
import { PackageTypePicker } from '@/features/hospital/components/masters/PackageTypePicker';
import { ReferrerPicker } from '../components/ReferrerPicker';

type WizardStep = 'admissionType' | 'personal' | 'clinical' | 'advanceBed';
const WIZARD_STEPS: { key: WizardStep; label: string; required: boolean }[] = [
    { key: 'admissionType', label: 'Admission Type', required: true },
    { key: 'personal', label: 'Personal Information', required: true },
    { key: 'clinical', label: 'Clinical & Referral', required: false },
    { key: 'advanceBed', label: 'Advance & Bed', required: false },
];

// "Planned" shown first — the easier, friendlier name for an elective admission; value stays
// ELECTIVE (the backend also accepts the literal string "PLANNED" as a synonym).
const ADMISSION_TYPES: { value: AdmissionTypeCode; label: string; icon: React.ElementType; tone: string; description: string }[] = [
    { value: 'ELECTIVE', label: 'Planned', icon: CalendarCheck, tone: 'border-brand-400 bg-brand-50 text-brand-700 ring-brand-200', description: 'Scheduled admission with lead time — pre-register the patient and arrange the bed/pre-auth before they arrive.' },
    { value: 'EMERGENCY', label: 'Emergency', icon: Siren, tone: 'border-rose-400 bg-rose-50 text-rose-700 ring-rose-200', description: 'Casualty or unidentified patient — only Sex and approximate age are needed to admit; everything else can be filled in once stabilised.' },
    { value: 'DAYCARE', label: 'Day Care', icon: Sun, tone: 'border-sky-400 bg-sky-50 text-sky-700 ring-sky-200', description: 'Short procedure or observation stay with no overnight — same admission flow, discharge the same day.' },
    { value: 'LAMA', label: 'Left Against Advice', icon: LogOut, tone: 'border-amber-400 bg-amber-50 text-amber-700 ring-amber-200', description: 'Patient is leaving the facility against medical advice — recorded for the clinical record.' },
];

const TYPE_LABEL: Record<string, string> = {
    EMERGENCY: 'Emergency', ELECTIVE: 'Planned', DAYCARE: 'Day Care', LAMA: 'Left Against Advice',
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

const SEX_OPTIONS: { value: 'M' | 'F' | 'O'; label: string }[] = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
];

const AGE_UNITS: { value: 'Y' | 'M' | 'D'; label: string }[] = [
    { value: 'Y', label: 'Yrs' },
    { value: 'M', label: 'Month' },
    { value: 'D', label: 'Day' },
];

const synthesizeUnknownName = (sex: string, ageYears: string, ageUnit: 'Y' | 'M' | 'D'): string => {
    const label = sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Patient';
    const ageSuffix = ageYears ? `, ~${ageYears}${ageUnit.toLowerCase()}` : '';
    return `Unknown ${label}${ageSuffix}`;
};

const SELECT_CLS = 'h-10 w-full text-sm border border-slate-200 rounded-lg px-3 bg-white outline-none transition focus:ring-2 focus:ring-brand-500/25 focus:border-brand-400';
// h-11 (44px) on mobile for comfortable touch targets, h-10 on sm+ to keep the desktop density.
const INPUT_CLS = 'h-11 sm:h-10 rounded-lg';

interface FormState {
    fullName: string; sex: string; ageYears: string; ageUnit: 'Y' | 'M' | 'D'; dateOfBirth: string;
    bloodGroup: string; religion: string; nationality: string;
    mobile: string; alternateMobile: string; email: string;
    emergencyContactName: string; emergencyContactRelation: string; emergencyContactPhone: string;
    flatHouse: string; street: string; city: string; district: string; state: string; pincode: string;
    aadhaarNumber: string; panNumber: string; abhaId: string;
    admissionType: AdmissionTypeCode; primaryDoctorId: string;
    admissionReason: string; diagnosis: string; expectedDischargeAt: string;
    isPreRegistration: boolean;
    referralSource: '' | 'SELF' | 'DOCTOR' | 'HOSPITAL' | 'OTHER'; referralName: string;
    referredByReferrerId: string; referrerType: string;
    referringFacilityName: string; referringFacilityType: '' | 'PHC' | 'NURSING_HOME' | 'HOSPITAL' | 'OTHER'; referringFacilityContact: string;

    payerType: PayerTypeCode; depositExpected: string; bedId: string;
    payerName: string; policyOrBeneficiaryNo: string; preAuthNo: string; packageCode: string; sanctionedAmount: string;
    entitledRoomCategory: string;
    otPlanId: string; otPlanCustomText: string;
    packageTypeId: string | null;
    collectAdvanceNow: boolean; advancePaymentMode: PaymentMode; advanceTransactionId: string;

    consentObtained: boolean; consentSignedByName: string; consentSignerRelation: string;
}

const EMPTY_FORM: FormState = {
    fullName: '', sex: 'M', ageYears: '', ageUnit: 'Y', dateOfBirth: '',
    bloodGroup: '', religion: '', nationality: 'India',
    mobile: '', alternateMobile: '', email: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
    flatHouse: '', street: '', city: '', district: '', state: '', pincode: '',
    aadhaarNumber: '', panNumber: '', abhaId: '',
    admissionType: 'ELECTIVE', primaryDoctorId: '',
    admissionReason: '', diagnosis: '', expectedDischargeAt: '',
    isPreRegistration: false,
    referralSource: '', referralName: '',
    referredByReferrerId: '', referrerType: '',
    referringFacilityName: '', referringFacilityType: '', referringFacilityContact: '',
    payerType: 'CASH', depositExpected: '', bedId: '',
    payerName: '', policyOrBeneficiaryNo: '', preAuthNo: '', packageCode: '', sanctionedAmount: '',
    entitledRoomCategory: '',
    otPlanId: '', otPlanCustomText: '',
    packageTypeId: null,
    collectAdvanceNow: false, advancePaymentMode: 'CASH', advanceTransactionId: '',
    consentObtained: false, consentSignedByName: '', consentSignerRelation: 'Self',
};

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onAdmitted: (admissionId: string) => void;
    // Pre-fill when opened from a Referred Admissions board row — an already-known patient/doctor/
    // plan. referralId is threaded through to the admit call so that referral is atomically marked
    // CONVERTED in the same transaction that creates the admission.
    initialPatientId?: string;
    initialDoctorId?: string;
    initialOtPlanId?: string;
    referralId?: string;
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
    // Cards whose content renders an absolutely-positioned overlay (e.g. a search
    // results dropdown) need this — the default overflow-hidden (for rounded corners)
    // would otherwise clip the overlay wherever it extends past the card's own bounds.
    allowOverflow?: boolean;
}> = ({ icon, title, subtitle, tone = 'indigo', right, children, allowOverflow }) => (
    <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', !allowOverflow && 'overflow-hidden')}>
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
    <div className={cn(className, required && 'border-l-2 border-rose-300 pl-2 -ml-2.5')}>
        <div className="flex items-center gap-1.5">
            <Label className="text-[11px] font-semibold text-slate-600">{label}</Label>
            {required && <span className="text-[8px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 py-0.5 leading-none">Required</span>}
        </div>
        <div className="mt-1">{children}</div>
    </div>
);

const initials = (name?: string | null) => {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const AdmitPatientSheet: React.FC<Props> = ({ open, onOpenChange, onAdmitted, initialPatientId, initialDoctorId, initialOtPlanId, referralId }) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
    const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);

    const [step, setStep] = useState<WizardStep>('admissionType');
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
    // Phone fields: digits only, max 10 — same convention as PatientForm's mobile input.
    const setPhone = (k: 'mobile' | 'alternateMobile' | 'emergencyContactPhone' | 'referringFacilityContact', v: string) =>
        set(k, v.replace(/\D/g, '').slice(0, 10));

    // Set once staff picks a live-duplicate-detection match — from then on this is a known,
    // existing patient (no more "new vs returning" mode; there's just one flow).
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientDetail, setPatientDetail] = useState<AdmissionPatientDetail | null>(null);
    const [history, setHistory] = useState<AdmissionHistoryItem[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Proactive "search existing patient" box — same generic name/UHID/mobile fuzzy search used on
    // the Appointment board, restored here (the wizard rework replaced it with the name-triggered
    // live duplicate-detection below, which needs 3+ letters of a name and doesn't help when staff
    // already knows the UHID or phone). Both now coexist: this is the fast known-patient path, the
    // duplicate check below stays as the safety net for the new-patient path.
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
    const [patientSearching, setPatientSearching] = useState(false);
    const [showPatientSearchResults, setShowPatientSearchResults] = useState(false);
    const patientSearchContainerRef = useRef<HTMLDivElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<{ admissionNo?: string; patientId?: string; isNewPatient?: boolean; admissionId?: string; statusCode?: string; admittedAt?: string; advanceReceiptNo?: string; advancePendingApproval?: boolean } | null>(null);

    // Available beds for the optional bed picker.
    const [availableBeds, setAvailableBeds] = useState<BedBoardItem[]>([]);
    // Admitting-consultant picker.
    const [doctors, setDoctors] = useState<HospitalDoctorItem[]>([]);
    // OT Plan picker (optional) — pre-fills entitledRoomCategory and shows an ICU hint.
    const [otPlans, setOtPlans] = useState<OTPlanItem[]>([]);
    // Active GENERAL_ADMISSION consent template, if the hospital has configured one — the consent
    // checkbox only renders when this is non-null (never blocks admission on missing config).
    const [generalConsentTemplate, setGeneralConsentTemplate] = useState<ConsentTemplateItem | null>(null);

    // Offline-resync idempotency key: one per admit attempt, reused across retries of the same
    // submission so a retried network call can't create a duplicate admission.
    const clientRequestIdRef = useRef<string>(generateUuid());

    // Local-only draft autosave — protects against an accidental close/refresh/tab-switch losing
    // an in-progress admission. Never touches the server; nothing exists until the real submit.
    // A restore banner (not silent auto-load) avoids ever mixing an old draft into a fresh admit
    // for a different patient.
    const DRAFT_KEY = `admit-draft:${hospitalId}`;
    const [pendingDraft, setPendingDraft] = useState<{ savedAt: number } | null>(null);
    const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const draftRestoredRef = useRef(false);

    const clearDraft = () => {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable — non-fatal */ }
        setPendingDraft(null);
    };

    // Offer to restore a recent draft (<24h) when the sheet opens fresh — never when it was opened
    // pre-filled from a Referred Admissions row, since that pre-fill should always win.
    useEffect(() => {
        if (!open || initialPatientId) return;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw) as { form: FormState; step: WizardStep; selectedPatientId: string | null; savedAt: number };
            if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
                setPendingDraft({ savedAt: draft.savedAt });
            } else {
                localStorage.removeItem(DRAFT_KEY);
            }
        } catch { /* corrupt/unavailable draft — ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialPatientId]);

    const restoreDraft = () => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw) as { form: FormState; step: WizardStep; selectedPatientId: string | null; savedAt: number };
            draftRestoredRef.current = true;
            setForm(draft.form);
            setStep(draft.step);
            if (draft.selectedPatientId) selectPatient(draft.selectedPatientId);
        } catch { /* ignore */ } finally {
            setPendingDraft(null);
        }
    };

    // Debounced local save — skipped for one cycle right after a restore so it doesn't immediately
    // "save" the just-restored draft back over itself with a fresh timestamp for no reason.
    useEffect(() => {
        if (!open || pendingDraft) return;
        if (draftRestoredRef.current) { draftRestoredRef.current = false; return; }
        if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, selectedPatientId, savedAt: Date.now() }));
            } catch { /* storage unavailable/full — non-fatal, just no autosave this cycle */ }
        }, 600);
        return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form, step, selectedPatientId, pendingDraft]);

    // Load the live bed picker, doctor list, OT Plans, and general-consent template whenever the sheet opens.
    useEffect(() => {
        if (!open) return;
        bedBoardApi.getBoard()
            .then(items => setAvailableBeds(items.filter(b => b.isActive && !b.admissionId)))
            .catch(() => setAvailableBeds([]));
        admissionApi.getHospitalDoctors().then(setDoctors).catch(() => setDoctors([]));
        consentApi.getTemplates('GENERAL_ADMISSION')
            .then(templates => setGeneralConsentTemplate(templates.find(t => t.isActive) ?? null))
            .catch(() => setGeneralConsentTemplate(null));
        otPlanApi.list().then(res => setOtPlans(res?.plans ?? [])).catch(() => setOtPlans([]));
    }, [open]);

    // Pre-fill from a Referred Admissions board row: known patient/doctor. Patient detail is
    // fetched via the same path as picking a live-duplicate match below.
    useEffect(() => {
        if (!open) return;
        if (initialPatientId) selectPatient(initialPatientId);
        if (initialDoctorId) set('primaryDoctorId', initialDoctorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialPatientId, initialDoctorId]);

    // OT Plan pre-fill needs the plans list loaded first — applies the plan's default room
    // category only if the doctor/desk hasn't already set one (never clobbers an explicit choice).
    useEffect(() => {
        if (!open || !initialOtPlanId || otPlans.length === 0) return;
        const plan = otPlans.find(p => p.otPlanId === initialOtPlanId);
        if (!plan) return;
        setForm(f => ({
            ...f,
            otPlanId: plan.otPlanId,
            entitledRoomCategory: f.entitledRoomCategory || plan.defaultRoomCategory || f.entitledRoomCategory,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialOtPlanId, otPlans]);

    // Debounced generic patient search — matches name/UHID/mobile/Aadhaar/ABHA the same way the
    // Appointment board's search does. A query that's mostly digits is treated as a phone-number
    // attempt and stripped to digits only (the backend mobile match is a plain substring Contains).
    useEffect(() => {
        if (selectedPatientId) return;
        const raw = patientSearchTerm.trim();
        const digitsOnly = raw.replace(/\D/g, '');
        const looksNumeric = digitsOnly.length > 0 && digitsOnly.length >= raw.replace(/\s/g, '').length - 2;
        const query = looksNumeric ? digitsOnly : raw;
        if (query.length < 2) {
            setPatientSearchResults([]);
            setShowPatientSearchResults(false);
            return;
        }
        let active = true;
        setPatientSearching(true);
        const timer = setTimeout(async () => {
            try {
                const items = await admissionApi.searchPatients(query, hospitalId);
                if (!active) return;
                setPatientSearchResults(items);
                setShowPatientSearchResults(true);
            } catch {
                if (!active) return;
                setPatientSearchResults([]);
                setShowPatientSearchResults(false);
            } finally {
                if (active) setPatientSearching(false);
            }
        }, 400);
        return () => { active = false; clearTimeout(timer); };
    }, [patientSearchTerm, selectedPatientId, hospitalId]);

    const selectPatient = async (patientId: string) => {
        setPatientSearchTerm(''); setPatientSearchResults([]); setShowPatientSearchResults(false);
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

    const selectReferrer = (referrerId: string, name: string, type: string) => {
        setForm(f => ({ ...f, referredByReferrerId: referrerId, referralName: name, referrerType: type }));
    };
    const clearReferrerSelection = () => {
        setForm(f => ({ ...f, referredByReferrerId: '', referralName: '', referrerType: '' }));
    };

    const reset = () => {
        setStep('admissionType'); setForm(EMPTY_FORM); setSelectedPatientId(null);
        setPatientDetail(null); setHistory([]); setSuccess(null);
        setPatientSearchTerm(''); setPatientSearchResults([]); setShowPatientSearchResults(false);
        clientRequestIdRef.current = generateUuid();
        // Deliberately NOT clearing the draft here — reset() also runs on an accidental
        // close-outside-click/Escape (see the Sheet's onOpenChange below), which is exactly the
        // scenario the draft protects against. It's only cleared explicitly: after a successful
        // submit, or via the restore banner's "Discard" button.
    };

    const bedsByWard = useMemo(() => {
        const groups: Record<string, BedBoardItem[]> = {};
        for (const b of availableBeds) {
            const key = b.wardName || b.wardCode || 'Other';
            (groups[key] ??= []).push(b);
        }
        return groups;
    }, [availableBeds]);

    // Emergency/casualty: an unidentified patient must never be blocked at the door — Sex +
    // approximate age are the only two things required; name/mobile are backfilled later.
    // Doesn't apply once an existing patient has been picked — their identity is already known.
    const isEmergencyQuickAdmit = !selectedPatientId && form.admissionType === 'EMERGENCY';
    const namePreview = isEmergencyQuickAdmit && !form.fullName.trim() ? synthesizeUnknownName(form.sex, form.ageYears, form.ageUnit) : null;
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
        return true;
    }, [selectedPatientId, isEmergencyQuickAdmit, form.fullName, form.mobile, form.sex, form.ageYears, form.dateOfBirth]);

    const submit = async () => {
        if (!canSubmit || submitting) {
            if (isEmergencyQuickAdmit) toast({ title: 'Incomplete', description: 'Sex and approximate age are required.', variant: 'destructive' });
            else toast({ title: 'Incomplete', description: 'Patient name and mobile are required.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        const t = (s: string) => { const v = s.trim(); return v.length ? v : undefined; };
        const isPreRegistration = form.admissionType === 'ELECTIVE' && form.isPreRegistration;

        // ReferrerPicker creates a brand-new referrer immediately on confirm (not deferred to
        // here) — by submit time form.referredByReferrerId is already a real Referrer master id.
        const referredByReferrerId = form.referredByReferrerId || undefined;
        const referralNameForPayload = t(form.referralName);

        const payload: AdmitPatientPayload = {
            patientId: selectedPatientId ?? undefined,
            fullName: t(form.fullName), mobile: t(form.mobile),
            ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
            ageUnit: form.ageYears ? form.ageUnit : undefined,
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
            otPlanId: form.otPlanId || undefined,
            customOtPlanText: !form.otPlanId ? t(form.otPlanCustomText) : undefined,
            packageTypeId: form.packageTypeId || undefined,
            referralId: referralId || undefined,
            referralSource: form.referralSource || undefined,
            referralName: referralNameForPayload,
            referredByReferrerId,
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
        try {
            const res = await admissionApi.admit(payload);
            if (res.success) {
                setSuccess({ admissionNo: res.admissionNo, patientId: res.patientId, isNewPatient: res.isNewPatient, admissionId: res.admissionId, statusCode: res.statusCode, admittedAt: res.admittedAt });
                toast({ title: isPreRegistration ? 'Patient pre-registered' : 'Patient admitted', description: `${res.admissionNo} · Patient ID ${res.patientId}` });
                clearDraft();
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
                // Best-effort advance collection — the "Deposit expected" figure becomes a real
                // BillingPayment(ADVANCE) right away when staff opt in, instead of only ever being
                // a printed-slip reference number. Needs a billing encounter (skipped for
                // pre-registrations / IPD billing disabled) and never undoes the admission if it fails.
                if (!isPreRegistration && form.collectAdvanceNow && res.encounterId && res.patientId && form.depositExpected) {
                    try {
                        const payRes = await ipdBillingService.addPayment({
                            patientId: res.patientId,
                            encounterId: res.encounterId,
                            payment: {
                                paymentType: 'ADVANCE',
                                paymentMode: form.advancePaymentMode,
                                transactionId: form.advanceTransactionId.trim() || undefined,
                                description: 'Advance collected at admission',
                                amount: parseFloat(form.depositExpected),
                            },
                        });
                        if (payRes.success) {
                            setSuccess(prev => prev ? { ...prev, advanceReceiptNo: payRes.data?.receiptNo, advancePendingApproval: payRes.pendingApproval } : prev);
                            toast(payRes.pendingApproval
                                ? { title: 'Advance submitted for approval', description: 'This would leave a credit balance — an Admin/AdminDoctor needs to approve it.' }
                                : { title: 'Advance collected', description: payRes.data?.receiptNo ? `Receipt ${payRes.data.receiptNo}` : undefined });
                        } else {
                            toast({ title: 'Admitted, but advance was not recorded', description: payRes.message ?? 'Record it from the billing page.', variant: 'destructive' });
                        }
                    } catch {
                        toast({ title: 'Admitted, but advance was not recorded', description: 'Record it from the billing page.', variant: 'destructive' });
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

    const printConfirmation = (mode: 'print' | 'download') => {
        if (!success) return;
        const pickedBedForPrint = availableBeds.find(b => b.bedId === form.bedId);
        const doctor = doctors.find(d => d.doctorId === form.primaryDoctorId);
        const settings = buildPrintSettingsFromHospital(hospitalData);
        const html = buildAdmissionConfirmationA4({
            admissionNo: success.admissionNo || '',
            admittedAt: success.admittedAt ?? new Date().toISOString(),
            patientName: form.fullName || namePreview || success.patientId || '',
            patientId: success.patientId || '',
            ageGender: form.ageYears ? `${form.ageYears}${form.ageUnit === 'Y' ? '' : form.ageUnit}${form.sex}` : form.sex,
            admissionType: form.admissionType,
            wardBed: pickedBedForPrint ? `${pickedBedForPrint.wardName ? pickedBedForPrint.wardName + ' · ' : ''}${pickedBedForPrint.bedCode}` : undefined,
            admittingDoctorName: doctor?.fullName,
            provisionalDiagnosis: form.diagnosis || form.admissionReason,
            payerType: form.payerType,
            depositExpected: form.depositExpected ? parseFloat(form.depositExpected) : undefined,
            attendantName: form.emergencyContactName || undefined,
            attendantPhone: form.emergencyContactPhone || undefined,
        }, settings);
        if (mode === 'download') downloadHtmlAsPdf(html, `admission-confirmation-${success.admissionNo}.pdf`);
        else openPrintHtml(html);
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
                        {success.advanceReceiptNo && (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 font-semibold">
                                Advance collected · Receipt {success.advanceReceiptNo}
                            </div>
                        )}
                        {success.advancePendingApproval && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 font-semibold">
                                Advance submitted for Admin/AdminDoctor approval (would leave a credit balance).
                            </div>
                        )}
                        <div className="mt-5 flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9" onClick={() => printConfirmation('print')}><Printer className="h-3.5 w-3.5 mr-1.5" /> Print confirmation</Button>
                            <Button variant="outline" size="sm" className="h-9" onClick={() => printConfirmation('download')}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
                        </div>
                        <div className="mt-5 flex items-center gap-3">
                            <Button variant="outline" className="h-10" onClick={reset}><RotateCcw className="h-4 w-4 mr-1.5" /> Admit another</Button>
                            <Button className="h-10 bg-brand-600 hover:bg-brand-700" onClick={finishToWorkspace}>Done <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Restore-draft banner — local-only autosave, never auto-restores silently
                            (a stale draft could belong to a different patient than intended now). */}
                        {pendingDraft && (
                            <div className="mx-5 sm:mx-6 mt-3 shrink-0 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 flex items-center justify-between gap-3">
                                <p className="text-xs text-brand-800">
                                    <span className="font-semibold">Unsaved admission draft found</span> from {new Date(pendingDraft.savedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clearDraft}>Discard</Button>
                                    <Button size="sm" className="h-7 text-[11px] bg-brand-600 hover:bg-brand-700" onClick={restoreDraft}>Restore</Button>
                                </div>
                            </div>
                        )}
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
                                                className={cn('flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-all shrink-0',
                                                    isCurrent ? 'bg-brand-600 text-white shadow' : isVisited ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400',
                                                    canJump && !isCurrent && 'cursor-pointer hover:bg-brand-100')}>
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold">
                                                    <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[10px]',
                                                        isCurrent ? 'bg-white/20' : isVisited ? 'bg-brand-200' : 'bg-slate-200')}>{i + 1}</span>
                                                    <span className="hidden sm:inline">{s.label}</span>
                                                </span>
                                                <span className={cn('hidden sm:inline text-[8px] font-bold uppercase tracking-wider',
                                                    isCurrent ? 'text-white/70' : s.required ? 'text-rose-500' : 'text-slate-400')}>
                                                    {s.required ? 'Required' : 'Optional'}
                                                </span>
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
                                                <motion.button key={t.value} type="button" onClick={() => set('admissionType', t.value)}
                                                    whileTap={{ scale: 0.96 }}
                                                    className={cn('rounded-xl border-2 py-2.5 px-1 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1',
                                                        active ? cn(t.tone, 'ring-2') : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                                    <Icon className="h-4 w-4" />{t.label}
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    <AnimatePresence mode="wait">
                                        <motion.p key={form.admissionType}
                                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                                            className="mt-3 text-[11px] text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-2.5">
                                            {ADMISSION_TYPES.find(t => t.value === form.admissionType)?.description}
                                        </motion.p>
                                    </AnimatePresence>

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
                            {/* ── Search existing patient — same generic name/UHID/mobile search as
                                 the Appointment board, so a known patient never needs re-typing ── */}
                            {!selectedPatientId && (
                                <SectionCard icon={<Search className="h-4 w-4" />} title="Search existing patient" subtitle="By name, UHID, or mobile — or skip and enter new details below" tone="sky" allowOverflow>
                                    <div className="relative" ref={patientSearchContainerRef}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                value={patientSearchTerm}
                                                onChange={e => setPatientSearchTerm(e.target.value)}
                                                onFocus={() => { if (patientSearchResults.length > 0) setShowPatientSearchResults(true); }}
                                                onBlur={() => setTimeout(() => setShowPatientSearchResults(false), 200)}
                                                placeholder="Search by name, UHID, or mobile number"
                                                autoComplete="off"
                                                className={cn(INPUT_CLS, 'pl-9 pr-8')}
                                            />
                                            {patientSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
                                        </div>
                                        {showPatientSearchResults && patientSearchResults.length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-white shadow-xl">
                                                {patientSearchResults.map(p => (
                                                    <button key={p.patientId} type="button" onClick={() => selectPatient(p.patientId)}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 border-b last:border-b-0 transition-colors">
                                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                            {p.fullName || '—'}
                                                            <Badge variant="outline" className="text-[10px] font-mono">{p.patientId}</Badge>
                                                        </div>
                                                        <div className="text-slate-500 text-xs mt-0.5 flex gap-2">
                                                            {p.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.mobile}</span>}
                                                            {p.age ? <span>· {p.age}{p.sex ?? ''}</span> : null}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {showPatientSearchResults && !patientSearching && patientSearchResults.length === 0 && patientSearchTerm.trim().length >= 2 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border bg-white shadow-xl px-3 py-2.5 text-xs text-slate-400">
                                                No matching patient found — enter details below to register a new one.
                                            </div>
                                        )}
                                    </div>
                                </SectionCard>
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
                                                    {history.map(h => {
                                                        const isActive = h.statusCode === 'ADMITTED' || h.statusCode === 'PRE_ADMIT';
                                                        const isAdverse = h.statusCode === 'LAMA' || h.statusCode === 'DAMA' || h.statusCode === 'EXPIRED';
                                                        return (
                                                            <div key={h.admissionId} className={cn('rounded-xl border-l-4 bg-white shadow-sm p-3',
                                                                isActive ? 'border-l-emerald-400 border border-emerald-100' : isAdverse ? 'border-l-rose-400 border border-rose-100' : 'border-l-slate-300 border border-slate-200')}>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="font-mono text-sm font-black text-brand-700">{h.admissionNo}</span>
                                                                    <Badge variant="outline" className={cn('text-[10px] font-bold', isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isAdverse ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                                                                        {h.statusCode}{h.admissionType ? ` · ${TYPE_LABEL[h.admissionType] ?? h.admissionType}` : ''}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-[11px] font-semibold text-slate-600 mt-1">
                                                                    {new Date(h.admittedAt).toLocaleDateString('en-IN')}
                                                                    {h.dischargedAt ? ` → ${new Date(h.dischargedAt).toLocaleDateString('en-IN')}` : ' → (current)'}
                                                                </p>
                                                                {(h.diagnosis || h.admissionReason) && <p className="text-xs text-slate-700 mt-1">{h.diagnosis || h.admissionReason}</p>}
                                                                {h.dischargeNotesPreview && <p className="text-[11px] text-slate-500 mt-1 italic">“{h.dischargeNotesPreview}”</p>}
                                                            </div>
                                                        );
                                                    })}
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
                                                <div className="flex bg-slate-100 p-1 h-10 rounded-lg border border-slate-200 w-full">
                                                    {SEX_OPTIONS.map(o => (
                                                        <button key={o.value} type="button" onClick={() => set('sex', o.value)}
                                                            className={cn('flex-1 text-[11px] font-bold rounded-md transition-all duration-200',
                                                                form.sex === o.value ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white')}>
                                                            {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </Field>
                                            <Field label="Blood group">
                                                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className={SELECT_CLS}>
                                                    <option value="">Unknown</option>
                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Age" required={isEmergencyQuickAdmit}>
                                                <div className="flex items-center h-10 rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-brand-500/25 focus-within:border-brand-400 transition">
                                                    <Input type="number" min={0} max={form.ageUnit === 'Y' ? 130 : form.ageUnit === 'M' ? 11 : 30}
                                                        value={form.ageYears} onChange={e => set('ageYears', e.target.value)}
                                                        className="flex-1 min-w-0 h-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none rounded-l-lg font-mono"
                                                        placeholder={form.ageUnit === 'Y' ? 'e.g. 42' : 'approximate'} />
                                                    <div className="flex bg-slate-100 p-0.5 h-full shrink-0 border-l border-slate-200 rounded-r-lg">
                                                        {AGE_UNITS.map(u => (
                                                            <button key={u.value} type="button" onClick={() => set('ageUnit', u.value)}
                                                                className={cn('px-2.5 text-[11px] font-bold rounded-md transition-all duration-200',
                                                                    form.ageUnit === u.value ? 'bg-brand-600 text-white shadow-md ring-1 ring-brand-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white')}>
                                                                {u.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
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
                                                <Input value={form.mobile} onChange={e => setPhone('mobile', e.target.value)} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} placeholder="10-digit mobile" />
                                            </Field>
                                            <Field label="Attendant / next-of-kin phone">
                                                <Input value={form.emergencyContactPhone} onChange={e => setPhone('emergencyContactPhone', e.target.value)} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} placeholder="Often more reachable than the patient's own" />
                                            </Field>
                                            <Field label="Attendant / next-of-kin name">
                                                <Input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} className={INPUT_CLS} placeholder="Name" />
                                            </Field>
                                            <Field label="Relation to patient">
                                                <Input value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} className={INPUT_CLS} placeholder="e.g. Son" />
                                            </Field>
                                            <Field label="Alternate mobile">
                                                <Input value={form.alternateMobile} onChange={e => setPhone('alternateMobile', e.target.value)} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
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

                            {/* ══ Step 3: Clinical & Referral ═════════════════════ */}
                            {step === 'clinical' && (
                                <>
                                    <SectionCard icon={<Stethoscope className="h-4 w-4" />} title="Clinical & referral details" subtitle="Consultant, diagnosis & referral" tone="amber" allowOverflow>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Admitting consultant">
                                                <select value={form.primaryDoctorId} onChange={e => set('primaryDoctorId', e.target.value)} className={SELECT_CLS}>
                                                    <option value="">— Not specified —</option>
                                                    {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.fullName || 'Unnamed'}{d.departmentName ? ` · ${d.departmentName}` : ''}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="OT Plan" className="sm:col-span-2">
                                                <select
                                                    value={form.otPlanId}
                                                    onChange={e => {
                                                        const plan = otPlans.find(p => p.otPlanId === e.target.value);
                                                        set('otPlanId', e.target.value);
                                                        if (plan && !form.entitledRoomCategory && plan.defaultRoomCategory) {
                                                            set('entitledRoomCategory', plan.defaultRoomCategory);
                                                        }
                                                    }}
                                                    className={SELECT_CLS}
                                                >
                                                    <option value="">— No plan — free text below —</option>
                                                    {otPlans.map(p => (
                                                        <option key={p.otPlanId} value={p.otPlanId}>
                                                            {p.planName}{p.departmentName ? ` (${p.departmentName})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {(() => {
                                                    const selectedPlan = otPlans.find(p => p.otPlanId === form.otPlanId);
                                                    return selectedPlan?.suggestedIcuLevel ? (
                                                        <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> ICU likely — {selectedPlan.suggestedIcuLevel.replace('_', ' ')}
                                                        </p>
                                                    ) : null;
                                                })()}
                                                {!form.otPlanId && (
                                                    <Input
                                                        value={form.otPlanCustomText}
                                                        onChange={e => set('otPlanCustomText', e.target.value)}
                                                        className={cn(INPUT_CLS, 'mt-2')}
                                                        placeholder="Not listed? Type the plan/procedure name here"
                                                    />
                                                )}
                                            </Field>
                                            <Field label="Package Type" className="sm:col-span-2">
                                                <PackageTypePicker
                                                    hospitalId={hospitalId}
                                                    value={form.packageTypeId}
                                                    onChange={v => set('packageTypeId', v)}
                                                    label={null}
                                                />
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
                                                <select value={form.referralSource} onChange={e => { set('referralSource', e.target.value as FormState['referralSource']); clearReferrerSelection(); }} className={SELECT_CLS}>
                                                    <option value="">— Not specified —</option>
                                                    <option value="SELF">Self</option>
                                                    <option value="DOCTOR">Doctor</option>
                                                    <option value="HOSPITAL">Hospital</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                            </Field>

                                            {(form.referralSource === 'DOCTOR' || form.referralSource === 'OTHER') && (
                                                <Field label="Referrer" className="sm:col-span-2">
                                                    <ReferrerPicker
                                                        hospitalId={hospitalId}
                                                        referrerId={form.referredByReferrerId}
                                                        referrerName={form.referralName}
                                                        referrerType={form.referrerType}
                                                        lockedType={form.referralSource === 'DOCTOR' ? 'DOCTOR' : 'REFERRER'}
                                                        onSelect={selectReferrer}
                                                        onClear={clearReferrerSelection}
                                                    />
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
                                                        <Input value={form.referringFacilityContact} onChange={e => setPhone('referringFacilityContact', e.target.value)} inputMode="numeric" maxLength={10} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                                    </Field>
                                                </div>
                                            </div>
                                        )}
                                    </SectionCard>
                                </>
                            )}

                            {/* ══ Step 4: Advance & Bed (optional) ════════════════ */}
                            {step === 'advanceBed' && (
                                <>
                                    <p className="text-[11px] text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
                                        This step is optional — you can admit now and add bed/payment details later from the dashboard.
                                    </p>

                                    {/* ── Bed selection ──────────────────────────────── */}
                                    <SectionCard icon={<BedDouble className="h-4 w-4" />} title="Bed selection" subtitle="Optional — assign now or later from the bed board" tone="sky">
                                        <div className="relative">
                                            <BedDouble className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <select value={form.bedId} onChange={e => set('bedId', e.target.value)}
                                                className="h-12 w-full text-sm font-semibold border-2 border-slate-200 rounded-xl pl-10 pr-4 bg-white outline-none transition focus:ring-4 focus:ring-brand-500/15 focus:border-brand-400 hover:border-slate-300 appearance-none">
                                                <option value="">— Assign later —</option>
                                                {Object.entries(bedsByWard).map(([ward, beds]) => (
                                                    <optgroup key={ward} label={ward}>
                                                        {beds.map(b => (
                                                            <option key={b.bedId} value={b.bedId}>{b.bedCode} · ₹{b.effectiveDailyRate.toLocaleString('en-IN')}/day</option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {pickedBed && (
                                                <motion.div key={pickedBed.bedId} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                                                    className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                                                            <BedDouble className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{pickedBed.bedCode}</p>
                                                            <p className="text-[11px] text-slate-500">{pickedBed.wardName || pickedBed.wardCode}{pickedBed.wardType ? ` · ${pickedBed.wardType}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-bold text-brand-700 font-mono">₹{pickedBed.effectiveDailyRate.toLocaleString('en-IN')}/day</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {availableBeds.length === 0 && <p className="text-[11px] text-slate-400 mt-2">No free beds right now — can be assigned later from the bed board.</p>}
                                    </SectionCard>

                                    {/* ── Payment ─────────────────────────────────────── */}
                                    <SectionCard icon={<Wallet className="h-4 w-4" />} title="Payment" subtitle="Billing branch & deposit" tone="rose">
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
                                        </div>

                                        {!!form.depositExpected && parseFloat(form.depositExpected) > 0 && !(form.admissionType === 'ELECTIVE' && form.isPreRegistration) && (
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-slate-700">Collect this deposit now?</p>
                                                        <p className="text-[10px] text-slate-400">Records it as a real advance payment against this admission.</p>
                                                    </div>
                                                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg shrink-0">
                                                        <button type="button" onClick={() => set('collectAdvanceNow', false)}
                                                            className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all', !form.collectAdvanceNow ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                                                            Later
                                                        </button>
                                                        <button type="button" onClick={() => set('collectAdvanceNow', true)}
                                                            className={cn('h-8 px-3 rounded-md text-xs font-bold transition-all', form.collectAdvanceNow ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500')}>
                                                            Now
                                                        </button>
                                                    </div>
                                                </div>
                                                {form.collectAdvanceNow && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                                        <Field label="Payment mode">
                                                            <select value={form.advancePaymentMode} onChange={e => set('advancePaymentMode', e.target.value as PaymentMode)} className={SELECT_CLS}>
                                                                <option value="CASH">Cash</option>
                                                                <option value="UPI">UPI</option>
                                                                <option value="CARD">Card</option>
                                                                <option value="BANK">Bank Transfer</option>
                                                                <option value="INSURANCE">Insurance</option>
                                                            </select>
                                                        </Field>
                                                        {form.advancePaymentMode !== 'CASH' && (
                                                            <Field label="Transaction ID">
                                                                <Input value={form.advanceTransactionId} onChange={e => set('advanceTransactionId', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                                            </Field>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {!!form.depositExpected && parseFloat(form.depositExpected) > 0 && form.admissionType === 'ELECTIVE' && form.isPreRegistration && (
                                            <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                                                Advance collection isn't available for a pre-registration — record it once the patient arrives.
                                            </p>
                                        )}

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

                                        <AnimatePresence>
                                            {showsEntitlementWarning && (
                                                <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.2 }}
                                                    className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 overflow-hidden">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                                    <p className="text-[11px] text-amber-800">
                                                        Patient is entitled to <span className="font-semibold">{form.entitledRoomCategory.replace('_', ' ')}</span> — the picked bed ({pickedBed?.wardType}) is above that. The differential will show as non-payable at discharge unless the patient/family accepts the upgrade.
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </SectionCard>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-4 bg-white border-t border-slate-200">
                            {/* Helper hint — its own row so it never fights the action buttons for width */}
                            {((step === 'personal' && !canSubmit) || (!!selectedPatientId && step !== 'admissionType')) && (
                                <div className="mb-2">
                                    {step === 'personal' && !canSubmit && (
                                        <p className="text-[11px] text-slate-400 truncate">
                                            {isEmergencyQuickAdmit ? 'Sex and approximate age are required to continue.' : 'Name and mobile are required to continue.'}
                                        </p>
                                    )}
                                    {!!selectedPatientId && <p className="text-[11px] text-slate-400 truncate">Re-admitting <span className="font-mono">{selectedPatientId}</span></p>}
                                </div>
                            )}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Button variant="outline" className="h-11 sm:h-10 px-3 sm:px-4 shrink-0" onClick={step === 'admissionType' ? closeAll : () => setStep(WIZARD_STEPS[WIZARD_STEPS.findIndex(s => s.key === step) - 1].key)}>
                                    {step === 'admissionType' ? <><X className="h-4 w-4 mr-1" /> Cancel</> : 'Back'}
                                </Button>
                                {/* Desktop: push actions to the right; mobile: buttons flex-fill instead. */}
                                <div className="hidden sm:block sm:flex-1" />
                                {step === 'admissionType' && (
                                    <Button onClick={() => setStep('personal')} className="h-11 sm:h-10 flex-1 sm:flex-none px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                        Next <ArrowRight className="h-4 w-4 ml-1.5" />
                                    </Button>
                                )}
                                {step === 'personal' && (
                                    <>
                                        <Button variant="outline" disabled={!canSubmit || submitting} onClick={submit} className="h-11 sm:h-10 flex-1 sm:flex-none px-3 sm:px-4 min-w-0">
                                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} <span className="truncate">Skip &amp; admit</span>
                                        </Button>
                                        <Button onClick={() => setStep('clinical')} disabled={!canSubmit} className="h-11 sm:h-10 flex-1 sm:flex-none px-4 sm:px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                            Next <ArrowRight className="h-4 w-4 ml-1.5" />
                                        </Button>
                                    </>
                                )}
                                {step === 'clinical' && (
                                    <>
                                        <Button variant="outline" disabled={!canSubmit || submitting} onClick={submit} className="h-11 sm:h-10 flex-1 sm:flex-none px-3 sm:px-4 min-w-0">
                                            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} <span className="truncate">Skip &amp; admit</span>
                                        </Button>
                                        <Button onClick={() => setStep('advanceBed')} className="h-11 sm:h-10 flex-1 sm:flex-none px-4 sm:px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                            Next <ArrowRight className="h-4 w-4 ml-1.5" />
                                        </Button>
                                    </>
                                )}
                                {step === 'advanceBed' && (
                                    <Button onClick={submit} disabled={!canSubmit || submitting} className="h-11 sm:h-10 flex-1 sm:flex-none px-4 sm:px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                        {form.admissionType === 'ELECTIVE' && form.isPreRegistration ? 'Pre-register patient' : 'Admit patient'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};
