import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Microscope, IndianRupee, Settings, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PathologyBillingTab } from './PathologyBillingTab';
import { PathologyWorkspace } from './PathologyWorkspace';
import { PathologySettingsTab } from './PathologySettingsTab';

const TABS = [
    { id: 'workspace', label: 'Workspace', description: 'Manage orders & results', icon: Microscope },
    { id: 'billing', label: 'Billing', description: 'Invoices & collections', icon: IndianRupee },
    { id: 'settings', label: 'Settings', description: 'Lab config & templates', icon: Settings },
] as const;

export const PathologyDashboard: React.FC = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-3 sm:px-6 pt-2 pb-4 gap-4 overflow-visible lg:overflow-hidden">
      <Tabs defaultValue="workspace" className="flex flex-col flex-1 min-h-0">
        {/* Header Card (Unified Theme & Layout matching IPD, Appointment & Billing Dashboards) */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden shrink-0 mb-1">
            {/* Decorative flare */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: Title */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                        <TestTube className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight">Pathology Lab</h1>
                        <p className="text-[11px] text-brand-100 mt-0.5">Manage orders and results.</p>
                    </div>
                </div>

                {/* Right: Navigation Tab Capsule */}
                <TabsList className="flex gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm h-auto w-full sm:w-auto border-0 shadow-none">
                    {TABS.map((t) => (
                        <TabsTrigger
                            key={t.id}
                            value={t.id}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white",
                                "px-3 select-none whitespace-normal flex-1 sm:flex-none sm:min-w-[110px]"
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

        <div className="flex-1 mt-3 overflow-auto">
          <TabsContent value="workspace" className="h-full m-0 data-[state=inactive]:hidden">
            <PathologyWorkspace />
          </TabsContent>
          <TabsContent value="billing" className="h-full m-0 data-[state=inactive]:hidden">
            <PathologyBillingTab />
          </TabsContent>
          <TabsContent value="settings" className="h-full m-0 pt-4 data-[state=inactive]:hidden">
            <PathologySettingsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
