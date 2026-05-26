import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    UserPlus, BedDouble, IndianRupee, Wallet, CreditCard, Smartphone, Building2,
    Banknote, Stethoscope, CheckCircle2, ChevronRight, ChevronLeft, User,
    Search, X, Loader2, AlertCircle,
} from 'lucide-react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Ward, NewAdmissionFormData, AdmissionPriority } from '../types';
import { ipdService } from '../services/ipdService';
import { patientService } from '@/features/billing/services/patientService';
import { appointmentApi, Department, ApiDoctor } from '@/features/appointment/services/appointmentApi';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

// ─── Configs ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<AdmissionPriority, { label: string; className: string }> = {
    ROUTINE: { label: 'Routine', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    URGENT: { label: 'Urgent', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    EMERGENCY: { label: 'Emergency', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const BED_CELL_STYLES: Record<string, string> = {
    AVAILABLE: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 cursor-pointer',
    OCCUPIED: 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-70',
    CLEANING: 'border-amber-200 bg-amber-50 text-amber-600 cursor-not-allowed opacity-70',
    MAINTENANCE: 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60',
    RESERVED: 'border-purple-200 bg-purple-50 text-purple-500 cursor-not-allowed opacity-70',
};

const BED_STATUS_LABEL: Record<string, string> = {
    AVAILABLE: 'Available',
    OCCUPIED: 'Occupied',
    CLEANING: 'Cleaning',
    MAINTENANCE: 'Maintenance',
    RESERVED: 'Reserved',
};

interface NewAdmissionSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    wards: Ward[];
    onAdmissionCreated: () => void;
}

const DEFAULT_FORM: NewAdmissionFormData = {
    patientId: '',
    patientName: '',
    patientMobile: '',
    age: 0,
    sex: 'M',
    wardId: '',
    bedId: '',
    departmentId: '',
    attendingDoctor: '',
    attendingDoctorId: '',
    diagnosis: '',
    chiefComplaint: '',
    priority: 'ROUTINE',
    expectedDischargeDate: '',
    referredBy: '',
    notes: '',
    estimatedStayDays: 3,
    advanceAmount: 0,
    paymentMode: '',
    transactionRef: '',
    insuranceName: '',
    insurancePolicyNo: '',
};

const STEPS = [
    { id: 1, label: 'Patient',  shortLabel: 'Patient',  icon: User },
    { id: 2, label: 'Bed',      shortLabel: 'Bed',       icon: BedDouble },
    { id: 3, label: 'Clinical', shortLabel: 'Clinical',  icon: Stethoscope },
    { id: 4, label: 'Billing',  shortLabel: 'Billing',   icon: IndianRupee },
] as const;

// ─── Patient Search Picker ────────────────────────────────────────────────────

interface PatientHit {
    patientId: string;
    name: string;
    mobile: string;
    age: number;
    sex: 'M' | 'F';
}

const PatientSearchPicker: React.FC<{
    selected: { patientId: string; name: string; mobile: string; age: number; sex: 'M' | 'F' | 'O' } | null;
    onSelect: (hit: PatientHit) => void;
    onClear: () => void;
}> = ({ selected, onSelect, onClear }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientHit[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef<number | null>(null);

    const runSearch = useCallback(async (q: string) => {
        if (!q || q.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }
        setIsSearching(true);
        try {
            const trimmed = q.trim();
            const looksLikePatientId = /^[A-Z]{2,}\d/i.test(trimmed);
            const looksLikeMobile = /^\d{6,}$/.test(trimmed);
            const by: 'patientId' | 'name' | 'contact' =
                looksLikePatientId ? 'patientId' : looksLikeMobile ? 'contact' : 'name';
            const hits = await patientService.searchPatients(trimmed, by);
            setResults(hits.map(h => ({
                patientId: h.patientId,
                name: h.name,
                mobile: h.mobile,
                age: h.age,
                sex: h.sex,
            })));
            setHasSearched(true);
        } catch {
            setResults([]);
            setHasSearched(true);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => runSearch(query), 350);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [query, runSearch]);

    if (selected && selected.patientId) {
        return (
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-emerald-900 truncate">{selected.name}</p>
                            <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-300 text-[10px] font-bold">
                                {selected.patientId}
                            </Badge>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">
                            {selected.age}y · {selected.sex === 'M' ? 'Male' : selected.sex === 'F' ? 'Female' : 'Other'} · {selected.mobile || 'no mobile'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-emerald-700 hover:bg-emerald-100"
                        onClick={onClear}
                    >
                        <X className="h-4 w-4 mr-1" /> Change
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    autoFocus
                    placeholder="Search by name, mobile, or patient ID..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="pl-9 h-10 text-sm"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                )}
            </div>

            {query.trim().length >= 2 && hasSearched && results.length === 0 && !isSearching && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                    <AlertCircle className="h-6 w-6 mx-auto text-slate-400" />
                    <p className="text-sm font-semibold text-slate-600">No patients found</p>
                    <p className="text-xs text-slate-400">
                        Patient must be registered before they can be admitted.
                    </p>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open('/patient/new', '_blank')}
                        className="mt-1"
                    >
                        Register New Patient
                    </Button>
                </div>
            )}

            {results.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                    {results.slice(0, 8).map(p => (
                        <button
                            key={p.patientId}
                            type="button"
                            onClick={() => onSelect(p)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left"
                        >
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                                        {p.patientId}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {p.age}y · {p.sex === 'M' ? 'Male' : 'Female'} · {p.mobile || 'no mobile'}
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {!hasSearched && query.trim().length < 2 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                    Type at least 2 characters to search registered patients.
                </div>
            )}
        </div>
    );
};

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export const NewAdmissionSheet: React.FC<NewAdmissionSheetProps> = ({
    open, onOpenChange, wards, onAdmissionCreated,
}) => {
    const { toast } = useToast();
    const hospitalId = useAuthStore.getState().getHospitalId();

    const [form, setForm] = useState<NewAdmissionFormData>(DEFAULT_FORM);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof NewAdmissionFormData, string>>>({});

    const [departments, setDepartments] = useState<Department[]>([]);
    const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);

    useEffect(() => {
        if (!open) {
            setForm(DEFAULT_FORM);
            setErrors({});
            setStep(1);
            setDoctors([]);
        }
    }, [open]);

    useEffect(() => {
        if (!open || step !== 3 || departments.length > 0 || !hospitalId) return;
        appointmentApi.getDepartments(hospitalId)
            .then(res => setDepartments(res.departments ?? []))
            .catch(() => setDepartments([]));
    }, [open, step, departments.length, hospitalId]);

    useEffect(() => {
        if (!form.departmentId || !hospitalId) {
            setDoctors([]);
            return;
        }
        setLoadingDoctors(true);
        appointmentApi.getDoctorsByDepartment(form.departmentId, hospitalId)
            .then(res => setDoctors(res.doctors ?? []))
            .catch(() => setDoctors([]))
            .finally(() => setLoadingDoctors(false));
    }, [form.departmentId, hospitalId]);

    useEffect(() => {
        if (form.expectedDischargeDate) {
            const days = Math.max(1, Math.ceil(
                (new Date(form.expectedDischargeDate).getTime() - Date.now()) / 86400000
            ));
            setForm(prev => ({ ...prev, estimatedStayDays: days }));
        }
    }, [form.expectedDischargeDate]);

    const set = <K extends keyof NewAdmissionFormData>(key: K, val: NewAdmissionFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: val }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validateStep = (s: number): boolean => {
        const e: Partial<Record<keyof NewAdmissionFormData, string>> = {};
        if (s === 1) {
            if (!form.patientId) e.patientId = 'Search and select a registered patient';
        }
        if (s === 2) {
            if (!form.wardId) e.wardId = 'Select a ward';
            if (!form.bedId) e.bedId = 'Select a bed';
        }
        if (s === 3) {
            if (!form.departmentId) e.departmentId = 'Select a department';
            if (!form.attendingDoctorId) e.attendingDoctorId = 'Select attending doctor';
            if (!form.chiefComplaint.trim()) e.chiefComplaint = 'Chief complaint is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => { if (validateStep(step)) setStep(s => Math.min(4, s + 1)); };
    const handleBack = () => { setErrors({}); setStep(s => Math.max(1, s - 1)); };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;
        setIsSubmitting(true);
        try {
            const result = await ipdService.createAdmission(form);
            toast({
                title: 'Patient admitted',
                description: `${result.patientName} admitted to ${result.wardName} · Bed ${result.bedNumber}.`,
            });
            onAdmissionCreated();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Admission failed:', err);
            toast({
                title: 'Admission failed',
                description: err?.message ?? 'Could not admit patient. Please retry.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePatientSelect = (hit: PatientHit) => {
        setForm(prev => ({
            ...prev,
            patientId: hit.patientId,
            patientName: hit.name,
            patientMobile: hit.mobile,
            age: hit.age,
            sex: hit.sex,
        }));
        if (errors.patientId) setErrors(prev => ({ ...prev, patientId: undefined }));
    };

    const handlePatientClear = () => {
        setForm(prev => ({
            ...prev,
            patientId: '', patientName: '', patientMobile: '', age: 0, sex: 'M',
        }));
    };

    const selectedWard = wards.find(w => w.id === form.wardId);
    const selectedBed = selectedWard?.beds.find(b => b.id === form.bedId);
    const estimatedBill = selectedBed ? selectedBed.pricePerDay * form.estimatedStayDays : 0;
    const selectedPatient = form.patientId ? {
        patientId: form.patientId, name: form.patientName, mobile: form.patientMobile, age: form.age, sex: form.sex,
    } : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">

                {/* Header */}
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                            <UserPlus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold text-slate-900">New Patient Admission</SheetTitle>
                            <SheetDescription className="text-xs text-slate-500">
                                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Step Indicator */}
                <div className="px-6 py-3 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-0">
                        {STEPS.map((s, idx) => {
                            const done = step > s.id;
                            const active = step === s.id;
                            return (
                                <React.Fragment key={s.id}>
                                    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                        <div className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs font-bold',
                                            done  ? 'bg-blue-600 border-blue-600 text-white' :
                                            active ? 'bg-white border-blue-600 text-blue-600 shadow-sm ring-2 ring-blue-100' :
                                                     'bg-white border-slate-200 text-slate-400'
                                        )}>
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                                        </div>
                                        <span className={cn(
                                            'text-[10px] font-semibold truncate w-full text-center',
                                            active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-slate-400'
                                        )}>
                                            {s.shortLabel}
                                        </span>
                                    </div>
                                    {idx < STEPS.length - 1 && (
                                        <div className={cn('h-0.5 flex-1 mb-5 transition-all', step > s.id ? 'bg-blue-500' : 'bg-slate-200')} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* Step 1: Patient lookup */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <PatientSearchPicker
                                selected={selectedPatient}
                                onSelect={handlePatientSelect}
                                onClear={handlePatientClear}
                            />
                            {errors.patientId && (
                                <p className="text-[11px] text-rose-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.patientId}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Bed assignment */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">
                                    Ward <span className="text-rose-500">*</span>
                                </Label>
                                <Select value={form.wardId} onValueChange={v => { set('wardId', v); set('bedId', ''); }}>
                                    <SelectTrigger className={cn('h-9 text-sm', errors.wardId && 'border-rose-400')}>
                                        <SelectValue placeholder="Select ward" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {wards.length === 0 && (
                                            <SelectItem disabled value="_no_wards">No wards configured</SelectItem>
                                        )}
                                        {wards.map(w => (
                                            <SelectItem key={w.id} value={w.id} disabled={w.availableBeds === 0}>
                                                <div className="flex items-center justify-between gap-6 w-full">
                                                    <span>{w.name}</span>
                                                    <span className={cn('text-[11px] font-semibold', w.availableBeds === 0 ? 'text-rose-500' : 'text-emerald-600')}>
                                                        {w.availableBeds === 0 ? 'Full' : `${w.availableBeds} free`}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.wardId && <p className="text-[11px] text-rose-500">{errors.wardId}</p>}
                            </div>

                            {selectedWard && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{selectedWard.floor || '—'}</span>
                                        <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{selectedWard.totalBeds} total</span>
                                        <span className={cn('font-semibold', selectedWard.availableBeds === 0 ? 'text-rose-600' : 'text-emerald-600')}>
                                            {selectedWard.availableBeds} available
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-500 mb-2">
                                            Select a Bed <span className="text-rose-500">*</span>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedWard.beds.map(bed => {
                                                const isSelected = form.bedId === bed.id;
                                                const isAvailable = bed.status === 'AVAILABLE';
                                                return (
                                                    <button
                                                        key={bed.id}
                                                        type="button"
                                                        disabled={!isAvailable}
                                                        onClick={() => isAvailable && set('bedId', bed.id)}
                                                        title={`${bed.bedNumber} — ${BED_STATUS_LABEL[bed.status]} — ₹${bed.pricePerDay.toLocaleString('en-IN')}/day`}
                                                        className={cn(
                                                            'flex flex-col items-center justify-center w-[60px] h-[56px] rounded-lg border-2 text-[11px] font-bold transition-all',
                                                            isSelected
                                                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400 ring-offset-1 shadow-md'
                                                                : BED_CELL_STYLES[bed.status]
                                                        )}
                                                    >
                                                        <BedDouble className="h-3.5 w-3.5 mb-0.5" />
                                                        <span className="leading-none">{bed.bedNumber}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.bedId && <p className="text-[11px] text-rose-500 mt-1.5">{errors.bedId}</p>}
                                    </div>

                                    {selectedBed && (
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                                            <BedDouble className="h-4 w-4 text-blue-600 shrink-0" />
                                            <span className="font-semibold text-blue-700">Bed {selectedBed.bedNumber}</span>
                                            <span className="text-blue-400 mx-0.5">·</span>
                                            <IndianRupee className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                            <span className="font-bold text-blue-700">{selectedBed.pricePerDay.toLocaleString('en-IN')}</span>
                                            <span className="text-blue-500">/day</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 border-t border-slate-200 pt-2">
                                        {Object.entries(BED_STATUS_LABEL).map(([status, label]) => (
                                            <span key={status} className="flex items-center gap-1">
                                                <span className={cn('w-2.5 h-2.5 rounded-sm border inline-block', {
                                                    'bg-emerald-50 border-emerald-300': status === 'AVAILABLE',
                                                    'bg-gray-100 border-gray-200': status === 'OCCUPIED',
                                                    'bg-amber-50 border-amber-200': status === 'CLEANING',
                                                    'bg-red-50 border-red-200': status === 'MAINTENANCE',
                                                    'bg-purple-50 border-purple-200': status === 'RESERVED',
                                                })} />
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!selectedWard && (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center h-40 text-sm text-slate-400">
                                    Select a ward to view bed availability
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Clinical details */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Department <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select
                                        value={form.departmentId}
                                        onValueChange={v => { set('departmentId', v); set('attendingDoctorId', ''); set('attendingDoctor', ''); }}
                                    >
                                        <SelectTrigger className={cn('h-9 text-sm', errors.departmentId && 'border-rose-400')}>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.length === 0 && (
                                                <SelectItem disabled value="_loading">Loading departments…</SelectItem>
                                            )}
                                            {departments.map(d => (
                                                <SelectItem key={d.departmentId} value={d.departmentId}>{d.departmentName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.departmentId && <p className="text-[11px] text-rose-500">{errors.departmentId}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Attending Doctor <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select
                                        value={form.attendingDoctorId}
                                        onValueChange={v => {
                                            const doc = doctors.find(d => d.doctorId === v);
                                            set('attendingDoctorId', v);
                                            set('attendingDoctor', doc?.doctorName ?? '');
                                        }}
                                        disabled={!form.departmentId || loadingDoctors}
                                    >
                                        <SelectTrigger className={cn('h-9 text-sm', errors.attendingDoctorId && 'border-rose-400')}>
                                            <SelectValue placeholder={
                                                !form.departmentId ? 'Select department first' :
                                                loadingDoctors ? 'Loading…' :
                                                doctors.length === 0 ? 'No doctors found' :
                                                'Select doctor'
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map(d => (
                                                <SelectItem key={d.doctorId} value={d.doctorId}>{d.doctorName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.attendingDoctorId && <p className="text-[11px] text-rose-500">{errors.attendingDoctorId}</p>}
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Chief Complaint <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. High fever, breathlessness"
                                        value={form.chiefComplaint}
                                        onChange={e => set('chiefComplaint', e.target.value)}
                                        className={cn('h-9 text-sm', errors.chiefComplaint && 'border-rose-400')}
                                    />
                                    {errors.chiefComplaint && <p className="text-[11px] text-rose-500">{errors.chiefComplaint}</p>}
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Provisional Diagnosis</Label>
                                    <Input
                                        placeholder="e.g. Dengue Fever with thrombocytopenia"
                                        value={form.diagnosis}
                                        onChange={e => set('diagnosis', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Priority</Label>
                                    <Select value={form.priority} onValueChange={v => set('priority', v as AdmissionPriority)}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(Object.entries(PRIORITY_CONFIG) as [AdmissionPriority, typeof PRIORITY_CONFIG[AdmissionPriority]][]).map(([key, cfg]) => (
                                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Expected Discharge</Label>
                                    <Input
                                        type="date"
                                        value={form.expectedDischargeDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => set('expectedDischargeDate', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Referred By</Label>
                                    <Input
                                        placeholder="Referring doctor / source"
                                        value={form.referredBy}
                                        onChange={e => set('referredBy', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700">Additional Notes</Label>
                                    <Textarea
                                        placeholder="Any additional clinical notes..."
                                        value={form.notes}
                                        onChange={e => set('notes', e.target.value)}
                                        className="text-sm resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Billing estimate */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>
                                    Advance payment is recorded after admission from the <strong>Billing</strong> tab.
                                    Fields below are for your reference only.
                                </span>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estimated Charges</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Est. Stay (days)</Label>
                                        <Input
                                            type="number"
                                            min={1} max={365}
                                            value={form.estimatedStayDays}
                                            onChange={e => set('estimatedStayDays', Math.max(1, Number(e.target.value)))}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Bed Rate / Day</Label>
                                        <div className="h-9 flex items-center px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-500">
                                            {selectedBed ? `₹${selectedBed.pricePerDay.toLocaleString('en-IN')}` : '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Est. Bed Charges</Label>
                                        <div className="h-9 flex items-center px-3 rounded-md border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700">
                                            {estimatedBill > 0 ? `₹${estimatedBill.toLocaleString('en-IN')}` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 opacity-90">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Advance (for reference)</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">
                                            Advance Amount <span className="text-slate-400 font-normal">(₹)</span>
                                        </Label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                value={form.advanceAmount || ''}
                                                onChange={e => set('advanceAmount', Number(e.target.value))}
                                                className="h-9 text-sm pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                                        <Select
                                            value={form.paymentMode}
                                            onValueChange={v => set('paymentMode', v as NewAdmissionFormData['paymentMode'])}
                                        >
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Select mode" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH"><span className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-emerald-600" />Cash</span></SelectItem>
                                                <SelectItem value="CARD"><span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-blue-600" />Card</span></SelectItem>
                                                <SelectItem value="UPI"><span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-purple-600" />UPI</span></SelectItem>
                                                <SelectItem value="NETBANKING"><span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-indigo-600" />Net Banking</span></SelectItem>
                                                <SelectItem value="INSURANCE"><span className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-amber-600" />Insurance</span></SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Admission Summary</p>
                                {[
                                    { label: 'Patient',     value: form.patientName ? `${form.patientName} (${form.patientId})` : '—' },
                                    { label: 'Mobile',      value: form.patientMobile || '—' },
                                    { label: 'Ward',        value: selectedWard?.name || '—' },
                                    { label: 'Bed',         value: selectedBed ? `Bed ${selectedBed.bedNumber}` : '—' },
                                    { label: 'Doctor',      value: form.attendingDoctor || '—' },
                                    { label: 'Priority',    value: PRIORITY_CONFIG[form.priority].label },
                                    { label: 'Complaint',   value: form.chiefComplaint || '—' },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 w-24 shrink-0">{row.label}</span>
                                        <span className="font-semibold text-slate-800 text-right truncate">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="h-10 px-4"
                        onClick={() => step === 1 ? onOpenChange(false) : handleBack()}
                        disabled={isSubmitting}
                    >
                        {step === 1 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
                    </Button>
                    <div className="flex-1" />
                    {step < 4 ? (
                        <Button
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 font-semibold gap-1"
                            onClick={handleNext}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 font-semibold"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Admitting…</> : 'Admit Patient'}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
