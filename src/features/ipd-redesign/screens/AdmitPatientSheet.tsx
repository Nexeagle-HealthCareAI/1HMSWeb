import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    UserPlus, Search, Check, X, Siren, CalendarClock, Loader2, CreditCard,
    Phone, MapPin, Stethoscope, RotateCcw, History, ShieldCheck, ArrowRight,
    User, CalendarCheck, Sun, LogOut, AlertTriangle, Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    admissionApi, type AdmissionTypeCode, type AdmitPatientPayload,
    type PatientSearchResult, type AdmissionPatientDetail, type AdmissionHistoryItem,
    type DuplicateMatch, type DuplicateConfidence,
} from '../services/admissionApi';

const DUP_TONE: Record<DuplicateConfidence, { chip: string; label: string }> = {
    NEAR_CERTAIN: { chip: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Near-certain' },
    PROBABLE: { chip: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Probable' },
    POSSIBLE: { chip: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Possible' },
};

type Mode = 'returning' | 'new';

const ADMISSION_TYPES: { value: AdmissionTypeCode; label: string; icon: React.ElementType; tone: string }[] = [
    { value: 'EMERGENCY', label: 'Emergency', icon: Siren, tone: 'border-rose-400 bg-rose-50 text-rose-700 ring-rose-200' },
    { value: 'ELECTIVE', label: 'Elective', icon: CalendarCheck, tone: 'border-brand-400 bg-brand-50 text-brand-700 ring-brand-200' },
    { value: 'DAYCARE', label: 'Day Care', icon: Sun, tone: 'border-sky-400 bg-sky-50 text-sky-700 ring-sky-200' },
    { value: 'LAMA', label: 'Left against advice', icon: LogOut, tone: 'border-amber-400 bg-amber-50 text-amber-700 ring-amber-200' },
];

const TYPE_LABEL: Record<string, string> = {
    EMERGENCY: 'Emergency', ELECTIVE: 'Elective', DAYCARE: 'Day Care', LAMA: 'Left against advice',
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
    admissionType: AdmissionTypeCode; admissionReason: string; diagnosis: string; expectedDischargeAt: string;
    referralSource: '' | 'SELF' | 'DOCTOR' | 'HOSPITAL'; referralName: string;
}

const EMPTY_FORM: FormState = {
    fullName: '', sex: '', ageYears: '', dateOfBirth: '',
    bloodGroup: '', religion: '', nationality: 'India',
    mobile: '', alternateMobile: '', email: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactPhone: '',
    flatHouse: '', street: '', city: '', district: '', state: '', pincode: '',
    aadhaarNumber: '', panNumber: '', abhaId: '',
    admissionType: 'EMERGENCY', admissionReason: '', diagnosis: '', expectedDischargeAt: '',
    referralSource: '', referralName: '',
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

    const [mode, setMode] = useState<Mode>('returning');
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

    // returning-patient search
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<PatientSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patientDetail, setPatientDetail] = useState<AdmissionPatientDetail | null>(null);
    const [history, setHistory] = useState<AdmissionHistoryItem[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<{ admissionNo?: string; patientId?: string; isNewPatient?: boolean; admissionId?: string } | null>(null);

    // duplicate detection (new-patient mode)
    const [dupMatches, setDupMatches] = useState<DuplicateMatch[]>([]);
    const [dupChecking, setDupChecking] = useState(false);
    const [dupDismissed, setDupDismissed] = useState(false);
    const [confirmNotDup, setConfirmNotDup] = useState(false);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced fast search
    useEffect(() => {
        if (mode !== 'returning') return;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        const q = searchText.trim();
        if (q.length < 2) { setResults([]); setSearching(false); return; }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const items = await admissionApi.searchPatients(q);
                setResults(items);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [searchText, mode]);

    // Debounced duplicate probe while entering a brand-new patient.
    useEffect(() => {
        if (mode !== 'new') { setDupMatches([]); setDupChecking(false); return; }
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
    }, [mode, form.fullName, form.mobile, form.dateOfBirth, form.aadhaarNumber]);

    const useExistingPatient = async (patientId: string) => {
        setDupMatches([]); setDupDismissed(false); setConfirmNotDup(false);
        setMode('returning');
        setSearchText(''); setResults([]);
        await selectPatient(patientId);
    };

    const selectPatient = async (patientId: string) => {
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
        setMode('returning'); setForm(EMPTY_FORM);
        setSearchText(''); setResults([]); setSelectedPatientId(null);
        setPatientDetail(null); setHistory([]); setSuccess(null);
        setDupMatches([]); setDupDismissed(false); setConfirmNotDup(false);
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        clearSelection();
        setSearchText(''); setResults([]);
        setDupMatches([]); setDupDismissed(false); setConfirmNotDup(false);
    };

    const isReturning = mode === 'returning' && !!selectedPatientId;
    const showForm = mode === 'new' || isReturning;
    const hasNearCertainDup = mode === 'new' && dupMatches.some(m => m.confidence === 'NEAR_CERTAIN');
    const canSubmit = useMemo(() => {
        if (mode === 'returning') return !!selectedPatientId;
        if (!form.fullName.trim() || !form.mobile.trim()) return false;
        // A near-certain duplicate must be explicitly acknowledged before a second UHID is created.
        if (hasNearCertainDup && !confirmNotDup) return false;
        return true;
    }, [mode, selectedPatientId, form.fullName, form.mobile, hasNearCertainDup, confirmNotDup]);

    const submit = async () => {
        if (!canSubmit || submitting) {
            if (mode === 'new') toast({ title: 'Incomplete', description: 'Patient name and mobile are required.', variant: 'destructive' });
            else toast({ title: 'Pick a patient', description: 'Search and select the returning patient first.', variant: 'destructive' });
            return;
        }
        const t = (s: string) => { const v = s.trim(); return v.length ? v : undefined; };
        const payload: AdmitPatientPayload = {
            patientId: isReturning ? selectedPatientId! : undefined,
            fullName: t(form.fullName), mobile: t(form.mobile),
            ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
            dateOfBirth: t(form.dateOfBirth), sex: t(form.sex),
            bloodGroup: t(form.bloodGroup), religion: t(form.religion), nationality: t(form.nationality),
            flatHouse: t(form.flatHouse), street: t(form.street), city: t(form.city),
            district: t(form.district), state: t(form.state), pincode: t(form.pincode), country: 'India',
            alternateMobile: t(form.alternateMobile), email: t(form.email),
            emergencyContactName: t(form.emergencyContactName), emergencyContactRelation: t(form.emergencyContactRelation),
            emergencyContactPhone: t(form.emergencyContactPhone),
            // Aadhaar is only captured for a new patient; for returning ones it is left untouched.
            aadhaarNumber: mode === 'new' ? t(form.aadhaarNumber) : undefined,
            panNumber: t(form.panNumber), abhaId: t(form.abhaId),
            admissionType: form.admissionType,
            admissionReason: t(form.admissionReason), diagnosis: t(form.diagnosis),
            expectedDischargeAt: t(form.expectedDischargeAt),
            referralSource: form.referralSource || undefined,
            referralName: t(form.referralName),
        };
        setSubmitting(true);
        try {
            const res = await admissionApi.admit(payload);
            if (res.success) {
                setSuccess({ admissionNo: res.admissionNo, patientId: res.patientId, isNewPatient: res.isNewPatient, admissionId: res.admissionId });
                toast({ title: 'Patient admitted', description: `${res.admissionNo} · Patient ID ${res.patientId}` });
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
                        <h3 className="text-lg font-bold text-slate-900">Admission created</h3>
                        <p className="text-sm text-slate-500 mt-1">{success.isNewPatient ? 'New patient registered and admitted.' : 'Returning patient admitted.'}</p>
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
                        {/* Mode toggle */}
                        <div className="px-5 sm:px-6 pt-4 pb-1 shrink-0">
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <button type="button" onClick={() => switchMode('returning')}
                                    className={cn('flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 transition-all',
                                        mode === 'returning' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50')}>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold"><Search className="h-4 w-4" /> Returning</span>
                                    <span className={cn('text-[10px]', mode === 'returning' ? 'text-brand-100' : 'text-slate-400')}>Search &amp; re-admit</span>
                                </button>
                                <button type="button" onClick={() => switchMode('new')}
                                    className={cn('flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 transition-all',
                                        mode === 'new' ? 'bg-brand-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50')}>
                                    <span className="flex items-center gap-1.5 text-sm font-semibold"><UserPlus className="h-4 w-4" /> New patient</span>
                                    <span className={cn('text-[10px]', mode === 'new' ? 'text-brand-100' : 'text-slate-400')}>Register &amp; admit</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                            {/* ── Duplicate warning (new-patient mode) ──────────── */}
                            {mode === 'new' && dupMatches.length > 0 && (!dupDismissed || hasNearCertainDup) && (
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
                                                <Button size="sm" onClick={() => useExistingPatient(m.patientId)} className="h-8 text-xs bg-brand-600 hover:bg-brand-700 shrink-0">
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
                                                <Button size="sm" variant="ghost" onClick={() => setDupDismissed(true)} className="h-7 text-[11px] text-slate-500">Continue as new patient</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {mode === 'new' && dupChecking && dupMatches.length === 0 && form.fullName.trim().length >= 3 && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking for existing patients…</p>
                            )}

                            {/* ── Returning: search ─────────────────────────────── */}
                            {mode === 'returning' && !selectedPatientId && (
                                <SectionCard icon={<Search className="h-4 w-4" />} title="Find a patient" subtitle="Search by patient ID, name, mobile, Aadhaar or ABHA" tone="indigo">
                                    <div className="relative">
                                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                                        <Input value={searchText} onChange={e => setSearchText(e.target.value)} autoFocus
                                            placeholder="Start typing to search…" className="h-10 pl-9 pr-9 rounded-lg" />
                                        {searching && <Loader2 className="h-4 w-4 text-brand-400 animate-spin absolute right-3 top-3" />}
                                    </div>
                                    <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                        {results.map(p => (
                                            <button key={p.patientId} type="button" onClick={() => selectPatient(p.patientId)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-brand-50/60 flex items-center gap-3 group">
                                                <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {initials(p.fullName)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-slate-900 truncate">{p.fullName || '—'}</p>
                                                    <p className="text-[11px] text-slate-500 font-mono truncate">
                                                        {p.patientId}{p.age != null ? ` · ${p.age}${p.sex ?? ''}` : p.sex ? ` · ${p.sex}` : ''}{p.mobile ? ` · ${p.mobile}` : ''}{p.city ? ` · ${p.city}` : ''}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                                            </button>
                                        ))}
                                        {!searching && searchText.trim().length >= 2 && results.length === 0 && (
                                            <p className="px-3 py-8 text-center text-xs text-slate-400">No patient matched. Try a different term, or switch to <button type="button" onClick={() => switchMode('new')} className="text-brand-600 font-semibold underline">New patient</button>.</p>
                                        )}
                                        {searchText.trim().length < 2 && (
                                            <p className="px-3 py-8 text-center text-xs text-slate-400">Type at least 2 characters to search.</p>
                                        )}
                                    </div>
                                </SectionCard>
                            )}

                            {/* ── Selected returning patient: identity card ─────── */}
                            {isReturning && (
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
                                                <Badge variant="outline" className="text-[10px] bg-white text-brand-700 border-brand-200">Returning patient</Badge>
                                                {patientDetail?.aadhaarMasked && <Badge variant="outline" className="text-[10px] bg-white text-slate-500 gap-1"><ShieldCheck className="h-3 w-3" /> {patientDetail.aadhaarMasked}</Badge>}
                                                {patientDetail?.abhaId && <Badge variant="outline" className="text-[10px] bg-white text-slate-500 gap-1"><CreditCard className="h-3 w-3" /> ABHA</Badge>}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8 text-xs shrink-0 text-slate-500 hover:text-slate-900"><X className="h-3.5 w-3.5 mr-1" /> Change</Button>
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

                            {/* ── Demographics (new patient, or editable for returning) ── */}
                            {showForm && (
                                <>
                                    <SectionCard icon={<User className="h-4 w-4" />} title="Identity"
                                        subtitle={mode === 'new' ? 'Name is required' : 'Pre-filled — edit if needed'} tone="indigo">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Full name" required={mode === 'new'} className="sm:col-span-2">
                                                <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} className={INPUT_CLS} placeholder="Patient full name" />
                                            </Field>
                                            <Field label="Sex">
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
                                            <Field label="Age (years)">
                                                <Input type="number" min={0} max={130} value={form.ageYears} onChange={e => set('ageYears', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="e.g. 42" />
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
                                        subtitle={mode === 'new' ? 'Mobile is required' : undefined} tone="sky">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Field label="Primary mobile" required={mode === 'new'}>
                                                <Input value={form.mobile} onChange={e => set('mobile', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="10-digit mobile" />
                                            </Field>
                                            <Field label="Alternate mobile">
                                                <Input value={form.alternateMobile} onChange={e => set('alternateMobile', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Optional" />
                                            </Field>
                                            <Field label="Email" className="sm:col-span-2">
                                                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT_CLS} placeholder="Optional" />
                                            </Field>
                                            <Field label="Emergency contact">
                                                <Input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} className={INPUT_CLS} placeholder="Name" />
                                            </Field>
                                            <Field label="Relation">
                                                <Input value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} className={INPUT_CLS} placeholder="e.g. Son" />
                                            </Field>
                                            <Field label="Emergency phone" className="sm:col-span-2">
                                                <Input value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} className={cn(INPUT_CLS, 'font-mono')} placeholder="Phone" />
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
                                            {mode === 'new' ? (
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

                                    {/* ── Admission details ─────────────────────────── */}
                                    <SectionCard icon={<Stethoscope className="h-4 w-4" />} title="Admission details" subtitle="Type, diagnosis & referral" tone="amber">
                                        <Label className="text-[11px] font-semibold text-slate-600">Admission type</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 mb-4">
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                                <Field label="Referrer name">
                                                    <Input value={form.referralName} onChange={e => set('referralName', e.target.value)} className={INPUT_CLS} placeholder="Doctor / hospital name" />
                                                </Field>
                                            )}
                                        </div>
                                    </SectionCard>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 px-5 sm:px-6 pt-3 pb-4 bg-white border-t border-slate-200 flex items-center gap-3">
                            <Button variant="outline" className="h-10 px-4" onClick={closeAll}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                            <div className="flex-1 min-w-0">
                                {showForm && !canSubmit && mode === 'new' && (
                                    <p className="text-[11px] text-slate-400 truncate">Name and mobile are required to admit.</p>
                                )}
                                {isReturning && <p className="text-[11px] text-slate-400 truncate">Re-admitting <span className="font-mono">{selectedPatientId}</span></p>}
                            </div>
                            <Button onClick={submit} disabled={!canSubmit || submitting} className="h-10 px-6 bg-brand-600 hover:bg-brand-700 font-semibold shadow-sm">
                                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />} Admit patient
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};
