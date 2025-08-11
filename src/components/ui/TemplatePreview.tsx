import React, { useState, useRef } from "react";
import Draggable from "react-draggable";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Eye, EyeOff, Download, Printer } from "lucide-react";

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

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  userRole = 'admin',
  doctorSettings 
}) => {
  const [showDraggable, setShowDraggable] = useState(false);
  const [previewMode, setPreviewMode] = useState<'design' | 'final'>('design');
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
        body { font-family: Arial, sans-serif; margin: 20px; }
        .prescription-container { max-width: 800px; margin: 0 auto; }
        .header-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
        .prescription-header { border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
        .prescription-footer { border-top: 1px solid #ccc; padding-top: 20px; margin-top: 30px; position: relative; }
        .doctor-info { margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin: 20px 0 10px auto; }
        .qr-code { width: 60px; height: 60px; border: 1px solid #ccc; position: absolute; bottom: 10px; right: 10px; }
    </style>
</head>
<body>
    <div class="prescription-container">
        ${headerHTML}
        
        <div class="prescription-body">
            <h3>Patient Information</h3>
            <p>Name: _________________ Age: _____ Date: ${new Date().toLocaleDateString()}</p>
            
            ${template.sections.vitals ? '<h3>Vitals</h3><p>BP: _____ Pulse: _____ Temperature: _____</p>' : ''}
            ${template.sections.diagnosis ? '<h3>Diagnosis</h3><p>_____________________________________</p>' : ''}
            ${template.sections.advice ? '<h3>Advice</h3><p>_____________________________________</p>' : ''}
            ${template.sections.medicines ? '<h3>Medicines</h3><p>_____________________________________</p>' : ''}
            ${template.sections.nextAppointment ? '<h3>Next Appointment</h3><p>_____________________</p>' : ''}
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
    a.download = `prescription-template-${userRole}.html`;
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
            body { font-family: Arial, sans-serif; margin: 20px; }
            .prescription-container { max-width: 800px; margin: 0 auto; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            ${headerHTML}
            <div style="margin: 30px 0;">
              <p><strong>This is a template preview</strong></p>
              <p>Patient information and prescription details will appear here...</p>
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
        ${template.footer.qrCode ? '<div class="qr-code" style="display: flex; align-items: center; justify-content: center; font-size: 10px;">QR Code</div>' : ''}
      </div>
    `;
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              Template Preview
            
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {userRole === 'admin' 
                ? 'This template will be used by all doctors' 
                : 'Preview of your personalized template'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDraggable(!showDraggable)}
              className="flex items-center gap-1"
            >
              {showDraggable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDraggable ? 'Lock' : 'Edit'}
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={handleExportHTML}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm" 
              onClick={handlePrintPreview}
              className="flex items-center gap-1"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {showDraggable && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              🎯 <strong>Edit Mode:</strong> Drag elements to reposition them. Changes are saved automatically.
            </p>
          </div>
        )}

        {/* Header Section */}
        {(template.header.hospitalName || template.header.showLogo || template.header.contactInfo || template.header.customText) && (
          <div className="relative min-h-[250px] border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-gray-50/30 dark:bg-gray-900/30 overflow-hidden">
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="outline" className="text-xs">
                Header Section
              </Badge>
            </div>
            
            {template.header.showLogo && template.header.logoUrl && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 10, y: 30 }} nodeRef={logoRef}>
                  <img
                    ref={logoRef}
                    src={template.header.logoUrl}
                    alt="Logo"
                    className="absolute w-20 h-20 object-contain border rounded shadow cursor-move bg-white p-1"
                    style={{ zIndex: 5 }}
                  />
                </Draggable>
              ) : (
                <img
                  src={template.header.logoUrl}
                  alt="Logo"
                  className="absolute top-8 left-4 w-20 h-20 object-contain border rounded shadow bg-white p-1"
                />
              )
            )}

            {template.header.hospitalName && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: template.header.showLogo ? 120 : 20, y: 40 }} nodeRef={hospitalNameRef}>
                  <div
                    ref={hospitalNameRef}
                    className="absolute p-2 cursor-move font-bold  rounded  border"
                    style={{...applyStyles(template.header.styles?.hospitalName), zIndex: 4}}
                  >
                    {template.header.hospitalName}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-2 font-bold"
                  style={{
                    ...applyStyles(template.header.styles?.hospitalName),
                    left: template.header.showLogo ? '120px' : '20px',
                    top: '40px'
                  }}
                >
                  {template.header.hospitalName}
                </div>
              )
            )}

            {template.header.contactInfo && template.header.contactDetails && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 20, y: 80 }}>
                  <div
                    className="absolute p-2 cursor-move text-sm  rounded  border max-w-xs"
                    style={{...applyStyles(template.header.styles?.contactInfo), zIndex: 3}}
                  >
                    {template.header.contactDetails.split('\n').map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-2 text-sm max-w-xs"
                  style={{
                    ...applyStyles(template.header.styles?.contactInfo),
                    left: '20px',
                    top: '80px'
                  }}
                >
                  {template.header.contactDetails.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )
            )}

            {template.header.customText && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 20, y: 140 }}>
                  <div
                    className="absolute p-2 cursor-move italic text-sm  rounded  border"
                    style={{...applyStyles(template.header.styles?.customText), zIndex: 2}}
                  >
                    {template.header.customText}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-2 italic text-sm"
                  style={{
                    ...applyStyles(template.header.styles?.customText),
                    left: '20px',
                    top: '140px'
                  }}
                >
                  {template.header.customText}
                </div>
              )
            )}

            {/* Doctor Information Section */}
            {/* {userRole === 'doctor' && doctorSettings ? (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 20, y: 180 }}>
                  <div className="absolute p-3 cursor-move bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg shadow-sm max-w-sm">
                    <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Doctor Information</div>
                    <div className="font-bold text-base">{doctorSettings.doctorName || 'Doctor Name'}</div>
                    {doctorSettings.qualifications && (
                      <div className="text-sm text-gray-600">{doctorSettings.qualifications}</div>
                    )}
                    {doctorSettings.designationRegNumber && (
                      <div className="text-xs text-gray-500">{doctorSettings.designationRegNumber}</div>
                    )}
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg shadow-sm max-w-sm"
                  style={{ left: '20px', top: '180px' }}
                >
                  <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Doctor Information</div>
                  <div className="font-bold text-base">{doctorSettings.doctorName || 'Doctor Name'}</div>
                  {doctorSettings.qualifications && (
                    <div className="text-sm text-gray-600">{doctorSettings.qualifications}</div>
                  )}
                  {doctorSettings.designationRegNumber && (
                    <div className="text-xs text-gray-500">{doctorSettings.designationRegNumber}</div>
                  )}
                </div>
              )
            ) : userRole === 'admin' && (
              <div 
                className="absolute p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg max-w-sm"
                style={{ left: '20px', top: '180px' }}
              >
                <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Doctor Information Placeholder</div>
                <div className="text-sm text-blue-600 dark:text-blue-300 italic">
                  Doctor details will be inserted here automatically
                </div>
              </div>
            )} */}
          </div>
        )}

        {/* Body Sections Preview */}
        <div className="space-y-4 border rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs">Prescription Body</Badge>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">Patient Information</h4>
              <p className="text-sm text-gray-600">
                Name: _________________ | Age: _____ | Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            {template.sections.vitals && (
              <div>
                <h4 className="font-semibold text-sm">Vitals</h4>
                <p className="text-sm text-gray-600">BP: _____ | Pulse: _____ | Temperature: _____°F</p>
              </div>
            )}

            {template.sections.diagnosis && (
              <div>
                <h4 className="font-semibold text-sm">Diagnosis</h4>
                <p className="text-sm text-gray-600">_________________________________</p>
              </div>
            )}

            {template.sections.advice && (
              <div>
                <h4 className="font-semibold text-sm">Advice</h4>
                <p className="text-sm text-gray-600">_________________________________</p>
              </div>
            )}

            {template.sections.medicines && (
              <div>
                <h4 className="font-semibold text-sm">Medicines</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>1. ____________________________</div>
                  <div>2. ____________________________</div>
                  <div>3. ____________________________</div>
                </div>
              </div>
            )}

            {template.sections.nextAppointment && (
              <div>
                <h4 className="font-semibold text-sm">Next Appointment</h4>
                <p className="text-sm text-gray-600">Follow-up: ________________</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Section */}
        {(template.footer.customNotes || template.footer.signature || template.footer.qrCode) && (
          <div className="relative min-h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-gray-50/30 dark:bg-gray-900/30 overflow-hidden">
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="outline" className="text-xs">
                Footer Section
              </Badge>
            </div>

            {template.footer.customNotes && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 20, y: 30 }}>
                  <div
                    className="absolute p-2 cursor-move text-sm  rounded  border max-w-md"
                    style={{...applyStyles(template.footer.styles?.customNotes), zIndex: 3}}
                  >
                    {template.footer.customNotes}
                  </div>
                </Draggable>
              ) : (
                <div
                  className="absolute p-2 text-sm max-w-md"
                  style={{
                    ...applyStyles(template.footer.styles?.customNotes),
                    left: '20px',
                    top: '30px'
                  }}
                >
                  {template.footer.customNotes}
                </div>
              )
            )}

            {template.footer.signature && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 320, y: 100 }}>
                  <div className="absolute cursor-move text-right  rounded  border p-2">
                    <div className="border-t border-gray-400 w-32 mx-auto mb-2"></div>
                    {userRole === 'doctor' && doctorSettings ? (
                      <>
                        <div className="text-sm font-semibold">Dr. {doctorSettings.doctorName || 'Doctor Name'}</div>
                        {doctorSettings.qualifications && (
                          <div className="text-xs text-gray-600">{doctorSettings.qualifications}</div>
                        )}
                        {doctorSettings.designationRegNumber && (
                          <div className="text-xs text-gray-500">{doctorSettings.designationRegNumber}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold">Dr. [Doctor Name]</div>
                        <div className="text-xs text-gray-500">[Qualifications]</div>
                      </>
                    )}
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute text-right p-2"
                  style={{ right: '20px', bottom: '60px' }}
                >
                  <div className="border-t border-gray-400 w-32 mx-auto mb-2"></div>
                  {userRole === 'doctor' && doctorSettings ? (
                    <>
                      <div className="text-sm font-semibold">Dr. {doctorSettings.doctorName || 'Doctor Name'}</div>
                      {doctorSettings.qualifications && (
                        <div className="text-xs text-gray-600">{doctorSettings.qualifications}</div>
                      )}
                      {doctorSettings.designationRegNumber && (
                        <div className="text-xs text-gray-500">{doctorSettings.designationRegNumber}</div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold">Dr. [Doctor Name]</div>
                      <div className="text-xs text-gray-500">[Qualifications]</div>
                    </>
                  )}
                </div>
              )
            )}

            {template.footer.qrCode && (
              showDraggable ? (
                <Draggable bounds="parent" defaultPosition={{ x: 400, y: 30 }}>
                  <div className="absolute w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500 cursor-move shadow border">
                    QR Code
                  </div>
                </Draggable>
              ) : (
                <div 
                  className="absolute w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500 shadow border"
                  style={{ right: '20px', top: '30px' }}
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