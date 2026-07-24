import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, TrendingDown, Gift, ShieldCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RevenueTab } from '../components/tabs/RevenueTab';
import { ExpenseTab } from '../components/tabs/ExpenseTab';
import { IncentiveTab } from '../components/tabs/IncentiveTab';
import { ApprovalsTab } from '../components/tabs/ApprovalsTab';

// Card-style nav matching the Admin / Appointment board: icon chip + label + description,
// blue→indigo gradient when active.
const TABS = [
    { id: 'revenue', label: 'Revenue', description: 'Bills & collections', icon: TrendingUp },
    { id: 'expense', label: 'Expense', description: 'Operational spend', icon: TrendingDown },
    { id: 'incentive', label: 'Incentive', description: 'Referral payouts', icon: Gift },
    { id: 'approvals', label: 'Approvals', description: 'Pending credit requests', icon: ShieldCheck },
] as const;

const TAB_TRIGGER = cn(
    'group w-full xl:flex-1 xl:min-w-[150px] h-auto flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 whitespace-normal',
    'rounded-xl px-2.5 py-2 sm:py-1.5 border border-transparent transition-all duration-300',
    'text-gray-600 hover:bg-white hover:text-gray-900 hover:-translate-y-0.5',
    'data-[state=active]:bg-gradient-to-br data-[state=active]:from-brand-600 data-[state=active]:to-brand-600',
    'data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-xl data-[state=active]:shadow-brand-500/30',
);

const fadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' as const },
};

export const BillingDashboard: React.FC = () => {
    const [tab, setTab] = useState('revenue');

    // Below lg: natural page scroll (the fixed-viewport/internal-scroll shell below starves the
    // list of vertical space once the KPI grid + filter bar eat the phone/tablet screen). At lg+
    // this reverts to the locked-viewport, internal-scroll desktop layout.
    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-3 sm:px-6 pt-2 pb-4 gap-4 overflow-visible lg:overflow-hidden">
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
                {/* Header Card (Unified Theme & Layout matching IPD & Appointment Dashboards) */}
                <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden shrink-0 mb-1">
                    {/* Decorative flare */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

                    <div className="relative z-10 flex flex-col gap-5">
                        {/* Header Row */}
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                                <IndianRupee className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Billing</h1>
                                <p className="text-[11px] text-brand-100 mt-0.5">Revenue, expenses and referral incentives.</p>
                            </div>
                        </div>

                        {/* Navigation Tab Capsule */}
                        <TabsList className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm h-auto w-full border-0 shadow-none">
                            {TABS.map((t) => (
                                <TabsTrigger
                                    key={t.id}
                                    value={t.id}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white",
                                        "px-1 select-none whitespace-normal flex-1"
                                    )}
                                    title={t.description}
                                >
                                    <t.icon className="h-5 w-5 mb-1 shrink-0" />
                                    <span className="text-[9px] font-bold tracking-wide leading-tight">{t.label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </div>

                <TabsContent value="revenue" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <motion.div key="revenue" {...fadeIn} className="h-full">
                        <RevenueTab />
                    </motion.div>
                </TabsContent>
                <TabsContent value="expense" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <motion.div key="expense" {...fadeIn} className="h-full">
                        <ExpenseTab />
                    </motion.div>
                </TabsContent>
                <TabsContent value="incentive" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <motion.div key="incentive" {...fadeIn} className="h-full">
                        <IncentiveTab />
                    </motion.div>
                </TabsContent>
                <TabsContent value="approvals" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <motion.div key="approvals" {...fadeIn} className="h-full">
                        <ApprovalsTab />
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BillingDashboard;
