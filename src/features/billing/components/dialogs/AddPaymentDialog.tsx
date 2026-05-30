import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30"><CreditCard className="h-4 w-4" /></span>
                        Record Payment
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Type</Label>
                            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
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
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Amount</Label>
                        <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value || '0'))} className="h-9 mt-1 font-mono text-lg font-semibold" />
                    </div>
                    {paymentMode !== 'CASH' && (
                        <div>
                            <Label className="text-xs font-semibold text-slate-700">Transaction / Ref #</Label>
                            <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="h-9 mt-1 font-mono" />
                        </div>
                    )}
                    <div>
                        <Label className="text-xs font-semibold text-slate-700">Notes</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-sm mt-1" placeholder="Optional" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</> : <><CreditCard className="h-4 w-4 mr-2" />Record</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddPaymentDialog;
