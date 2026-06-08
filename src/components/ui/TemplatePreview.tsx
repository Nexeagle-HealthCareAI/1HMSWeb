import React, { useState, useRef, useCallback } from "react";
import Draggable from "react-draggable";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Eye, EyeOff, Download, Printer, Settings, Palette, Undo2, Save, RotateCcw, FileText, Plus, Trash2, Copy, Check } from "lucide-react";

export interface TextStyle {
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: "normal" | "bold";
}

interface PrescriptionTemplate {
  header: {
    showLogo: boolean;
    logoUrl?: string;
    hospitalName: string;
    contactInfo: boolean;
    contactDetails?: string;
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
}

interface DoctorSettings {
  doctorName?: string;
  qualifications?: string;
  designationRegNumber?: string;
}

interface TemplatePreviewProps {
  template: PrescriptionTemplate;
  userRole?: 'admin' | 'doctor';
  doctorSettings?: DoctorSettings;
}

const applyStyles = (styles?: TextStyle): React.CSSProperties => ({
  color: styles?.color,
  fontFamily: styles?.fontFamily,
  fontSize: styles?.fontSize,
  fontStyle: styles?.fontStyle,
  fontWeight: styles?.fontWeight,
});

// Template Presets
const templatePresets: PrescriptionTemplate[] = [
  {
    header: {
      showLogo: true,
      logoUrl: '/hospital-logo.png',
      hospitalName: 'City General Hospital',
      contactInfo: true,
      contactDetails: '123 Medical Center Dr.\nPhone: (555) 123-4567\nEmail: info@cityhospital.com',
      customText: 'Excellence in Healthcare',
      styles: {
        hospitalName: { fontSize: '24px', fontWeight: 'bold', color: '#1e40af' },
        contactInfo: { fontSize: '14px', color: '#374151' },
        customText: { fontSize: '16px', fontStyle: 'italic', color: '#059669' }
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
      customNotes: 'Please follow all instructions carefully. Contact us if you have any questions.',
      styles: {
        customNotes: { fontSize: '12px', color: '#6b7280' }
      }
    }
  },
  {
    header: {
      showLogo: false,
      hospitalName: 'Community Medical Center',
      contactInfo: true,
      contactDetails: '456 Health Ave\nPhone: (555) 987-6543',
      customText: 'Caring for Our Community',
      styles: {
        hospitalName: { fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' },
        contactInfo: { fontSize: '13px', color: '#4b5563' }
      }
    },
    sections: {
      vitals: true,
      diagnosis: true,
      advice: false,
      medicines: true,
      nextAppointment: false
    },
    footer: {
      signature: true,
      qrCode: false,
      customNotes: 'Thank you for choosing Community Medical Center',
      styles: {
        customNotes: { fontSize: '11px', color: '#9ca3af' }
      }
    }
  }
];

// Utility functions
const snapToGridValue = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

const saveTemplateToLocalStorage = (name: string, template: PrescriptionTemplate) => {
  const templates = JSON.parse(localStorage.getItem('prescriptionTemplates') || '[]');
  const existingIndex = templates.findIndex((t: any) => t.name === name);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = { name, template };
  } else {
    templates.push({ name, template });
  }
  
  localStorage.setItem('prescriptionTemplates', JSON.stringify(templates));
};

const loadTemplatesFromLocalStorage = (): PrescriptionTemplate[] => {
  try {
    const templates = JSON.parse(localStorage.getItem('prescriptionTemplates') || '[]');
    return templates.map((t: any) => t.template);
  } catch {
    return [];
  }
};

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  userRole = 'admin',
  doctorSettings 
}) => {
  const [showDraggable, setShowDraggable] = useState(false);
  const [previewMode, setPreviewMode] = useState<'design' | 'final'>('design');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [elementPositions, setElementPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(20);
  const [savedTemplates, setSavedTemplates] = useState<PrescriptionTemplate[]>([]);
  const [currentTemplateName, setCurrentTemplateName] = useState('Default Template');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const hospitalNameRef = useRef<HTMLDivElement>(null);

  const handleExportHTML = () => {
    const headerHTML = generateCompleteHeaderHTML();
    const footerHTML = generateCompleteFooterHTML();
    
    const completeHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Prescription Template</title>
    <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f8fafc;
          color: #1e293b;
        }
        .prescription-container { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .header-logo { 
          max-width: 120px; 
          max-height: 120px; 
          object-fit: contain;
          border-radius: 8px;
        }
        .prescription-header { 
          border-bottom: 3px solid #3b82f6; 
          padding-bottom: 30px; 
          margin-bottom: 40px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 30px;
          border-radius: 12px;
        }
        .prescription-footer { 
          border-top: 2px solid #3b82f6; 
          padding-top: 30px; 
          margin-top: 40px;
          position: relative;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 30px;
          border-radius: 12px;
        }
        .doctor-info { 
          margin-top: 25px; 
          padding: 20px; 
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 12px;
          border: 2px solid #3b82f6;
        }
        .signature-line { 
          border-top: 3px solid #1e293b; 
          width: 200px; 
          margin: 25px auto 15px auto; 
        }
        .qr-code { 
          width: 80px; 
          height: 80px; 
          border: 2px solid #3b82f6; 
          border-radius: 8px;
          position: absolute; 
          bottom: 20px; 
          right: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #3b82f6;
        }
        .section-title {
          color: #1e40af;
          font-size: 18px;
          font-weight: 600;
          margin: 25px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #dbeafe;
        }
        .field-placeholder {
          background: #f1f5f9;
          border: 2px dashed #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          margin: 8px 0;
          color: #64748b;
          font-style: italic;
        }
    </style>
</head>
<body>
    <div class="prescription-container">
        ${headerHTML}
        
        <div class="prescription-body">
            <div class="section-title">Patient Information</div>
            <div class="field-placeholder">
              <strong>Name:</strong> _________________ | <strong>Age:</strong> _____ | <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            
            ${template.sections.vitals ? '<div class="section-title">Vitals</div><div class="field-placeholder"><strong>BP:</strong> _____ | <strong>Pulse:</strong> _____ | <strong>Temperature:</strong> _____°F</div>' : ''}
            ${template.sections.diagnosis ? '<div class="section-title">Diagnosis</div><div class="field-placeholder">_____________________________________</div>' : ''}
            ${template.sections.advice ? '<div class="section-title">Advice</div><div class="field-placeholder">_____________________________________</div>' : ''}
            ${template.sections.medicines ? '<div class="section-title">Medicines</div><div class="field-placeholder">1. ____________________________<br>2. ____________________________<br>3. ____________________________</div>' : ''}
            ${template.sections.nextAppointment ? '<div class="section-title">Next Appointment</div><div class="field-placeholder"><strong>Follow-up:</strong> ________________</div>' : ''}
        </div>
        
        ${footerHTML}
    </div>
</body>
</html>
    `;
    
    const blob = new Blob([completeHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-template-${userRole}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPreview = () => {
    const headerHTML = generateCompleteHeaderHTML();
    const footerHTML = generateCompleteFooterHTML();
    
    const printHTML = `
      <html>
        <head>
          <title>Prescription Template Preview</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #1e293b;
            }
            .prescription-container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px;
            }
            .section-title {
              color: #1e40af;
              font-size: 18px;
              font-weight: 600;
              margin: 25px 0 15px 0;
              padding-bottom: 8px;
              border-bottom: 2px solid #dbeafe;
            }
            .field-placeholder {
              background: #f1f5f9;
              border: 2px dashed #cbd5e1;
              border-radius: 6px;
              padding: 12px;
              margin: 8px 0;
              color: #64748b;
              font-style: italic;
            }
            @media print { 
              body { margin: 0; padding: 20px; }
              .prescription-container { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            ${headerHTML}
            <div style="margin: 40px 0;">
              <div class="section-title">Template Preview</div>
              <div class="field-placeholder">
                <strong>This is a template preview</strong><br>
                Patient information and prescription details will appear here when used by doctors...
              </div>
            </div>
            ${footerHTML}
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const resetPositions = () => {
    setElementPositions({});
  };

  const savePositions = () => {
    // In a real app, this would save to backend
    console.log('Positions saved:', elementPositions);
  };

  const applyTemplatePreset = useCallback((preset: PrescriptionTemplate) => {
    try {
      setIsLoading(true);
      // Apply the preset template
      Object.assign(template, preset);
      setElementPositions({});
      
      // Show success notification
      setNotification({ type: 'success', message: `Template "${preset.header.hospitalName}" applied successfully!` });
      setTimeout(() => setNotification(null), 3000);
      
      // Show visual feedback on button
      const button = document.querySelector(`[data-preset="${preset.header.hospitalName}"]`);
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ Applied!';
        button.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
        }, 2000);
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to apply template. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [template]);

  const saveCurrentTemplate = useCallback(() => {
    const name = prompt('Enter template name:') || currentTemplateName;
    if (name) {
      try {
        setIsLoading(true);
        saveTemplateToLocalStorage(name, template);
        setCurrentTemplateName(name);
        setSavedTemplates(loadTemplatesFromLocalStorage());
        setNotification({ type: 'success', message: `Template "${name}" saved successfully!` });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        setNotification({ type: 'error', message: 'Failed to save template. Please try again.' });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setIsLoading(false);
      }
    }
  }, [template, currentTemplateName]);

  const loadSavedTemplate = useCallback((savedTemplate: PrescriptionTemplate) => {
    Object.assign(template, savedTemplate);
    setElementPositions({});
  }, [template]);

  const deleteSavedTemplate = useCallback((index: number) => {
    const templates = JSON.parse(localStorage.getItem('prescriptionTemplates') || '[]');
    templates.splice(index, 1);
    localStorage.setItem('prescriptionTemplates', JSON.stringify(templates));
    setSavedTemplates(templates.map((t: any) => t.template));
  }, []);

  // Load saved templates on component mount
  React.useEffect(() => {
    setSavedTemplates(loadTemplatesFromLocalStorage());
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'e':
            e.preventDefault();
            setShowDraggable(!showDraggable);
            break;
          case 's':
            e.preventDefault();
            if (showSettings) {
              savePositions();
            } else {
              saveCurrentTemplate();
            }
            break;
          case 't':
            e.preventDefault();
            setShowTemplates(!showTemplates);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDraggable, showSettings, showTemplates, saveCurrentTemplate]);

  const generateCompleteHeaderHTML = (): string => {
    return `
      <div class="prescription-header">
        ${template.header.showLogo && template.header.logoUrl ? 
          `<img src="${template.header.logoUrl}" alt="Logo" class="header-logo" />` : ''}
        <h1 style="${Object.entries(applyStyles(template.header.styles?.hospitalName)).map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`).join('; ')}">
          ${template.header.hospitalName}
        </h1>
        ${template.header.contactInfo && template.header.contactDetails ? 
          `<div style="${Object.entries(applyStyles(template.header.styles?.contactInfo)).map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`).join('; ')}">${template.header.contactDetails.split('\n').map(line => `<div>${line}</div>`).join('')}</div>` : ''}
        ${template.header.customText ? 
          `<p style="${Object.entries(applyStyles(template.header.styles?.customText)).map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`).join('; ')}">${template.header.customText}</p>` : ''}
        ${userRole === 'doctor' && doctorSettings ? 
          `<div class="doctor-info">
            <h2>${doctorSettings.doctorName || 'Doctor Name'}</h2>
            ${doctorSettings.qualifications ? `<p>${doctorSettings.qualifications}</p>` : ''}
            ${doctorSettings.designationRegNumber ? `<p>${doctorSettings.designationRegNumber}</p>` : ''}
          </div>` : 
          (userRole === 'admin' ? '<div class="doctor-info-placeholder">[Doctor information will be inserted here]</div>' : '')
        }
      </div>
    `;
  };

  const generateCompleteFooterHTML = (): string => {
    return `
      <div class="prescription-footer">
        ${template.footer.customNotes ? 
          `<p style="${Object.entries(applyStyles(template.footer.styles?.customNotes)).map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`).join('; ')}">${template.footer.customNotes}</p>` : ''}
        ${template.footer.signature ? 
          (userRole === 'doctor' && doctorSettings ? 
            `<div style="text-align: right; margin-top: 30px;">
              <div class="signature-line"></div>
              <p><strong>Dr. ${doctorSettings.doctorName || 'Doctor Name'}</strong></p>
              ${doctorSettings.qualifications ? `<p>${doctorSettings.qualifications}</p>` : ''}
              ${doctorSettings.designationRegNumber ? `<p>${doctorSettings.designationRegNumber}</p>` : ''}
            </div>` :
            '<div style="text-align: right; margin-top: 30px;"><div class="signature-line"></div><p>[Doctor signature will appear here]</p></div>'
          ) : ''
        }
        ${template.footer.qrCode ? '<div class="qr-code">QR Code</div>' : ''}
      </div>
    `;
  };

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
      <CardHeader className="bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-950/20 dark:to-brand-950/20 border-b border-brand-100 dark:border-brand-800/30">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              Prescription Template Preview
            </CardTitle>
                         <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
               {userRole === 'admin' 
                 ? '🎯 This template will be used by all doctors in the system' 
                 : '👨‍⚕️ Preview of your personalized prescription template'}
             </p>
             <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
               ⌨️ <strong>Keyboard shortcuts:</strong> Ctrl+E (Edit), Ctrl+S (Save), Ctrl+T (Templates)
             </div>
          </div>
                     <div className="flex gap-2 flex-wrap">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setShowTemplates(!showTemplates)}
               className="flex items-center gap-2 border-brand-200 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
             >
               <FileText className="h-4 w-4" />
               Templates
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setShowSettings(!showSettings)}
               className="flex items-center gap-2 border-brand-200 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
             >
               <Palette className="h-4 w-4" />
               Customize
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setShowDraggable(!showDraggable)}
               className={`flex items-center gap-2 transition-all duration-200 ${
                 showDraggable 
                   ? 'border-green-200 hover:border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:border-green-600 dark:hover:bg-green-900/20' 
                   : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900/20'
               }`}
             >
               {showDraggable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               {showDraggable ? 'Lock Layout' : 'Edit Layout'}
             </Button>
             <Button
               variant="outline" 
               size="sm"
               onClick={handleExportHTML}
               className="flex items-center gap-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:border-purple-600 dark:hover:bg-purple-900/20"
             >
               <Download className="h-4 w-4" />
               Export
             </Button>
             <Button
               variant="outline"
               size="sm" 
               onClick={handlePrintPreview}
               className="flex items-center gap-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:border-orange-600 dark:hover:bg-orange-900/20"
             >
               <Printer className="h-4 w-4" />
               Print
             </Button>
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotification(null)}
                className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Template Management Panel */}
        {showTemplates && (
          <div className="bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/20 dark:to-purple-950/20 border border-brand-200 dark:border-brand-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-brand-900 dark:text-brand-100">Template Management</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveCurrentTemplate}
                  disabled={isLoading}
                  className="border-brand-200 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Current'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                  className="border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-900/20"
                >
                  Close
                </Button>
              </div>
            </div>
            
            {/* Template Presets */}
            <div className="mb-6">
              <h4 className="font-medium text-brand-800 dark:text-brand-200 mb-3">📋 Professional Templates</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templatePresets.map((preset, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-brand-200 dark:border-brand-600 hover:border-brand-300 dark:hover:border-brand-500 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-brand-900 dark:text-brand-100">
                        {preset.header.hospitalName}
                      </h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplatePreset(preset)}
                        data-preset={preset.header.hospitalName}
                        className="h-7 px-2 text-xs border-brand-200 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                    <p className="text-xs text-brand-700 dark:text-brand-300">
                      {preset.sections.vitals ? '📊 Vitals' : ''} {preset.sections.diagnosis ? '🔍 Diagnosis' : ''} {preset.sections.medicines ? '💊 Medicines' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Templates */}
            {savedTemplates.length > 0 && (
              <div>
                <h4 className="font-medium text-brand-800 dark:text-brand-200 mb-3">💾 Saved Templates</h4>
                <div className="space-y-2">
                  {savedTemplates.map((savedTemplate, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-brand-200 dark:border-brand-600">
                      <span className="text-sm text-brand-900 dark:text-brand-100">
                        Template {index + 1}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSavedTemplate(savedTemplate)}
                          className="h-7 px-2 text-xs border-green-200 hover:border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:border-green-600 dark:hover:bg-green-900/20"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSavedTemplate(index)}
                          className="h-7 px-2 text-xs border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-green-700 dark:hover:border-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-950/20 dark:to-brand-950/20 border border-brand-200 dark:border-brand-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-brand-900 dark:text-brand-100">Template Customization</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetPositions}
                  className="border-brand-200 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={savePositions}
                  className="border-green-200 hover:border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:border-green-600 dark:hover:bg-green-900/20"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
            <p className="text-sm text-brand-800 dark:text-brand-200">
              🎨 Customize colors, fonts, and layout to match your hospital's branding
            </p>
            
            {/* Grid Settings */}
            <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-700">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-brand-800 dark:text-brand-200">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="rounded border-brand-300 dark:border-brand-600"
                  />
                  Snap to Grid ({gridSize}px)
                </label>
              </div>
            </div>
          </div>
        )}

        {showDraggable && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                ✨ Edit Mode Active
              </p>
              <Badge variant="outline" className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600">
                {snapToGrid ? `Grid: ${gridSize}px` : 'Free Move'}
              </Badge>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              🎯 Drag elements to reposition them. {snapToGrid ? `Elements will snap to ${gridSize}px grid.` : 'Elements can be positioned freely.'} All changes are saved automatically.
            </p>
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              💡 <strong>Pro tip:</strong> Use the grid settings in Customize panel for precise alignment
            </div>
          </div>
        )}

        {/* Header Section */}
        {(template.header.hospitalName || template.header.showLogo || template.header.contactInfo || template.header.customText) && (
          <div className="relative min-h-[280px] border-2 border-dashed border-brand-300 dark:border-brand-600 p-6 rounded-xl bg-gradient-to-br from-brand-50/50 to-brand-50/30 dark:from-brand-950/20 dark:to-brand-950/10 overflow-hidden shadow-inner">
            {/* Grid Overlay */}
            {showDraggable && snapToGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: Math.ceil(280 / gridSize) }).map((_, i) => (
                  <div key={`h-${i}`} className="absolute w-full border-t border-brand-200/30 dark:border-brand-700/30" style={{ top: i * gridSize }} />
                ))}
                {Array.from({ length: Math.ceil(800 / gridSize) }).map((_, i) => (
                  <div key={`v-${i}`} className="absolute h-full border-l border-brand-200/30 dark:border-brand-700/30" style={{ left: i * gridSize }} />
                ))}
              </div>
            )}
            
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="outline" className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-600 font-medium">
                🏥 Header Section
              </Badge>
            </div>
            
            {template.header.showLogo && template.header.logoUrl && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 20, y: 40 }} 
                  nodeRef={logoRef}
                  onStop={(e, data) => {
                    const x = snapToGrid ? snapToGridValue(data.x, gridSize) : data.x;
                    const y = snapToGrid ? snapToGridValue(data.y, gridSize) : data.y;
                    setElementPositions(prev => ({ ...prev, logo: { x, y } }));
                  }}
                  position={elementPositions.logo ? { x: elementPositions.logo.x, y: elementPositions.logo.y } : undefined}
                >
                  <img
                    ref={logoRef}
                    src={template.header.logoUrl}
                    alt="Logo"
                    className="absolute w-24 h-24 object-contain border-2 border-brand-200 dark:border-brand-700 rounded-xl shadow-lg cursor-move bg-white dark:bg-gray-800 p-2 hover:shadow-xl transition-all duration-200"
                    style={{ zIndex: 5 }}
                  />
                </Draggable>
              ) : (
                <img
                  src={template.header.logoUrl}
                  alt="Logo"
                  className="absolute top-10 left-5 w-24 h-24 object-contain border-2 border-brand-200 dark:border-brand-700 rounded-xl shadow-lg bg-white dark:bg-gray-800 p-2"
                />
              )
            )}

            {template.header.hospitalName && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: template.header.showLogo ? 140 : 30, y: 50 }} 
                  nodeRef={hospitalNameRef}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, hospitalName: { x: data.x, y: data.y } }))}
                >
                  <div
                    ref={hospitalNameRef}
                    className="absolute p-3 cursor-move font-bold text-gray-900 dark:text-white rounded-xl border-2 border-brand-300 dark:border-brand-600 bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{...applyStyles(template.header.styles?.hospitalName), zIndex: 4}}
                  >
                    {template.header.hospitalName}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-3 font-bold text-gray-900 dark:text-white bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-xl shadow-lg"
                  style={{
                    ...applyStyles(template.header.styles?.hospitalName),
                    left: template.header.showLogo ? '140px' : '30px',
                    top: '50px'
                  }}
                >
                  {template.header.hospitalName}
                </div>
              )
            )}

            {template.header.contactInfo && template.header.contactDetails && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 30, y: 100 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, contactInfo: { x: data.x, y: data.y } }))}
                >
                  <div
                    className="absolute p-3 cursor-move text-sm text-gray-900 dark:text-white rounded-xl border-2 border-brand-300 dark:border-brand-600 max-w-xs bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{...applyStyles(template.header.styles?.contactInfo), zIndex: 3}}
                  >
                    {template.header.contactDetails.split('\n').map((line, idx) => (
                      <div key={idx} className="mb-1">{line}</div>
                    ))}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-3 text-sm text-gray-900 dark:text-white max-w-xs bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-xl shadow-lg"
                  style={{
                    ...applyStyles(template.header.styles?.contactInfo),
                    left: '30px',
                    top: '100px'
                  }}
                >
                  {template.header.contactDetails.split('\n').map((line, idx) => (
                    <div key={idx} className="mb-1">{line}</div>
                  ))}
                </div>
              )
            )}

            {template.header.customText && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 30, y: 180 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, customText: { x: data.x, y: data.y } }))}
                >
                  <div
                    className="absolute p-3 cursor-move italic text-sm text-gray-900 dark:text-white rounded-xl border-2 border-brand-300 dark:border-brand-600 bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{...applyStyles(template.header.styles?.customText), zIndex: 2}}
                  >
                    {template.header.customText}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-3 italic text-sm text-gray-900 dark:text-white bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-xl shadow-lg"
                  style={{
                    ...applyStyles(template.header.styles?.customText),
                    left: '30px',
                    top: '180px'
                  }}
                >
                  {template.header.customText}
                </div>
              )
            )}

            {/* Doctor Information Section */}
            {userRole === 'doctor' && doctorSettings ? (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 30, y: 220 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, doctorInfo: { x: data.x, y: data.y } }))}
                >
                  <div className="absolute p-4 cursor-move bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-lg max-w-sm hover:shadow-xl transition-all duration-200">
                    <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Doctor Information
                    </div>
                    <div className="font-bold text-base text-green-900 dark:text-green-100 mb-2">{doctorSettings.doctorName || 'Doctor Name'}</div>
                    {doctorSettings.qualifications && (
                      <div className="text-sm text-green-700 dark:text-green-300 mb-1">{doctorSettings.qualifications}</div>
                    )}
                    {doctorSettings.designationRegNumber && (
                      <div className="text-xs text-green-600 dark:text-green-400">{doctorSettings.designationRegNumber}</div>
                    )}
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-lg max-w-sm"
                  style={{ left: '30px', top: '220px' }}
                >
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Doctor Information
                  </div>
                  <div className="font-bold text-base text-green-900 dark:text-green-100 mb-2">{doctorSettings.doctorName || 'Doctor Name'}</div>
                  {doctorSettings.qualifications && (
                    <div className="text-sm text-green-700 dark:text-green-300 mb-1">{doctorSettings.qualifications}</div>
                  )}
                  {doctorSettings.designationRegNumber && (
                    <div className="text-xs text-green-600 dark:text-green-400">{doctorSettings.designationRegNumber}</div>
                  )}
                </div>
              )
            ) : userRole === 'admin' && (
              <div 
                className="absolute p-4 bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 border-2 border-dashed border-brand-400 dark:border-brand-600 rounded-xl max-w-sm shadow-lg"
                style={{ left: '30px', top: '220px' }}
              >
                <div className="text-sm font-semibold text-brand-800 dark:text-brand-200 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  Doctor Information Placeholder
                </div>
                <div className="text-sm text-brand-700 dark:text-brand-300 italic">
                  Doctor details will be inserted here automatically when used
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body Sections Preview */}
        <div className="space-y-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 font-medium">
              📋 Prescription Body
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-700">
              <h4 className="font-semibold text-base text-brand-900 dark:text-brand-100 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                Patient Information
              </h4>
              <p className="text-sm text-brand-800 dark:text-brand-200">
                <strong>Name:</strong> _________________ | <strong>Age:</strong> _____ | <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>

            {template.sections.vitals && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <h4 className="font-semibold text-base text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Vitals
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>BP:</strong> _____ | <strong>Pulse:</strong> _____ | <strong>Temperature:</strong> _____°F
                </p>
              </div>
            )}

            {template.sections.diagnosis && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-semibold text-base text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Diagnosis
                </h4>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  _________________________________
                </p>
              </div>
            )}

            {template.sections.advice && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <h4 className="font-semibold text-base text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  Advice
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  _________________________________
                </p>
              </div>
            )}

            {template.sections.medicines && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-700">
                <h4 className="font-semibold text-base text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Medicines
                </h4>
                <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-300">1</span>
                    ____________________________
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-300">2</span>
                    ____________________________
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-300">3</span>
                    ____________________________
                  </div>
                </div>
              </div>
            )}

            {template.sections.nextAppointment && (
              <div className="p-4 bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-700">
                <h4 className="font-semibold text-base text-brand-900 dark:text-brand-100 mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  Next Appointment
                </h4>
                <p className="text-sm text-brand-800 dark:text-brand-200">
                  <strong>Follow-up:</strong> ________________
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Section */}
        {(template.footer.customNotes || template.footer.signature || template.footer.qrCode) && (
          <div className="relative min-h-[220px] border-2 border-dashed border-brand-300 dark:border-brand-600 p-6 rounded-xl bg-gradient-to-br from-brand-50/50 to-brand-50/30 dark:from-brand-950/20 dark:to-brand-950/10 overflow-hidden shadow-inner">
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="outline" className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-600 font-medium">
                📝 Footer Section
              </Badge>
            </div>

            {template.footer.customNotes && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 30, y: 40 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, customNotes: { x: data.x, y: data.y } }))}
                >
                  <div
                    className="absolute p-3 cursor-move text-sm text-gray-900 dark:text-white rounded-xl border-2 border-brand-300 dark:border-brand-600 max-w-md bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{...applyStyles(template.footer.styles?.customNotes), zIndex: 3}}
                  >
                    {template.footer.customNotes}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-3 text-sm text-gray-900 dark:text-white max-w-md bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-xl shadow-lg"
                  style={{
                    ...applyStyles(template.footer.styles?.customNotes),
                    left: '30px',
                    top: '40px'
                  }}
                >
                  {template.footer.customNotes}
                </div>
              )
            )}

            {template.footer.signature && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 350, y: 120 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, signature: { x: data.x, y: data.y } }))}
                >
                  <div className="absolute cursor-move text-right rounded-xl border-2 border-brand-300 dark:border-brand-600 p-4 bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="border-t-2 border-brand-400 dark:border-brand-400 w-36 mx-auto mb-3"></div>
                    {userRole === 'doctor' && doctorSettings ? (
                      <>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Dr. {doctorSettings.doctorName || 'Doctor Name'}</div>
                        {doctorSettings.qualifications && (
                          <div className="text-xs text-gray-700 dark:text-gray-200 mb-1">{doctorSettings.qualifications}</div>
                        )}
                        {doctorSettings.designationRegNumber && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">{doctorSettings.designationRegNumber}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Dr. [Doctor Name]</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">[Qualifications]</div>
                      </>
                    )}
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute text-right p-4 bg-gradient-to-r from-white to-brand-50 dark:from-gray-800 dark:to-brand-900/20 border-2 border-brand-300 dark:border-brand-600 rounded-xl shadow-lg"
                  style={{ right: '30px', bottom: '70px' }}
                >
                  <div className="border-t-2 border-brand-400 dark:border-brand-400 w-36 mx-auto mb-3"></div>
                  {userRole === 'doctor' && doctorSettings ? (
                    <>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Dr. {doctorSettings.doctorName || 'Doctor Name'}</div>
                      {doctorSettings.qualifications && (
                        <div className="text-xs text-gray-700 dark:text-gray-200 mb-1">{doctorSettings.qualifications}</div>
                      )}
                      {doctorSettings.designationRegNumber && (
                        <div className="text-xs text-gray-600 dark:text-gray-300">{doctorSettings.designationRegNumber}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Dr. [Doctor Name]</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">[Qualifications]</div>
                    </>
                  )}
                </div>
              )
            )}

            {template.footer.qrCode && (
              showDraggable ? (
                <Draggable 
                  bounds="parent" 
                  defaultPosition={{ x: 420, y: 40 }}
                  onStop={(e, data) => setElementPositions(prev => ({ ...prev, qrCode: { x: data.x, y: data.y } }))}
                >
                  <div className="absolute w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center text-xs font-bold text-gray-600 dark:text-white cursor-move shadow-lg border-2 border-brand-300 dark:border-brand-600 hover:shadow-xl transition-all duration-200">
                    QR Code
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center text-xs font-bold text-gray-600 dark:text-white shadow-lg border-2 border-brand-300 dark:border-brand-600"
                  style={{ right: '30px', top: '40px' }}
                >
                  QR Code
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplatePreview;