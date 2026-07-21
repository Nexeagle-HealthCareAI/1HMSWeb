import React from 'react';
import { Building2 } from 'lucide-react';
import { SystemConfiguration } from '@/features/hospital/components/SystemConfiguration';
import { SubscriptionReadOnlyOverlay } from '@/features/subscription/components/SubscriptionReadOnlyOverlay';

export const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8 pb-24 max-md:pb-28">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Android UI Compatible Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-3 shadow-lg shadow-brand-500/5 ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950/40 dark:to-brand-900/40 border border-brand-200 dark:border-brand-800 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/10">
              <Building2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Hospital Info</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your hospital configuration and public directory.</p>
            </div>
          </div>
        </div>

        <SubscriptionReadOnlyOverlay featureLabel="Managing hospital settings">
          <SystemConfiguration />
        </SubscriptionReadOnlyOverlay>
      </div>
    </div>
  );
};

export default SettingsPage;
