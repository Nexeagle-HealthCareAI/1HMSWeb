import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  FileText,
  Shield,
  BarChart3
} from 'lucide-react';
import { BillingConfiguration } from '@/features/billing/components/BillingConfiguration';
import { FinancialReports } from '@/features/billing/components/FinancialReports';
import { PatientBillManagement } from '@/features/billing/components/PatientBillManagement';
import { InsuranceManagement } from '@/features/billing/components/InsuranceManagement';

export const BillingInsuranceModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Billing & Insurance Management</h2>
          <p className="text-muted-foreground">Comprehensive financial management system</p>
        </div>
      </div>
      
      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="configuration" className="flex items-center gap-1 lg:gap-2">
            <Settings className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="text-xs lg:text-sm">Config</span>
          </TabsTrigger>
          <TabsTrigger value="patient-bills" className="flex items-center gap-1 lg:gap-2">
            <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="text-xs lg:text-sm">Bills</span>
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1 lg:gap-2">
            <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="text-xs lg:text-sm">Insurance</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1 lg:gap-2">
            <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="text-xs lg:text-sm">Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration" className="space-y-6">
          <BillingConfiguration />
        </TabsContent>
        
        <TabsContent value="patient-bills" className="space-y-6">
          <PatientBillManagement />
        </TabsContent>
        
        <TabsContent value="insurance" className="space-y-6">
          <InsuranceManagement />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};
