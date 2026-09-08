import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Microscope, IndianRupee, FlaskConical, LayoutTemplate, TestTube, Zap, Sparkles, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ipdBillingService } from '@/features/billing/services/ipdBillingService';
import { PathologyBillingTab } from './PathologyBillingTab';
import { PathologyWorkspace } from './PathologyWorkspace';
import { TestCatalogManager } from './TestCatalogManager';
import { ReportLetterheadConfig } from './ReportLetterheadConfig';
import { ReportKeywordsManager } from './ReportKeywordsManager';
import { LabSettingsPanel } from './LabSettingsPanel';

const TABS = [
    { id: 'workspace', label: 'Workspace', description: 'Manage orders & results', icon: Microscope },
    { id: 'billing', label: 'Billing', description: 'Invoices & collections', icon: IndianRupee },
    { id: 'catalog', label: 'Test Catalog', description: 'Test master, ranges & pricing', icon: FlaskConical },
    { id: 'keywords', label: 'Keywords', description: 'Reusable formatted report paragraphs', icon: Sparkles },
    { id: 'lab-settings', label: 'Lab Settings', description: 'Lab identity, sign-off & online listing', icon: Settings2 },
    { id: 'letterhead', label: 'Letterhead', description: 'Report letterhead designer', icon: LayoutTemplate },
] as const;

// Mirrors BillingPolicyConfig.tsx's LAB_PATH_TRIGGER_OPTIONS labels (plus ON_SAMPLE_COLLECTION,
// which the backend honors -- CollectPathologySampleHandler.cs -- but that settings screen
// doesn't currently expose as a selectable option).
const AUTO_BILLING_LABELS: Record<string, string> = {
    ON_ORDER: 'On Order Placement',
    ON_SAMPLE_COLLECTION: 'On Sample Collection',
    ON_REPORT_APPROVAL: 'On Report Approval',
};

export const PathologyDashboard: React.FC = () => {
  const [autoBillingMode, setAutoBillingMode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('workspace');

  useEffect(() => {
    let cancelled = false;
    ipdBillingService.getPolicy()
      .then((res: any) => {
        if (cancelled || res?.success === false) return;
        const trigger = res?.data?.labPathTrigger;
        setAutoBillingMode(trigger && trigger !== 'OFF' ? trigger : null);
      })
      .catch(() => { /* silent -- the header badge is a convenience, not load-bearing */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-slate-100/60 px-3 sm:px-6 pt-2 pb-4 gap-4 overflow-visible lg:overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold tracking-tight">Pathology Lab</h1>
                            {autoBillingMode && (
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-100 border border-emerald-300/30"
                                    title={`Lab charges post automatically: ${AUTO_BILLING_LABELS[autoBillingMode] ?? autoBillingMode}`}
                                >
                                    <Zap className="h-2.5 w-2.5" /> Auto-Billing: {AUTO_BILLING_LABELS[autoBillingMode] ?? autoBillingMode}
                                </span>
                            )}
                        </div>
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
            <PathologyWorkspace onNavigateToLabSettings={() => setActiveTab('lab-settings')} />
          </TabsContent>
          <TabsContent value="billing" className="h-full m-0 data-[state=inactive]:hidden">
            <PathologyBillingTab />
          </TabsContent>
          <TabsContent value="catalog" className="h-full m-0 pt-1 data-[state=inactive]:hidden">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">Test Catalog</h2>
              <p className="text-sm text-muted-foreground">Manage your pathology test master list, normal ranges, and pricing linkage.</p>
            </div>
            <TestCatalogManager />
          </TabsContent>
          <TabsContent value="keywords" className="h-full m-0 pt-1 data-[state=inactive]:hidden">
            <ReportKeywordsManager />
          </TabsContent>
          <TabsContent value="lab-settings" className="h-full m-0 pt-1 data-[state=inactive]:hidden">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">Lab Settings</h2>
              <p className="text-sm text-muted-foreground">Lab identity, the manual sign-off names printed on reports, and online listing on Doctor Dekho.</p>
            </div>
            <LabSettingsPanel />
          </TabsContent>
          <TabsContent value="letterhead" className="h-full m-0 pt-1 data-[state=inactive]:hidden">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800">Report Letterhead Designer</h2>
              <p className="text-sm text-muted-foreground">Design and configure letterheads for your pathology reports. You can create multiple templates and set a default.</p>
            </div>
            <ReportLetterheadConfig />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
