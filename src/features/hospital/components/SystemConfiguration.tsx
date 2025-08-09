import React from 'react';
import { 
  Settings,
  Building2,
  FileText,
  Palette
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepartmentManagement } from './DepartmentManagement';
import { PrescriptionTemplateConfig } from './PrescriptionTemplateConfig';
import { HospitalBrandingConfig } from './HospitalBrandingConfig';
import { useSystemConfiguration } from '../hooks';

interface SystemConfigurationProps {
  focusTab?: string;
}

export const SystemConfiguration: React.FC<SystemConfigurationProps> = ({ focusTab }) => {
  const {
    activeTab,
    setActiveTab,
    departments,
    prescriptionTemplate,
    hospitalBranding,
    handleDepartmentChange,
    handleTemplateChange,
    handleBrandingChange
  } = useSystemConfiguration(focusTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">System Configuration</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prescription Templates</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Hospital Branding</span>
          </TabsTrigger>
        </TabsList>

                 {/* Departments Tab */}
         <TabsContent value="departments">
           <DepartmentManagement
             departments={departments}
             onDepartmentsChange={handleDepartmentChange}
           />
         </TabsContent>

         {/* Prescription Template Tab */}
         <TabsContent value="prescription">
           <PrescriptionTemplateConfig
             template={prescriptionTemplate}
             onTemplateChange={handleTemplateChange}
           />
         </TabsContent>

         {/* Hospital Branding Tab */}
         <TabsContent value="branding">
           <HospitalBrandingConfig
             branding={hospitalBranding}
             onBrandingChange={handleBrandingChange}
           />
         </TabsContent>
      </Tabs>
    </div>
  );
};