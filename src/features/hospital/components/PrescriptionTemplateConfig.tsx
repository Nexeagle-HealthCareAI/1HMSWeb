import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  RotateCcw,
  Download,
  Printer,
  Shield,
  User
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import TemplatePreview from "@/components/ui/TemplatePreview";

import { useToast } from '@/hooks/use-toast';

export interface TextStyle {
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  isAdminTemplate?: boolean; // New flag to identify admin templates
  createdBy?: 'admin' | 'doctor'; // Track who created the template
  header: {
    showLogo: boolean;
    logoUrl?: string;
    hospitalName: string;
    contactInfo: boolean;
    contactDetails?: string; // Store actual contact details
    customText?: string;
    styles?: {
      hospitalName?: TextStyle;
      contactInfo?: TextStyle;
      customText?: TextStyle;
    };
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
    styles?: {
      customNotes?: TextStyle;
      signature?: TextStyle;
      qrCode?: TextStyle;
    };
  };
  doctorSpecific?: string;
}

interface PrescriptionTemplateConfigProps {
  template: PrescriptionTemplate;
  onTemplateChange: (template: PrescriptionTemplate) => void;
  userRole?: 'admin' | 'doctor'; // New prop to determine user role
}

export const PrescriptionTemplateConfig: React.FC<PrescriptionTemplateConfigProps> = ({
  template,
  onTemplateChange,
  userRole = 'admin' // Default to admin for backward compatibility
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [doctorTemplate, setDoctorTemplate] = useState<PrescriptionTemplate | null>(null);
  const { toast } = useToast();

  // Load admin template if user is doctor
  useEffect(() => {
    if (userRole === 'doctor') {
      const adminTemplateData = localStorage.getItem('adminTemplate');
      if (adminTemplateData) {
        const adminTemplate = JSON.parse(adminTemplateData);
        setDoctorTemplate(adminTemplate);
        
        // Initialize doctor template with admin settings
        if (!template.header.hospitalName && adminTemplate.header.hospitalName) {
          onTemplateChange({
            ...template,
            header: {
              ...template.header,
              ...adminTemplate.header
            }
          });
        }
      }
    }
  }, [userRole, template, onTemplateChange]);

  const handleSaveTemplate = async () => {
    try {
      // Save to localStorage for now
      if (userRole === 'admin') {
        localStorage.setItem('adminTemplate', JSON.stringify(template));
        localStorage.setItem('adminTemplatePayload', JSON.stringify({
          headerHtml: generateAdminHeaderHTML(template),
          footerHtml: generateAdminFooterHTML(template),
          template: template
        }));
      } else {
        localStorage.setItem('doctorTemplate', JSON.stringify(template));
        localStorage.setItem('doctorTemplatePayload', JSON.stringify({
          headerHtml: generateDoctorHeaderHTML(template, doctorTemplate),
          footerHtml: generateDoctorFooterHTML(template, doctorTemplate),
          template: template
        }));
      }
      
      toast({
        title: "Template saved successfully!",
        description: `${userRole === 'admin' ? 'Admin' : 'Doctor'} template has been saved.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error saving template",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateAdminHeaderHTML = (template: PrescriptionTemplate): string => {
    let headerHTML = '<div class="prescription-header">';
    
    if (template.header.showLogo && template.header.logoUrl) {
      headerHTML += `<img src="${template.header.logoUrl}" alt="Hospital Logo" style="max-height: 60px; margin-bottom: 10px;" />`;
    }
    
    if (template.header.hospitalName) {
      const styles = template.header.styles?.hospitalName || {};
      headerHTML += `<h1 style="
        color: ${styles.color || '#000'};
        font-size: ${styles.fontSize || '24px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        font-weight: ${styles.fontWeight || 'bold'};
        text-align: ${styles.textAlign || 'center'};
        margin: 10px 0;
      ">${template.header.hospitalName}</h1>`;
    }
    
    if (template.header.contactInfo && template.header.contactDetails) {
      const styles = template.header.styles?.contactInfo || {};
      headerHTML += `<p style="
        color: ${styles.color || '#666'};
        font-size: ${styles.fontSize || '14px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'center'};
        margin: 5px 0;
      ">${template.header.contactDetails}</p>`;
    }
    
    if (template.header.customText) {
      const styles = template.header.styles?.customText || {};
      headerHTML += `<p style="
        color: ${styles.color || '#333'};
        font-size: ${styles.fontSize || '16px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'left'};
        margin: 10px 0;
      ">${template.header.customText}</p>`;
    }
    
    headerHTML += '</div>';
    return headerHTML;
  };

  const generateAdminFooterHTML = (template: PrescriptionTemplate): string => {
    let footerHTML = '<div class="prescription-footer">';
    
    if (template.footer.customNotes) {
      const styles = template.footer.styles?.customNotes || {};
      footerHTML += `<p style="
        color: ${styles.color || '#333'};
        font-size: ${styles.fontSize || '14px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'left'};
        margin: 10px 0;
      ">${template.footer.customNotes}</p>`;
    }
    
    if (template.footer.signature) {
      const styles = template.footer.styles?.signature || {};
      footerHTML += `<div style="
        text-align: ${styles.textAlign || 'right'};
        margin-top: 20px;
      ">
        <p style="
          color: ${styles.color || '#000'};
          font-size: ${styles.fontSize || '16px'};
          font-family: ${styles.fontFamily || 'Arial, sans-serif'};
          font-weight: ${styles.fontWeight || 'bold'};
        ">Doctor's Signature</p>
        <div style="border-top: 2px solid #000; width: 200px; margin-left: auto;"></div>
      </div>`;
    }
    
    if (template.footer.qrCode) {
      footerHTML += `<div style="text-align: center; margin-top: 20px;">
        <div style="
          width: 100px;
          height: 100px;
          border: 1px solid #ccc;
          display: inline-block;
          background: #f0f0f0;
          text-align: center;
          line-height: 100px;
        ">QR Code</div>
      </div>`;
    }
    
    footerHTML += '</div>';
    return footerHTML;
  };

  const generateDoctorHeaderHTML = (template: PrescriptionTemplate, doctorSettings: any): string => {
    let headerHTML = '<div class="prescription-header">';
    
    // Use admin logo if available
    if (doctorSettings?.header?.showLogo && doctorSettings?.header?.logoUrl) {
      headerHTML += `<img src="${doctorSettings.header.logoUrl}" alt="Hospital Logo" style="max-height: 60px; margin-bottom: 10px;" />`;
    }
    
    // Use admin hospital name
    if (doctorSettings?.header?.hospitalName) {
      const styles = doctorSettings.header.styles?.hospitalName || {};
      headerHTML += `<h1 style="
        color: ${styles.color || '#000'};
        font-size: ${styles.fontSize || '24px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        font-weight: ${styles.fontWeight || 'bold'};
        text-align: ${styles.textAlign || 'center'};
        margin: 10px 0;
      ">${doctorSettings.header.hospitalName}</h1>`;
    }
    
    // Use admin contact info
    if (doctorSettings?.header?.contactInfo && doctorSettings?.header?.contactDetails) {
      const styles = doctorSettings.header.styles?.contactInfo || {};
      headerHTML += `<p style="
        color: ${styles.color || '#666'};
        font-size: ${styles.fontSize || '14px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'center'};
        margin: 5px 0;
      ">${doctorSettings.header.contactDetails}</p>`;
    }
    
    // Add doctor-specific custom text
    if (template.header.customText) {
      const styles = template.header.styles?.customText || {};
      headerHTML += `<p style="
        color: ${styles.color || '#333'};
        font-size: ${styles.fontSize || '16px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'left'};
        margin: 10px 0;
      ">${template.header.customText}</p>`;
    }
    
    headerHTML += '</div>';
    return headerHTML;
  };

  const generateDoctorFooterHTML = (template: PrescriptionTemplate, doctorSettings: any): string => {
    let footerHTML = '<div class="prescription-footer">';
    
    // Add doctor-specific custom notes
    if (template.footer.customNotes) {
      const styles = template.footer.styles?.customNotes || {};
      footerHTML += `<p style="
        color: ${styles.color || '#333'};
        font-size: ${styles.fontSize || '14px'};
        font-family: ${styles.fontFamily || 'Arial, sans-serif'};
        text-align: ${styles.textAlign || 'left'};
        margin: 10px 0;
      ">${template.footer.customNotes}</p>`;
    }
    
    // Add doctor signature
    if (template.footer.signature) {
      const styles = template.footer.styles?.signature || {};
      footerHTML += `<div style="
        text-align: ${styles.textAlign || 'right'};
        margin-top: 20px;
      ">
        <p style="
          color: ${styles.color || '#000'};
          font-size: ${styles.fontSize || '16px'};
          font-family: ${styles.fontFamily || 'Arial, sans-serif'};
          font-weight: ${styles.fontWeight || 'bold'};
        ">Doctor's Signature</p>
        <div style="border-top: 2px solid #000; width: 200px; margin-left: auto;"></div>
      </div>`;
    }
    
    // Add QR code if enabled
    if (template.footer.qrCode) {
      footerHTML += `<div style="text-align: center; margin-top: 20px;">
        <div style="
          width: 100px;
          height: 100px;
          border: 1px solid #ccc;
          display: inline-block;
          background: #f0f0f0;
          text-align: center;
          line-height: 100px;
        ">QR Code</div>
      </div>`;
    }
    
    footerHTML += '</div>';
    return footerHTML;
  };

  const handleResetTemplate = () => {
    const defaultTemplate: PrescriptionTemplate = {
      id: template.id,
      name: template.name,
      isDefault: true,
      isAdminTemplate: userRole === 'admin',
      createdBy: userRole,
      header: {
        showLogo: true,
        hospitalName: userRole === 'admin' ? 'Hospital Name' : '',
        contactInfo: true,
        contactDetails: userRole === 'admin' ? 'Contact: +1234567890 | Email: info@hospital.com' : '',
        customText: '',
        styles: {
          hospitalName: { color: '#000', fontSize: '24px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', textAlign: 'center' },
          contactInfo: { color: '#666', fontSize: '14px', fontFamily: 'Arial, sans-serif', textAlign: 'center' },
          customText: { color: '#333', fontSize: '16px', fontFamily: 'Arial, sans-serif', textAlign: 'left' }
        }
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
        customNotes: '',
        styles: {
          customNotes: { color: '#333', fontSize: '14px', fontFamily: 'Arial, sans-serif', textAlign: 'left' },
          signature: { color: '#000', fontSize: '16px', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', textAlign: 'right' },
          qrCode: { color: '#666', fontSize: '12px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }
        }
      }
    };
    
    onTemplateChange(defaultTemplate);
    
    toast({
      title: "Template reset to default",
      description: "All settings have been reset to their default values.",
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

  const updateHeaderStyle = (
    element: keyof PrescriptionTemplate['header']['styles'],
    property: keyof TextStyle,
    value: string
  ) => {
    onTemplateChange({
      ...template,
      header: {
        ...template.header,
        styles: {
          ...template.header.styles,
          [element]: {
            ...template.header.styles?.[element],
            [property]: value
          }
        }
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

  const updateFooterStyle = (
    element: keyof PrescriptionTemplate['footer']['styles'],
    property: keyof TextStyle,
    value: string
  ) => {
    onTemplateChange({
      ...template,
      footer: {
        ...template.footer,
        styles: {
          ...template.footer.styles,
          [element]: {
            ...template.footer.styles?.[element],
            [property]: value
          }
        }
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const logoUrl = event.target?.result as string;
        updateHeader('logoUrl', logoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prescription Template Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure the layout and content of prescription templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
            {userRole === 'admin' ? 'Admin Template' : 'Doctor Template'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Header Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showLogo">Show Hospital Logo</Label>
              <Switch
                id="showLogo"
                checked={template.header.showLogo}
                onCheckedChange={(checked) => updateHeader('showLogo', checked)}
              />
            </div>

            {template.header.showLogo && (
              <div className="space-y-2">
                <Label>Upload Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                />
                {template.header.logoUrl && (
                  <img
                    src={template.header.logoUrl}
                    alt="Hospital Logo"
                    className="w-20 h-20 object-contain border rounded"
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="hospitalName">Hospital Name</Label>
              <Input
                id="hospitalName"
                value={template.header.hospitalName}
                onChange={(e) => updateHeader('hospitalName', e.target.value)}
                placeholder="Enter hospital name"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="contactInfo">Show Contact Information</Label>
              <Switch
                id="contactInfo"
                checked={template.header.contactInfo}
                onCheckedChange={(checked) => updateHeader('contactInfo', checked)}
              />
            </div>

            {template.header.contactInfo && (
              <div className="space-y-2">
                <Label htmlFor="contactDetails">Contact Details</Label>
                <Textarea
                  id="contactDetails"
                  value={template.header.contactDetails || ''}
                  onChange={(e) => updateHeader('contactDetails', e.target.value)}
                  placeholder="Enter contact details"
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customText">Custom Header Text</Label>
              <Textarea
                id="customText"
                value={template.header.customText || ''}
                onChange={(e) => updateHeader('customText', e.target.value)}
                placeholder="Enter custom header text"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sections Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sections Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="vitals">Include Vitals Section</Label>
              <Switch
                id="vitals"
                checked={template.sections.vitals}
                onCheckedChange={(checked) =>
                  onTemplateChange({
                    ...template,
                    sections: { ...template.sections, vitals: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="diagnosis">Include Diagnosis Section</Label>
              <Switch
                id="diagnosis"
                checked={template.sections.diagnosis}
                onCheckedChange={(checked) =>
                  onTemplateChange({
                    ...template,
                    sections: { ...template.sections, diagnosis: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="advice">Include Advice Section</Label>
              <Switch
                id="advice"
                checked={template.sections.advice}
                onCheckedChange={(checked) =>
                  onTemplateChange({
                    ...template,
                    sections: { ...template.sections, advice: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="medicines">Include Medicines Section</Label>
              <Switch
                id="medicines"
                checked={template.sections.medicines}
                onCheckedChange={(checked) =>
                  onTemplateChange({
                    ...template,
                    sections: { ...template.sections, medicines: checked }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="nextAppointment">Include Next Appointment Section</Label>
              <Switch
                id="nextAppointment"
                checked={template.sections.nextAppointment}
                onCheckedChange={(checked) =>
                  onTemplateChange({
                    ...template,
                    sections: { ...template.sections, nextAppointment: checked }
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Footer Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="signature">Include Doctor Signature</Label>
              <Switch
                id="signature"
                checked={template.footer.signature}
                onCheckedChange={(checked) => updateFooter('signature', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="qrCode">Include QR Code</Label>
              <Switch
                id="qrCode"
                checked={template.footer.qrCode}
                onCheckedChange={(checked) => updateFooter('qrCode', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customNotes">Custom Footer Notes</Label>
              <Textarea
                id="customNotes"
                value={template.footer.customNotes || ''}
                onChange={(e) => updateFooter('customNotes', e.target.value)}
                placeholder="Enter custom footer notes"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSaveTemplate} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>

            <Button
              variant="outline"
              onClick={handleResetTemplate}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const html = userRole === 'admin' 
                  ? generateAdminHeaderHTML(template) + generateAdminFooterHTML(template)
                  : generateDoctorHeaderHTML(template, doctorTemplate) + generateDoctorFooterHTML(template, doctorTemplate);
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Template Preview</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .prescription-header, .prescription-footer { margin: 20px 0; }
                      </style>
                    </head>
                    <body>
                      ${html}
                    </body>
                    </html>
                  `);
                  newWindow.document.close();
                }
              }}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const html = userRole === 'admin' 
                  ? generateAdminHeaderHTML(template) + generateAdminFooterHTML(template)
                  : generateDoctorHeaderHTML(template, doctorTemplate) + generateDoctorFooterHTML(template, doctorTemplate);
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'prescription-template.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download HTML
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Template Preview</CardTitle>
          </CardHeader>
          <CardContent>
                         <TemplatePreview
               template={template}
               userRole={userRole}
               doctorSettings={userRole === 'doctor' ? JSON.parse(localStorage.getItem('prescriptionSettings') || '{}') : undefined}
             />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
