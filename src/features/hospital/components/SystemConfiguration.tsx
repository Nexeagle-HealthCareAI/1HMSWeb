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
      }
    ] as const,
    [t]
  );

  return (
    <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-140px)] w-full relative z-10 animate-in fade-in duration-500">
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
              <span className="font-bold text-lg tracking-tight">Settings</span>
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
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent">
        <div className="w-full h-full max-w-[1200px] mx-auto">
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
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="rounded-2xl border border-border/60 bg-white/80 p-5 dark:bg-background/60 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between relative z-10">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('systemConfiguration.subscription.billingOverview')}
                    </p>
                    <h3 className="text-xl font-semibold">{t('systemConfiguration.subscription.subscriptionManagement')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('systemConfiguration.subscription.description')}
                    </p>
                  </div>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="rounded-xl border border-green-200/80 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200 shadow-sm flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {t('systemConfiguration.subscription.statusActive')}
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="border-border/70 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/50 backdrop-blur shadow-sm hover:shadow-md transition-shadow h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.remainingDays.title')}</CardTitle>
                      <motion.span whileHover={{ rotate: 15, scale: 1.1 }} className="rounded-full bg-brand-50 dark:bg-brand-900/20 p-2 text-brand-600 dark:text-brand-400 shadow-sm">
                        <Calendar className="h-4 w-4" />
                      </motion.span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-600 dark:from-brand-400 dark:to-brand-400">
                        {isHospitalLoading ? '...' : daysRemaining}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isTrialActive
                          ? 'Free trial days left'
                          : t('systemConfiguration.subscription.cards.remainingDays.helper')}
                      </p>
                      {isTrialActive && trialStartDate && (
                        <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                          <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground">
                            <div className="flex justify-between items-center">
                              <span>Started:</span>
                              <span className="font-medium bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {trialStartDate.getDate()} {trialStartDate.toLocaleString('en-US', { month: 'short' })}, {trialStartDate.getFullYear()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Duration:</span>
                              <span className="font-medium bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">3 Months</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="border-border/70 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/50 backdrop-blur shadow-sm hover:shadow-md transition-shadow h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.paymentMode.title')}</CardTitle>
                      <motion.span whileHover={{ rotate: 15, scale: 1.1 }} className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 p-2 text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <Wallet className="h-4 w-4" />
                      </motion.span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                        {isTrialActive ? 'TRIAL' : t('systemConfiguration.subscription.cards.paymentMode.value')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isTrialActive
                          ? 'No payment method required'
                          : t('systemConfiguration.subscription.cards.paymentMode.helper')}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="border-border/70 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/50 backdrop-blur shadow-sm hover:shadow-md transition-shadow h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('systemConfiguration.subscription.cards.totalBill.title')}</CardTitle>
                      <motion.span whileHover={{ rotate: 15, scale: 1.1 }} className="rounded-full bg-orange-50 dark:bg-orange-900/20 p-2 text-orange-600 dark:text-orange-400 shadow-sm">
                        <Receipt className="h-4 w-4" />
                      </motion.span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400">
                        {isTrialActive ? 'Free' : t('systemConfiguration.subscription.cards.totalBill.value')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isTrialActive
                          ? 'Enjoy your free trial period'
                          : t('systemConfiguration.subscription.cards.totalBill.helper')}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
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