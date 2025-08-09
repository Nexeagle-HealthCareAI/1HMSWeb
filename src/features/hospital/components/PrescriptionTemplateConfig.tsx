import React, { useState } from 'react';
import { 
  FileText,
  Save,
  RotateCcw,
  Eye,
  Download,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export interface PrescriptionTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  header: {
    showLogo: boolean;
    hospitalName: string;
    contactInfo: boolean;
    customText?: string;
  };
  sections: {
    vitals: boolean;
    diagnosis: boolean;
    advice: boolean;
    medicines: boolean;
    nextAppointment: boolean;
  };
  footer: {
    signature: boolean;
    qrCode: boolean;
    customNotes?: string;
  };
  doctorSpecific?: string;
}

interface PrescriptionTemplateConfigProps {
  template: PrescriptionTemplate;
  onTemplateChange: (template: PrescriptionTemplate) => void;
}

const defaultTemplate: PrescriptionTemplate = {
  id: 'default',
  name: 'Default Template',
  isDefault: true,
  header: {
    showLogo: true,
    hospitalName: 'NexEagle Hospital',
    contactInfo: true,
    customText: 'Providing Quality Healthcare'
  },
  sections: {
    vitals: true,
    diagnosis: true,
    advice: true,
    medicines: true,
    nextAppointment: true
  },
  footer: {
    signature: true,
    qrCode: true,
    customNotes: 'Thank you for choosing our services'
  }
};

export const PrescriptionTemplateConfig: React.FC<PrescriptionTemplateConfigProps> = ({
  template,
  onTemplateChange
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleSaveTemplate = () => {
    onTemplateChange(template);
    toast({
      title: "Template Saved",
      description: "Prescription template has been updated successfully.",
    });
  };

  const handleResetTemplate = () => {
    onTemplateChange(defaultTemplate);
    toast({
      title: "Template Reset",
      description: "Template has been reset to default settings.",
    });
  };

  const updateHeader = (field: keyof PrescriptionTemplate['header'], value: any) => {
    onTemplateChange({
      ...template,
      header: {
        ...template.header,
        [field]: value
      }
    });
  };

  const updateSections = (field: keyof PrescriptionTemplate['sections'], value: boolean) => {
    onTemplateChange({
      ...template,
      sections: {
        ...template.sections,
        [field]: value
      }
    });
  };

  const updateFooter = (field: keyof PrescriptionTemplate['footer'], value: any) => {
    onTemplateChange({
      ...template,
      footer: {
        ...template.footer,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Prescription Template</h3>
          <p className="text-sm text-muted-foreground">
            Customize how prescriptions are formatted and displayed
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Template Preview</DialogTitle>
              </DialogHeader>
              <div className="border rounded-lg p-6 bg-white">
                {/* Header */}
                {template.header.showLogo && (
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-primary">{template.header.hospitalName}</div>
                  </div>
                )}
                {template.header.contactInfo && (
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    <div>123 Hospital Street, Medical District</div>
                    <div>Phone: +91 98765 43210 | Email: info@nexeagle.com</div>
                  </div>
                )}
                {template.header.customText && (
                  <div className="text-center text-sm italic mb-4">{template.header.customText}</div>
                )}
                
                <Separator className="my-4" />
                
                {/* Sample Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Patient Information</h4>
                    <p className="text-sm">Name: John Doe | Age: 35 | Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  
                  {template.sections.vitals && (
                    <div>
                      <h4 className="font-semibold">Vitals</h4>
                      <p className="text-sm">BP: 120/80 | Pulse: 72 | Temperature: 98.6°F</p>
                    </div>
                  )}
                  
                  {template.sections.diagnosis && (
                    <div>
                      <h4 className="font-semibold">Diagnosis</h4>
                      <p className="text-sm">Hypertension, Type 2 Diabetes</p>
                    </div>
                  )}
                  
                  {template.sections.advice && (
                    <div>
                      <h4 className="font-semibold">Advice</h4>
                      <p className="text-sm">Regular exercise, low-salt diet, monitor blood pressure daily</p>
                    </div>
                  )}
                  
                  {template.sections.medicines && (
                    <div>
                      <h4 className="font-semibold">Medicines</h4>
                      <div className="text-sm space-y-1">
                        <div>1. Amlodipine 5mg - 1 tab daily</div>
                        <div>2. Metformin 500mg - 1 tab twice daily</div>
                      </div>
                    </div>
                  )}
                  
                  {template.sections.nextAppointment && (
                    <div>
                      <h4 className="font-semibold">Next Appointment</h4>
                      <p className="text-sm">Follow-up in 2 weeks</p>
                    </div>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                {/* Footer */}
                <div className="flex justify-between items-end">
                  <div className="flex-1">
                    {template.footer.customNotes && (
                      <p className="text-sm text-muted-foreground">{template.footer.customNotes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {template.footer.signature && (
                      <div className="mb-2">
                        <div className="border-t border-gray-400 w-24 inline-block"></div>
                        <div className="text-sm">Dr. Sarah Johnson</div>
                        <div className="text-xs text-muted-foreground">MBBS, MD (Cardiology)</div>
                      </div>
                    )}
                    {template.footer.qrCode && (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        QR Code
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Header Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Header Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hospital Name</Label>
                <Input
                  value={template.header.hospitalName}
                  onChange={(e) => updateHeader('hospitalName', e.target.value)}
                  placeholder="Enter hospital name"
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Text</Label>
                <Input
                  value={template.header.customText || ''}
                  onChange={(e) => updateHeader('customText', e.target.value)}
                  placeholder="e.g., Providing Quality Healthcare"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show Logo</Label>
                <Switch
                  checked={template.header.showLogo}
                  onCheckedChange={(checked) => updateHeader('showLogo', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Contact Information</Label>
                <Switch
                  checked={template.header.contactInfo}
                  onCheckedChange={(checked) => updateHeader('contactInfo', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Content Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Patient Vitals</Label>
              <Switch
                checked={template.sections.vitals}
                onCheckedChange={(checked) => updateSections('vitals', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Diagnosis</Label>
              <Switch
                checked={template.sections.diagnosis}
                onCheckedChange={(checked) => updateSections('diagnosis', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Medical Advice</Label>
              <Switch
                checked={template.sections.advice}
                onCheckedChange={(checked) => updateSections('advice', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Medicines</Label>
              <Switch
                checked={template.sections.medicines}
                onCheckedChange={(checked) => updateSections('medicines', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Next Appointment</Label>
              <Switch
                checked={template.sections.nextAppointment}
                onCheckedChange={(checked) => updateSections('nextAppointment', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Footer Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Notes</Label>
              <Textarea
                value={template.footer.customNotes || ''}
                onChange={(e) => updateFooter('customNotes', e.target.value)}
                placeholder="Enter custom footer notes"
                rows={3}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Show Doctor Signature</Label>
                <Switch
                  checked={template.footer.signature}
                  onCheckedChange={(checked) => updateFooter('signature', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show QR Code</Label>
                <Switch
                  checked={template.footer.qrCode}
                  onCheckedChange={(checked) => updateFooter('qrCode', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleResetTemplate}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
        <Button onClick={handleSaveTemplate}>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );
};