import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Loader2, BedDouble, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ipdBillingService, type ChargeMaster, type AddChargeEventRequest } from '../../services/ipdBillingService';
import { offlineMutation, isReachable } from '@/offline';
import { useAuthStore } from '@/store/authStore';
import { bedService, type BedMasterItem } from '@/features/hospital/services/bedService';

export interface AddChargeDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patientId: string;
    encounterId: string;
    onSaved: () => void;
    // Optional optimistic hook: shows the charge in the ledger instantly; returns a rollback fn.
    onOptimistic?: (rows: Array<{ displayName: string; qty: number; rate: number; discountPercent: number; categoryCode: string }>) => () => void;
}

type Source = 'catalog' | 'bed' | 'manual';
const MANUAL_CATEGORIES = ['OTHER', 'PROCEDURE', 'LAB', 'RADIOLOGY', 'PHARMACY', 'CONSUMABLE', 'CONSULT'];

interface StagedItem {
    key: string;
    charge: AddChargeEventRequest['charges'][number];
    net: number;
}

export const AddChargeDialog: React.FC<AddChargeDialogProps> = ({ open, onOpenChange, patientId, encounterId, onSaved, onOptimistic }) => {
    const { toast } = useToast();
    const [source, setSource] = useState<Source>('catalog');

    // Catalog
    const [chargeMasters, setChargeMasters] = useState<ChargeMaster[]>([]);
    const [chargeMasterFilter, setChargeMasterFilter] = useState('');
    const [loadingMasters, setLoadingMasters] = useState(false);
    const [selectedMaster, setSelectedMaster] = useState<ChargeMaster | null>(null);

    // Bed / Room
    const [beds, setBeds] = useState<BedMasterItem[]>([]);
    const [bedFilter, setBedFilter] = useState('');
    const [loadingBeds, setLoadingBeds] = useState(false);
    const [selectedBed, setSelectedBed] = useState<BedMasterItem | null>(null);
    const [bedFrom, setBedFrom] = useState('');
    const [bedTo, setBedTo] = useState('');

    // Manual
    const [manualName, setManualName] = useState('');
    const [manualCategory, setManualCategory] = useState('OTHER');
    const [manualGstRate, setManualGstRate] = useState('');
    const [manualIncentive, setManualIncentive] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Shared line inputs
    const [qty, setQty] = useState(1);
    const [rate, setRate] = useState(0);
    const [discountKind, setDiscountKind] = useState<'percent' | 'amount'>('amount');
    const [discountValue, setDiscountValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Items staged via "+ Add another" — submitted together with whatever's currently configured
    // in the form, in one API call, instead of needing a separate "add multiple" flow.
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);

    // Reset + load catalog on open
    useEffect(() => {
        if (!open) return;
        setSource('catalog');
        setSelectedMaster(null);
        setChargeMasterFilter('');
        setSelectedBed(null);
        setBedFilter('');
        setBedFrom('');
        setBedTo('');
        setManualName('');
        setManualCategory('OTHER');
        setManualGstRate('');
        setManualIncentive('');
        setQty(1);
        setRate(0);
        setDiscountKind('amount');
        setDiscountValue('');
        setStagedItems([]);
        let cancelled = false;
        (async () => {
            setLoadingMasters(true);
            try {
                const res = await ipdBillingService.listChargeMasters({ pageSize: 500 });
                if (!cancelled) setChargeMasters((res?.items ?? []).filter(m => m.isActive));
            } catch (e: any) {
                if (!cancelled) toast({ title: 'Could not load charge catalog', description: e?.message ?? '', variant: 'destructive' });
            } finally {
                if (!cancelled) setLoadingMasters(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, toast]);

    // Lazy-load beds the first time the Bed tab is opened. NOTE: keep deps to [open, source]
    // only — including loadingBeds/beds.length would re-run the effect mid-flight and its
    // cleanup would cancel the in-progress request, leaving the list empty.
    useEffect(() => {
        if (!open || source !== 'bed' || beds.length > 0) return;
        let cancelled = false;
        (async () => {
            setLoadingBeds(true);
            try {
                const res = await bedService.list({ pageSize: 500 });
                if (!cancelled) setBeds((res?.items ?? []).filter(b => b.isActive !== false));
            } catch (e: any) {
                if (!cancelled) toast({ title: 'Could not load beds', description: e?.message ?? '', variant: 'destructive' });
            } finally {
                if (!cancelled) setLoadingBeds(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, source]);

    const filteredMasters = useMemo(() => {
        const q = chargeMasterFilter.trim().toLowerCase();
        if (!q) return chargeMasters;
        return chargeMasters.filter(m =>
            (m.displayName ?? '').toLowerCase().includes(q)
            || (m.chargeCode ?? '').toLowerCase().includes(q)
            || (m.categoryCode ?? '').toLowerCase().includes(q)
        );
    }, [chargeMasters, chargeMasterFilter]);

    const filteredBeds = useMemo(() => {
        const q = bedFilter.trim().toLowerCase();
        if (!q) return beds;
        return beds.filter(b =>
            [b.wardType, b.wardName, b.roomType, b.bedName, b.bedCode].filter(Boolean).join(' ').toLowerCase().includes(q)
        );
    }, [beds, bedFilter]);

    // Inclusive day count: 01 May → 03 May = 3 days.
    const bedDays = useMemo(() => {
        if (!bedFrom || !bedTo) return 0;
        const f = new Date(bedFrom); const t = new Date(bedTo);
        if (isNaN(f.getTime()) || isNaN(t.getTime()) || t < f) return 0;
        return Math.floor((t.getTime() - f.getTime()) / 86400000) + 1;
    }, [bedFrom, bedTo]);

    // In bed mode the day count drives the quantity.
    useEffect(() => {
        if (source === 'bed' && bedDays > 0) setQty(bedDays);
    }, [source, bedDays]);

    const pickMaster = (m: ChargeMaster) => {
        setSelectedMaster(m);
        setQty(m.defaultQty || 1);
        setRate(Number(m.defaultRate || 0));
    };

    const pickBed = (b: BedMasterItem) => {
        setSelectedBed(b);
        setRate(Number(b.effectiveDailyRate || b.bedDailyRateOverride || b.wardRoomDailyRate || 0));
        if (bedDays > 0) setQty(bedDays);
    };

    const switchSource = (s: Source) => {
        setSource(s);
        if (s !== 'catalog') setSelectedMaster(null);
        if (s !== 'bed') setSelectedBed(null);
        if (s === 'manual') { setQty(1); }
    };

    const fmtDate = (d: string) => {
        const x = new Date(d);
        return isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const bedLabel = selectedBed
        ? `Room/Bed — ${[selectedBed.wardType || selectedBed.wardName, selectedBed.roomType, selectedBed.bedName].filter(Boolean).join(' · ')}`
          + (bedFrom && bedTo ? ` (${fmtDate(bedFrom)}–${fmtDate(bedTo)}, ${bedDays}d)` : '')
        : '';

    const canSubmit =
        source === 'manual' ? manualName.trim().length > 0
        : source === 'bed' ? (!!selectedBed && bedDays > 0)
        : !!selectedMaster;

    const gross = qty * rate;
    const cap = selectedMaster?.maxDiscountPercent ?? 100;
    const rawDisc = parseFloat(discountValue || '0') || 0;
    const discountAmount = Math.max(0, Math.min(gross, discountKind === 'amount' ? rawDisc : (gross * rawDisc) / 100));
    const discountPercent = gross > 0 ? (discountAmount / gross) * 100 : 0;
    const net = gross - discountAmount;
    const needsApproval = discountPercent > cap + 0.001;

    // Builds the charge for whatever is currently configured in the form — shared by "Add
    // another" (stages it and resets for the next pick) and the final submit (includes it
    // alongside anything already staged). Returns null when the current selection is incomplete.
    const buildCurrentCharge = (): AddChargeEventRequest['charges'][number] | null => {
        if (!canSubmit || qty <= 0 || rate < 0) return null;
        const manualGst = parseFloat(manualGstRate || '');
        const manualInc = parseFloat(manualIncentive || '');
        if (source === 'bed' && selectedBed) {
            return {
                displayName: bedLabel,
                qty,
                rate,
                discountPercent,
                categoryCode: 'BED',
                incentiveAmount: selectedBed.incentiveAmount ? selectedBed.incentiveAmount * qty : undefined,
            };
        }
        if (source === 'manual') {
            return {
                displayName: manualName.trim(), qty, rate, discountPercent, categoryCode: manualCategory,
                gstRate: Number.isFinite(manualGst) && manualGst > 0 ? manualGst : undefined,
                incentiveAmount: Number.isFinite(manualInc) && manualInc > 0 ? manualInc : undefined,
            };
        }
        if (source === 'catalog' && selectedMaster) {
            return { chargeId: selectedMaster.chargeId, displayName: selectedMaster.displayName ?? '', qty, rate, discountPercent, categoryCode: selectedMaster.categoryCode ?? 'OTHER' };
        }
        return null;
    };

    // Stages the current selection and clears just the pick/amount fields (keeps the current
    // source tab) so the next item can be configured without losing what's already staged.
    const addAnother = () => {
        const charge = buildCurrentCharge();
        if (!charge) {
            toast({
                title: source === 'manual' ? 'Enter a charge name' : source === 'bed' ? 'Pick a bed and a valid date range' : 'Pick a charge from the catalog',
                variant: 'destructive',
            });
            return;
        }
        setStagedItems(prev => [...prev, { key: `${prev.length}-${charge.displayName}-${Date.now()}`, charge, net }]);
        setSelectedMaster(null);
        setSelectedBed(null);
        setBedFrom('');
        setBedTo('');
        setManualName('');
        setShowAdvanced(false);
        setQty(1);
        setRate(0);
        setDiscountKind('amount');
        setDiscountValue('');
    };

    const removeStaged = (key: string) => setStagedItems(prev => prev.filter(s => s.key !== key));

    const submit = async () => {
        if (submitting) return;
        const currentCharge = buildCurrentCharge();
        const charges = [...stagedItems.map(s => s.charge), ...(currentCharge ? [currentCharge] : [])];
        if (charges.length === 0) {
            toast({ title: 'Add at least one item', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            const hospitalId = useAuthStore.getState().getHospitalId() ?? undefined;
            // Optimistic UI (online): show the charge(s) in the ledger instantly; roll back on failure.
            const rollback = isReachable()
                ? onOptimistic?.(charges.map(c => ({ displayName: c.displayName, qty: c.qty, rate: c.rate, discountPercent: c.discountPercent, categoryCode: c.categoryCode })))
                : undefined;
            // Add-charge is safe to queue offline (it targets an existing, already-synced encounter
            // and the backend appends). Payments/finalize stay online-only.
            try {
                const { queued, data: res } = await offlineMutation<any>({
                    entity: 'billing',
                    opType: 'create',
                    client: 'ipd',
                    method: 'post',
                    url: 'charge/add-event',
                    data: { patientId, encounterId, charges, hospitalId },
                    label: charges.length > 1 ? `${charges.length} charges` : `Charge · ${charges[0].displayName}`,
                    hospitalId,
                    run: () => ipdBillingService.addChargeEvents({ patientId, encounterId, charges }),
                    synthetic: () => ({ success: true, message: 'Queued offline' }),
                });
                if (queued) {
                    toast({ title: 'Saved offline', description: `${charges.length} item${charges.length === 1 ? '' : 's'} will be added when you're back online.` });
                } else {
                    if (!res?.success) throw new Error(res?.message ?? 'Could not add charge');
                    toast({ title: charges.length > 1 ? `${charges.length} items added` : 'Charge added', description: charges.length === 1 ? charges[0].displayName : undefined });
                }
            } catch (mutErr) {
                rollback?.();
                throw mutErr;
            }
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not add charge', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const tabClass = (active: boolean) => cn('px-3 py-1.5 font-semibold transition-colors', active ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col bg-white dark:bg-slate-950">
                {/* Premium gradient header */}
                <div className="px-6 py-5 bg-gradient-to-r from-brand-500 to-violet-600">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Plus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-white text-lg font-bold">Add Item</SheetTitle>
                            <p className="text-brand-50/90 text-xs mt-0.5">Pick from the catalog, a bed by date range, or a custom item — add as many as you need</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Catalog-first: catalog & bed are the real modes; a custom item is the rare fallback. */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-xs">
                            <button type="button" onClick={() => switchSource('catalog')} className={tabClass(source === 'catalog')}>Catalog</button>
                            <button type="button" onClick={() => switchSource('bed')} className={tabClass(source === 'bed')}>Bed / Room</button>
                        </div>
                        <button type="button" onClick={() => switchSource('manual')} className={cn('text-[11px] font-medium underline underline-offset-2 shrink-0', source === 'manual' ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600')}>
                            {source === 'manual' ? '✎ Custom item' : '+ Custom item'}
                        </button>
                    </div>

                    {source === 'catalog' && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700">Search the catalog</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input value={chargeMasterFilter} onChange={(e) => setChargeMasterFilter(e.target.value)} placeholder="Type a service name, code or category…" className="h-9 pl-8 text-sm rounded-xl" autoFocus />
                                </div>
                                <div className="border border-slate-200 rounded-xl max-h-[220px] overflow-auto bg-white">
                                    {loadingMasters ? (
                                        <div className="p-3 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
                                    ) : filteredMasters.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-500">Nothing matches. <button type="button" onClick={() => switchSource('manual')} className="text-brand-600 underline font-semibold">Add it as a custom item</button>.</div>
                                    ) : (
                                        filteredMasters.map(m => (
                                            <button key={m.chargeId} type="button" onClick={() => pickMaster(m)}
                                                className={cn('w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-brand-50/40 text-xs transition-colors', selectedMaster?.chargeId === m.chargeId && 'bg-brand-50 border-l-2 border-l-brand-500')}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-slate-900 truncate">{m.displayName}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{m.chargeCode} · {m.categoryCode} · {m.appliesTo}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap tabular-nums">₹{Number(m.defaultRate).toLocaleString('en-IN')}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Selected</Label>
                                <div className="h-10 mt-1 px-3 flex items-center text-sm border border-slate-200 rounded-xl bg-slate-50">
                                    {selectedMaster ? <span className="truncate font-semibold">{selectedMaster.displayName}</span> : <span className="text-slate-400 italic">No charge selected</span>}
                                </div>
                            </div>
                        </>
                    )}

                    {source === 'bed' && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-brand-500" /> Bed / Room</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input value={bedFilter} onChange={(e) => setBedFilter(e.target.value)} placeholder="Search ward / room / bed…" className="h-9 pl-8 text-sm rounded-xl" />
                                </div>
                                <div className="border border-slate-200 rounded-xl max-h-[180px] overflow-auto bg-white">
                                    {loadingBeds ? (
                                        <div className="p-3 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
                                    ) : filteredBeds.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-500">No beds configured.</div>
                                    ) : (
                                        filteredBeds.map(b => (
                                            <button key={b.bedId} type="button" onClick={() => pickBed(b)}
                                                className={cn('w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-brand-50/40 text-xs transition-colors', selectedBed?.bedId === b.bedId && 'bg-brand-50 border-l-2 border-l-brand-500')}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-slate-900 truncate">{[b.wardType || b.wardName, b.bedName || b.bedCode].filter(Boolean).join(' · ') || 'Bed'}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{[b.roomType, b.roomCode].filter(Boolean).join(' · ')}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap tabular-nums">₹{Number(b.effectiveDailyRate).toLocaleString('en-IN')}/day</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">From</Label>
                                    <Input type="date" value={bedFrom} onChange={(e) => setBedFrom(e.target.value)} className="h-10 mt-1 rounded-xl" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">To</Label>
                                    <Input type="date" value={bedTo} min={bedFrom || undefined} onChange={(e) => setBedTo(e.target.value)} className="h-10 mt-1 rounded-xl" />
                                </div>
                            </div>

                            {bedFrom && bedTo && (
                                <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-xs', bedDays > 0 ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-rose-50 text-rose-700 border border-rose-200')}>
                                    <CalendarDays className="h-4 w-4" />
                                    {bedDays > 0
                                        ? <span><b>{bedDays}</b> day{bedDays === 1 ? '' : 's'} × ₹{rate.toLocaleString('en-IN')}/day (inclusive of both dates)</span>
                                        : <span>“To” date must be on or after “From”.</span>}
                                </div>
                            )}
                        </>
                    )}

                    {source === 'manual' && (
                        <>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Charge name <span className="text-rose-500">*</span></Label>
                                <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Dressing, X-Ray, Ambulance…" className="h-10 mt-1 rounded-xl" autoFocus />
                            </div>
                            {/* Just name + amount by default — category/GST/incentive are optional and
                                default sensibly on the backend, so they hide behind "Advanced". */}
                            <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-[11px] font-medium text-brand-600 hover:text-brand-700 self-start">
                                {showAdvanced ? '− Hide advanced' : '+ Advanced (category, GST, incentive)'}
                            </button>
                            {showAdvanced && (
                                <>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-700">Category</Label>
                                        <Select value={manualCategory} onValueChange={setManualCategory}>
                                            <SelectTrigger className="h-10 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {MANUAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs font-semibold text-slate-700">GST Rate (%)</Label>
                                            <Input type="number" min={0} max={28} step="0.01" value={manualGstRate} onChange={(e) => setManualGstRate(e.target.value)} placeholder="0 (no tax)" className="h-10 mt-1 rounded-xl" />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold text-slate-700">Incentive (₹)</Label>
                                            <Input type="number" min={0} step="0.01" value={manualIncentive} onChange={(e) => setManualIncentive(e.target.value)} placeholder="0" className="h-10 mt-1 rounded-xl" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Optional. GST falls back to the hospital policy default when left blank; incentive accrues to the visit's referrer.</p>
                                </>
                            )}
                        </>
                    )}

                    {/* Qty / Rate / Discount */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">{source === 'bed' ? 'Days' : 'Qty'}</Label>
                            <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || '0', 10))} className="h-10 mt-1 rounded-xl" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">{source === 'bed' ? 'Rate/day' : 'Rate'}</Label>
                            <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(parseFloat(e.target.value || '0'))} className="h-10 mt-1 rounded-xl" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-700">Discount</Label>
                                <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
                                    <button type="button" onClick={() => setDiscountKind('percent')} className={cn('px-1.5 text-[10px] font-bold leading-5', discountKind === 'percent' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500')}>%</button>
                                    <button type="button" onClick={() => setDiscountKind('amount')} className={cn('px-1.5 text-[10px] font-bold leading-5', discountKind === 'amount' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500')}>₹</button>
                                </div>
                            </div>
                            <Input type="number" min={0} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountKind === 'percent' ? '0%' : '₹0'} className="h-10 mt-1 rounded-xl" />
                        </div>
                    </div>

                    {/* Live preview */}
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Gross {source === 'bed' && bedDays > 0 ? `(${qty} × ₹${rate.toLocaleString('en-IN')})` : ''}</span><span className="tabular-nums font-semibold">₹{gross.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Discount {discountAmount > 0 ? `(${discountPercent.toFixed(1)}%)` : ''}</span><span className="tabular-nums font-semibold text-rose-600">- ₹{discountAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200"><span className="font-bold text-slate-800">Net</span><span className="tabular-nums font-bold text-emerald-700">₹{net.toFixed(2)}</span></div>
                        {needsApproval && (
                            <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                                <span>⚠</span>
                                <span>Discount {discountPercent.toFixed(1)}% exceeds the usual {cap}% cap for this charge.</span>
                            </div>
                        )}
                    </div>

                    {/* Stage this item and keep picking — submitted together as one batch. */}
                    <Button type="button" variant="outline" onClick={addAnother} disabled={!canSubmit || submitting} className="w-full rounded-xl border-brand-200 text-brand-700 hover:bg-brand-50">
                        <Plus className="h-4 w-4 mr-1.5" /> Add another item
                    </Button>

                    {stagedItems.length > 0 && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-2 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 px-1">Staged ({stagedItems.length})</p>
                            {stagedItems.map(item => (
                                <div key={item.key} className="flex items-center justify-between gap-2 bg-white rounded-lg border border-slate-200 px-2.5 py-1.5">
                                    <span className="text-xs font-medium text-slate-700 truncate">{item.charge.displayName}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold tabular-nums text-slate-700">₹{item.net.toFixed(2)}</span>
                                        <button type="button" onClick={() => removeStaged(item.key)} className="text-slate-400 hover:text-rose-600 text-sm leading-none" title="Remove">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 mt-auto">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || (stagedItems.length === 0 && !canSubmit)} className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20">
                        {submitting
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</>
                            : <><Plus className="h-4 w-4 mr-2" />{stagedItems.length > 0 ? `Add ${stagedItems.length + (canSubmit ? 1 : 0)} Items` : 'Add Item'}</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AddChargeDialog;
