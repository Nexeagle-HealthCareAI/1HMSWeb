import React, { useState } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RevenueTab } from '../components/tabs/RevenueTab';
import { ExpenseTab } from '../components/tabs/ExpenseTab';
import { IncentiveTab } from '../components/tabs/IncentiveTab';

export const BillingDashboard: React.FC = () => {
    const [tab, setTab] = useState('revenue');

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 px-4 sm:px-6 pt-2 pb-4 gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                    <IndianRupee className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Billing</h1>
                    <p className="text-xs text-slate-500">Revenue, expenses and referral incentives.</p>
                </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
                <TabsList className="bg-white border border-slate-200 shadow-sm w-fit">
                    <TabsTrigger value="revenue" className="gap-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <TrendingUp className="h-4 w-4" /> Revenue
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="gap-1.5 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700">
                        <TrendingDown className="h-4 w-4" /> Expense
                    </TabsTrigger>
                    <TabsTrigger value="incentive" className="gap-1.5 data-[state=active]:bg-fuchsia-50 data-[state=active]:text-fuchsia-700">
                        <Gift className="h-4 w-4" /> Incentive
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <RevenueTab />
                </TabsContent>
                <TabsContent value="expense" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <ExpenseTab />
                </TabsContent>
                <TabsContent value="incentive" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                    <IncentiveTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BillingDashboard;
