import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Palette,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Globe
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalBrandingConfig } from './HospitalBrandingConfig';
import { PublicDirectoryConfig } from './PublicDirectoryConfig';
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
        label: t('systemConfiguration.navigation.publicDirectory.label', { defaultValue: 'Public Directory' }),
        description: t('systemConfiguration.navigation.publicDirectory.description', { defaultValue: 'Platform-wide doctor listing' }),
        icon: Globe,
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
          {navigationItems.map((item) => (
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
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto lg:p-8 bg-transparent max-lg:p-0">
        <div className="w-full h-full max-w-[1200px] mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="lg:hidden sticky top-0 z-40 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-sm dark:shadow-gray-900/50">
              <TabsList className="flex w-full h-12 gap-1 rounded-[1.25rem] bg-gray-200/60 dark:bg-gray-800/60 p-1 shadow-inner border border-gray-200/50 dark:border-gray-700/50">
                {navigationItems.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="relative flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
                    data-testid={item.id === 'branding' ? 'hospital-info-tab' : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0 transition-transform data-[state=active]:scale-110" />
                    <span className="truncate">{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
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
          </Tabs>
        </div>
      </main >
    </div >
  );
};