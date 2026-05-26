import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Boxes, Plus, Search, RefreshCw, Loader2, AlertCircle, AlertTriangle,
    PackagePlus, PackageMinus, Settings2, X, Save, History,
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
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns';
import {
    inventoryService,
    type InventoryItem,
    type InventoryMovementItem,
    type UpsertInventoryItemRequest,
    type InventoryCategory,
} from '../services/inventoryService';

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
    { value: 'CONSUMABLE', label: 'Consumable' },
    { value: 'DRUG',       label: 'Drug' },
    { value: 'DISPOSABLE', label: 'Disposable' },
    { value: 'SURGICAL',   label: 'Surgical' },
    { value: 'IMPLANT',    label: 'Implant' },
    { value: 'OTHER',      label: 'Other' },
];

const CATEGORY_TONE: Record<string, string> = {
    CONSUMABLE: 'bg-slate-50 text-slate-700 border-slate-200',
    DRUG:       'bg-indigo-50 text-indigo-700 border-indigo-200',
    DISPOSABLE: 'bg-amber-50 text-amber-700 border-amber-200',
    SURGICAL:   'bg-rose-50 text-rose-700 border-rose-200',
    IMPLANT:    'bg-violet-50 text-violet-700 border-violet-200',
    OTHER:      'bg-slate-50 text-slate-600 border-slate-200',
};

const MOVEMENT_TONE: Record<string, string> = {
    RECEIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    ISSUE:      'bg-rose-50 text-rose-700 border-rose-200',
    RETURN:     'bg-sky-50 text-sky-700 border-sky-200',
    ADJUST_IN:  'bg-amber-50 text-amber-700 border-amber-200',
    ADJUST_OUT: 'bg-amber-50 text-amber-700 border-amber-200',
};

const inr = (n: number | undefined | null) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// ─── Item editor sheet ──────────────────────────────────────────────────────

const initialItem = (): UpsertInventoryItemRequest => ({
    itemCode: '',
    itemName: '',
    category: 'CONSUMABLE',
    unit: 'PCS',
    minStockLevel: 0,
    isActive: true,
    isTaxable: false,
});

const ItemSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editing?: InventoryItem | null;
    onSaved: () => void;
}> = ({ open, onOpenChange, editing, onSaved }) => {
    const { toast } = useToast();
    const [form, setForm] = useState<UpsertInventoryItemRequest>(initialItem());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                inventoryItemId: editing.inventoryItemId,
                itemCode: editing.itemCode,
                itemName: editing.itemName,
                genericName: editing.genericName,
                manufacturer: editing.manufacturer,
                category: editing.category,
                unit: editing.unit,
                defaultRate: editing.defaultRate,
                hsnSacCode: editing.hsnSacCode,
                gstSlabPercent: editing.gstSlabPercent,
                isTaxable: editing.isTaxable,
                chargeId: editing.chargeId,
                minStockLevel: editing.minStockLevel,
                storeLocation: editing.storeLocation,
                isActive: editing.isActive,
            });
        } else {
            setForm(initialItem());
        }
    }, [open, editing]);

    const set = <K extends keyof UpsertInventoryItemRequest>(k: K, v: UpsertInventoryItemRequest[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async () => {
        if (submitting) return;
        if (!form.itemCode.trim()) { toast({ title: 'Item code required', variant: 'destructive' }); return; }
        if (!form.itemName.trim()) { toast({ title: 'Item name required', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await inventoryService.upsertItem(form);
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({ title: editing ? 'Item updated' : 'Item created', description: `${form.itemCode} · ${form.itemName}` });
            onSaved();
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
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">{editing ? 'Edit Item' : 'New Item'}</SheetTitle>
                            <SheetDescription className="text-xs">Catalog entry for consumables, drugs, implants and other stocked items.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Item code *</Label>
                            <Input value={form.itemCode} onChange={e => set('itemCode', e.target.value)} className="h-9 mt-1 font-mono" disabled={!!editing} />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Unit *</Label>
                            <Input value={form.unit} onChange={e => set('unit', e.target.value)} className="h-9 mt-1" placeholder="PCS / TAB / VIAL / ML" />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-slate-700">Item name *</Label>
                            <Input value={form.itemName} onChange={e => set('itemName', e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Generic</Label>
                            <Input value={form.genericName ?? ''} onChange={e => set('genericName', e.target.value)} className="h-9 mt-1" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Manufacturer</Label>
                            <Input value={form.manufacturer ?? ''} onChange={e => set('manufacturer', e.target.value)} className="h-9 mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Category</Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => set('category', c.value)}
                                    className={cn(
                                        'px-2.5 h-8 rounded-md border text-xs font-semibold transition-all',
                                        form.category === c.value
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                    )}
                                >{c.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Default rate (₹)</Label>
                            <Input
                                type="number" min={0} step="0.01"
                                value={form.defaultRate ?? ''}
                                onChange={e => set('defaultRate', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-9 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Min stock level</Label>
                            <Input
                                type="number" min={0} step="0.001"
                                value={form.minStockLevel}
                                onChange={e => set('minStockLevel', parseFloat(e.target.value || '0'))}
                                className="h-9 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">HSN/SAC</Label>
                            <Input value={form.hsnSacCode ?? ''} onChange={e => set('hsnSacCode', e.target.value)} className="h-9 mt-1 font-mono" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">GST %</Label>
                            <Input
                                type="number" min={0} max={100} step="0.01"
                                value={form.gstSlabPercent ?? ''}
                                onChange={e => set('gstSlabPercent', e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="h-9 mt-1"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-slate-700">Store location</Label>
                            <Input value={form.storeLocation ?? ''} onChange={e => set('storeLocation', e.target.value)} className="h-9 mt-1" placeholder="e.g. Main Pharmacy / OT Store / ICU Cart" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={!!form.isTaxable} onChange={e => set('isTaxable', e.target.checked)} />
                            Taxable
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={!!form.isActive} onChange={e => set('isActive', e.target.checked)} />
                            Active
                        </label>
                    </div>
                </div>

                <div className="shrink-0 px-6 pt-3 pb-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Item</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Movement sheet (receive / issue / adjust) ──────────────────────────────

type MovementMode = 'RECEIVE' | 'ISSUE' | 'ADJUST';

const MovementSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    item: InventoryItem | null;
    mode: MovementMode;
    onDone: () => void;
}> = ({ open, onOpenChange, item, mode, onDone }) => {
    const { toast } = useToast();
    const [qty, setQty] = useState<string>('');
    const [unitCost, setUnitCost] = useState<string>('');
    const [unitRate, setUnitRate] = useState<string>('');
    const [discountPercent, setDiscountPercent] = useState<string>('0');
    const [batch, setBatch] = useState('');
    const [expiry, setExpiry] = useState('');
    const [encounterId, setEncounterId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setQty('');
        setUnitCost('');
        setUnitRate(item?.defaultRate?.toString() ?? '');
        setDiscountPercent('0');
        setBatch('');
        setExpiry('');
        setEncounterId('');
        setPatientId('');
        setReason('');
        setNotes('');
    }, [open, item]);

    if (!item) return null;

    const submit = async () => {
        if (submitting) return;
        const qtyNum = parseFloat(qty);
        if (!qtyNum || qtyNum === 0) { toast({ title: 'Qty required', variant: 'destructive' }); return; }
        if (mode !== 'ADJUST' && qtyNum < 0)   { toast({ title: 'Qty must be positive', variant: 'destructive' }); return; }
        if (mode === 'ADJUST' && !reason.trim()){ toast({ title: 'Reason required for adjustment', variant: 'destructive' }); return; }

        setSubmitting(true);
        try {
            let res;
            if (mode === 'RECEIVE') {
                res = await inventoryService.receive({
                    inventoryItemId: item.inventoryItemId,
                    qty: qtyNum,
                    unitCost: unitCost ? parseFloat(unitCost) : undefined,
                    batchNumber: batch || undefined,
                    expiryDate: expiry ? new Date(expiry).toISOString() : undefined,
                    notes: notes || undefined,
                });
            } else if (mode === 'ISSUE') {
                res = await inventoryService.issue({
                    inventoryItemId: item.inventoryItemId,
                    qty: qtyNum,
                    patientId: patientId || undefined,
                    encounterId: encounterId || undefined,
                    unitRate: unitRate ? parseFloat(unitRate) : undefined,
                    discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
                    batchNumber: batch || undefined,
                    reason: reason || undefined,
                    notes: notes || undefined,
                });
            } else {
                res = await inventoryService.adjust({
                    inventoryItemId: item.inventoryItemId,
                    qty: qtyNum,
                    reason: reason.trim(),
                    notes: notes || undefined,
                });
            }
            if (!res.success) throw new Error(res.message ?? 'Could not save');
            toast({
                title: mode === 'RECEIVE' ? 'Stock received' : mode === 'ISSUE' ? 'Stock issued' : 'Stock adjusted',
                description: `${item.itemName} · ${res.currentStock} ${item.unit}${res.chargeEventId ? ' · charged' : ''}${res.lowStockReached ? ' · LOW STOCK' : ''}`,
                variant: res.lowStockReached ? 'destructive' : undefined,
            });
            onDone();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not save', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const title = mode === 'RECEIVE' ? 'Receive Stock' : mode === 'ISSUE' ? 'Issue Stock' : 'Adjust Stock';
    const icon = mode === 'RECEIVE' ? <PackagePlus className="h-5 w-5 text-white" /> : mode === 'ISSUE' ? <PackageMinus className="h-5 w-5 text-white" /> : <Settings2 className="h-5 w-5 text-white" />;
    const tone = mode === 'RECEIVE' ? 'bg-emerald-600' : mode === 'ISSUE' ? 'bg-rose-600' : 'bg-amber-600';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', tone)}>
                            {icon}
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">{title}</SheetTitle>
                            <SheetDescription className="text-xs">{item.itemName} · {item.itemCode} · current {item.currentStock} {item.unit}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">{mode === 'ADJUST' ? 'Qty (signed) *' : `Qty (${item.unit}) *`}</Label>
                        <Input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} className="h-9 mt-1" placeholder={mode === 'ADJUST' ? '+5 or -5' : '0'} />
                    </div>

                    {mode === 'RECEIVE' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Unit cost (₹)</Label>
                                    <Input type="number" min={0} step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Batch #</Label>
                                    <Input value={batch} onChange={e => setBatch(e.target.value)} className="h-9 mt-1" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Expiry</Label>
                                <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="h-9 mt-1" />
                            </div>
                        </>
                    )}

                    {mode === 'ISSUE' && (
                        <>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                                Supply an Encounter ID to auto-bill this consumption to the patient's bill.
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Patient ID</Label>
                                    <Input value={patientId} onChange={e => setPatientId(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Encounter ID</Label>
                                    <Input value={encounterId} onChange={e => setEncounterId(e.target.value)} className="h-9 mt-1 font-mono" placeholder="GUID" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Unit rate (₹)</Label>
                                    <Input type="number" min={0} step="0.01" value={unitRate} onChange={e => setUnitRate(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700">Discount %</Label>
                                    <Input type="number" min={0} max={100} step="0.01" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="h-9 mt-1" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-slate-700">Batch #</Label>
                                    <Input value={batch} onChange={e => setBatch(e.target.value)} className="h-9 mt-1" />
                                </div>
                            </div>
                        </>
                    )}

                    {mode === 'ADJUST' && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Reason *</Label>
                            <Input value={reason} onChange={e => setReason(e.target.value)} className="h-9 mt-1" placeholder="e.g. Stock count correction, damaged unit" />
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
                    <Button onClick={submit} disabled={submitting} className={cn('h-10 px-5 font-semibold text-white', tone, 'hover:opacity-90')}>
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Confirm</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Movements drawer ───────────────────────────────────────────────────────

const MovementsSheet: React.FC<{
    open: boolean;
    onOpenChange: (v: boolean) => void;
    item: InventoryItem | null;
}> = ({ open, onOpenChange, item }) => {
    const [items, setItems] = useState<InventoryMovementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!item) return;
        setLoading(true); setError(null);
        try {
            const res = await inventoryService.listMovements({ inventoryItemId: item.inventoryItemId, take: 300 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load movements');
        } finally {
            setLoading(false);
        }
    }, [item]);

    useEffect(() => { if (open) load(); }, [open, load]);

    if (!item) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                            <History className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Stock Movements</SheetTitle>
                            <SheetDescription className="text-xs">{item.itemName} · current {item.currentStock} {item.unit}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                    {loading && [0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> {error}
                        </div>
                    )}
                    {!loading && !error && items.length === 0 && (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                            <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No movements yet</p>
                        </div>
                    )}
                    {!loading && !error && items.map(m => {
                        const tone = MOVEMENT_TONE[m.movementType] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                        return (
                            <div key={m.inventoryMovementId} className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', tone)}>{m.movementType.replace('_', ' ')}</Badge>
                                            <p className={cn('text-sm font-bold', m.qty < 0 ? 'text-rose-700' : 'text-emerald-700')}>
                                                {m.qty > 0 ? '+' : ''}{m.qty}
                                            </p>
                                            {m.batchNumber && <span className="text-[11px] text-slate-500">Batch {m.batchNumber}</span>}
                                            {m.chargeEventId && <span className="text-[11px] text-emerald-700">→ billed</span>}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {m.movedBy ?? 'System'} · {format(parseISO(m.movedAt), 'd MMM HH:mm')} ({formatDistanceToNowStrict(parseISO(m.movedAt))} ago)
                                        </p>
                                        {m.reason && <p className="text-[11px] text-slate-600 mt-0.5">Reason: {m.reason}</p>}
                                        {m.notes && <p className="text-[11px] text-slate-500 mt-0.5">{m.notes}</p>}
                                        {m.encounterId && (
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">enc {m.encounterId.slice(0, 8)}…</p>
                                        )}
                                    </div>
                                    {m.unitCost != null && (
                                        <span className="text-xs text-slate-500">@ {inr(m.unitCost)}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main page ──────────────────────────────────────────────────────────────

const InventoryPage: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'ALL' | InventoryCategory>('ALL');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    const [itemSheetOpen, setItemSheetOpen] = useState(false);
    const [editing, setEditing] = useState<InventoryItem | null>(null);

    const [movementSheetOpen, setMovementSheetOpen] = useState(false);
    const [movementMode, setMovementMode] = useState<MovementMode>('RECEIVE');
    const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

    const [movementsHistoryOpen, setMovementsHistoryOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

    const load = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const res = await inventoryService.listItems({ take: 500 });
            if (!res.success) throw new Error(res.message ?? 'Failed to load');
            setItems(res.items ?? []);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load inventory');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(it => {
            if (categoryFilter !== 'ALL' && it.category !== categoryFilter) return false;
            if (lowStockOnly && !it.isLowStock) return false;
            if (!q) return true;
            return it.itemCode.toLowerCase().includes(q)
                || it.itemName.toLowerCase().includes(q)
                || (it.genericName ?? '').toLowerCase().includes(q)
                || (it.manufacturer ?? '').toLowerCase().includes(q);
        });
    }, [items, search, categoryFilter, lowStockOnly]);

    const counts = useMemo(() => ({
        total: items.length,
        active: items.filter(i => i.isActive).length,
        low: items.filter(i => i.isLowStock).length,
    }), [items]);

    const openMovement = (item: InventoryItem, mode: MovementMode) => {
        setMovementItem(item); setMovementMode(mode); setMovementSheetOpen(true);
    };

    const openHistory = (item: InventoryItem) => {
        setHistoryItem(item); setMovementsHistoryOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md">
                            <Boxes className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Inventory</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Consumables, drugs and disposables. Issue from here to auto-bill the patient.</p>
                        </div>
                    </div>
                    <Button onClick={() => { setEditing(null); setItemSheetOpen(true); }} className="h-10 bg-indigo-600 hover:bg-indigo-700 font-semibold">
                        <Plus className="h-4 w-4 mr-2" /> New Item
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Items</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Active</p>
                        <p className="text-2xl font-black text-emerald-900 mt-0.5">{counts.active}</p>
                    </div>
                    <div className={cn('rounded-xl border p-4', counts.low > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100')}>
                        <p className={cn('text-[10px] font-bold uppercase tracking-widest', counts.low > 0 ? 'text-rose-700' : 'text-slate-400')}>Low Stock</p>
                        <p className={cn('text-2xl font-black mt-0.5', counts.low > 0 ? 'text-rose-900' : 'text-slate-700')}>{counts.low}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code, name, generic, manufacturer…" className="h-9 text-sm pl-8 bg-white" />
                    </div>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg gap-1">
                        {(['ALL', ...CATEGORIES.map(c => c.value)] as ('ALL' | InventoryCategory)[]).map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategoryFilter(c)}
                                className={cn(
                                    'h-7 px-3 rounded-md text-xs font-semibold',
                                    categoryFilter === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                )}
                            >{c}</button>
                        ))}
                    </div>
                    <Button
                        variant={lowStockOnly ? 'default' : 'outline'}
                        size="sm"
                        className={cn('h-9', lowStockOnly && 'bg-rose-600 hover:bg-rose-700')}
                        onClick={() => setLowStockOnly(v => !v)}
                    >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Low only
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => load(true)} disabled={refreshing}>
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} /> Refresh
                    </Button>
                </div>

                {loading && (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                )}

                {error && !loading && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                )}

                {!loading && !error && items.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                        <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-base font-semibold text-slate-700">No inventory items yet</p>
                        <p className="text-sm text-slate-500 mt-1 mb-5">Add your first consumable or drug.</p>
                        <Button onClick={() => { setEditing(null); setItemSheetOpen(true); }} className="h-10 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" /> New Item
                        </Button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2.5 font-bold">Code</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Item</th>
                                    <th className="text-left px-3 py-2.5 font-bold">Cat</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Stock</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Min</th>
                                    <th className="text-right px-3 py-2.5 font-bold">Rate</th>
                                    <th className="text-right px-3 py-2.5 font-bold">GST</th>
                                    <th className="text-right px-3 py-2.5 font-bold w-[200px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(it => (
                                    <tr key={it.inventoryItemId} className={cn('border-t border-slate-100 hover:bg-slate-50/50', !it.isActive && 'opacity-60')}>
                                        <td className="px-3 py-2 font-mono text-xs text-indigo-700 font-bold">{it.itemCode}</td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => { setEditing(it); setItemSheetOpen(true); }}
                                                className="text-left hover:underline"
                                            >
                                                <p className="text-sm font-semibold text-slate-900">{it.itemName}</p>
                                                {it.genericName && <p className="text-[11px] text-slate-500">{it.genericName}</p>}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge variant="outline" className={cn('text-[10px] font-bold', CATEGORY_TONE[it.category] ?? '')}>{it.category}</Badge>
                                        </td>
                                        <td className={cn('px-3 py-2 text-right text-sm font-bold', it.isLowStock ? 'text-rose-700' : 'text-slate-800')}>
                                            {it.currentStock} <span className="text-[11px] font-normal text-slate-500">{it.unit}</span>
                                            {it.isLowStock && <AlertTriangle className="h-3 w-3 inline ml-1 text-rose-600" />}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs text-slate-500">{it.minStockLevel}</td>
                                        <td className="px-3 py-2 text-right text-xs text-slate-700">{inr(it.defaultRate)}</td>
                                        <td className="px-3 py-2 text-right text-xs text-slate-500">{it.isTaxable && it.gstSlabPercent != null ? `${it.gstSlabPercent}%` : '—'}</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="inline-flex gap-1">
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => openMovement(it, 'RECEIVE')}>
                                                    <PackagePlus className="h-3 w-3 mr-1" /> In
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => openMovement(it, 'ISSUE')} disabled={it.currentStock <= 0}>
                                                    <PackageMinus className="h-3 w-3 mr-1" /> Out
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => openMovement(it, 'ADJUST')}>
                                                    <Settings2 className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => openHistory(it)}>
                                                    <History className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && items.length > 0 && filtered.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-white">
                        <p className="text-sm font-semibold text-slate-700">No items match the current filters</p>
                    </div>
                )}
            </div>

            <ItemSheet open={itemSheetOpen} onOpenChange={setItemSheetOpen} editing={editing} onSaved={() => load(true)} />
            <MovementSheet open={movementSheetOpen} onOpenChange={setMovementSheetOpen} item={movementItem} mode={movementMode} onDone={() => load(true)} />
            <MovementsSheet open={movementsHistoryOpen} onOpenChange={setMovementsHistoryOpen} item={historyItem} />
        </div>
    );
};

export default InventoryPage;
