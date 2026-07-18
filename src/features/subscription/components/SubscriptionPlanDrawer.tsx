import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Stethoscope, BedDouble, Check, Landmark, ShieldCheck, Clock, TrendingUp, TrendingDown, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import { PAYMENT_MODES, CYCLE_LABEL, computeSwitchQuote } from '../services/subscriptionApi';
import type { SubscriptionPlan, SubscriptionStatusResponse } from '../services/subscriptionApi';
import { cn } from '@/lib/utils';

interface Props {
    hospitalId: string;
    plan: SubscriptionPlan | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // The hospital's current plan + status — used to compute a mid-cycle switch's prorated price.
    // Omit (or pass an unrelated/Trial status) and the drawer just charges the plan's full price.
    previousPlan?: SubscriptionPlan | null;
    subscriptionStatus?: SubscriptionStatusResponse;
}

/**
 * Side drawer opened right after a plan is selected: a compact review of what was picked, plus
 * the manual-payment form (mode + reference). For a fresh/trial subscriber the amount is just the
 * plan's price. For an already-Active hospital switching plans mid-cycle, the amount is the new
 * plan's price minus a credit for the unused days left on their current plan.
 */
export const SubscriptionPlanDrawer: React.FC<Props> = ({ hospitalId, plan, open, onOpenChange, previousPlan, subscriptionStatus }) => {
    const { toast } = useToast();
    const { switchPlan } = useSubscriptionApi();
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

    const quote = useMemo(
        () => (plan ? computeSwitchQuote(subscriptionStatus, previousPlan, plan) : null),
        [plan, previousPlan, subscriptionStatus]
    );
    const isUpgrade = !!previousPlan && !!plan && plan.discountedPrice >= previousPlan.discountedPrice;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!plan || !quote) return;
        // Nothing to actually pay when the credit fully covers the new plan — no bank reference
        // exists to ask for in that case, so only require the fields when money changes hands.
        const noPaymentDue = quote.amountDue === 0 && quote.isProrated;
        if (!noPaymentDue && (!paymentMode || !reference.trim())) {
            toast({ title: 'Validation Error', description: 'Please select a payment mode and enter a reference.', variant: 'destructive' });
            return;
        }
        switchPlan.mutate(
            {
                hospitalId,
                planId: plan.id,
                amount: quote.amountDue,
                reference: noPaymentDue ? 'Fully covered by plan-switch credit' : reference.trim(),
                paymentMode: noPaymentDue ? 'N/A' : paymentMode,
                isProratedSwitch: quote.isProrated,
                ...(quote.isProrated && {
                    previousPlanId: quote.previousPlanId!,
                    previousPlanName: quote.previousPlanName!,
                    proratedCreditAmount: quote.creditAmount,
                }),
            },
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

    if (!plan || !quote) return null;
    const priceSuffix = CYCLE_LABEL[plan.billingCycle];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{quote.isProrated ? 'Confirm Plan Switch' : 'Confirm & Pay'}</SheetTitle>
                    <SheetDescription>Review your selection, then submit your payment details for approval.</SheetDescription>
                </SheetHeader>

                {/* Selection overview */}
                <div className="mt-6 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/10 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-400/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                    {quote.isProrated && (
                        <div className={cn(
                            'inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-2',
                            isUpgrade ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        )}>
                            {isUpgrade ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isUpgrade ? 'Upgrading' : 'Switching'} from {quote.previousPlanName}
                        </div>
                    )}
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
                                Your payment is with our team for verification. Your subscription {quote.isProrated ? 'switches' : 'activates'} automatically the moment it's approved.
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

                                {quote.isProrated ? (
                                    <div className="rounded-md border border-input bg-muted/50 divide-y divide-border overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="text-muted-foreground">New plan ({plan.name})</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">₹{quote.newPlanPrice.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <Tag className="w-3 h-3" /> Credit · {quote.daysRemaining} day{quote.daysRemaining === 1 ? '' : 's'} left on {quote.previousPlanName}
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">− ₹{quote.creditAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-3 py-2.5 bg-brand-50 dark:bg-brand-900/20">
                                            <span className="font-bold text-slate-900 dark:text-white">Amount to pay now</span>
                                            <span className="text-lg font-black text-slate-900 dark:text-white">₹{quote.amountDue.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-11 flex items-center px-3 rounded-md border border-input bg-muted/50 text-base font-bold text-slate-900 dark:text-white">
                                        ₹{quote.amountDue.toLocaleString('en-IN')}
                                    </div>
                                )}
                            </div>

                            {quote.amountDue === 0 && quote.isProrated ? (
                                <p className="text-sm text-muted-foreground bg-muted/50 border border-input rounded-md px-3 py-2.5">
                                    Your credit fully covers this plan — no payment needed, just confirm the switch below.
                                </p>
                            ) : (
                                <>
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
                                </>
                            )}

                            <Button type="submit" size="lg" disabled={switchPlan.isPending} className="w-full font-semibold">
                                {switchPlan.isPending ? 'Submitting…' : quote.amountDue === 0 && quote.isProrated ? 'Confirm Switch' : 'Submit for Approval'}
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
