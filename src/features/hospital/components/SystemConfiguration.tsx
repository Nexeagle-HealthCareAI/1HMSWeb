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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">System Configuration</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2" data-testid="hospital-branding-tab">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Hospital Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Subscription Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage your subscription plan, billing, and payment information
              </p>
            </div>
            
            {/* Subscription Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Remaining Subscription Days */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Remaining Days
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45</div>
                  <p className="text-xs text-muted-foreground">
                    Days remaining in your subscription
                  </p>
                </CardContent>
              </Card>

              {/* Payment Mode */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Payment Mode
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Credit Card</div>
                  <p className="text-xs text-muted-foreground">
                    Current payment method
                  </p>
                </CardContent>
              </Card>

              {/* Total Bill */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Bill
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹12,000</div>
                  <p className="text-xs text-muted-foreground">
                    Total subscription amount
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Hospital Branding Tab */}
        <TabsContent value="branding" data-testid="hospital-branding-content">
          <HospitalBrandingConfig
            branding={hospitalBranding}
            onBrandingChange={handleBrandingChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};