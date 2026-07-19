import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, PiggyBank, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { isReachable } from '@/offline';
import { ipdBillingService, type AddPaymentRequest, type PaymentMode, type PaymentType } from '../../services/ipdBillingService';
import { PAYMENT_MODES } from '../../utils/constants';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

export interface AddPaymentDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patientId: string;
    encounterId: string;
    // Raw signed ledger balance for this encounter (billed vs. actually collected), matching what
    // the backend's REFUND validation checks against: positive = amount due, negative = credit
    // already held (real, collected money — available to refund). Must NOT have a discount netted
    // out here — a discount was never actual cash collected, so it can never be "refunded"; passing
    // a discount-adjusted value made this button show a phantom credit the backend then rejected.
    netBalance: number;
    // What to prefill "Balance Due · tap to fill" with — may differ from netBalance when an
    // invoice-level discount applies (this is genuinely what the patient still owes to pay).
    // Defaults to netBalance when omitted.
    dueAmount?: number;
    // Which tab to land on when the sheet opens — 'REFUND' when navigated here from a credit
    // banner, so the credit is pre-selected instead of requiring an extra "tap to refund" click.
    // Defaults to 'PAYMENT'.
    initialType?: PaymentType;
    onSaved: () => void;
}

export const AddPaymentDialog: React.FC<AddPaymentDialogProps> = ({ open, onOpenChange, patientId, encounterId, netBalance, dueAmount, initialType, onSaved }) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [paymentType, setPaymentType] = useState<PaymentType>('PAYMENT');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [extraCharges, setExtraCharges] = useState<{ reason: string; amount: number }[]>([]);

    const totalExtraCharges = extraCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const effectiveDue = dueAmount ?? netBalance;
    const effectiveDueWithExtra = effectiveDue + totalExtraCharges;
    const availableCredit = netBalance < 0 ? Math.abs(netBalance) : 0;
    const exceedsCredit = paymentType === 'REFUND' && availableCredit > 0 && amount > availableCredit;

    useEffect(() => {
        if (open) {
            const type = initialType ?? 'PAYMENT';
            setPaymentType(type);
            setPaymentMode('CASH');
            setAmount(type === 'REFUND' ? Math.max(0, availableCredit) : Math.max(0, effectiveDue));
            setDescription('');
            setTransactionId('');
            setExtraCharges([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, effectiveDue, initialType]);

    const submit = async () => {
        if (submitting) return;
        if (isSubscriptionReadOnly) { blockAction(paymentType === 'REFUND' ? 'Processing refunds' : 'Taking payments'); return; }
        if (amount <= 0) { toast({ title: 'Amount must be > 0', variant: 'destructive' }); return; }
        if (exceedsCredit) { toast({ title: 'Refund exceeds available credit', variant: 'destructive' }); return; }
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Recording a payment requires an internet connection.', variant: 'destructive' }); return; }
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
                extraCharges: extraCharges.length > 0 ? extraCharges : undefined,
            };
            const res = await ipdBillingService.addPayment(req);
            if (!res?.success) throw new Error(res?.message ?? 'Could not record payment');
            if (res.pendingApproval) {
                toast({
                    title: 'Pending admin approval',
                    description: res.message ?? 'This would leave the patient in credit and needs Admin/AdminDoctor sign-off before it is recorded.',
                });
            } else {
                toast({ title: 'Payment recorded', description: `${paymentMode} · ₹${amount.toLocaleString('en-IN')}` });
            }
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
                    {effectiveDueWithExtra > 0 && (
                        <button
                            type="button"
                            onClick={() => setAmount(Math.max(0, effectiveDueWithExtra))}
                            className="w-full flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
                        >
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Balance Due {totalExtraCharges > 0 ? '(incl. extra)' : ''} · tap to fill</span>
                            <span className="text-base font-bold text-emerald-700 tabular-nums">₹{effectiveDueWithExtra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </button>
                    )}

                    {availableCredit > 0 && (
                        <button
                            type="button"
                            onClick={() => { setPaymentType('REFUND'); setAmount(availableCredit); }}
                            className="w-full flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                        >
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                                <PiggyBank className="h-3.5 w-3.5" /> Credit available · tap to refund
                            </span>
                            <span className="text-base font-bold text-blue-700 tabular-nums">₹{availableCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </button>
                    )}

                    {/* Extra Charges */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-3">
                            <Label className="text-xs font-semibold text-slate-700">Extra Charges</Label>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setExtraCharges([...extraCharges, { reason: '', amount: 0 }])}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>
                        {extraCharges.length > 0 ? (
                            <div className="space-y-2">
                                {extraCharges.map((ec, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <Input 
                                                placeholder="Reason (e.g. Night Charge)" 
                                                value={ec.reason} 
                                                onChange={e => {
                                                    const nc = [...extraCharges];
                                                    nc[i].reason = e.target.value;
                                                    setExtraCharges(nc);
                                                }}
                                                className="h-9 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Input 
                                                type="number"
                                                min={0}
                                                placeholder="Amount" 
                                                value={ec.amount || ''} 
                                                onChange={e => {
                                                    const nc = [...extraCharges];
                                                    nc[i].amount = Number(e.target.value);
                                                    setExtraCharges(nc);
                                                    if (paymentType === 'PAYMENT' && Number(e.target.value) > 0) {
                                                        const newTotal = extraCharges.reduce((s, c, idx) => s + (idx === i ? Number(e.target.value) : c.amount), 0);
                                                        setAmount(Math.max(0, effectiveDue + newTotal));
                                                    }
                                                }}
                                                className="h-9 rounded-lg text-sm"
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-slate-400 hover:text-red-600"
                                            onClick={() => {
                                                const nc = extraCharges.filter((_, idx) => idx !== i);
                                                setExtraCharges(nc);
                                                if (paymentType === 'PAYMENT') {
                                                    const newTotal = nc.reduce((s, c) => s + c.amount, 0);
                                                    setAmount(Math.max(0, effectiveDue + newTotal));
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-500 italic">No extra charges added.</div>
                        )}
                    </div>

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
                        {exceedsCredit && (
                            <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Refund exceeds available credit (₹{availableCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}).
                            </p>
                        )}
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
                    <Button onClick={submit} disabled={submitting || isSubscriptionReadOnly} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : <><CreditCard className="h-4 w-4 mr-2" />Record</>}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default AddPaymentDialog;
