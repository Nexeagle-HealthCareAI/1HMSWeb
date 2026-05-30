import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ipdBillingService, type ChargeMaster, type AddChargeEventRequest } from '../../services/ipdBillingService';

export interface AddChargeDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patientId: string;
    encounterId: string;
    onSaved: () => void;
}

export const AddChargeDialog: React.FC<AddChargeDialogProps> = ({ open, onOpenChange, patientId, encounterId, onSaved }) => {
    const { toast } = useToast();
    const [chargeMasters, setChargeMasters] = useState<ChargeMaster[]>([]);
    const [chargeMasterFilter, setChargeMasterFilter] = useState('');
    const [loadingMasters, setLoadingMasters] = useState(false);
    const [selectedMaster, setSelectedMaster] = useState<ChargeMaster | null>(null);
    const [qty, setQty] = useState(1);
    const [rate, setRate] = useState(0);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelectedMaster(null);
        setQty(1);
        setRate(0);
        setDiscountPercent(0);
        setChargeMasterFilter('');
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

    const filteredMasters = useMemo(() => {
        const q = chargeMasterFilter.trim().toLowerCase();
        if (!q) return chargeMasters;
        return chargeMasters.filter(m =>
            (m.displayName ?? '').toLowerCase().includes(q)
            || (m.chargeCode ?? '').toLowerCase().includes(q)
            || (m.categoryCode ?? '').toLowerCase().includes(q)
        );
    }, [chargeMasters, chargeMasterFilter]);

    const pickMaster = (m: ChargeMaster) => {
        setSelectedMaster(m);
        setQty(m.defaultQty || 1);
        setRate(Number(m.defaultRate || 0));
    };

    const submit = async () => {
        if (submitting) return;
        if (!selectedMaster) { toast({ title: 'Pick a charge from the catalog', variant: 'destructive' }); return; }
        if (qty <= 0) { toast({ title: 'Quantity must be > 0', variant: 'destructive' }); return; }
        if (rate < 0) { toast({ title: 'Rate cannot be negative', variant: 'destructive' }); return; }

        setSubmitting(true);
        try {
            const req: AddChargeEventRequest = {
                patientId,
                encounterId,
                charges: [{
                    chargeId: selectedMaster.chargeId,
                    displayName: selectedMaster.displayName ?? '',
                    qty,
                    rate,
                    discountPercent,
                    categoryCode: selectedMaster.categoryCode ?? 'OTHER',
                }],
            };
            const res = await ipdBillingService.addChargeEvents(req);
            if (!res?.success) throw new Error(res?.message ?? 'Could not add charge');
            toast({ title: 'Charge added', description: selectedMaster.displayName ?? '' });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not add charge', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const gross = qty * rate;
    const discountAmount = (gross * Math.max(0, Math.min(100, discountPercent))) / 100;
    const net = gross - discountAmount;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30"><Plus className="h-4 w-4" /></span>
                        Add Charge
                    </DialogTitle>
                    <DialogDescription>Pick from the charge catalog and adjust quantity / discount.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Charge catalog</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input value={chargeMasterFilter} onChange={(e) => setChargeMasterFilter(e.target.value)} placeholder="Search charges…" className="h-8 pl-8 text-xs" />
                        </div>
                        <div className="border border-slate-200 rounded-md max-h-[280px] overflow-auto bg-white">
                            {loadingMasters ? (
                                <div className="p-3 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                            ) : filteredMasters.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500">No charges configured</div>
                            ) : (
                                filteredMasters.map(m => (
                                    <button
                                        key={m.chargeId}
                                        type="button"
                                        onClick={() => pickMaster(m)}
                                        className={cn(
                                            'w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-indigo-50/40 text-xs',
                                            selectedMaster?.chargeId === m.chargeId && 'bg-indigo-50 border-l-2 border-l-indigo-500'
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-900 truncate">{m.displayName}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{m.chargeCode} · {m.categoryCode} · {m.appliesTo}</p>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">₹{Number(m.defaultRate).toLocaleString('en-IN')}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Selected</Label>
                            <div className="h-9 mt-1 px-2 flex items-center text-sm border border-slate-200 rounded-md bg-slate-50">
                                {selectedMaster ? <span className="truncate font-semibold">{selectedMaster.displayName}</span> : <span className="text-slate-400 italic">No charge selected</span>}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Qty</Label>
                                <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || '0', 10))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Rate</Label>
                                <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(parseFloat(e.target.value || '0'))} className="h-9 mt-1" />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700">Disc %</Label>
                                <Input type="number" min={0} max={100} step="0.01" value={discountPercent} onChange={(e) => setDiscountPercent(parseFloat(e.target.value || '0'))} className="h-9 mt-1" />
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 space-y-1.5">
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Gross</span><span className="font-mono font-semibold">₹{gross.toFixed(2)}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Discount</span><span className="font-mono font-semibold text-rose-600">- ₹{discountAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200"><span className="font-bold text-slate-800">Net</span><span className="font-mono font-bold text-emerald-700">₹{net.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || !selectedMaster} className="bg-indigo-600 hover:bg-indigo-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : <><Plus className="h-4 w-4 mr-2" />Add Charge</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddChargeDialog;
