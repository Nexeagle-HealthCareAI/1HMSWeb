import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CheckCircle, AlertTriangle, CreditCard, ShieldCheck, Zap, Stethoscope, BedDouble, Mail, Sparkles, LayoutGrid, Receipt, CalendarClock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import { SubscriptionPlanDrawer } from '../components/SubscriptionPlanDrawer';
import { CYCLE_DAYS, CYCLE_LABEL, type BillingCycle, type SubscriptionPlan } from '../services/subscriptionApi';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// One shared status vocabulary — subscription status (Trial/Active/Expired/Blocked/Rejected/
// Pending/PendingApproval) and payment status (PendingApproval/Approved/Rejected) overlap enough
// to share a single badge style map.
const statusStyles: Record<string, string> = {
    Trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    Expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PendingApproval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap', statusStyles[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}>
        {status}
    </span>
);

export const SubscriptionPage = () => {
    const { toast } = useToast();
    const hospitalId = useAuthStore(state => state.hospitalId) || '';

    const { getStatus, getPlans, getPaymentHistory } = useSubscriptionApi();
    const { data: status, isLoading: isLoadingStatus } = getStatus(hospitalId);
    const { data: plans = [], isLoading: isLoadingPlans } = getPlans();
    const { data: paymentHistory = [], isLoading: isLoadingHistory } = getPaymentHistory(hospitalId);

    const [cycle, setCycle] = useState<BillingCycle>('Monthly');
    const [drawerPlan, setDrawerPlan] = useState<SubscriptionPlan | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTeamSize, setSelectedTeamSize] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'current' | 'plans'>('current');
    const [historyPage, setHistoryPage] = useState(1);

    const activePlan = useMemo(() => plans.find(p => p.id === status?.planId), [plans, status?.planId]);

    const HISTORY_PAGE_SIZE = 5;
    const historyTotalPages = Math.max(1, Math.ceil(paymentHistory.length / HISTORY_PAGE_SIZE));
    const currentHistoryPage = Math.min(historyPage, historyTotalPages);
    const paginatedHistory = useMemo(
        () => paymentHistory.slice((currentHistoryPage - 1) * HISTORY_PAGE_SIZE, currentHistoryPage * HISTORY_PAGE_SIZE),
        [paymentHistory, currentHistoryPage]
    );

    const cyclePlans = useMemo(() => plans.filter(p => p.billingCycle === cycle), [plans, cycle]);
    // Only worth showing the Monthly/Quarterly/Yearly switch once a second cycle actually exists
    // in the catalog — a visible-but-empty toggle would be a dead end for the user. Sorted by
    // actual duration (not alphabetically) so the toggle always reads shortest-to-longest.
    const availableCycles = useMemo(
        () => Array.from(new Set(plans.map(p => p.billingCycle))).sort((a, b) => CYCLE_DAYS[a] - CYCLE_DAYS[b]),
        [plans]
    );

    const enterprisePlan = useMemo(() => cyclePlans.find(p => p.isEnterprise), [cyclePlans]);
    // Plans are priced along two axes (team size + bed capacity). Segmenting by team size first —
    // like a real SaaS pricing page — keeps the grid to 3-4 cards instead of dumping every
    // combination on screen at once.
    const teamSizes = useMemo(() => {
        const sizes = cyclePlans.filter(p => !p.isEnterprise && p.maxDoctors != null).map(p => p.maxDoctors as number);
        return Array.from(new Set(sizes)).sort((a, b) => a - b);
    }, [cyclePlans]);

    useEffect(() => {
        if (teamSizes.length > 0 && (selectedTeamSize === null || !teamSizes.includes(selectedTeamSize))) {
            setSelectedTeamSize(teamSizes[0]);
        }
    }, [teamSizes, selectedTeamSize]);

    const tierPlans = useMemo(
        () => cyclePlans
            .filter(p => !p.isEnterprise && p.maxDoctors === selectedTeamSize)
            .sort((a, b) => a.discountedPrice - b.discountedPrice),
        [cyclePlans, selectedTeamSize]
    );
    const visiblePlans = useMemo(
        () => (enterprisePlan ? [...tierPlans, enterprisePlan] : tierPlans),
        [tierPlans, enterprisePlan]
    );
    // The middle-priced tier is highlighted as the recommended pick — the classic pricing-page
    // "decoy" pattern that gives the eye somewhere to land instead of 3-4 equally-weighted cards.
    const popularPlanId = tierPlans.length >= 3 ? tierPlans[Math.floor((tierPlans.length - 1) / 2)].id : null;

    // Features shared by every tier in the current group are hoisted into a single summary line
    // instead of repeating the identical checklist on every card — a card only lists what's extra.
    const sharedFeatures = useMemo(() => {
        if (tierPlans.length === 0) return [];
        return tierPlans[0].features.filter(f => tierPlans.every(p => p.features.includes(f)));
    }, [tierPlans]);

    // Just opens the review drawer — nothing is written to the backend until the user actually
    // submits payment there (see useSubscriptionApi's switchPlan for why). Lets them freely
    // browse/compare plans, or back out of an upgrade, without side effects.
    const handleSelectPlan = (plan: SubscriptionPlan) => {
        setDrawerPlan(plan);
        setDrawerOpen(true);
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

    const isBlocked = status?.status === 'Expired' || status?.status === 'Blocked';
    const isPending = status?.status === 'Pending';
    const isPendingApproval = status?.status === 'PendingApproval';
    const isRejected = status?.status === 'Rejected';

    return (
        <div className="min-h-full lg:h-[calc(100vh-4rem)] w-full relative overflow-hidden lg:bg-white dark:lg:bg-slate-900 lg:border border-gray-200 dark:border-gray-800 lg:rounded-2xl flex flex-col">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            {/* Mobile Tab Bar */}
            <div className="lg:hidden flex p-1 mx-4 mt-4 mb-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl relative z-10 shadow-sm">
                <button
                    onClick={() => setActiveTab('current')}
                    className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'current' ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    Current Plan
                </button>
                <button
                    onClick={() => setActiveTab('plans')}
                    className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'plans' ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
                    )}
                >
                    Upgrade Plans
                </button>
            </div>

            <div className="relative z-10 w-full h-full flex flex-col lg:flex-row lg:overflow-hidden">
                {/* Left Panel: Current Subscription & History */}
                <div className={cn(
                    "w-full lg:w-[360px] xl:w-[420px] shrink-0 lg:border-r border-slate-200 dark:border-slate-800 bg-transparent lg:bg-slate-50/50 dark:lg:bg-slate-900/50 p-4 lg:p-6 lg:overflow-y-auto",
                    activeTab === 'current' ? 'block' : 'hidden lg:block'
                )}>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-brand-500" /> Current Plan
                    </h2>

                    <div className="space-y-6">
                        {status ? (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
                                <Card className="border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <div>
                                                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{activePlan?.name ?? 'Unknown Plan'}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{activePlan ? `Billed ${activePlan.billingCycle}` : 'Free trial'}</p>
                                            </div>
                                            <StatusBadge status={status.status} />
                                        </div>

                                        {status.daysLeft !== undefined && status.daysLeft >= 0 && (() => {
                                            const isUrgent = status.status === 'Active' && status.daysLeft <= 3;
                                            return (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex justify-between items-baseline text-xs font-semibold mb-1.5">
                                                        <span className={isUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}>
                                                            {isUrgent ? 'Renews soon' : 'Time remaining'}
                                                        </span>
                                                        <span className={cn('text-sm font-bold', isUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200')}>
                                                            {status.daysLeft} d
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(100, (status.daysLeft / (activePlan ? CYCLE_DAYS[activePlan.billingCycle] : 30)) * 100)}
                                                        className="h-1.5"
                                                        indicatorClassName={isUrgent ? 'bg-red-500' : 'bg-brand-500'}
                                                    />
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl shadow-sm text-sm">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5"><Zap className="w-4 h-4"/> No Plan</h3>
                                <p className="text-blue-700 dark:text-blue-400 mt-1">Select a plan on the right to get started.</p>
                            </div>
                        )}

                        {isBlocked && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 p-4 rounded-xl shadow-sm text-sm">
                                <h3 className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Inactive</h3>
                                <p className="text-red-700 dark:text-red-400 mt-1 leading-relaxed">Your subscription expired. Submit a payment to restore access.</p>
                            </div>
                        )}
                        {isRejected && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 p-4 rounded-xl shadow-sm text-sm">
                                <h3 className="font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Rejected</h3>
                                <p className="text-red-700 dark:text-red-400 mt-1 leading-relaxed">Last payment rejected. Please review and resubmit.</p>
                                {status?.rejectionReason && (
                                    <div className="mt-2 bg-white/60 dark:bg-black/20 p-2 rounded text-red-800 dark:text-red-300 text-xs font-medium border border-red-200/50">
                                        {status.rejectionReason}
                                    </div>
                                )}
                            </div>
                        )}
                        {isPendingApproval && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl shadow-sm text-sm">
                                <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5"><CreditCard className="w-4 h-4"/> Verification Pending</h3>
                                <p className="text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">Payment received and is currently being verified.</p>
                            </div>
                        )}
                        {isPending && (
                            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/60 p-4 rounded-xl shadow-sm text-sm">
                                <h3 className="font-bold text-brand-900 dark:text-brand-300 flex items-center gap-1.5"><CreditCard className="w-4 h-4"/> Pending Payment</h3>
                                <p className="text-brand-700 dark:text-brand-400 mt-1 leading-relaxed">Select a plan and submit payment details to continue.</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="w-full font-semibold shadow-sm text-slate-700 dark:text-slate-200">
                                        <Receipt className="w-4 h-4 mr-2" /> View Billing History
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-y-auto p-0">
                                    <div className="p-6">
                                        <SheetHeader className="mb-6">
                                            <SheetTitle className="flex items-center gap-2 text-xl font-bold">
                                                <Receipt className="w-5 h-5 text-brand-500" /> Payment History
                                            </SheetTitle>
                                        </SheetHeader>
                                        
                                        {isLoadingHistory ? (
                                            <div className="text-center py-10 text-sm text-muted-foreground">Loading payment history...</div>
                                        ) : paymentHistory.length === 0 ? (
                                            <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                No payments submitted yet.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {paymentHistory.map(entry => {
                                                    const planName = entry.planName ?? plans.find(p => p.id === entry.planId)?.name ?? 'Unknown Plan';
                                                    return (
                                                        <div key={entry.paymentId} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
                                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white text-base">{planName}</p>
                                                                    <p className="text-sm text-muted-foreground mt-0.5">{new Date(entry.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {entry.paymentMode ?? 'Unknown mode'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-black text-lg text-slate-900 dark:text-white">₹{entry.amount.toLocaleString('en-IN')}</p>
                                                                    <StatusBadge status={entry.status} />
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Ref: {entry.reference}</div>
                                                            {entry.isProratedSwitch && (
                                                                <div className="mt-3 p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-xs text-brand-700 dark:text-brand-300 font-medium">
                                                                    Switch from {entry.previousPlanName} {entry.proratedCreditAmount != null && `· credit applied: ₹${entry.proratedCreditAmount.toLocaleString('en-IN')}`}
                                                                </div>
                                                            )}
                                                            {entry.status === 'Rejected' && entry.rejectionReason && (
                                                                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300 font-medium border border-red-100 dark:border-red-900/50">
                                                                    Reason: {entry.rejectionReason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Available Plans */}
                <div className={cn(
                    "flex-1 lg:overflow-y-auto p-4 lg:p-6 md:p-8 relative",
                    activeTab === 'plans' ? 'block' : 'hidden lg:block'
                )}>
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Available Plans</h2>
                                <p className="text-sm text-muted-foreground mt-1">Upgrade your capabilities and scale seamlessly.</p>
                            </div>
                            
                            {/* Toggles */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto overflow-hidden sm:overflow-visible">
                                {/* Billing Cycle Toggle */}
                                {availableCycles.length > 1 && (
                                    <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1 shadow-inner shrink-0 mx-auto sm:mx-0">
                                        {availableCycles.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setCycle(c)}
                                                className={cn(
                                                    'px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap',
                                                    cycle === c ? 'bg-brand-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                                )}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Doctor Size Chips */}
                                {teamSizes.length > 1 && (
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 mx-auto sm:mx-0">
                                        {teamSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedTeamSize(size)}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border',
                                                    selectedTeamSize === size 
                                                      ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400'
                                                )}
                                            >
                                                <Stethoscope className="w-4 h-4" />
                                                {size} Doc{size > 1 ? 's' : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {sharedFeatures.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 px-4 py-3 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100/50 dark:border-brand-800/30">
                                <div className="text-xs font-bold uppercase tracking-widest text-brand-600/80 dark:text-brand-400/80">Included in all:</div>
                                {sharedFeatures.map(f => (
                                    <span key={f} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <CheckCircle className="w-3.5 h-3.5 text-brand-500" strokeWidth={2.5} />
                                        {f}
                                    </span>
                                ))}
                            </div>
                        )}

                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {visiblePlans.map((plan) => {
                                const isCurrentPlan = plan.id === status?.planId;
                                const isPopular = !isCurrentPlan && plan.id === popularPlanId;
                                const extraFeatures = plan.features.filter(f => !sharedFeatures.includes(f));
                                return (
                                    <motion.div key={plan.id} variants={itemVariants} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300 }} className="h-full flex">
                                        <Card className={cn(
                                            "relative flex flex-col w-full border-2 overflow-hidden transition-all duration-300 rounded-2xl",
                                            isCurrentPlan
                                                ? "border-brand-500 shadow-xl shadow-brand-500/20 bg-white dark:bg-slate-900"
                                                : isPopular
                                                    ? "border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-500/10 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-900/10 dark:to-slate-900"
                                                    : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700"
                                        )}>
                                            {isCurrentPlan && (
                                                <div className="absolute top-0 right-0 bg-brand-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm z-10">
                                                    Current
                                                </div>
                                            )}
                                            {isPopular && (
                                                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow-sm z-10 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Popular
                                                </div>
                                            )}
                                            <CardHeader className="pb-4 pt-5">
                                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                    {plan.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs font-semibold flex items-center gap-1 mt-1">
                                                    <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" /> Billed {plan.billingCycle.toLowerCase()}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow pb-4">
                                                <div className="mb-5">
                                                    {plan.isEnterprise ? (
                                                        <div className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white pt-2">Custom</div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                                                                    ₹{plan.discountedPrice.toLocaleString('en-IN')}
                                                                </span>
                                                                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">/ {CYCLE_LABEL[plan.billingCycle]}</span>
                                                            </div>
                                                            {plan.discountedPrice < plan.basePrice && (
                                                                <div className="mt-1.5 flex items-center gap-2">
                                                                    <div className="text-xs text-muted-foreground line-through decoration-slate-400">₹{plan.basePrice.toLocaleString('en-IN')}</div>
                                                                    <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                                                        Save {Math.round(((plan.basePrice - plan.discountedPrice) / plan.basePrice) * 100)}%
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-2 mb-5">
                                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700/50">
                                                        <span className="flex items-center gap-2"><Stethoscope className="w-3.5 h-3.5 text-brand-500" /> Doctors</span>
                                                        <span>{plan.maxDoctors == null ? 'Unlimited' : plan.maxDoctors}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700/50">
                                                        <span className="flex items-center gap-2"><BedDouble className="w-3.5 h-3.5 text-brand-500" /> Beds</span>
                                                        <span>{plan.maxBeds == null ? 'Unlimited' : plan.maxBeds}</span>
                                                    </div>
                                                </div>

                                                {extraFeatures.length > 0 && (
                                                    <ul className="space-y-3">
                                                        {extraFeatures.map((feature: string, idx: number) => (
                                                            <li key={idx} className="flex items-start text-xs font-medium text-slate-700 dark:text-slate-300">
                                                                <CheckCircle className="w-3.5 h-3.5 text-brand-500 mr-2 shrink-0 opacity-80" />
                                                                <span className="leading-tight">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-slate-900/30">
                                                {plan.isEnterprise ? (
                                                    <Button asChild className="w-full text-sm font-bold shadow-sm" variant="secondary">
                                                        <a href={`mailto:info@nexeagle.com?subject=${encodeURIComponent(`Enterprise plan enquiry — ${plan.name}`)}`}>
                                                            <Mail className="w-3.5 h-3.5 mr-2" /> Contact Us
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className={cn(
                                                            "w-full text-sm font-bold shadow-sm transition-all",
                                                            isPopular && !isCurrentPlan && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                                                        )}
                                                        variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'secondary'}
                                                        onClick={() => handleSelectPlan(plan)}
                                                    >
                                                        {isCurrentPlan ? 'Manage Current Plan' : status?.status === 'Active' ? 'Switch Plan' : 'Select Plan'}
                                                    </Button>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </div>

            <SubscriptionPlanDrawer
                hospitalId={hospitalId}
                plan={drawerPlan}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                previousPlan={activePlan ?? null}
                subscriptionStatus={status}
            />
        </div>
    );
};

export default SubscriptionPage;
