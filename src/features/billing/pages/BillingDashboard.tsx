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
                {/* Header + tab navigation in one row (matches the Admin / Appointment board) */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-xl px-3 py-3 sm:px-4 shadow-lg shadow-brand-500/5 ring-1 ring-black/5">
                    <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/30">
                            <IndianRupee className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">Billing</h1>
                            <p className="text-xs text-slate-500 truncate">Revenue, expenses and referral incentives.</p>
                        </div>
                    </div>

                    {/* 2×2 card grid on phones — every tab visible at once, no horizontal swipe —
                        a single row from sm up, reverting to the original inline flex row at xl. */}
                    <TabsList className="h-auto w-full xl:w-auto xl:flex-1 xl:max-w-2xl grid grid-cols-2 sm:grid-cols-4 xl:flex xl:flex-nowrap gap-2 rounded-2xl border border-slate-200 bg-white/70 p-1.5 sm:p-1 shadow-inner ring-1 ring-black/5">
                        {TABS.map((t) => (
                            <TabsTrigger key={t.id} value={t.id} className={TAB_TRIGGER} title={t.description}>
                                <div className="flex items-center justify-center sm:justify-start gap-1.5 font-semibold w-full">
                                    <span className="p-1 rounded-lg bg-gray-100 group-data-[state=active]:bg-white/20">
                                        <t.icon className="h-3.5 w-3.5 shrink-0 text-brand-500 group-data-[state=active]:text-white" />
                                    </span>
                                    <span className="hidden sm:inline text-[12px] line-clamp-1">{t.label}</span>
                                </div>
                                <span className="sm:hidden text-[10px] font-medium w-full text-center line-clamp-1 leading-tight">{t.label}</span>
                                <p className="hidden sm:block text-[10px] leading-snug w-full line-clamp-2 opacity-90 mt-0.5 text-gray-500 group-data-[state=active]:text-white/90">
                                    {t.description}
                                </p>
                            </TabsTrigger>
                        ))}
                    </TabsList>
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
