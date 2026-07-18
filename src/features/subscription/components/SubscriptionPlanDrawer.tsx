import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Stethoscope, BedDouble, Check, Landmark, ShieldCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import { PAYMENT_MODES } from '../services/subscriptionApi';
import type { SubscriptionPlan } from '../services/subscriptionApi';

interface Props {
    hospitalId: string;
    plan: SubscriptionPlan | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Side drawer opened right after a plan is selected: a compact review of what was picked, plus
 * the manual-payment form (mode + reference) — the amount is fixed to the plan's price rather
 * than editable, since it isn't negotiable per-submission.
 */
export const SubscriptionPlanDrawer: React.FC<Props> = ({ hospitalId, plan, open, onOpenChange }) => {
    const { toast } = useToast();
    const { submitPayment } = useSubscriptionApi();
    const [paymentMode, setPaymentMode] = useState('');
    const [reference, setReference] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Reset the form/confirmation each time a different plan is opened.
    useEffect(() => {
        if (open) {
            setPaymentMode('');
            setReference('');
            setSubmitted(false);
        }
    }, [open, plan?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!plan) return;
        if (!paymentMode || !reference.trim()) {
            toast({ title: 'Validation Error', description: 'Please select a payment mode and enter a reference.', variant: 'destructive' });
            return;
        }
        submitPayment.mutate(
            { hospitalId, amount: plan.discountedPrice, reference: reference.trim(), paymentMode },
            {
                onSuccess: () => {
                    setSubmitted(true);
                    toast({ title: 'Payment Submitted', description: 'Your payment details have been submitted and are pending approval.' });
                },
                onError: (error: any) => {
                    toast({ title: 'Error', description: error.response?.data?.message || 'Failed to submit payment', variant: 'destructive' });
                },
            }
        );
    };

    if (!plan) return null;
    const priceSuffix = plan.billingCycle === 'Yearly' ? 'year' : 'month';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Confirm &amp; Pay</SheetTitle>
                    <SheetDescription>Review your selection, then submit your payment details for approval.</SheetDescription>
                </SheetHeader>

                {/* Selection overview */}
                <div className="mt-6 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/10 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-400/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">{plan.billingCycle} plan</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{plan.name}</h3>

                    <div className="flex flex-wrap gap-2 mt-3">
                        <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-black/20 border border-brand-100 dark:border-brand-800/50 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Stethoscope className="w-3.5 h-3.5 text-brand-500" />
                            {plan.maxDoctors == null ? 'Unlimited doctors' : `${plan.maxDoctors} Doctor${plan.maxDoctors === 1 ? '' : 's'}`}
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-black/20 border border-brand-100 dark:border-brand-800/50 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <BedDouble className="w-3.5 h-3.5 text-brand-500" />
                            {plan.maxBeds == null ? 'Unlimited beds' : `${plan.maxBeds} Beds`}
                        </div>
                    </div>

                    <div className="flex items-end gap-2 mt-4 pt-4 border-t border-brand-100 dark:border-brand-800/50">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.discountedPrice}</span>
                        <span className="text-muted-foreground mb-1 text-sm">/ {priceSuffix}</span>
                        {plan.discountedPrice < plan.basePrice && (
                            <span className="text-sm text-muted-foreground line-through ml-1">₹{plan.basePrice}</span>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex-1">
                    {submitted ? (
                        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 p-6 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400 mb-3">
                                <Check className="h-6 w-6" strokeWidth={3} />
                            </div>
                            <p className="font-bold text-lg text-emerald-800 dark:text-emerald-300">Submitted for Approval</p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                                Your payment is with our team for verification. Your subscription activates automatically the moment it's approved.
                            </p>
                            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <Clock className="w-3.5 h-3.5" /> Track this in Payment History
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label className="font-semibold flex items-center gap-1.5">
                                    <Landmark className="w-3.5 h-3.5 text-muted-foreground" /> Amount to Pay
                                </Label>
                                <div className="h-11 flex items-center px-3 rounded-md border border-input bg-muted/50 text-base font-bold text-slate-900 dark:text-white">
                                    ₹{plan.discountedPrice.toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="drawer-payment-mode" className="font-semibold">Payment Mode</Label>
                                <Select value={paymentMode} onValueChange={setPaymentMode}>
                                    <SelectTrigger id="drawer-payment-mode" className="h-11">
                                        <SelectValue placeholder="Select payment mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_MODES.map(mode => (
                                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="drawer-reference" className="font-semibold">Transaction Reference / UTR Number</Label>
                                <Input
                                    id="drawer-reference"
                                    type="text"
                                    placeholder="Enter bank reference number"
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className="h-11"
                                    required
                                />
                            </div>

                            <Button type="submit" size="lg" disabled={submitPayment.isPending} className="w-full font-semibold">
                                {submitPayment.isPending ? 'Submitting…' : 'Submit for Approval'}
                            </Button>

                            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                <ShieldCheck className="w-3.5 h-3.5" /> Manually verified by our team — usually within a few hours
                            </p>
                        </form>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default SubscriptionPlanDrawer;
