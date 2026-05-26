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
import { cn } from '@/lib/utils';
import {
    IndianRupee, Banknote, CreditCard, Smartphone, Building2, Wallet,
    Loader2, X, AlertCircle,
} from 'lucide-react';
import {
    ipdBillingService, type PaymentType, type PaymentMode,
} from '../services/ipdBillingService';

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
    { value: 'CARD',      label: 'Card',       icon: <CreditCard className="h-3.5 w-3.5 text-blue-600" /> },
    { value: 'BANK',      label: 'Bank',       icon: <Building2 className="h-3.5 w-3.5 text-indigo-600" /> },
    { value: 'INSURANCE', label: 'Insurance',  icon: <Wallet className="h-3.5 w-3.5 text-amber-600" /> },
];

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
    open, onOpenChange, encounterId, patientId, netBalance, onPaid,
}) => {
    const { toast } = useToast();
    const [paymentType, setPaymentType] = useState<PaymentType>('PAYMENT');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [amount, setAmount] = useState<number>(0);
    const [transactionId, setTransactionId] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setPaymentType('PAYMENT');
            setPaymentMode('CASH');
            setAmount(Math.max(0, netBalance));
            setTransactionId('');
            setDescription('');
        }
    }, [open, netBalance]);

    const needsTxnId = paymentMode !== 'CASH';
    const canSubmit = amount > 0 && !submitting;

    const exceedsBalance = paymentType === 'PAYMENT' && amount > Math.max(0, netBalance);

    const handleSubmit = async () => {
        if (!canSubmit) return;
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
            });
            if (!res.success) {
                throw new Error(res.message ?? 'Payment failed');
            }
            const credit = res.data?.creditAmount;
            toast({
                title: `Payment recorded · ${res.data?.receiptNo ?? ''}`,
                description: credit && credit > 0
                    ? `₹${(res.data?.allocatedAmount ?? 0).toLocaleString('en-IN')} allocated, ₹${credit.toLocaleString('en-IN')} held as advance credit.`
                    : `₹${(res.data?.allocatedAmount ?? amount).toLocaleString('en-IN')} allocated.`,
            });
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
                    {/* Outstanding balance */}
                    <div className={cn(
                        'rounded-lg border px-3 py-2 flex items-center justify-between text-sm',
                        netBalance > 0
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    )}>
                        <span className="font-semibold">Outstanding balance</span>
                        <span className="font-extrabold flex items-center">
                            <IndianRupee className="h-3.5 w-3.5" />{Math.max(0, netBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
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
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
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
                    <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-blue-600 hover:bg-blue-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : 'Record Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
