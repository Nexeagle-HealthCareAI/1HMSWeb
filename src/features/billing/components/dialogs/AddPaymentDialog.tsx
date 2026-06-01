import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { ipdBillingService, type AddPaymentRequest, type PaymentMode, type PaymentType } from '../../services/ipdBillingService';
import { PAYMENT_MODES } from '../../utils/constants';

export interface AddPaymentDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patientId: string;
    encounterId: string;
    suggestedAmount: number;
    onSaved: () => void;
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({ open, onOpenChange, patientId, encounterId, suggestedAmount, onSaved }) => {
    const { toast } = useToast();
    const [paymentType, setPaymentType] = useState<PaymentType>('PAYMENT');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setPaymentType('PAYMENT');
            setPaymentMode('CASH');
            setAmount(Math.max(0, suggestedAmount));
            setDescription('');
            setTransactionId('');
        }
    }, [open, suggestedAmount]);

    const submit = async () => {
        if (submitting) return;
        if (amount <= 0) { toast({ title: 'Amount must be > 0', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const req: AddPaymentRequest = {
                patientId,
                encounterId,
                payment: {
                    paymentType,
                    paymentMode,
                    amount,
                    description: description.trim() || undefined,
                    transactionId: transactionId.trim() || undefined,
                },
            };
            const res = await ipdBillingService.addPayment(req);
            if (!res?.success) throw new Error(res?.message ?? 'Could not record payment');
            toast({ title: 'Payment recorded', description: `${paymentMode} · ₹${amount.toLocaleString('en-IN')}` });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            toast({ title: 'Could not record payment', description: e?.message ?? '', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 flex flex-col bg-white dark:bg-slate-950">
                {/* Premium gradient header */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-500 to-teal-600">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <SheetTitle className="text-white text-lg font-bold">Record Payment</SheetTitle>
                            <p className="text-emerald-50/90 text-xs mt-0.5">Collect against this visit</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {suggestedAmount > 0 && (
                        <button
                            type="button"
                            onClick={() => setAmount(Math.max(0, suggestedAmount))}
                            className="w-full flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
                        >
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Balance Due · tap to fill</span>
                            <span className="text-base font-bold text-emerald-700 tabular-nums">₹{suggestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Type</Label>
                            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                                <SelectTrigger className="h-10 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PAYMENT">Payment</SelectItem>
                                    <SelectItem value="ADVANCE">Advance / Deposit</SelectItem>
                                    <SelectItem value="REFUND">Refund</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Mode</Label>
                            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                                <SelectTrigger className="h-10 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Amount</Label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value || '0'))} className="h-12 pl-8 rounded-xl tabular-nums text-xl font-bold" />
                        </div>
                    </div>

                    {paymentMode !== 'CASH' && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Transaction / Ref #</Label>
                            <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="h-10 mt-1 rounded-xl font-mono" />
                        </div>
                    )}

                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-sm mt-1 rounded-xl" placeholder="Optional" />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 mt-auto">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : <><CreditCard className="h-4 w-4 mr-2" />Record</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AddPaymentDialog;
