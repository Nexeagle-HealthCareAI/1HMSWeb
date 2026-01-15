import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Settings,
  CreditCard,
  Palette,
  Calendar,
  Wallet,
  Receipt,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalBrandingConfig } from './HospitalBrandingConfig';
import { useSystemConfiguration } from '../hooks';
import { cn } from '@/lib/utils';

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
        id: 'subscription',
        label: t('systemConfiguration.navigation.subscription.label'),
        description: t('systemConfiguration.navigation.subscription.description'),
        icon: CreditCard,
      },
      {
        id: 'branding',
        label: t('systemConfiguration.navigation.branding.label'),
        description: t('systemConfiguration.navigation.branding.description'),
        icon: Palette,
      },
    ] as const,
    [t]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative hidden lg:flex",
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
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Configuration</span>
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
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                isSidebarCollapsed ? "justify-center" : "gap-3"
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                activeTab === item.id ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
              )} />

              {!isSidebarCollapsed && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm whitespace-nowrap">{item.label}</p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.description}</p>
                </div>
              )}

              {activeTab === item.id && !isSidebarCollapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="lg:hidden">
              <TabsList className="flex gap-2 rounded-2xl bg-muted/40 p-1">
                {navigationItems.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                    data-testid={item.id === 'branding' ? 'hospital-info-tab' : undefined}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground group-data-[state=active]:text-primary" />
                    <span>{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="subscription" className="space-y-6">
              <div className="rounded-2xl border border-border/60 bg-white/80 p-5 dark:bg-background/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('systemConfiguration.subscription.billingOverview')}
                    </p>
                    <h3 className="text-xl font-semibold">{t('systemConfiguration.subscription.subscriptionManagement')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('systemConfiguration.subscription.description')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-200/80 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
                    {t('systemConfiguration.subscription.statusActive')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.remainingDays.title')}</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Calendar className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">
                      {isHospitalLoading ? '...' : daysRemaining}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isTrialActive
                        ? 'Free trial days left'
                        : t('systemConfiguration.subscription.cards.remainingDays.helper')}
                    </p>
                    {isTrialActive && trialStartDate && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Started:</span>
                            <span className="font-medium">
                              {trialStartDate.getDate()} {trialStartDate.toLocaleString('en-US', { month: 'short' })}, {trialStartDate.getFullYear()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span className="font-medium">3 Months</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.paymentMode.title')}</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Wallet className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">
                      {isTrialActive ? 'Free Trial' : t('systemConfiguration.subscription.cards.paymentMode.value')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isTrialActive
                        ? 'No payment method required'
                        : t('systemConfiguration.subscription.cards.paymentMode.helper')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.totalBill.title')}</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Receipt className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">
                      {isTrialActive ? 'Free' : t('systemConfiguration.subscription.cards.totalBill.value')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isTrialActive
                        ? 'Enjoy your free trial period'
                        : t('systemConfiguration.subscription.cards.totalBill.helper')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="branding" data-testid="hospital-info-content">
              <HospitalBrandingConfig
                branding={hospitalBranding}
                onBrandingChange={handleBrandingChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main >
    </div >
  );
};