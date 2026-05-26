import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Pill, Plus, RefreshCw, Loader2, AlertCircle, X, Save, AlertTriangle,
    CheckCircle2, Clock, Ban, ShieldAlert, PauseCircle, PlayCircle, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
    medicationService,
    type MedicationOrder,
    type MedicationDueDose,
    type MedicationAdministrationRecord,
    type CreateMedicationOrderRequest,
    type RecordMedicationAdministrationRequest,
    type FrequencyCode,
} from '../services/medicationService';
import {
    allergyService,
    type PatientAllergy,
    type AddPatientAllergyRequest,
    type AllergyType,
    type AllergySeverity,
    type CheckMedicationSafetyResponse,
} from '../services/allergyService';
import { inventoryService, type InventoryItem } from '@/features/inventory/services/inventoryService';

interface MarTabProps {
    admissionId: string;
    patientId?: string;
    isActive: boolean;
}

type SubView = 'due' | 'orders' | 'allergies' | 'history';

const SUB_VIEW_LABEL: Record<SubView, string> = {
    due: 'Due Doses',
    orders: 'Orders',
    allergies: 'Allergies',
    history: 'History',
};

// Allergy + interaction severity tones
const ALLERGY_SEVERITY_TONE: Record<string, string> = {
    MILD:        'bg-amber-50 text-amber-700 border-amber-200',
    MODERATE:    'bg-amber-100 text-amber-800 border-amber-300',
    SEVERE:      'bg-rose-50 text-rose-700 border-rose-200',
    ANAPHYLAXIS: 'bg-rose-100 text-rose-800 border-rose-300',
};

const INTERACTION_SEVERITY_TONE: Record<string, string> = {
    MINOR:           'bg-amber-50 text-amber-700 border-amber-200',
    MODERATE:        'bg-amber-100 text-amber-800 border-amber-300',
    MAJOR:           'bg-rose-50 text-rose-700 border-rose-200',
    CONTRAINDICATED: 'bg-rose-100 text-rose-800 border-rose-300',
};

const FREQUENCY_OPTIONS: { code: FrequencyCode; label: string; hint: string }[] = [
    { code: 'OD',   label: 'OD',   hint: 'Once daily (08:00)' },
    { code: 'BID',  label: 'BID',  hint: 'Twice daily (08, 20)' },
    { code: 'TID',  label: 'TID',  hint: 'Three times (08, 14, 20)' },
    { code: 'QID',  label: 'QID',  hint: 'Four times (06, 12, 18, 24)' },
    { code: 'Q4H',  label: 'Q4H',  hint: 'Every 4 hours' },
    { code: 'Q6H',  label: 'Q6H',  hint: 'Every 6 hours' },
    { code: 'Q8H',  label: 'Q8H',  hint: 'Every 8 hours' },
    { code: 'Q12H', label: 'Q12H', hint: 'Every 12 hours' },
    { code: 'STAT', label: 'STAT', hint: 'Once, immediately' },
    { code: 'PRN',  label: 'PRN',  hint: 'On demand' },
];

const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'SC', 'TOP', 'INH', 'PR', 'SL', 'NG', 'OPH', 'OTIC'];

// ─── Tone maps ──────────────────────────────────────────────────────────────

