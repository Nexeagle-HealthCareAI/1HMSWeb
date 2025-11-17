import React from 'react';
import { 
  Settings,
  CreditCard,
  Palette,
  Calendar,
  Wallet,
  Receipt
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
  const {
    activeTab,
    setActiveTab,
    hospitalBranding,
    handleBrandingChange
  } = useSystemConfiguration(focusTab);

  const navigationItems = [
    {
      id: 'subscription',
      label: 'Subscription',
      description: 'Plans, billing cycles, invoices',
      icon: CreditCard,
    },
    {
      id: 'branding',
      label: 'Hospital Branding',
      description: 'Identity, contact, compliance',
      icon: Palette,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="hidden lg:flex">
          <div className="w-full rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configuration Areas</p>
            <div className="mt-3 space-y-3">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-3 text-left transition-all',
                    activeTab === item.id
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl border text-primary',
                      activeTab === item.id ? 'border-primary/40 bg-white' : 'border-border/60 bg-muted/40'
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="lg:hidden">
              <TabsList className="flex gap-2 rounded-2xl bg-muted/40 p-1">
                {navigationItems.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                    data-testid={item.id === 'branding' ? 'hospital-branding-tab' : undefined}
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Billing Overview</p>
                    <h3 className="text-xl font-semibold">Subscription Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage plan renewals, invoices, and payment preferences.
                    </p>
                  </div>
                  <div className="rounded-xl border border-green-200/80 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200">
                    All systems active
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Remaining Days</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Calendar className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">45</div>
                    <p className="text-xs text-muted-foreground">Days left in your current cycle</p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Wallet className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">Credit Card</div>
                    <p className="text-xs text-muted-foreground">Primary method on record</p>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-muted/40 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bill</CardTitle>
                    <span className="rounded-full bg-white/80 p-2 text-primary shadow-sm">
                      <Receipt className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">₹12,000</div>
                    <p className="text-xs text-muted-foreground">Amount invoiced this cycle</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="branding" data-testid="hospital-branding-content">
              <HospitalBrandingConfig
                branding={hospitalBranding}
                onBrandingChange={handleBrandingChange}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
};