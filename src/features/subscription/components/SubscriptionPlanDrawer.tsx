import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import type { SubscriptionPlan } from '../services/subscriptionApi';

interface Props {
    hospitalId: string;
    plan: SubscriptionPlan | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Side drawer opened right after a plan is selected: shows what was picked and lets the admin
 * mark payment done (submit-payment) without leaving the Subscription page.
 */
export const SubscriptionPlanDrawer: React.FC<Props> = ({ hospitalId, plan, open, onOpenChange }) => {
    const { toast } = useToast();
    const { submitPayment } = useSubscriptionApi();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Reset the form/confirmation each time a different plan is opened.
    useEffect(() => {
        if (open) {
            setAmount('');
            setReference('');
            setSubmitted(false);
        }
    }, [open, plan?.id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !reference) {
            toast({ title: 'Validation Error', description: 'Please enter amount and reference.', variant: 'destructive' });
            return;
        }
        submitPayment.mutate(
            { hospitalId, amount: Number(amount), reference },
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
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                    <SheetTitle>Your selected plan</SheetTitle>
                    <SheetDescription>Confirm the details below, then mark your payment as done.</SheetDescription>
                </SheetHeader>

                <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/50 dark:bg-brand-900/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{plan.billingCycle} plan</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{plan.name}</h3>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.discountedPrice}</span>
                        <span className="text-muted-foreground mb-1 text-sm">/ {priceSuffix}</span>
                        {plan.discountedPrice < plan.basePrice && (
                            <span className="text-sm text-muted-foreground line-through ml-1">₹{plan.basePrice}</span>
                        )}
                    </div>
                    <ul className="mt-4 space-y-2">
                        {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <CheckCircle className="h-3.5 w-3.5 text-brand-500 shrink-0" /> {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 flex-1">
                    {submitted ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 p-5 flex items-start gap-3">
                            <Check className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Payment submitted</p>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                    We're verifying your transaction. Your account will be activated shortly.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="drawer-amount" className="font-semibold">Amount Paid (₹)</Label>
                                <Input
                                    id="drawer-amount"
                                    type="number"
                                    placeholder="e.g. 5000"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="h-11"
                                    required
                                />
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
                                {submitPayment.isPending ? 'Submitting…' : 'Mark Payment Done'}
                            </Button>
                        </form>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default SubscriptionPlanDrawer;