const SLOT_TONE: Record<string, { bg: string; ring: string; label: string; icon: React.ReactNode }> = {
    OVERDUE:               { bg: 'bg-rose-50 text-rose-700 border-rose-200',           ring: 'ring-rose-300',     label: 'Overdue',     icon: <AlertTriangle className="h-3 w-3" /> },
    DUE:                   { bg: 'bg-amber-50 text-amber-700 border-amber-200',         ring: 'ring-amber-300',    label: 'Due',         icon: <Clock className="h-3 w-3" /> },
    UPCOMING:              { bg: 'bg-slate-50 text-slate-600 border-slate-200',         ring: 'ring-slate-300',    label: 'Upcoming',    icon: <Clock className="h-3 w-3" /> },
    DONE:                  { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',   ring: 'ring-emerald-300',  label: 'Administered',icon: <CheckCircle2 className="h-3 w-3" /> },
    HELD:                  { bg: 'bg-sky-50 text-sky-700 border-sky-200',               ring: 'ring-sky-300',      label: 'Held',        icon: <PauseCircle className="h-3 w-3" /> },
    REFUSED:               { bg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',   ring: 'ring-fuchsia-300',  label: 'Refused',     icon: <Ban className="h-3 w-3" /> },
    PATIENT_NOT_AVAILABLE: { bg: 'bg-violet-50 text-violet-700 border-violet-200',      ring: 'ring-violet-300',   label: 'Pt N/A',      icon: <X className="h-3 w-3" /> },
    MISSED:                { bg: 'bg-rose-100 text-rose-800 border-rose-300',           ring: 'ring-rose-400',     label: 'Missed',      icon: <AlertCircle className="h-3 w-3" /> },
};

const ORDER_STATUS_TONE: Record<string, string> = {
    ACTIVE:       'bg-emerald-50 text-emerald-700 border-emerald-200',
    HELD:         'bg-sky-50 text-sky-700 border-sky-200',
    DISCONTINUED: 'bg-slate-50 text-slate-600 border-slate-300',
    COMPLETED:    'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const ACTION_LABEL: Record<string, string> = {
    ADMINISTERED:          'Administered',
    HELD:                  'Held',
    REFUSED:               'Refused',
    PATIENT_NOT_AVAILABLE: 'Patient unavailable',
    MISSED:                'Missed',
};

// ─── Order sheet ────────────────────────────────────────────────────────────

// ─── Inventory link field ───────────────────────────────────────────────────

const InventoryLinkField: React.FC<{
    inventoryItemId?: string;
    qtyPerDose?: number;
    searchHint?: string;
    onChange: (inventoryItemId?: string, qtyPerDose?: number) => void;
}> = ({ inventoryItemId, qtyPerDose, searchHint, onChange }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<InventoryItem[]>([]);
    const [linked, setLinked] = useState<InventoryItem | null>(null);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);

    // Resolve current linked item label
    useEffect(() => {
        if (!inventoryItemId) { setLinked(null); return; }
        if (linked?.inventoryItemId === inventoryItemId) return;
        // Cheapest: look up via list endpoint filtered by code/name — we just fetch a small batch.
        inventoryService.listItems({ take: 1, search: inventoryItemId })
            .catch(() => null);
    }, [inventoryItemId, linked]);

    useEffect(() => {
        const q = (query || searchHint || '').trim();
        if (!open || q.length < 2) { setResults([]); return; }
        const handle = window.setTimeout(async () => {
            setSearching(true);
            try {
                const res = await inventoryService.listItems({ search: q, isActive: true, take: 10 });
                setResults(res.success ? res.items ?? [] : []);
            } catch { setResults([]); }
            finally { setSearching(false); }
        }, 250);
        return () => window.clearTimeout(handle);
    }, [query, searchHint, open]);

    const pick = (it: InventoryItem) => {
        setLinked(it);
        onChange(it.inventoryItemId, qtyPerDose ?? 1);
        setOpen(false);
        setQuery('');
    };

    const clear = () => {
        setLinked(null);
        onChange(undefined, undefined);
    };

    return (
        <div className="rounded-lg border-2 border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Pharmacy auto-dispense</Label>
                <p className="text-[10px] text-slate-500">Optional. Links order to an inventory item; ADMINISTERED doses deduct stock and bill the patient.</p>
            </div>

            {linked || inventoryItemId ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">{linked?.itemName ?? 'Linked item'}</p>
                        {linked && (
                            <p className="text-[10px] text-emerald-700">
                                {linked.itemCode} · {linked.currentStock} {linked.unit} in stock{linked.isLowStock ? ' · LOW' : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] font-semibold text-slate-600">Qty/dose</Label>
                        <Input
                            type="number" min={0} step="0.001"
                            value={qtyPerDose ?? ''}
                            onChange={e => onChange(inventoryItemId, e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="h-7 w-20 text-xs"
                        />
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={clear}>
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <Input
                            value={query}
                            onChange={e => { setQuery(e.target.value); setOpen(true); }}
                            onFocus={() => setOpen(true)}
                            placeholder={searchHint ? `Search inventory (try "${searchHint}")` : 'Search inventory by code, name, generic…'}
                            className="h-9 text-sm"
                        />
                        {open && (results.length > 0 || searching) && (
                            <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                                {searching && <p className="px-3 py-2 text-[11px] text-slate-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</p>}
                                {results.map(it => (
                                    <button
                                        key={it.inventoryItemId}
                                        type="button"
                                        onClick={() => pick(it)}
                                        className="block w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-t border-slate-100 first:border-t-0"
                                    >
                                        <p className="font-semibold text-slate-900">{it.itemName}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {it.itemCode} · {it.currentStock} {it.unit}{it.isLowStock ? ' · LOW' : ''}{it.defaultRate ? ` · ₹${it.defaultRate}` : ''}
                                        </p>
                                    </button>
                                ))}
                                {!searching && results.length === 0 && (
                                    <p className="px-3 py-2 text-[11px] text-slate-500">No items match.</p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const initialOrder = (): CreateMedicationOrderRequest => ({
    admissionId: '',
    drugName: '',
    dose: '',
    route: 'PO',
    frequencyCode: 'BID',
    highAlert: false,
    allergyOverride: false,
});

const NewOrderSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    admissionId: string;
    onCreated: () => void;
}> = ({ open, onOpenChange, admissionId, onCreated }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<CreateMedicationOrderRequest>({ ...initialOrder(), admissionId });
    const [submitting, setSubmitting] = useState(false);
    const [safety, setSafety] = useState<CheckMedicationSafetyResponse | null>(null);
    const [safetyLoading, setSafetyLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm({ ...initialOrder(), admissionId });
        setSafety(null);
    }, [open, admissionId]);

    // Debounced safety check on drug name / generic
    useEffect(() => {
        if (!open) return;
        const name = form.drugName?.trim();
        const generic = form.genericName?.trim();
        if (!name && !generic) { setSafety(null); return; }
        const handle = window.setTimeout(async () => {
            setSafetyLoading(true);
            try {
                const res = await allergyService.checkSafety(admissionId, {
                    proposedDrugName: name || undefined,
                    proposedGenericName: generic || undefined,
                    includeExistingOrders: false, // only flag the proposed drug here
                });
                setSafety(res.success ? res : null);
            } catch {
                setSafety(null);
            } finally {
                setSafetyLoading(false);
            }
        }, 350);
        return () => window.clearTimeout(handle);
    }, [open, admissionId, form.drugName, form.genericName]);

    const set = <K extends keyof CreateMedicationOrderRequest>(k: K, v: CreateMedicationOrderRequest[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
    };

    const hasSafetyHits = !!safety && (safety.allergyHits.length > 0 || safety.interactionHits.length > 0);
    const overallTone = safety?.overallSeverity === 'CONTRAINDICATED' || safety?.overallSeverity === 'MAJOR'
        ? 'border-rose-300 bg-rose-50'
        : 'border-amber-300 bg-amber-50';

    const handleSubmit = async () => {
        if (submitting) return;
        if (!form.drugName.trim()) { toast({ title: 'Drug name is required', variant: 'destructive' }); return; }
        if (!form.dose.trim())     { toast({ title: 'Dose is required',      variant: 'destructive' }); return; }
        if (safety && safety.allergyHits.length > 0 && !form.allergyOverride) {
            toast({ title: 'Allergy flagged', description: 'Tick the override box and document a reason before saving.', variant: 'destructive' });
            return;
        }
        if (form.allergyOverride && !form.allergyOverrideReason?.trim()) {
            toast({ title: 'Override reason required', description: 'Document why you are prescribing despite a known allergy.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await medicationService.createOrder({ ...form, admissionId });
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: 'Medication order created', description: `${form.drugName} · ${form.dose} · ${form.frequencyCode}` });
            onCreated();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <Pill className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">New Medication Order</SheetTitle>
                            <SheetDescription className="text-xs">Doctor-prescribed. Nurses administer from due-doses.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-slate-700">Drug Name *</Label>
                            <Input value={form.drugName} onChange={e => set('drugName', e.target.value)} className="h-9 mt-1" placeholder="e.g. Paracetamol" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Generic</Label>
                            <Input value={form.genericName ?? ''} onChange={e => set('genericName', e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Strength</Label>
                            <Input value={form.strength ?? ''} onChange={e => set('strength', e.target.value)} className="h-9 mt-1" placeholder="e.g. 500 mg" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Dose *</Label>
                            <Input value={form.dose} onChange={e => set('dose', e.target.value)} className="h-9 mt-1" placeholder="e.g. 1 tab" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Form</Label>
                            <Input value={form.dosageForm ?? ''} onChange={e => set('dosageForm', e.target.value)} className="h-9 mt-1" placeholder="e.g. Tablet" />
                        </div>
                    </div>

                    {/* Safety preview */}
                    {(safetyLoading || hasSafetyHits) && (
                        <div className={cn('rounded-lg border-2 p-3', hasSafetyHits ? overallTone : 'border-slate-200 bg-slate-50')}>
                            {safetyLoading && !hasSafetyHits && (
                                <p className="text-xs text-slate-600 flex items-center gap-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking allergies & interactions…
                                </p>
                            )}
                            {hasSafetyHits && (
                                <>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                                        Safety check · {safety?.overallSeverity}
                                    </p>
                                    {safety!.allergyHits.length > 0 && (
                                        <div className="space-y-1.5 mb-2">
                                            {safety!.allergyHits.map(h => (
                                                <div key={`a-${h.patientAllergyId}-${h.drugName}`} className="text-[11px] flex items-start gap-2">
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0', ALLERGY_SEVERITY_TONE[h.severity] ?? '')}>
                                                        ALLERGY · {h.severity}
                                                    </Badge>
                                                    <span className="text-slate-700">
                                                        <strong>{h.allergen}</strong> in {h.drugName}{h.reaction && <span className="text-slate-500"> · {h.reaction}</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {safety!.interactionHits.length > 0 && (
                                        <div className="space-y-1.5">
                                            {safety!.interactionHits.map(h => (
                                                <div key={`i-${h.drugInteractionId}-${h.drugA}-${h.drugB}`} className="text-[11px] flex items-start gap-2">
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0', INTERACTION_SEVERITY_TONE[h.severity] ?? '')}>
                                                        INTERACTION · {h.severity}
                                                    </Badge>
                                                    <span className="text-slate-700">
                                                        <strong>{h.drugA}</strong> ↔ <strong>{h.drugB}</strong>{h.effect && <span className="text-slate-500"> · {h.effect}</span>}
                                                        {h.management && <div className="text-slate-500 mt-0.5">↳ {h.management}</div>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {safety!.allergyHits.length > 0 && !form.allergyOverride && (
                                        <p className="text-[11px] text-rose-700 font-semibold mt-2">
                                            Tick the override box below and document a reason to proceed.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Route *</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {ROUTE_OPTIONS.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => set('route', r)}
                                    className={cn(
                                        'px-2.5 h-8 rounded-md border text-xs font-semibold transition-all',
                                        form.route === r
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{r}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Frequency *</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
                            {FREQUENCY_OPTIONS.map(f => (
                                <button
                                    key={f.code}
                                    type="button"
                                    onClick={() => set('frequencyCode', f.code)}
                                    className={cn(
                                        'px-2.5 py-1.5 rounded-md border text-left transition-all',
                                        form.frequencyCode === f.code
                                            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    )}
                                >
                                    <div className="text-xs font-bold text-slate-800">{f.label}</div>
                                    <div className="text-[10px] text-slate-500">{f.hint}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Duration (days)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.durationDays ?? ''}
                                onChange={e => set('durationDays', e.target.value ? parseInt(e.target.value, 10) : null)}
                                className="h-9 mt-1"
                                placeholder="Leave blank for open-ended"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Prescribed By</Label>
                            <Input
                                value={form.prescribedByName ?? ''}
                                onChange={e => set('prescribedByName', e.target.value)}
                                className="h-9 mt-1"
                                placeholder="Defaults to current user"
                            />
                        </div>
                    </div>

                    <InventoryLinkField
                        inventoryItemId={form.inventoryItemId}
                        qtyPerDose={form.qtyPerDose}
                        searchHint={form.drugName || form.genericName}
                        onChange={(id, qty) => { set('inventoryItemId', id); set('qtyPerDose', qty); }}
                    />

                    <button
                        type="button"
                        onClick={() => set('highAlert', !form.highAlert)}
                        className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                            form.highAlert
                                ? 'border-rose-300 bg-rose-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                    >
                        <ShieldAlert className={cn('h-5 w-5 mt-0.5 shrink-0', form.highAlert ? 'text-rose-600' : 'text-slate-400')} />
                        <div className="flex-1">
                            <p className={cn('text-xs font-bold', form.highAlert ? 'text-rose-800' : 'text-slate-700')}>
                                High-alert medication
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Requires a second-nurse witness name on administration. Use for insulin, anticoagulants, chemo, controlled substances.
                            </p>
                        </div>
                        <div className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center mt-0.5',
                            form.highAlert ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-300'
                        )}>
                            {form.highAlert && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => set('allergyOverride', !form.allergyOverride)}
                        className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
                            form.allergyOverride
                                ? 'border-amber-300 bg-amber-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                    >
                        <AlertTriangle className={cn('h-5 w-5 mt-0.5 shrink-0', form.allergyOverride ? 'text-amber-600' : 'text-slate-400')} />
                        <div className="flex-1">
                            <p className={cn('text-xs font-bold', form.allergyOverride ? 'text-amber-800' : 'text-slate-700')}>
                                Override an allergy / interaction
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Use only when the clinical benefit clearly outweighs the risk. Reason is required.
                            </p>
                        </div>
                        <div className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center mt-0.5',
                            form.allergyOverride ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-300'
                        )}>
                            {form.allergyOverride && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                    </button>

                    {form.allergyOverride && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Override Reason *</Label>
                            <Textarea
                                value={form.allergyOverrideReason ?? ''}
                                onChange={e => set('allergyOverrideReason', e.target.value)}
                                rows={2}
                                className="text-sm mt-1"
                            />
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Create Order</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Administer sheet ───────────────────────────────────────────────────────

interface AdministerContext {
    dose: MedicationDueDose;
}

const AdministerSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    ctx: AdministerContext | null;
    admissionId: string;
    onRecorded: () => void;
}> = ({ open, onOpenChange, ctx, admissionId, onRecorded }) => {
    const { toast } = useToast();
    const [action, setAction] = useState<RecordMedicationAdministrationRequest['actionStatus']>('ADMINISTERED');
    const [administeredDose, setAdministeredDose] = useState('');
    const [administeredRoute, setAdministeredRoute] = useState('');
    const [administrationSite, setAdministrationSite] = useState('');
    const [witnessName, setWitnessName] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !ctx) return;
        setAction('ADMINISTERED');
        setAdministeredDose(ctx.dose.dose);
        setAdministeredRoute(ctx.dose.route);
        setAdministrationSite('');
        setWitnessName('');
        setReason('');
        setNotes('');
    }, [open, ctx]);

    const handleSubmit = async () => {
        if (submitting || !ctx) return;
        if ((action === 'HELD' || action === 'REFUSED' || action === 'PATIENT_NOT_AVAILABLE') && !reason.trim()) {
            toast({ title: 'Reason required', description: 'Document why this dose was not administered.', variant: 'destructive' });
            return;
        }
        if (ctx.dose.highAlert && action === 'ADMINISTERED' && !witnessName.trim()) {
            toast({ title: 'Witness required', description: 'This is a high-alert drug. Enter the witness nurse name.', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await medicationService.recordAdministration({
                admissionId,
                medicationOrderId: ctx.dose.medicationOrderId,
                scheduledFor: ctx.dose.scheduledFor,
                actionStatus: action,
                administeredDose: action === 'ADMINISTERED' ? administeredDose : undefined,
                administeredRoute: action === 'ADMINISTERED' ? administeredRoute : undefined,
                administrationSite: action === 'ADMINISTERED' ? (administrationSite || undefined) : undefined,
                witnessName: ctx.dose.highAlert && action === 'ADMINISTERED' ? witnessName : undefined,
                reason: reason || undefined,
                notes: notes || undefined,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not record');
            const dispenseBits: string[] = [];
            if (res.dispensed) {
                dispenseBits.push(`Dispensed ${res.dispensedQty}`);
                if (res.currentStock != null) dispenseBits.push(`stock ${res.currentStock}`);
                if (res.chargeEventId)         dispenseBits.push('billed');
                if (res.lowStockReached)       dispenseBits.push('LOW STOCK');
            }
            toast({
                title: `${ACTION_LABEL[action]}`,
                description: `${ctx.dose.drugName} · ${format(parseISO(ctx.dose.scheduledFor), 'd MMM HH:mm')}` +
                    (dispenseBits.length ? ` · ${dispenseBits.join(' · ')}` : ''),
                variant: res.lowStockReached ? 'destructive' : undefined,
            });
            onRecorded();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not record', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!ctx) return null;
    const dose = ctx.dose;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <SheetTitle className="text-base font-bold flex items-center gap-2">
                        <Pill className="h-5 w-5 text-indigo-600" /> Record Dose
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                        Scheduled for {format(parseISO(dose.scheduledFor), 'EEE d MMM · HH:mm')}.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-bold text-slate-900">{dose.drugName}</p>
                                {dose.genericName && <p className="text-[11px] text-slate-500">{dose.genericName}</p>}
                                <p className="text-xs text-slate-600 mt-1">{dose.dose} · {dose.route} · {dose.frequencyCode}</p>
                            </div>
                            {dose.highAlert && (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                                    <ShieldAlert className="h-3 w-3 mr-1" /> HIGH-ALERT
                                </Badge>
                            )}
                        </div>
                        {dose.allergyOverride && (
                            <p className="text-[11px] text-amber-700 font-semibold mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Allergy override on order
                            </p>
                        )}
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Action</Label>
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                            {(['ADMINISTERED', 'HELD', 'REFUSED', 'PATIENT_NOT_AVAILABLE'] as const).map(a => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => setAction(a)}
                                    className={cn(
                                        'px-2.5 py-2 rounded-md border text-xs font-semibold transition-all',
                                        action === a
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >
                                    {ACTION_LABEL[a]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {action === 'ADMINISTERED' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Dose given</Label>
                                    <Input value={administeredDose} onChange={e => setAdministeredDose(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Route</Label>
                                    <Input value={administeredRoute} onChange={e => setAdministeredRoute(e.target.value)} className="h-9 mt-1" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Site</Label>
                                <Input value={administrationSite} onChange={e => setAdministrationSite(e.target.value)} className="h-9 mt-1" placeholder="e.g. R deltoid" />
                            </div>
                            {dose.highAlert && (
                                <div>
                                    <Label className="text-xs font-semibold text-rose-700">Witness nurse name *</Label>
                                    <Input value={witnessName} onChange={e => setWitnessName(e.target.value)} className="h-9 mt-1 border-rose-300" />
                                    <p className="text-[10px] text-rose-600 mt-1">Required for high-alert medications.</p>
                                </div>
                            )}
                        </>
                    )}

                    {(action === 'HELD' || action === 'REFUSED' || action === 'PATIENT_NOT_AVAILABLE') && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Reason *</Label>
                            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="text-sm mt-1" />
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Record</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Due Doses view ─────────────────────────────────────────────────────────

const DueDosesView: React.FC<{ admissionId: string; refreshKey: number; onRecorded: () => void }> = ({ admissionId, refreshKey, onRecorded }) => {
    const [doses, setDoses] = useState<MedicationDueDose[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ctx, setCtx] = useState<AdministerContext | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await medicationService.listDueDoses(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setDoses(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load due doses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const grouped = useMemo(() => {
        const out: Record<string, MedicationDueDose[]> = { OVERDUE: [], DUE: [], UPCOMING: [], DONE: [] };
        for (const d of doses) {
            const bucket =
                d.slotStatus === 'OVERDUE' || d.slotStatus === 'MISSED' ? 'OVERDUE' :
                d.slotStatus === 'DUE' ? 'DUE' :
                d.slotStatus === 'UPCOMING' ? 'UPCOMING' :
                'DONE';
            out[bucket].push(d);
        }
        return out;
    }, [doses]);

    const openSheet = (dose: MedicationDueDose) => {
        setCtx({ dose });
        setSheetOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" className="h-8" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            {loading && (
                <div className="space-y-2">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {!loading && !error && doses.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Pill className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No scheduled doses</p>
                    <p className="text-xs text-slate-500 mt-1">Create a medication order from the Orders tab to start the schedule.</p>
                </div>
            )}

            {!loading && !error && doses.length > 0 && (
                <div className="space-y-4">
                    {(['OVERDUE', 'DUE', 'UPCOMING', 'DONE'] as const).map(bucket => {
                        const list = grouped[bucket];
                        if (list.length === 0) return null;
                        return (
                            <div key={bucket}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                    {bucket === 'OVERDUE' ? 'Overdue / Missed' : bucket === 'DUE' ? 'Due now' : bucket === 'UPCOMING' ? 'Upcoming' : 'Recorded'}
                                    <span className="text-slate-400 ml-1.5 font-medium">({list.length})</span>
                                </p>
                                <div className="space-y-2">
                                    {list.map(d => {
                                        const tone = SLOT_TONE[d.slotStatus] ?? SLOT_TONE.UPCOMING;
                                        const past = new Date(d.scheduledFor).getTime() < Date.now();
                                        return (
                                            <div
                                                key={`${d.medicationOrderId}-${d.scheduledFor}`}
                                                className={cn(
                                                    'rounded-lg border bg-white p-3 flex items-center gap-3',
                                                    bucket === 'OVERDUE' && 'ring-1 ring-rose-200'
                                                )}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{d.drugName}</p>
                                                        {d.highAlert && (
                                                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                                                                <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> HIGH-ALERT
                                                            </Badge>
                                                        )}
                                                        {d.allergyOverride && (
                                                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                                                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Allergy override
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-0.5">{d.dose} · {d.route} · {d.frequencyCode}</p>
                                                    <p className="text-[11px] text-slate-500 mt-1">
                                                        {d.frequencyCode === 'PRN'
                                                            ? 'On demand'
                                                            : <>
                                                                {format(parseISO(d.scheduledFor), 'EEE d MMM · HH:mm')}
                                                                <span className="text-slate-400 ml-1.5">
                                                                    ({past ? `${formatDistanceToNowStrict(parseISO(d.scheduledFor))} ago` : `in ${formatDistanceToNowStrict(parseISO(d.scheduledFor))}`})
                                                                </span>
                                                            </>}
                                                    </p>
                                                    {d.actedBy && d.actedAt && (
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {ACTION_LABEL[d.slotStatus] ?? d.slotStatus} by {d.actedBy} · {format(parseISO(d.actedAt), 'HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <Badge variant="outline" className={cn('text-[10px] font-bold flex items-center gap-1', tone.bg)}>
                                                        {tone.icon} {tone.label}
                                                    </Badge>
                                                    {!d.medicationAdministrationId && (
                                                        <Button size="sm" className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold" onClick={() => openSheet(d)}>
                                                            Record
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AdministerSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                ctx={ctx}
                admissionId={admissionId}
                onRecorded={() => { load(true); onRecorded(); }}
            />
        </div>
    );
};

// ─── Orders view ────────────────────────────────────────────────────────────

const OrdersView: React.FC<{ admissionId: string; refreshKey: number; onChanged: () => void }> = ({ admissionId, refreshKey, onChanged }) => {
    const { toast } = useToast();
    const [orders, setOrders] = useState<MedicationOrder[]>([]);
    const [safety, setSafety] = useState<CheckMedicationSafetyResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const [ordersRes, safetyRes] = await Promise.all([
                medicationService.listOrders(admissionId),
                allergyService.checkSafety(admissionId, { includeExistingOrders: true }).catch(() => null),
            ]);
            if (!ordersRes.success) throw new Error(ordersRes.message ?? 'Failed to load');
            setOrders(ordersRes.items ?? []);
            setSafety(safetyRes && safetyRes.success ? safetyRes : null);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load medication orders');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const safetyHits = (safety?.allergyHits.length ?? 0) + (safety?.interactionHits.length ?? 0);

    const updateStatus = async (order: MedicationOrder, status: 'HELD' | 'ACTIVE' | 'DISCONTINUED') => {
        if (busyId) return;
        let reason: string | undefined;
        if (status === 'DISCONTINUED') {
            reason = window.prompt('Discontinue reason?') ?? '';
            if (!reason.trim()) return;
        }
        setBusyId(order.medicationOrderId);
        try {
            const res = await medicationService.updateOrderStatus({
                medicationOrderId: order.medicationOrderId,
                status,
                discontinueReason: reason,
            });
            if (!res.success) throw new Error(res.message ?? 'Could not update');
            toast({ title: `Order ${status.toLowerCase()}` });
            load(true);
            onChanged();
        } catch (e: any) {
            toast({ title: 'Could not update', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                    <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 font-semibold" onClick={() => setSheetOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> New Order
                    </Button>
                </div>
            </div>

            {safety && safetyHits > 0 && (
                <div className={cn(
                    'rounded-lg border-2 p-3',
                    safety.overallSeverity === 'CONTRAINDICATED' || safety.overallSeverity === 'MAJOR'
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-amber-300 bg-amber-50'
                )}>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                        Active safety alerts · {safety.overallSeverity} · {safetyHits} issue{safetyHits === 1 ? '' : 's'}
                    </p>
                    <div className="space-y-1.5">
                        {safety.allergyHits.map(h => (
                            <div key={`oa-${h.patientAllergyId}-${h.medicationOrderId ?? ''}-${h.drugName}`} className="text-[11px] flex items-start gap-2">
                                <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0', ALLERGY_SEVERITY_TONE[h.severity] ?? '')}>
                                    ALLERGY · {h.severity}
                                </Badge>
                                <span className="text-slate-700">
                                    <strong>{h.allergen}</strong> in active order {h.drugName}{h.reaction && <span className="text-slate-500"> · {h.reaction}</span>}
                                </span>
                            </div>
                        ))}
                        {safety.interactionHits.map(h => (
                            <div key={`oi-${h.drugInteractionId}-${h.orderIdA ?? ''}-${h.orderIdB ?? ''}`} className="text-[11px] flex items-start gap-2">
                                <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0', INTERACTION_SEVERITY_TONE[h.severity] ?? '')}>
                                    INTERACTION · {h.severity}
                                </Badge>
                                <span className="text-slate-700">
                                    <strong>{h.drugA}</strong> ↔ <strong>{h.drugB}</strong>{h.effect && <span className="text-slate-500"> · {h.effect}</span>}
                                    {h.management && <div className="text-slate-500 mt-0.5">↳ {h.management}</div>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading && (
                <div className="space-y-2">
                    {[0, 1].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {!loading && !error && orders.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Pill className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No medication orders yet</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Prescribe the first medication to start the MAR schedule.</p>
                    <Button size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700" onClick={() => setSheetOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" /> New Order
                    </Button>
                </div>
            )}

            {!loading && !error && orders.length > 0 && (
                <div className="space-y-2">
                    {orders.map(o => {
                        const tone = ORDER_STATUS_TONE[o.status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                        const canHold = o.status === 'ACTIVE';
                        const canResume = o.status === 'HELD';
                        const canStop = o.status === 'ACTIVE' || o.status === 'HELD';
                        return (
                            <div key={o.medicationOrderId} className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-slate-900">{o.drugName}</p>
                                            {o.genericName && <span className="text-[11px] text-slate-500">({o.genericName})</span>}
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{o.status}</Badge>
                                            {o.highAlert && (
                                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                                                    <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> HIGH-ALERT
                                                </Badge>
                                            )}
                                            {o.allergyOverride && (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Allergy override
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-700 mt-1">
                                            {o.dose} · {o.route} · {o.frequencyCode}
                                            {o.durationDays && <span className="text-slate-400"> · {o.durationDays}d</span>}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Started {format(parseISO(o.startAt), 'd MMM HH:mm')}
                                            {o.endAt && <> · ends {format(parseISO(o.endAt), 'd MMM HH:mm')}</>}
                                            {o.prescribedByName && <> · by {o.prescribedByName}</>}
                                        </p>
                                        {o.allergyOverrideReason && (
                                            <p className="text-[11px] text-amber-700 mt-1">Override: {o.allergyOverrideReason}</p>
                                        )}
                                        {o.discontinueReason && (
                                            <p className="text-[11px] text-slate-600 mt-1">Discontinued: {o.discontinueReason}</p>
                                        )}
                                        {o.notes && <p className="text-[11px] text-slate-500 mt-1">{o.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {canHold && (
                                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(o, 'HELD')} disabled={busyId === o.medicationOrderId}>
                                                <PauseCircle className="h-3.5 w-3.5 mr-1" /> Hold
                                            </Button>
                                        )}
                                        {canResume && (
                                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(o, 'ACTIVE')} disabled={busyId === o.medicationOrderId}>
                                                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Resume
                                            </Button>
                                        )}
                                        {canStop && (
                                            <Button size="sm" variant="outline" className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => updateStatus(o, 'DISCONTINUED')} disabled={busyId === o.medicationOrderId}>
                                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Stop
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <NewOrderSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                admissionId={admissionId}
                onCreated={() => { load(true); onChanged(); }}
            />
        </div>
    );
};

// ─── History view ───────────────────────────────────────────────────────────

const HistoryView: React.FC<{ admissionId: string; refreshKey: number }> = ({ admissionId, refreshKey }) => {
    const [items, setItems] = useState<MedicationAdministrationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!admissionId) return;
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await medicationService.listAdministrations(admissionId);
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load administration history');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admissionId]);

    useEffect(() => { load(); }, [load, refreshKey]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{items.length} record{items.length === 1 ? '' : 's'}</p>
                <Button variant="outline" size="sm" className="h-8" onClick={() => load(true)} disabled={refreshing}>
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                </Button>
            </div>

            {loading && (
                <div className="space-y-2">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No administration history</p>
                    <p className="text-xs text-slate-500 mt-1">Records appear here as nurses act on due doses.</p>
                </div>
            )}

            {!loading && !error && items.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left px-3 py-2 font-bold">When</th>
                                <th className="text-left px-3 py-2 font-bold">Drug</th>
                                <th className="text-left px-3 py-2 font-bold">Action</th>
                                <th className="text-left px-3 py-2 font-bold">By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(it => {
                                const tone = SLOT_TONE[it.actionStatus === 'ADMINISTERED' ? 'DONE' : it.actionStatus] ?? SLOT_TONE.DONE;
                                return (
                                    <tr key={it.medicationAdministrationId} className="border-t border-slate-100">
                                        <td className="px-3 py-2 text-xs text-slate-700">{format(parseISO(it.actedAt), 'd MMM HH:mm')}</td>
                                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">
                                            {it.drugName}
                                            {it.administeredDose && <span className="text-slate-500 ml-1.5 font-normal">{it.administeredDose}</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', tone.bg)}>
                                                {ACTION_LABEL[it.actionStatus] ?? it.actionStatus}
                                            </Badge>
                                            {it.witnessRequired && it.witnessName && (
                                                <span className="text-[10px] text-rose-700 ml-1.5">w/ {it.witnessName}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-600">{it.actedBy ?? '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── Allergies view ─────────────────────────────────────────────────────────

const ALLERGY_TYPES: { value: AllergyType; label: string }[] = [
    { value: 'DRUG', label: 'Drug' },
    { value: 'FOOD', label: 'Food' },
    { value: 'ENVIRONMENT', label: 'Environment' },
    { value: 'OTHER', label: 'Other' },
];
const ALLERGY_SEVERITIES: { value: AllergySeverity; label: string }[] = [
    { value: 'MILD', label: 'Mild' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'SEVERE', label: 'Severe' },
    { value: 'ANAPHYLAXIS', label: 'Anaphylaxis' },
];

const AddAllergySheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patientId: string;
    onAdded: () => void;
}> = ({ open, onOpenChange, patientId, onAdded }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<AddPatientAllergyRequest>({
        patientId, allergyType: 'DRUG', allergen: '', severity: 'MODERATE',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm({ patientId, allergyType: 'DRUG', allergen: '', severity: 'MODERATE' });
    }, [open, patientId]);

    const set = <K extends keyof AddPatientAllergyRequest>(k: K, v: AddPatientAllergyRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async () => {
        if (submitting) return;
        if (!form.allergen.trim()) { toast({ title: 'Allergen is required', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await allergyService.add(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: 'Allergy recorded', description: `${form.allergen} (${form.severity})` });
            onAdded();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <SheetTitle className="text-base font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" /> Record Allergy
                    </SheetTitle>
                    <SheetDescription className="text-xs">Active allergies are checked against every new medication order.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Type</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {ALLERGY_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => set('allergyType', t.value)}
                                    className={cn(
                                        'px-2.5 h-8 rounded-md border text-xs font-semibold transition-all',
                                        form.allergyType === t.value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{t.label}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Allergen *</Label>
                        <Input value={form.allergen} onChange={e => set('allergen', e.target.value)} className="h-9 mt-1" placeholder="e.g. Penicillin" />
                        <p className="text-[10px] text-slate-500 mt-1">For drug allergies, this name is matched (case-insensitive) against drug & generic on every order.</p>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Severity</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {ALLERGY_SEVERITIES.map(s => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => set('severity', s.value)}
                                    className={cn(
                                        'px-2.5 h-8 rounded-md border text-xs font-semibold transition-all',
                                        form.severity === s.value
                                            ? cn('ring-2 ring-indigo-200', ALLERGY_SEVERITY_TONE[s.value], 'border-indigo-400')
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{s.label}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Reaction</Label>
                        <Input value={form.reaction ?? ''} onChange={e => set('reaction', e.target.value)} className="h-9 mt-1" placeholder="e.g. Rash, swelling, breathing difficulty" />
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="text-sm mt-1" />
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Record Allergy</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

const AllergiesView: React.FC<{ patientId?: string; refreshKey: number; onChanged: () => void }> = ({ patientId, refreshKey, onChanged }) => {
    const { toast } = useToast();
    const [items, setItems] = useState<PatientAllergy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!patientId) { setLoading(false); return; }
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await allergyService.list(patientId, true);
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load allergies');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [patientId]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const deactivate = async (a: PatientAllergy) => {
        if (busyId) return;
        if (!window.confirm(`Deactivate "${a.allergen}"? It will stop flagging on new orders.`)) return;
        setBusyId(a.patientAllergyId);
        try {
            const res = await allergyService.deactivate({ patientAllergyId: a.patientAllergyId });
            if (!res.success) throw new Error(res.message ?? 'Could not deactivate');
            toast({ title: 'Allergy deactivated' });
            load(true);
            onChanged();
        } catch (e: any) {
            toast({ title: 'Could not deactivate', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setBusyId(null);
        }
    };

    if (!patientId) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Patient ID not available</p>
                <p className="text-xs text-slate-500 mt-1">Allergies are scoped to the patient, not the admission.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{items.filter(i => i.isActive).length} active · {items.length} total</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                    <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 font-semibold" onClick={() => setSheetOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Record Allergy
                    </Button>
                </div>
            </div>

            {loading && (
                <div className="space-y-2">
                    {[0, 1].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
            )}

            {error && !loading && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No allergies recorded</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Add known drug allergies so new orders are checked automatically.</p>
                    <Button size="sm" className="h-9 bg-indigo-600 hover:bg-indigo-700" onClick={() => setSheetOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" /> Record Allergy
                    </Button>
                </div>
            )}

            {!loading && !error && items.length > 0 && (
                <div className="space-y-2">
                    {items.map(a => (
                        <div key={a.patientAllergyId} className={cn('rounded-lg border p-3 flex items-start justify-between gap-3', !a.isActive && 'opacity-60')}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-900">{a.allergen}</p>
                                    <Badge variant="outline" className={cn('text-[10px] font-bold', ALLERGY_SEVERITY_TONE[a.severity] ?? '')}>{a.severity}</Badge>
                                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-600 border-slate-200">{a.allergyType}</Badge>
                                    {!a.isActive && <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-500 border-slate-200">Inactive</Badge>}
                                </div>
                                {a.reaction && <p className="text-xs text-slate-600 mt-1">Reaction: {a.reaction}</p>}
                                {a.notes && <p className="text-[11px] text-slate-500 mt-1">{a.notes}</p>}
                                <p className="text-[11px] text-slate-400 mt-1">Recorded {format(parseISO(a.createdAt), 'd MMM yyyy')}{a.createdBy && <> by {a.createdBy}</>}</p>
                            </div>
                            {a.isActive && (
                                <Button size="sm" variant="outline" className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => deactivate(a)} disabled={busyId === a.patientAllergyId}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Deactivate
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AddAllergySheet open={sheetOpen} onOpenChange={setSheetOpen} patientId={patientId} onAdded={() => { load(true); onChanged(); }} />
        </div>
    );
};

// ─── Main tab ───────────────────────────────────────────────────────────────

export const MarTab: React.FC<MarTabProps> = ({ admissionId, patientId, isActive }) => {
    const [view, setView] = useState<SubView>('due');
    const [refreshKey, setRefreshKey] = useState(0);

    if (!isActive) return null;

    const bump = () => setRefreshKey(k => k + 1);

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Pill className="h-4 w-4 text-indigo-600" /> Medication Administration Record
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Orders, due doses, patient allergies, and two-nurse verification.
                    </p>
                </div>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                    {(['due', 'orders', 'allergies', 'history'] as SubView[]).map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            className={cn(
                                'h-8 px-4 rounded-md text-xs font-semibold transition-all',
                                view === v
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            {SUB_VIEW_LABEL[v]}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'due'       && <DueDosesView   admissionId={admissionId} refreshKey={refreshKey} onRecorded={bump} />}
            {view === 'orders'    && <OrdersView     admissionId={admissionId} refreshKey={refreshKey} onChanged={bump} />}
            {view === 'allergies' && <AllergiesView  patientId={patientId}    refreshKey={refreshKey} onChanged={bump} />}
            {view === 'history'   && <HistoryView    admissionId={admissionId} refreshKey={refreshKey} />}
        </div>
    );
};
