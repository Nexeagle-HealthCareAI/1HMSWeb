import React, { useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { isReachable } from '@/offline';
import { cn } from '@/lib/utils';
import { ipdBillingService } from '../../services/ipdBillingService';

export interface EditChargeDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    charge: {
        chargeEventId: string;
        displayName?: string;
        qty: number;
        rate: number;
        discountAmount: number;
    } | null;
    onSaved: () => void;
}

// Corrects an already-posted charge line (qty/rate/discount/name) in place — no admin approval
// or discount-cap gate; that workflow was removed so any user can freely correct a mistake.
export const EditChargeDialog: React.FC<EditChargeDialogProps> = ({ open, onOpenChange, charge, onSaved }) => {
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState('');
    const [qty, setQty] = useState(1);
    const [rate, setRate] = useState(0);
    const [discountKind, setDiscountKind] = useState<'percent' | 'amount'>('amount');
    const [discountValue, setDiscountValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !charge) return;
        setDisplayName(charge.displayName ?? '');
        setQty(charge.qty);
        setRate(charge.rate);
        setDiscountKind('amount');
        setDiscountValue(charge.discountAmount > 0 ? String(charge.discountAmount) : '');
    }, [open, charge]);

    const gross = qty * rate;
    const rawDisc = parseFloat(discountValue || '0') || 0;
    const discountAmount = Math.max(0, Math.min(gross, discountKind === 'amount' ? rawDisc : (gross * rawDisc) / 100));
    const discountPercent = gross > 0 ? (discountAmount / gross) * 100 : 0;
    const net = gross - discountAmount;

    const canSubmit = !!charge && qty > 0 && rate >= 0 && !submitting;

    const submit = async () => {
        if (!canSubmit || !charge) return;
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Editing a charge requires an internet connection.', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await ipdBillingService.updateChargeEvent({
                chargeEventId: charge.chargeEventId,
                displayName: displayName.trim() || undefined,
                qty,
                rate,
                discountPercent,
            });
            if (!res?.success) throw new Error(res?.message ?? 'Could not update charge');
            toast({ title: 'Charge updated', description: displayName.trim() || charge.displayName || undefined });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not update charge', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col bg-white dark:bg-slate-950">
                <div className="px-6 py-5 bg-gradient-to-r from-amber-500 to-orange-600">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Pencil className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-white text-lg font-bold">Edit Charge</SheetTitle>
                            <p className="text-amber-50/90 text-xs mt-0.5">Correct the quantity, rate, discount or name</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Charge name</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10 mt-1 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Qty</Label>
                            <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value || '0', 10))} className="h-10 mt-1 rounded-xl" />
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Rate</Label>
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

                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Gross ({qty} × ₹{rate.toLocaleString('en-IN')})</span><span className="tabular-nums font-semibold">₹{gross.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Discount {discountAmount > 0 ? `(${discountPercent.toFixed(1)}%)` : ''}</span><span className="tabular-nums font-semibold text-rose-600">- ₹{discountAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200"><span className="font-bold text-slate-800">Net</span><span className="tabular-nums font-bold text-emerald-700">₹{net.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 mt-auto">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submit} disabled={!canSubmit} className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default EditChargeDialog;
