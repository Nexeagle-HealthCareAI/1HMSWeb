import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, Crown, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const SubscriptionPage = () => {
    const { toast } = useToast();
    const hospitalId = useAuthStore(state => state.hospitalId) || '';
    
    const { getStatus, getPlans, selectPlan, submitPayment } = useSubscriptionApi();
    const { data: statusResponse, isLoading: isLoadingStatus } = getStatus(hospitalId);
    const { data: plans = [], isLoading: isLoadingPlans } = getPlans();

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');

    const handleSelectPlan = async (planId: string) => {
        selectPlan.mutate(
            { hospitalId, planId },
            {
                onSuccess: () => {
                    toast({
                        title: 'Plan Selected',
                        description: 'Your plan has been selected. Please submit your payment details.',
                    });
                },
                onError: (error: any) => {
                    toast({
                        title: 'Error',
                        description: error.response?.data?.message || 'Failed to select plan',
                        variant: 'destructive'
                    });
                }
            }
        );
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAmount || !paymentReference) {
            toast({ title: 'Validation Error', description: 'Please enter amount and reference.', variant: 'destructive' });
            return;
        }

        submitPayment.mutate(
            { hospitalId, amount: Number(paymentAmount), reference: paymentReference },
            {
                onSuccess: () => {
                    toast({
                        title: 'Payment Submitted',
                        description: 'Your payment details have been submitted and are pending approval by CMS.',
                    });
                    setPaymentAmount('');
                    setPaymentReference('');
                },
                onError: (error: any) => {
                    toast({
                        title: 'Error',
                        description: error.response?.data?.message || 'Failed to submit payment',
                        variant: 'destructive'
                    });
                }
            }
        );
    };

    if (isLoadingStatus || isLoadingPlans) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium animate-pulse">Loading subscription details...</p>
                </div>
            </div>
        );
    }

    const status = statusResponse?.data || statusResponse;
    const isBlocked = status?.status === 'Expired' || status?.status === 'Blocked';
    const isPending = status?.status === 'Pending';
    const isPendingApproval = status?.status === 'PendingApproval';

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-[calc(100vh-140px)] w-full relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 container mx-auto py-12 px-4 md:px-8 max-w-6xl h-full overflow-y-auto scrollbar-hide">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 mb-4 shadow-sm border border-brand-100 dark:border-brand-800/50">
                        <Crown className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Manage Subscription
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Choose the perfect plan for your hospital and unlock powerful features to streamline your healthcare management.
                    </p>
                </motion.div>

                {status ? (
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-12">
                        <Card className="border-border/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-white/0 pointer-events-none" />
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className="text-brand-500" />
                                    Current Subscription Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</p>
                                        <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-blue-600">{status.status}</p>
                                    </div>
                                    {status.daysLeft !== undefined && status.daysLeft >= 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Time Remaining</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{status.daysLeft} days</p>
                                        </div>
                                    )}
                                    {status.paymentAmount !== undefined && status.paymentAmount !== null && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Last Payment</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">₹{status.paymentAmount}</p>
                                        </div>
                                    )}
                                    {status.paymentDate && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Payment Date</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{new Date(status.paymentDate).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-12">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-full text-blue-600 dark:text-blue-300">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-blue-900 dark:text-blue-300 font-bold text-xl">No Active Subscription</h3>
                                <p className="text-blue-700 dark:text-blue-400 mt-2 max-w-3xl">
                                    You currently do not have an active subscription plan. Select a premium plan below to unlock all features and take your hospital management to the next level.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isBlocked && (
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-12">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="p-3 bg-red-100 dark:bg-red-800/50 rounded-full text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-red-900 dark:text-red-300 font-bold text-xl">Subscription Inactive</h3>
                                <p className="text-red-700 dark:text-red-400 mt-2">
                                    Your trial or subscription has expired. Please select a plan and submit payment to continue using EasyHMS seamlessly.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isPendingApproval && (
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-12">
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="p-3 bg-amber-100 dark:bg-amber-800/50 rounded-full text-amber-600 dark:text-amber-400">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-amber-900 dark:text-amber-300 font-bold text-xl">Payment Verification Pending</h3>
                                <p className="text-amber-700 dark:text-amber-400 mt-2">
                                    We have received your payment details and are verifying the transaction. Your account will be fully activated shortly.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {isPending && (
                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="mb-12">
                        <Card className="border-brand-200 dark:border-brand-800/50 bg-gradient-to-b from-white to-brand-50/30 dark:from-slate-900 dark:to-brand-900/10 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                            <CardHeader>
                                <CardTitle className="text-2xl text-slate-800 dark:text-slate-100">Complete Your Subscription</CardTitle>
                                <CardDescription className="text-base">
                                    You have selected a plan. Please transfer the amount and provide the transaction reference below to activate.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmitPayment} className="space-y-6 max-w-xl">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount" className="font-semibold">Amount Paid (₹)</Label>
                                        <Input 
                                            id="amount" 
                                            type="number" 
                                            placeholder="e.g. 5000" 
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="h-12 text-lg bg-white/50 dark:bg-slate-800/50 focus-visible:ring-brand-500"
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reference" className="font-semibold">Transaction Reference / UTR Number</Label>
                                        <Input 
                                            id="reference" 
                                            type="text" 
                                            placeholder="Enter bank reference number" 
                                            value={paymentReference}
                                            onChange={e => setPaymentReference(e.target.value)}
                                            className="h-12 text-lg bg-white/50 dark:bg-slate-800/50 focus-visible:ring-brand-500"
                                            required 
                                        />
                                    </div>
                                    <Button type="submit" size="lg" disabled={submitPayment.isPending} className="w-full text-base font-semibold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-shadow">
                                        {submitPayment.isPending ? 'Submitting...' : 'Submit Payment Details'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid lg:grid-cols-3 gap-8 mt-12 pb-12">
                    {plans.map((plan) => {
                        const isPremium = plan.billingCycle === 'Yearly';
                        return (
                            <motion.div key={plan.id} variants={itemVariants} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                                <Card className={cn(
                                    "relative h-full flex flex-col border-2 overflow-hidden transition-all duration-300",
                                    isPremium 
                                        ? "border-brand-500 shadow-2xl shadow-brand-500/10 bg-white dark:bg-slate-900" 
                                        : "border-transparent bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg hover:shadow-xl dark:border-slate-800"
                                )}>
                                    {isPremium && (
                                        <>
                                            <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm z-10">
                                                Best Value
                                            </div>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                        </>
                                    )}
                                    <CardHeader className="pb-6">
                                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                            {plan.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium">Billed {plan.billingCycle.toLowerCase()}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="mb-8 relative">
                                            <div className="flex items-end gap-2">
                                                <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">₹{plan.discountedPrice}</span>
                                                <span className="text-muted-foreground mb-2 font-medium">/ month</span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="text-sm text-muted-foreground line-through decoration-slate-400">₹{plan.basePrice} / mo</div>
                                                <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-green-200 dark:border-green-800">
                                                    SAVE {Math.round(((plan.basePrice - plan.discountedPrice) / plan.basePrice) * 100)}%
                                                </div>
                                            </div>
                                        </div>
                                        <ul className="space-y-4">
                                            {plan.features.map((feature: string, idx: number) => (
                                                <li key={idx} className="flex items-start">
                                                    <div className="mt-0.5 bg-brand-50 dark:bg-brand-900/20 p-1 rounded-full mr-3 border border-brand-100 dark:border-brand-800/50">
                                                        <CheckCircle className="text-brand-500 w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="pt-6 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
                                        <Button 
                                            className="w-full text-base font-semibold transition-all shadow-md" 
                                            size="lg" 
                                            variant={isPremium ? 'default' : 'secondary'}
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={isPending || selectPlan.isPending}
                                        >
                                            {isPending ? 'Action Required' : 'Select Plan'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
