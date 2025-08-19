import React from 'react';
import { 
  Settings,
  FileText,
  Palette
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HospitalBrandingConfig } from './HospitalBrandingConfig';
import { useSystemConfiguration } from '../hooks';
import PrescriptionCanvasEditor from '@/features/prescriptions/PrescriptionCanvasEditor';

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
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prescription Templates</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2" data-testid="hospital-branding-tab">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Hospital Branding</span>
          </TabsTrigger>
        </TabsList>

        {/* Prescription Template Tab */}
        <TabsContent value="prescription">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Prescription Template Editor</h3>
              <p className="text-sm text-muted-foreground">
                Use the canvas editor to create and customize prescription templates
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <PrescriptionCanvasEditor />
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