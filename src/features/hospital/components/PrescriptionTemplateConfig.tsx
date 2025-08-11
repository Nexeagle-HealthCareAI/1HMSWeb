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

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import TemplatePreview from "../../../components/ui/TemplatePreview.tsx"; // Adjust the import path as necessary

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
      const adminTemplateData = localStorage.getItem('easyHMS_adminTemplate');
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
            },
            footer: {
              ...template.footer,
              ...adminTemplate.footer
            }
          });
        }
      }
    }
  }, [userRole, template, onTemplateChange]);

 const handleSaveTemplate = async () => {
  const updatedTemplate = {
    ...template,
    createdBy: userRole,
    isAdminTemplate: userRole === "admin",
    updatedAt: new Date().toISOString()
  };

  let payloadToSend: any = null;

  if (userRole === "admin") {
    // Save locally
    localStorage.setItem("easyHMS_adminTemplate", JSON.stringify(updatedTemplate));

    const headerHTML = generateAdminHeaderHTML(updatedTemplate);
    const footerHTML = generateAdminFooterHTML(updatedTemplate);

    const adminPayload = {
      templateId: updatedTemplate.id,
      headerHTML,
      footerHTML,
      template: updatedTemplate,
      role: "admin"
    };

    localStorage.setItem("easyHMS_adminTemplatePayload", JSON.stringify(adminPayload));
    payloadToSend = adminPayload;

    toast({
      title: "Admin Template Saved",
      description: "Master template has been saved and will be available for all doctors."
    });

  } else {
    // Doctor flow
    const doctorSettings = JSON.parse(localStorage.getItem("easyHMS_prescriptionSettings") || "{}");

    const finalTemplate = {
      ...updatedTemplate,
      doctorInfo: doctorSettings,
      baseAdminTemplate: doctorTemplate
    };

    localStorage.setItem("easyHMS_doctorTemplate", JSON.stringify(finalTemplate));

    const headerHTML = generateDoctorHeaderHTML(updatedTemplate, doctorSettings);
    const footerHTML = generateDoctorFooterHTML(updatedTemplate, doctorSettings);

    const doctorPayload = {
      doctorId: doctorSettings.doctorId || "doctor_123",
      templateId: updatedTemplate.id,
      headerHTML,
      footerHTML,
      template: finalTemplate,
      role: "doctor"
    };

    localStorage.setItem("easyHMS_doctorTemplatePayload", JSON.stringify(doctorPayload));
    payloadToSend = doctorPayload;

    toast({
      title: "Doctor Template Saved",
      description: "Your customized template has been saved and is ready for prescriptions."
    });
  }

  onTemplateChange(updatedTemplate);

  // 🔹 Send to backend
  try {
    const response = await fetch("https://your-api.com/save-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToSend)
    });

    if (!response.ok) throw new Error("Failed to save on server");

    const result = await response.json();
    console.log("Template synced to server:", result);
  } catch (error) {
    console.error("Error syncing template to server:", error);
    toast({
      title: "Server Save Failed",
      description: "Template saved locally but could not be synced to the server.",
      variant: "destructive"
    });
  }
};


  const generateAdminHeaderHTML = (template: PrescriptionTemplate): string => {
    return `
      <div class="admin-prescription-header">
        ${template.header.showLogo && template.header.logoUrl ? 
          `<img src="${template.header.logoUrl}" alt="Logo" class="header-logo" style="max-width: 100px; max-height: 100px;" />` : ''}
        <h1 style="color: ${template.header.styles?.hospitalName?.color || '#000'}; font-size: ${template.header.styles?.hospitalName?.fontSize || '24px'}; font-family: ${template.header.styles?.hospitalName?.fontFamily || 'Arial'}; font-weight: ${template.header.styles?.hospitalName?.fontWeight || 'bold'};">
          ${template.header.hospitalName}
        </h1>
        ${template.header.contactInfo && template.header.contactDetails ? 
          `<p style="color: ${template.header.styles?.contactInfo?.color || '#666'}; font-size: ${template.header.styles?.contactInfo?.fontSize || '14px'}; font-family: ${template.header.styles?.contactInfo?.fontFamily || 'Arial'};">
            ${template.header.contactDetails}
          </p>` : ''}
        ${template.header.customText ? 
          `<p style="color: ${template.header.styles?.customText?.color || '#666'}; font-size: ${template.header.styles?.customText?.fontSize || '14px'}; font-family: ${template.header.styles?.customText?.fontFamily || 'Arial'}; font-style: ${template.header.styles?.customText?.fontStyle || 'italic'};">
            ${template.header.customText}
          </p>` : ''}
        <div class="doctor-placeholder">
          <!-- Doctor information will be inserted here -->
        </div>
      </div>
    `;
  };

  const generateAdminFooterHTML = (template: PrescriptionTemplate): string => {
    return `
      <div class="admin-prescription-footer">
        ${template.footer.customNotes ? 
          `<p style="color: ${template.footer.styles?.customNotes?.color || '#666'}; font-size: ${template.footer.styles?.customNotes?.fontSize || '12px'}; font-family: ${template.footer.styles?.customNotes?.fontFamily || 'Arial'};">
            ${template.footer.customNotes}
          </p>` : ''}
        <div class="signature-placeholder">
          <!-- Doctor signature will be inserted here -->
        </div>
        ${template.footer.qrCode ? '<div class="qr-code-placeholder">QR Code</div>' : ''}
      </div>
    `;
  };

  const generateDoctorHeaderHTML = (template: PrescriptionTemplate, doctorSettings: any): string => {
    return `
      <div class="doctor-prescription-header">
        ${template.header.showLogo && template.header.logoUrl ? 
          `<img src="${template.header.logoUrl}" alt="Logo" class="header-logo" style="max-width: 100px; max-height: 100px;" />` : ''}
        <h1 style="color: ${template.header.styles?.hospitalName?.color || '#000'}; font-size: ${template.header.styles?.hospitalName?.fontSize || '24px'}; font-family: ${template.header.styles?.hospitalName?.fontFamily || 'Arial'}; font-weight: ${template.header.styles?.hospitalName?.fontWeight || 'bold'};">
          ${template.header.hospitalName}
        </h1>
        ${template.header.contactInfo && template.header.contactDetails ? 
          `<p style="color: ${template.header.styles?.contactInfo?.color || '#666'}; font-size: ${template.header.styles?.contactInfo?.fontSize || '14px'}; font-family: ${template.header.styles?.contactInfo?.fontFamily || 'Arial'};">
            ${template.header.contactDetails}
          </p>` : ''}
        ${template.header.customText ? 
          `<p style="color: ${template.header.styles?.customText?.color || '#666'}; font-size: ${template.header.styles?.customText?.fontSize || '14px'}; font-family: ${template.header.styles?.customText?.fontFamily || 'Arial'}; font-style: ${template.header.styles?.customText?.fontStyle || 'italic'};">
            ${template.header.customText}
          </p>` : ''}
        <div class="doctor-info">
          <h2 style="font-size: 18px; font-weight: bold; margin: 10px 0 5px 0;">${doctorSettings.doctorName || 'Dr. Name'}</h2>
          ${doctorSettings.qualifications ? `<p style="font-size: 14px; margin: 2px 0;">${doctorSettings.qualifications}</p>` : ''}
          ${doctorSettings.designationRegNumber ? `<p style="font-size: 12px; margin: 2px 0; color: #666;">${doctorSettings.designationRegNumber}</p>` : ''}
        </div>
      </div>
    `;
  };

  const generateDoctorFooterHTML = (template: PrescriptionTemplate, doctorSettings: any): string => {
    return `
      <div class="doctor-prescription-footer">
        ${template.footer.customNotes ? 
          `<p style="color: ${template.footer.styles?.customNotes?.color || '#666'}; font-size: ${template.footer.styles?.customNotes?.fontSize || '12px'}; font-family: ${template.footer.styles?.customNotes?.fontFamily || 'Arial'};">
            ${template.footer.customNotes}
          </p>` : ''}
        ${template.footer.signature ? 
          `<div class="doctor-signature" style="text-align: right; margin-top: 30px;">
            <div style="border-top: 1px solid #000; width: 200px; margin: 20px 0 10px auto;"></div>
            <p style="font-size: 14px; font-weight: bold;">Dr. ${doctorSettings.doctorName || 'Doctor Name'}</p>
            ${doctorSettings.qualifications ? `<p style="font-size: 12px;">${doctorSettings.qualifications}</p>` : ''}
            ${doctorSettings.designationRegNumber ? `<p style="font-size: 10px; color: #666;">${doctorSettings.designationRegNumber}</p>` : ''}
          </div>` : ''}
        ${template.footer.qrCode ? '<div class="qr-code" style="width: 60px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; position: absolute; bottom: 10px; right: 10px;">QR Code</div>' : ''}
      </div>
    `;
  };

  const handleResetTemplate = () => {
    if (userRole === 'doctor' && doctorTemplate) {
      // Reset doctor template to admin defaults
      onTemplateChange({
        ...template,
        header: { ...doctorTemplate.header },
        footer: { ...doctorTemplate.footer }
      });
      toast({
        title: "Template Reset",
        description: "Template has been reset to admin defaults.",
      });
    } else {
      // Reset admin template to system defaults
      const defaultTemplate: PrescriptionTemplate = {
        ...template,
        header: {
          showLogo: false,
          hospitalName: '',
          contactInfo: false,
          customText: '',
          styles: {
            hospitalName: { color: '#000000', fontSize: '24px', fontFamily: 'Arial' },
            contactInfo: { color: '#666666', fontSize: '14px', fontFamily: 'Arial' },
            customText: { color: '#666666', fontSize: '14px', fontFamily: 'Arial' }
          }
        },
        footer: {
          signature: true,
          qrCode: false,
          customNotes: '',
          styles: {
            customNotes: { color: '#666666', fontSize: '12px', fontFamily: 'Arial' }
          }
        }
      };
      
      onTemplateChange(defaultTemplate);
      toast({
        title: "Template Reset",
        description: "Template has been reset to default settings.",
      });
    }
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
            [property]: value,
          },
        },
      },
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
            [property]: value,
          },
        },
      },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateHeader('logoUrl', reader.result?.toString() || '');
      toast({
        title: "Logo Uploaded",
        description: "Logo has been successfully uploaded.",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {userRole === 'admin' ? <Shield className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-green-600" />}
            {userRole === 'admin' ? 'Admin Template Configuration' : 'Doctor Template Customization'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {userRole === 'admin' 
              ? 'Create master template for all doctors'
              : 'Customize the admin template for your prescriptions'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
            {userRole === 'admin' ? 'Admin Mode' : 'Doctor Mode'}
          </Badge>
          {userRole === 'doctor' && doctorTemplate && (
            <Badge variant="outline" className="text-green-600">
              Based on Admin Template
            </Badge>
          )}
        </div>
      </div>

      {/* Admin Template Info for Doctors */}
      {userRole === 'doctor' && doctorTemplate && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Admin Template Loaded</h4>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You can customize the admin template below. Your changes will be saved as your personal template.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          {/* Header Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Header Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {userRole === 'admin' ? 'Set up hospital header information' : 'Customize header appearance'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Hospital Name</Label>
                    <Input
                      value={template.header.hospitalName}
                      onChange={(e) => updateHeader('hospitalName', e.target.value)}
                      placeholder="Enter hospital name"
                      disabled={userRole === 'doctor' && doctorTemplate?.header.hospitalName}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Input
                      type="text"
                      value={template.header.styles?.hospitalName?.fontSize || ''}
                      onChange={(e) => updateHeaderStyle('hospitalName', 'fontSize', e.target.value)}
                      placeholder="e.g., 24px"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Font Color</Label>
                    <Input
                      type="color"
                      value={template.header.styles?.hospitalName?.color || '#000000'}
                      onChange={(e) => updateHeaderStyle('hospitalName', 'color', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <select
                      value={template.header.styles?.hospitalName?.fontFamily || ''}
                      onChange={(e) => updateHeaderStyle('hospitalName', 'fontFamily', e.target.value)}
                      className="w-full border rounded-md p-2 text-sm"
                    >
                      <option value="">Default</option>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Textarea
                      value={template.header.contactDetails || ''}
                      onChange={(e) => updateHeader('contactDetails', e.target.value)}
                      placeholder="Phone: +91 12345 67890&#10;Email: info@hospital.com&#10;Address: Hospital Address"
                      rows={3}
                      disabled ={userRole === 'doctor' && doctorTemplate?.header.contactDetails}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Custom Text/Tagline</Label>
                    <Input
                      value={template.header.customText || ''}
                      onChange={(e) => updateHeader('customText', e.target.value)}
                      placeholder="e.g., Providing Quality Healthcare"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Custom Text Font Size</Label>
                    <Input
                      type="text"
                      value={template.header.styles?.customText?.fontSize || ''}
                      onChange={(e) => updateHeaderStyle('customText', 'fontSize', e.target.value)}
                      placeholder="e.g., 14px"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Custom Text Color</Label>
                    <Input
                      type="color"
                      value={template.header.styles?.customText?.color || '#000000'}
                      onChange={(e) => updateHeaderStyle('customText', 'color', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show Logo</Label>
                  <Switch
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
                    />
                    {template.header.logoUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={template.header.logoUrl}
                          alt="Preview Logo"
                          className="max-w-[80px] max-h-[80px] object-contain border rounded"
                        />
                        <div className="text-xs text-muted-foreground">
                          <p>Logo uploaded successfully</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateHeader('logoUrl', '')}
                            className="text-red-600 hover:text-red-700 p-0 h-auto"
                          >
                            Remove Logo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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

          {/* Footer Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Footer Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                {userRole === 'admin' ? 'Set up footer information' : 'Customize footer appearance'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Custom Footer Notes</Label>
                  <Textarea
                    value={template.footer.customNotes || ''}
                    onChange={(e) => updateFooter('customNotes', e.target.value)}
                    placeholder="Enter custom footer notes (e.g., clinic timings, emergency contact)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Size</Label>
                    <Input
                      type="text"
                      value={template.footer.styles?.customNotes?.fontSize || ''}
                      onChange={(e) => updateFooterStyle('customNotes', 'fontSize', e.target.value)}
                      placeholder="e.g., 12px"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Font Color</Label>
                    <Input
                      type="color"
                      value={template.footer.styles?.customNotes?.color || '#000000'}
                      onChange={(e) => updateFooterStyle('customNotes', 'color', e.target.value)}
                    />
                  </div>
                </div>
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

          {/* Action Buttons */}
          <div className="flex justify-start gap-3">
            <Button variant="outline" onClick={handleResetTemplate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to {userRole === 'doctor' ? 'Admin' : 'Default'}
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
            {userRole === 'admin' && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Template
              </Button>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <TemplatePreview 
            template={template} 
            userRole={userRole}
            doctorSettings={userRole === 'doctor' ? JSON.parse(localStorage.getItem('easyHMS_prescriptionSettings') || '{}') : undefined}
          />
        </div>
      </div>
    </div>
  );
};