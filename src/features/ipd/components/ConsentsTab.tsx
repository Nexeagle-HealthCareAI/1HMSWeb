import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FileSignature, Plus, RefreshCw, AlertCircle, Loader2, Eye, X,
    CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    consentService,
    type ConsentRecord,
    type ConsentTemplate,
    type ConsentTypeCode,
    type SignConsentRequest,
} from '../services/consentService';
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas';

// ─── Type meta ───────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
    GENERAL_ADMISSION: 'General Admission',
    PROCEDURE: 'Procedure',
    RADIATION: 'Radiation Exposure',
    IV_CONTRAST: 'IV Contrast',
    BLOOD_TRANSFUSION: 'Blood / Blood Products',
    ANAESTHESIA: 'Anaesthesia',
    OTHER: 'Other',
};

const TYPE_TONE: Record<string, string> = {
    GENERAL_ADMISSION: 'bg-slate-100 text-slate-700 border-slate-200',
    PROCEDURE: 'bg-blue-50 text-blue-700 border-blue-200',
    RADIATION: 'bg-amber-50 text-amber-700 border-amber-200',
    IV_CONTRAST: 'bg-purple-50 text-purple-700 border-purple-200',
    BLOOD_TRANSFUSION: 'bg-rose-50 text-rose-700 border-rose-200',
    ANAESTHESIA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    OTHER: 'bg-slate-100 text-slate-600 border-slate-200',
};

const RELATION_OPTIONS = ['SELF', 'FATHER', 'MOTHER', 'SPOUSE', 'SON', 'DAUGHTER', 'GUARDIAN', 'BROTHER', 'SISTER', 'OTHER'];
const ID_TYPE_OPTIONS = ['AADHAAR', 'PAN', 'DL', 'PASSPORT', 'VOTER_ID', 'OTHER'];

interface ConsentsTabProps {
    admissionId: string;
    isActive: boolean;
}

// ─── Detail view sheet ──────────────────────────────────────────────────────

const ConsentDetailSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: ConsentRecord | null;
}> = ({ open, onOpenChange, record }) => {
    if (!record) return null;
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <FileSignature className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold text-slate-900">
                                {record.templateTitle ?? TYPE_LABEL[record.templateTypeCode] ?? 'Consent'}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                Signed {format(new Date(record.signedAt), 'dd MMM yyyy · HH:mm')}
                                {record.signedByName && ` by ${record.signedByName}`}
                                {record.signerRelation && record.signerRelation !== 'SELF' && ` (${record.signerRelation.toLowerCase()})`}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px]', TYPE_TONE[record.templateTypeCode] ?? TYPE_TONE.OTHER)}>
                            {TYPE_LABEL[record.templateTypeCode] ?? record.templateTypeCode}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                            v{record.templateVersion} · {record.templateLanguage ?? 'EN'}
                        </Badge>
                        {record.procedureName && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                {record.procedureName}
                            </Badge>
                        )}
                    </div>

                    {/* Template body — admin-controlled HTML; safe in this context. */}
                    <div
                        className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-4 bg-white"
                        dangerouslySetInnerHTML={{ __html: record.templateBodyHtmlSnapshot ?? '' }}
                    />

                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Signer</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-slate-500">Name</p>
                                <p className="font-semibold text-slate-800">{record.signedByName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Relation</p>
                                <p className="font-semibold text-slate-800">{record.signerRelation}</p>
                            </div>
                            {record.signerIdType && (
                                <>
                                    <div>
                                        <p className="text-slate-500">ID Type</p>
                                        <p className="font-semibold text-slate-800">{record.signerIdType}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">ID Number</p>
                                        <p className="font-semibold text-slate-800 font-mono">{record.signerIdNumberMasked ?? '—'}</p>
                                    </div>
                                </>
                            )}
                            {record.witnessName && (
                                <>
                                    <div>
                                        <p className="text-slate-500">Witness</p>
                                        <p className="font-semibold text-slate-800">{record.witnessName}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Role</p>
                                        <p className="font-semibold text-slate-800">{record.witnessRole ?? '—'}</p>
                                    </div>
                                </>
                            )}
                        </div>
                        {record.signatureImageBase64 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Signature</p>
                                <img
                                    src={`data:image/png;base64,${record.signatureImageBase64}`}
                                    alt="Signature"
                                    className="border border-slate-200 rounded bg-white max-h-40"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Sign wizard sheet ──────────────────────────────────────────────────────

const SignConsentSheet: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    onSigned: () => void;
}> = ({ open, onOpenChange, admissionId, onSigned }) => {
    const { toast } = useToast();
    const sigRef = useRef<SignatureCanvasHandle | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [typeFilter, setTypeFilter] = useState<string>('');
    const [picked, setPicked] = useState<ConsentTemplate | null>(null);
    const [hasInk, setHasInk] = useState(false);

    const [form, setForm] = useState<Omit<SignConsentRequest, 'admissionId' | 'consentTemplateId' | 'signatureImageBase64'>>({
        signedByName: '',
        signerRelation: 'SELF',
        signerIdType: undefined,
        signerIdNumber: undefined,
        procedureName: undefined,
        witnessName: undefined,
        witnessRole: undefined,
    });

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep(1);
            setPicked(null);
            setTypeFilter('');
            setHasInk(false);
            setForm({
                signedByName: '',
                signerRelation: 'SELF',
                signerIdType: undefined,
                signerIdNumber: undefined,
                procedureName: undefined,
                witnessName: undefined,
                witnessRole: undefined,
            });
        }
    }, [open]);

    // Fetch templates once when opened
    useEffect(() => {
        if (!open || templates.length > 0) return;
        setLoadingTemplates(true);
        consentService.listTemplates({ isActive: true })
            .then(res => setTemplates(res.items ?? []))
            .catch(() => setTemplates([]))
            .finally(() => setLoadingTemplates(false));
    }, [open, templates.length]);

    const filteredTemplates = useMemo(() => {
        if (!typeFilter) return templates;
        return templates.filter(t => t.typeCode === typeFilter);
    }, [templates, typeFilter]);

    const submit = async () => {
        if (!picked) return;
        const dataUrl = sigRef.current?.getDataUrl();
        if (!dataUrl) {
            toast({ title: 'Signature required', description: 'Please sign in the box above.', variant: 'destructive' });
            return;
        }
        if (!form.signedByName.trim()) {
            toast({ title: 'Signer name required', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await consentService.sign({
                admissionId,
                consentTemplateId: picked.consentTemplateId,
                signatureImageBase64: dataUrl,
                signedByName: form.signedByName.trim(),
                signerRelation: form.signerRelation,
                signerIdType: form.signerIdType,
                signerIdNumber: form.signerIdNumber?.trim() || undefined,
                procedureName: form.procedureName?.trim() || undefined,
                witnessName: form.witnessName?.trim() || undefined,
                witnessRole: form.witnessRole?.trim() || undefined,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not save consent');
            toast({ title: 'Consent signed' });
            onSigned();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Sign failed', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const STEPS = [
        { id: 1, label: 'Template' },
        { id: 2, label: 'Review' },
        { id: 3, label: 'Sign' },
    ] as const;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Sign Consent</SheetTitle>
                            <SheetDescription className="text-xs">
                                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="px-6 py-3 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-0">
                        {STEPS.map((s, i) => {
                            const done = step > s.id;
                            const active = step === s.id;
                            return (
                                <React.Fragment key={s.id}>
                                    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                                        <div className={cn(
                                            'w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold',
                                            done ? 'bg-emerald-600 border-emerald-600 text-white' :
                                            active ? 'bg-white border-emerald-600 text-emerald-700 ring-2 ring-emerald-100' :
                                            'bg-white border-slate-200 text-slate-400'
                                        )}>
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                                        </div>
                                        <span className={cn(
                                            'text-[10px] font-semibold',
                                            active ? 'text-emerald-700' : done ? 'text-emerald-500' : 'text-slate-400'
                                        )}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={cn('h-0.5 flex-1 mb-5', step > s.id ? 'bg-emerald-500' : 'bg-slate-200')} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {step === 1 && (
                        <>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Filter by Type</Label>
                                <Select value={typeFilter || 'ALL'} onValueChange={v => setTypeFilter(v === 'ALL' ? '' : v)}>
                                    <SelectTrigger className="h-9 text-sm mt-1">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All types</SelectItem>
                                        {Object.entries(TYPE_LABEL).map(([code, label]) => (
                                            <SelectItem key={code} value={code}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {loadingTemplates ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                                    <AlertCircle className="h-6 w-6 mx-auto text-slate-400" />
                                    <p className="text-sm font-semibold text-slate-600">No active templates</p>
                                    <p className="text-xs text-slate-400">Admin must create consent templates for this hospital first.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTemplates.map(t => (
                                        <button
                                            key={t.consentTemplateId}
                                            type="button"
                                            onClick={() => { setPicked(t); setStep(2); }}
                                            className={cn(
                                                'w-full text-left rounded-xl border p-3 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors',
                                                picked?.consentTemplateId === t.consentTemplateId ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200 bg-white'
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className={cn('text-[10px]', TYPE_TONE[t.typeCode] ?? TYPE_TONE.OTHER)}>
                                                            {TYPE_LABEL[t.typeCode] ?? t.typeCode}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400">v{t.version} · {t.language ?? 'EN'}</span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-800 mt-1">{t.title ?? TYPE_LABEL[t.typeCode]}</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && picked && (
                        <>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={cn('text-[10px]', TYPE_TONE[picked.typeCode] ?? TYPE_TONE.OTHER)}>
                                    {TYPE_LABEL[picked.typeCode] ?? picked.typeCode}
                                </Badge>
                                <span className="text-[10px] text-slate-400">v{picked.version} · {picked.language ?? 'EN'}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800">{picked.title ?? TYPE_LABEL[picked.typeCode]}</p>
                            <div
                                className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-4 bg-white"
                                dangerouslySetInnerHTML={{ __html: picked.bodyHtml ?? '' }}
                            />
                            {(picked.typeCode === 'PROCEDURE' || picked.typeCode === 'IV_CONTRAST' || picked.typeCode === 'ANAESTHESIA') && (
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Procedure / Study Name <span className="text-slate-400 font-normal">(recommended)</span>
                                    </Label>
                                    <Input
                                        value={form.procedureName ?? ''}
                                        onChange={e => setForm(prev => ({ ...prev, procedureName: e.target.value }))}
                                        placeholder="e.g. CT Chest with contrast"
                                        className="h-9 text-sm mt-1"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {step === 3 && picked && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Signed By <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        value={form.signedByName}
                                        onChange={e => setForm(prev => ({ ...prev, signedByName: e.target.value }))}
                                        placeholder="Full name of person signing"
                                        className="h-9 text-sm mt-1"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">
                                        Relation <span className="text-rose-500">*</span>
                                    </Label>
                                    <Select value={form.signerRelation} onValueChange={v => setForm(prev => ({ ...prev, signerRelation: v }))}>
                                        <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {RELATION_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">ID Type</Label>
                                    <Select
                                        value={form.signerIdType ?? '_'}
                                        onValueChange={v => setForm(prev => ({ ...prev, signerIdType: v === '_' ? undefined : v }))}
                                    >
                                        <SelectTrigger className="h-9 text-sm mt-1">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_">—</SelectItem>
                                            {ID_TYPE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {form.signerIdType && (
                                    <div className="col-span-2">
                                        <Label className="text-xs font-semibold text-slate-700">ID Number</Label>
                                        <Input
                                            value={form.signerIdNumber ?? ''}
                                            onChange={e => setForm(prev => ({ ...prev, signerIdNumber: e.target.value }))}
                                            placeholder="Stored partially masked"
                                            className="h-9 text-sm mt-1 font-mono"
                                        />
                                    </div>
                                )}
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Witness Name</Label>
                                    <Input
                                        value={form.witnessName ?? ''}
                                        onChange={e => setForm(prev => ({ ...prev, witnessName: e.target.value }))}
                                        placeholder="Optional"
                                        className="h-9 text-sm mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Witness Role</Label>
                                    <Input
                                        value={form.witnessRole ?? ''}
                                        onChange={e => setForm(prev => ({ ...prev, witnessRole: e.target.value }))}
                                        placeholder="e.g. Nurse, Receptionist"
                                        className="h-9 text-sm mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-slate-700">
                                    Signature <span className="text-rose-500">*</span>
                                </Label>
                                <div className="mt-1">
                                    <SignatureCanvas ref={sigRef} onChange={setHasInk} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="h-10 px-4"
                        onClick={() => step === 1 ? onOpenChange(false) : setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}
                        disabled={submitting}
                    >
                        {step === 1 ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><ChevronLeft className="h-4 w-4 mr-1" /> Back</>}
                    </Button>
                    <div className="flex-1 text-[11px] text-slate-400 text-right">
                        {step === 3 && !hasInk && 'Please sign in the box'}
                        {step === 3 && !form.signedByName.trim() && hasInk && 'Enter the signer name'}
                    </div>
                    {step < 3 ? (
                        <Button
                            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 gap-1"
                            disabled={step === 1 ? !picked : false}
                            onClick={() => setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3)}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={submit}
                            disabled={submitting || !hasInk || !form.signedByName.trim()}
                            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 gap-1"
                        >
                            {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-1" />Sign & Save</>}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main tab ────────────────────────────────────────────────────────────────

export const ConsentsTab: React.FC<ConsentsTabProps> = ({ admissionId, isActive }) => {
    const [records, setRecords] = useState<ConsentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [signOpen, setSignOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRecord, setDetailRecord] = useState<ConsentRecord | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await consentService.listRecords(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load consents');
            setRecords(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load consents');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadedOnce(true);
        }
    }, [admissionId]);

    useEffect(() => {
        if (isActive && !loadedOnce) load();
    }, [isActive, loadedOnce, load]);

    const openDetail = async (r: ConsentRecord) => {
        try {
            // Fetch the full body + signature when the user opens detail (records list is body-less for size).
            const full = await consentService.listRecords(admissionId, { includeBody: true });
            const hit = full.items.find(x => x.consentRecordId === r.consentRecordId) ?? r;
            setDetailRecord(hit);
            setDetailOpen(true);
        } catch {
            setDetailRecord(r);
            setDetailOpen(true);
        }
    };

    const presentTypes = useMemo(() => new Set(records.map(r => r.templateTypeCode)), [records]);

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileSignature className="h-4 w-4 text-emerald-600" /> Consents
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Signed consents are immutable. Superseded only by a new version of the template.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing} className="h-9 text-xs gap-1">
                        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button size="sm" onClick={() => setSignOpen(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700 gap-1">
                        <Plus className="h-4 w-4" /> Sign New
                    </Button>
                </div>
            </div>

            {/* Coverage row — quick view of which types are signed */}
            <div className="flex items-center gap-2 flex-wrap">
                {(['GENERAL_ADMISSION', 'PROCEDURE', 'IV_CONTRAST', 'BLOOD_TRANSFUSION', 'ANAESTHESIA', 'RADIATION'] as ConsentTypeCode[]).map(c => {
                    const signed = presentTypes.has(c);
                    return (
                        <Badge
                            key={c}
                            variant="outline"
                            className={cn(
                                'text-[10px] gap-1',
                                signed ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'
                            )}
                        >
                            {signed ? <CheckCircle2 className="h-3 w-3" /> : <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />}
                            {TYPE_LABEL[c]}
                        </Badge>
                    );
                })}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-rose-700">Could not load consents</p>
                        <p className="text-xs text-rose-600">{error}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => load()} className="border-rose-300 text-rose-700">Retry</Button>
                </div>
            ) : records.length === 0 ? (
                <div className="p-10 text-center space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <div className="h-14 w-14 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <FileSignature className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">No consents on file</p>
                        <p className="text-xs text-slate-500">At minimum, a general admission consent is required by NABH.</p>
                    </div>
                    <Button onClick={() => setSignOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Sign the first consent
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {records.map(r => (
                        <div
                            key={r.consentRecordId}
                            className="rounded-xl border border-slate-200 bg-white p-3 flex items-start justify-between gap-3"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={cn('text-[10px]', TYPE_TONE[r.templateTypeCode] ?? TYPE_TONE.OTHER)}>
                                        {TYPE_LABEL[r.templateTypeCode] ?? r.templateTypeCode}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                                        v{r.templateVersion} · {r.templateLanguage ?? 'EN'}
                                    </Badge>
                                    {r.procedureName && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                            {r.procedureName}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-slate-800 mt-1">
                                    {r.templateTitle ?? TYPE_LABEL[r.templateTypeCode]}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Signed by <strong>{r.signedByName ?? '—'}</strong>
                                    {r.signerRelation && r.signerRelation !== 'SELF' && ` (${r.signerRelation.toLowerCase()})`}
                                    {' · '}{format(new Date(r.signedAt), 'dd MMM yyyy · HH:mm')}
                                </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openDetail(r)} className="h-8 text-xs gap-1">
                                <Eye className="h-3 w-3" /> View
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <SignConsentSheet
                open={signOpen}
                onOpenChange={setSignOpen}
                admissionId={admissionId}
                onSigned={() => load(true)}
            />
            <ConsentDetailSheet
                open={detailOpen}
                onOpenChange={setDetailOpen}
                record={detailRecord}
            />
        </div>
    );
};

export default ConsentsTab;
