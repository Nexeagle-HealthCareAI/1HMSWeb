import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { isReachable } from '@/offline';
import { cn } from '@/lib/utils';
import {
    IndianRupee, Banknote, CreditCard, Smartphone, Building2, Wallet,
    Loader2, X, AlertCircle, Plus, Trash2,
} from 'lucide-react';
import {
    ipdBillingService, type PaymentType, type PaymentMode,
} from '../services/ipdBillingService';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface AddPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    encounterId: string;
    patientId: string;
    netBalance: number;
    onPaid: () => void;
}

const PAYMENT_MODES: { value: PaymentMode; label: string; icon: React.ReactNode }[] = [
    { value: 'CASH',      label: 'Cash',       icon: <Banknote className="h-3.5 w-3.5 text-emerald-600" /> },
    { value: 'UPI',       label: 'UPI',        icon: <Smartphone className="h-3.5 w-3.5 text-purple-600" /> },
    { value: 'CARD',      label: 'Card',       icon: <CreditCard className="h-3.5 w-3.5 text-brand-600" /> },
    { value: 'BANK',      label: 'Bank',       icon: <Building2 className="h-3.5 w-3.5 text-brand-600" /> },
    { value: 'INSURANCE', label: 'Insurance',  icon: <Wallet className="h-3.5 w-3.5 text-amber-600" /> },
];

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
    open, onOpenChange, encounterId, patientId, netBalance, onPaid,
}) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
    const [paymentType, setPaymentType] = useState<PaymentType>('PAYMENT');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [amount, setAmount] = useState<number>(0);
    const [transactionId, setTransactionId] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [extraCharges, setExtraCharges] = useState<{ reason: string; amount: number }[]>([]);

    const totalExtraCharges = extraCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const effectiveNetBalance = netBalance + totalExtraCharges;

    useEffect(() => {
        if (open) {
            setPaymentType('PAYMENT');
            setPaymentMode('CASH');
            setAmount(Math.max(0, netBalance));
            setTransactionId('');
            setDescription('');
            setExtraCharges([]);
        }
    }, [open, netBalance]);

    const needsTxnId = paymentMode !== 'CASH';
    const availableCredit = effectiveNetBalance < 0 ? Math.abs(effectiveNetBalance) : 0;
    const exceedsBalance = paymentType === 'PAYMENT' && amount > Math.max(0, effectiveNetBalance);
    const exceedsCredit = paymentType === 'REFUND' && availableCredit > 0 && amount > availableCredit;
    const canSubmit = amount > 0 && !exceedsCredit && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        if (isSubscriptionReadOnly) { blockAction(paymentType === 'REFUND' ? 'Processing refunds' : 'Taking payments'); return; }
        if (!isReachable()) { toast({ title: 'Needs connection', description: 'Recording a payment requires an internet connection.', variant: 'destructive' }); return; }
        setSubmitting(true);
        try {
            const res = await ipdBillingService.addPayment({
                encounterId,
                patientId,
                payment: {
                    paymentType,
                    paymentMode,
                    amount,
                    transactionId: transactionId.trim() || undefined,
                    description: description.trim() || undefined,
                },
                extraCharges: extraCharges.length > 0 ? extraCharges : undefined,
            });
            if (!res.success) {
                throw new Error(res.message ?? 'Payment failed');
            }
            if (res.pendingApproval) {
                toast({
                    title: 'Pending admin approval',
                    description: res.message ?? 'This would leave the patient in credit and needs Admin/AdminDoctor sign-off before it is recorded.',
                });
            } else {
                const credit = res.data?.creditAmount;
                toast({
                    title: `Payment recorded · ${res.data?.receiptNo ?? ''}`,
                    description: credit && credit > 0
                        ? `₹${(res.data?.allocatedAmount ?? 0).toLocaleString('en-IN')} allocated, ₹${credit.toLocaleString('en-IN')} held as advance credit.`
                        : `₹${(res.data?.allocatedAmount ?? amount).toLocaleString('en-IN')} allocated.`,
                });
            }
            onPaid();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: 'Payment failed',
                description: err?.message ?? 'Try again.',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold">Record Payment</DialogTitle>
                    <DialogDescription className="text-xs">
                        Allocated against this encounter's invoice. Receipt is auto-generated.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Outstanding balance / credit available */}
                    {availableCredit > 0 ? (
                        <button
                            type="button"
                            onClick={() => { setPaymentType('REFUND'); setAmount(availableCredit); }}
                            className="w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2 flex items-center justify-between text-sm hover:bg-blue-100/60 transition-colors"
                        >
                            <span className="font-semibold">Credit available · tap to refund</span>
                            <span className="font-extrabold flex items-center">
                                <IndianRupee className="h-3.5 w-3.5" />{availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                        </button>
                    ) : (
                        <div className={cn(
                            'rounded-lg border px-3 py-2 flex items-center justify-between text-sm',
                            effectiveNetBalance > 0
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        )}>
                            <span className="font-semibold">Total Payable {totalExtraCharges > 0 ? '(incl. extra charges)' : ''}</span>
                            <span className="font-extrabold flex items-center">
                                <IndianRupee className="h-3.5 w-3.5" />{Math.max(0, effectiveNetBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* Extra Charges */}
                    <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                        <div className="flex justify-between items-center mb-2">
                            <Label className="text-xs font-semibold text-slate-700">Extra Charges</Label>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-brand-600 hover:text-brand-700"
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
                                                className="h-8 text-xs"
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
                                                        setAmount(Math.max(0, netBalance + newTotal));
                                                    }
                                                }}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                                            onClick={() => {
                                                const nc = extraCharges.filter((_, idx) => idx !== i);
                                                setExtraCharges(nc);
                                                if (paymentType === 'PAYMENT') {
                                                    const newTotal = nc.reduce((s, c) => s + c.amount, 0);
                                                    setAmount(Math.max(0, netBalance + newTotal));
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

                    {/* Type tabs */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Type</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {(['PAYMENT', 'ADVANCE', 'REFUND'] as PaymentType[]).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setPaymentType(t)}
                                    className={cn(
                                        'h-9 rounded-md border text-xs font-semibold transition-all',
                                        paymentType === t
                                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
                                    )}
                                >
                                    {t === 'PAYMENT' ? 'Payment' : t === 'ADVANCE' ? 'Advance' : 'Refund'}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {paymentType === 'PAYMENT' && 'Allocates immediately to invoice balance.'}
                            {paymentType === 'ADVANCE' && 'Excess over balance is held as credit on the encounter.'}
                            {paymentType === 'REFUND' && 'Returns previously collected money. Reduces allocated total.'}
                        </p>
                    </div>

                    {/* Amount */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Amount</Label>
                        <div className="relative mt-1.5">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount || ''}
                                onChange={e => setAmount(Number(e.target.value))}
                                className="pl-9 h-10 text-base font-bold"
                                autoFocus
                            />
                        </div>
                        {exceedsBalance && (
                            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Payment exceeds balance. Consider <strong>Advance</strong> to hold the excess as credit.
                            </p>
                        )}
                        {exceedsCredit && (
                            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Refund exceeds available credit (₹{availableCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}).
                            </p>
                        )}
                    </div>

                    {/* Mode */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Mode</Label>
                        <Select value={paymentMode} onValueChange={v => setPaymentMode(v as PaymentMode)}>
                            <SelectTrigger className="h-9 text-sm mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_MODES.map(m => (
                                    <SelectItem key={m.value} value={m.value}>
                                        <span className="flex items-center gap-2">{m.icon}{m.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Txn ID (cards/UPI/bank) */}
                    {needsTxnId && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">
                                Transaction Reference {paymentMode === 'INSURANCE' ? '(policy / claim no.)' : '(UTR / Txn ID)'}
                            </Label>
                            <Input
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                placeholder={paymentMode === 'INSURANCE' ? 'Claim or policy reference' : 'e.g. 482919024401'}
                                className="h-9 text-sm mt-1.5"
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. Advance against bill"
                            className="h-9 text-sm mt-1.5"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || isSubscriptionReadOnly} className="bg-brand-600 hover:bg-brand-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : 'Record Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
