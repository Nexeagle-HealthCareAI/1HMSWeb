import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { CheckCircle, AlertTriangle, CreditCard, ShieldCheck, Zap, Stethoscope, BedDouble, Mail, Sparkles, LayoutGrid, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionApi } from '../hooks/useSubscriptionApi';
import { SubscriptionPlanDrawer } from '../components/SubscriptionPlanDrawer';
import { CYCLE_DAYS, CYCLE_LABEL, type BillingCycle, type SubscriptionPlan } from '../services/subscriptionApi';
import { motion, type Variants } from 'framer-motion';
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
        <div className="min-h-[calc(100vh-140px)] w-full relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            {/* Ambient Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 container mx-auto py-10 px-4 md:px-8 max-w-5xl h-full overflow-y-auto scrollbar-hide">
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'current' | 'plans')} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1 h-auto">
                            <TabsTrigger
                                value="current"
                                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-300"
                            >
                                <ShieldCheck className="w-4 h-4" /> Current Subscription
                            </TabsTrigger>
                            <TabsTrigger
                                value="plans"
                                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold data-[state=active]:bg-brand-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 dark:text-slate-300"
                            >
                                <LayoutGrid className="w-4 h-4" /> All Plans
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ── Current Subscription ─────────────────────────────────────────── */}
                    <TabsContent value="current" className="mt-0 focus-visible:outline-none space-y-6">
                        {status ? (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
                                <Card className="border-border/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-white/0 pointer-events-none" />
                                    <CardContent className="p-6 relative">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Active Plan</p>
                                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activePlan?.name ?? 'No Plan Selected'}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {activePlan ? `Billed ${activePlan.billingCycle}` : 'Free trial — no plan selected yet'}
                                                </p>
                                            </div>
                                            <StatusBadge status={status.status} />
                                        </div>

                                        {status.daysLeft !== undefined && status.daysLeft >= 0 && (() => {
                                            const isUrgent = status.status === 'Active' && status.daysLeft <= 3;
                                            return (
                                                <div className="mt-6">
                                                    <div className="flex justify-between items-baseline text-sm font-medium mb-1.5">
                                                        <span className={isUrgent ? 'text-red-600 dark:text-red-400 font-bold' : 'text-muted-foreground'}>
                                                            {isUrgent ? 'Renews Soon — Days Remaining' : 'Days Remaining'}
                                                        </span>
                                                        <span className={cn('font-bold', isUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200')}>
                                                            {status.daysLeft} day{status.daysLeft === 1 ? '' : 's'}
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(100, (status.daysLeft / (activePlan ? CYCLE_DAYS[activePlan.billingCycle] : 30)) * 100)}
                                                        className="h-2"
                                                        indicatorClassName={isUrgent ? 'bg-red-500' : undefined}
                                                    />
                                                    {isUrgent && (
                                                        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                                                            Your subscription is about to end — renew now to avoid losing access.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-full text-blue-600 dark:text-blue-300">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-blue-900 dark:text-blue-300 font-bold text-xl">No Active Subscription</h3>
                                        <p className="text-blue-700 dark:text-blue-400 mt-2 max-w-3xl">
                                            You currently do not have an active subscription plan. Select a plan to unlock all features.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {isBlocked && (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
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

                        {isRejected && (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                                    <div className="p-3 bg-red-100 dark:bg-red-800/50 rounded-full text-red-600 dark:text-red-400">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-red-900 dark:text-red-300 font-bold text-xl">Payment Rejected</h3>
                                        <p className="text-red-700 dark:text-red-400 mt-2">
                                            Your last payment submission was rejected{status?.rejectedAt ? ` on ${new Date(status.rejectedAt).toLocaleDateString()}` : ''}.
                                            Please review the reason below, then select a plan and resubmit your payment details.
                                        </p>
                                        {status?.rejectionReason && (
                                            <div className="mt-3 bg-white/70 dark:bg-black/20 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3">
                                                <p className="text-xs uppercase tracking-wider text-red-500 dark:text-red-400 font-semibold mb-1">Reason from admin</p>
                                                <p className="text-red-800 dark:text-red-300 text-sm font-medium">{status.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {isPendingApproval && (
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
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
                            <motion.div variants={itemVariants} initial="hidden" animate="show">
                                <div className="bg-gradient-to-r from-brand-50 to-blue-50 dark:from-brand-900/20 dark:to-blue-900/20 border border-brand-200 dark:border-brand-800 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                                    <div className="p-3 bg-brand-100 dark:bg-brand-800/50 rounded-full text-brand-600 dark:text-brand-300">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-brand-900 dark:text-brand-300 font-bold text-xl">Complete Your Subscription</h3>
                                        <p className="text-brand-700 dark:text-brand-400 mt-2">
                                            You have selected a plan. Open it below to submit your payment details.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="flex justify-center pt-2">
                            <Button onClick={() => setActiveTab('plans')} size="lg" className="font-semibold">
                                <LayoutGrid className="w-4 h-4 mr-2" /> {status?.planId ? 'Change Plan' : 'View Plans'}
                            </Button>
                        </div>

                        {/* Payment History */}
                        <div className="pt-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-brand-500" /> Payment History
                            </h3>
                            {isLoadingHistory ? (
                                <div className="text-center py-10 text-sm text-muted-foreground">Loading payment history...</div>
                            ) : paymentHistory.length === 0 ? (
                                <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                    No payments submitted yet.
                                </div>
                            ) : (
                                <>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Plan</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Mode</TableHead>
                                                    <TableHead>Reference</TableHead>
                                                    <TableHead>Submitted</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedHistory.map(entry => {
                                                    const planName = entry.planName ?? plans.find(p => p.id === entry.planId)?.name ?? 'Unknown Plan';
                                                    return (
                                                        <React.Fragment key={entry.paymentId}>
                                                            <TableRow>
                                                                <TableCell className="font-medium">
                                                                    {planName}
                                                                    {entry.isProratedSwitch && (
                                                                        <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                                                                            Switch from {entry.previousPlanName}
                                                                            {entry.proratedCreditAmount != null && ` · credit ₹${entry.proratedCreditAmount.toLocaleString('en-IN')}`}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>₹{entry.amount}</TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">{entry.paymentMode ?? '—'}</TableCell>
                                                                <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {new Date(entry.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                                                </TableCell>
                                                                <TableCell><StatusBadge status={entry.status} /></TableCell>
                                                            </TableRow>
                                                            {entry.status === 'Rejected' && entry.rejectionReason && (
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableCell colSpan={6} className="pt-0 pb-3 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">
                                                                        Reason: {entry.rejectionReason}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {historyTotalPages > 1 && (
                                        <Pagination className="mt-4">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={e => { e.preventDefault(); setHistoryPage(p => Math.max(1, p - 1)); }}
                                                        className={cn(currentHistoryPage === 1 && 'pointer-events-none opacity-50')}
                                                    />
                                                </PaginationItem>
                                                {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map(p => (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={p === currentHistoryPage}
                                                            onClick={e => { e.preventDefault(); setHistoryPage(p); }}
                                                        >
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={e => { e.preventDefault(); setHistoryPage(p => Math.min(historyTotalPages, p + 1)); }}
                                                        className={cn(currentHistoryPage === historyTotalPages && 'pointer-events-none opacity-50')}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )}
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* ── All Plans ─────────────────────────────────────────────────────── */}
                    <TabsContent value="plans" className="mt-0 focus-visible:outline-none">
                        <div className="flex flex-col items-center gap-6 mt-4 mb-10">
                            {(availableCycles.length > 1 || teamSizes.length > 1) && (
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 w-full">
                                    {availableCycles.length > 1 && (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Billing Cycle</span>
                                            <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1">
                                                {availableCycles.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setCycle(c)}
                                                        className={cn(
                                                            'px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap',
                                                            cycle === c ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                                        )}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {teamSizes.length > 1 && (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Team Size</span>
                                            <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1">
                                                {teamSizes.map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setSelectedTeamSize(size)}
                                                        className={cn(
                                                            'flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap',
                                                            selectedTeamSize === size ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                                        )}
                                                    >
                                                        <Stethoscope className="w-4 h-4" />
                                                        {size} Doctor{size === 1 ? '' : 's'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {sharedFeatures.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 max-w-3xl">
                                    {sharedFeatures.map(f => (
                                        <span key={f} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-4 pb-12 items-start">
                            {visiblePlans.map((plan) => {
                                const isCurrentPlan = plan.id === status?.planId;
                                const isPopular = !isCurrentPlan && plan.id === popularPlanId;
                                const extraFeatures = plan.features.filter(f => !sharedFeatures.includes(f));
                                return (
                                    <motion.div key={plan.id} variants={itemVariants} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className={cn(isPopular && 'md:-mt-3')}>
                                        <Card className={cn(
                                            "relative h-full flex flex-col border-2 overflow-hidden transition-all duration-300",
                                            isCurrentPlan
                                                ? "border-brand-500 shadow-2xl shadow-brand-500/10 bg-white dark:bg-slate-900"
                                                : isPopular
                                                    ? "border-amber-400 dark:border-amber-500 shadow-2xl shadow-amber-500/10 bg-white dark:bg-slate-900"
                                                    : "border-transparent bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-lg hover:shadow-xl dark:border-slate-800"
                                        )}>
                                            {isCurrentPlan && (
                                                <>
                                                    <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm z-10">
                                                        Current Plan
                                                    </div>
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                                </>
                                            )}
                                            {isPopular && (
                                                <>
                                                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> Most Popular
                                                    </div>
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                                                </>
                                            )}
                                            <CardHeader className="pb-6">
                                                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                    {plan.name}
                                                </CardTitle>
                                                <CardDescription className="text-sm font-medium">Billed {plan.billingCycle.toLowerCase()}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <div className="mb-6 relative">
                                                    {plan.isEnterprise ? (
                                                        <div className="flex items-end gap-2">
                                                            <span className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Custom</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">₹{plan.discountedPrice}</span>
                                                                <span className="text-muted-foreground mb-2 font-medium">/ {CYCLE_LABEL[plan.billingCycle]}</span>
                                                            </div>
                                                            {plan.discountedPrice < plan.basePrice && (
                                                                <div className="mt-3 flex items-center gap-3">
                                                                    <div className="text-sm text-muted-foreground line-through decoration-slate-400">₹{plan.basePrice}</div>
                                                                    <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-green-200 dark:border-green-800">
                                                                        SAVE {Math.round(((plan.basePrice - plan.discountedPrice) / plan.basePrice) * 100)}%
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <Stethoscope className="w-3.5 h-3.5 text-brand-500" />
                                                        {plan.maxDoctors == null ? 'Unlimited doctors' : `Up to ${plan.maxDoctors} doctor${plan.maxDoctors === 1 ? '' : 's'}`}
                                                    </div>
                                                    <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        <BedDouble className="w-3.5 h-3.5 text-brand-500" />
                                                        {plan.maxBeds == null ? 'Unlimited beds' : `Up to ${plan.maxBeds} beds`}
                                                    </div>
                                                </div>

                                                {extraFeatures.length > 0 && (
                                                    <ul className="space-y-4">
                                                        {extraFeatures.map((feature: string, idx: number) => (
                                                            <li key={idx} className="flex items-start">
                                                                <div className="mt-0.5 bg-brand-50 dark:bg-brand-900/20 p-1 rounded-full mr-3 border border-brand-100 dark:border-brand-800/50">
                                                                    <CheckCircle className="text-brand-500 w-3 h-3" strokeWidth={3} />
                                                                </div>
                                                                <span className="text-slate-700 dark:text-slate-300 font-medium">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </CardContent>
                                            <CardFooter className="pt-6 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
                                                {plan.isEnterprise ? (
                                                    <Button asChild className="w-full text-base font-semibold transition-all shadow-md" size="lg" variant="secondary">
                                                        <a href={`mailto:info@nexeagle.com?subject=${encodeURIComponent(`Enterprise plan enquiry — ${plan.name}`)}`}>
                                                            <Mail className="w-4 h-4 mr-2" /> Contact Us
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className={cn(
                                                            "w-full text-base font-semibold transition-all shadow-md",
                                                            isPopular && !isCurrentPlan && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                                                        )}
                                                        size="lg"
                                                        variant={isCurrentPlan ? 'default' : isPopular ? 'default' : 'secondary'}
                                                        onClick={() => handleSelectPlan(plan)}
                                                    >
                                                        {isCurrentPlan ? 'Manage / Pay' : status?.status === 'Active' ? 'Switch Plan' : 'Select Plan'}
                                                    </Button>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </TabsContent>
                </Tabs>
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
