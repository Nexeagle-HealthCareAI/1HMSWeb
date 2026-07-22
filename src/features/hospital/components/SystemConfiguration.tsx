import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Palette,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Globe,
  Users,
  Building2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalBrandingConfig } from './HospitalBrandingConfig';
import { PublicDirectoryConfig } from './PublicDirectoryConfig';
import { UserManagement } from '@/features/user-management/components/UserManagement';
import { useSystemConfiguration } from '../hooks';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemConfigurationProps {
  focusTab?: string;
}

export const SystemConfiguration: React.FC<SystemConfigurationProps> = ({ focusTab }) => {
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    hospitalBranding,
    handleBrandingChange,
    daysRemaining,
    isTrialActive,
    isHospitalLoading,
    trialStartDate
  } = useSystemConfiguration(focusTab);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigationItems = useMemo(
    () => [

      {
        id: 'branding',
        label: t('systemConfiguration.navigation.branding.label'),
        description: t('systemConfiguration.navigation.branding.description'),
        icon: Palette,
      },
      {
        id: 'publicDirectory',
        label: t('systemConfiguration.navigation.publicDirectory.label', { defaultValue: 'Online Listing' }),
        description: t('systemConfiguration.navigation.publicDirectory.description', { defaultValue: 'Manage online visibility and doctor profiles' }),
        icon: Globe,
      },
      {
        id: 'users',
        label: t('systemConfiguration.navigation.users.label', { defaultValue: 'User Management' }),
        description: t('systemConfiguration.navigation.users.description', { defaultValue: 'Manage hospital staff' }),
        icon: Users,
        mobileOnly: true, // Only show on mobile top-nav, hidden on desktop sidebar
      }
    ] as const,
    [t]
  );

  return (
    <div className="flex bg-white dark:bg-slate-900 lg:border lg:border-gray-200 lg:dark:border-gray-800 lg:rounded-2xl overflow-hidden lg:shadow-sm h-[calc(100vh-140px)] max-lg:h-auto w-full relative z-10 animate-in fade-in duration-500 max-lg:bg-transparent">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-gray-50/50 dark:bg-slate-900/50 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative hidden lg:flex rounded-l-xl",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-3 top-6 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Sidebar Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Hospital Info</span>
            )}
          </div>
        </div>

        <div className="w-full p-4 border-b border-gray-100 dark:border-gray-800">
          <p className={cn(
            "text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-all duration-300",
            isSidebarCollapsed ? "text-center opacity-0 h-0 overflow-hidden" : "opacity-100"
          )}>
            {t('systemConfiguration.navigation.configurationAreas')}
          </p>
        </div>

        <div className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            if ('mobileOnly' in item && item.mobileOnly) return null;
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                activeTab === item.id
                  ? "bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                isSidebarCollapsed ? "justify-center" : "gap-3"
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                activeTab === item.id ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
              )} />

              {!isSidebarCollapsed && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm whitespace-nowrap">{item.label}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.description}</p>
                </div>
              )}

              {activeTab === item.id && !isSidebarCollapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-brand-500"></div>
              )}
            </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto lg:p-8 bg-transparent max-lg:p-0">
        <div className="w-full h-full max-w-[1200px] mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Header Card (Unified Theme & Layout matching IPD & Appointment Dashboards) */}
            <div className="lg:hidden bg-gradient-to-r from-brand-600 via-brand-600 to-violet-600 dark:from-brand-900/80 dark:via-brand-900/80 dark:to-violet-900/80 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden shrink-0 mb-4">
                {/* Decorative flare */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-5">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Hospital Info</h1>
                            <p className="text-[11px] text-brand-100 mt-0.5">Manage your hospital configuration and public directory.</p>
                        </div>
                    </div>

                    {/* Navigation Tab Capsule */}
                    <TabsList className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-black/15 dark:bg-black/30 backdrop-blur-sm h-auto w-full border-0 shadow-none">
                        {navigationItems.map((item) => (
                            <TabsTrigger
                                key={item.id}
                                value={item.id}
                                className={cn(
                                    "flex flex-col items-center justify-center py-2 text-center rounded-xl transition-all h-auto bg-transparent border-0 text-brand-50 hover:bg-white/10 hover:text-white data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-900 data-[state=active]:text-brand-600 data-[state=active]:dark:text-brand-400 data-[state=active]:shadow-sm data-[state=active]:hover:bg-white",
                                    "px-1 select-none whitespace-normal flex-1"
                                )}
                                data-testid={item.id === 'branding' ? 'hospital-info-tab' : undefined}
                            >
                                <item.icon className="h-5 w-5 mb-1 shrink-0" />
                                <span className="text-[9px] font-bold tracking-wide leading-tight">{item.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </div>



            <TabsContent value="branding" data-testid="hospital-info-content">
              <HospitalBrandingConfig
                branding={hospitalBranding}
                onBrandingChange={handleBrandingChange}
              />
            </TabsContent>

            <TabsContent value="publicDirectory">
              <PublicDirectoryConfig />
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main >
    </div >
  );
};