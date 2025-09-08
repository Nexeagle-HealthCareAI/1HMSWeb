import React, { useMemo } from 'react';
import { usePrescriptionStore } from '@/store/prescription';
import { mmToPx, A4_WIDTH_MM, A4_HEIGHT_MM } from '@/utils/units';
import { Button } from '@/components/ui/button';
import { Printer, Eye } from 'lucide-react';

interface A4PreviewProps {
  className?: string;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ className = '' }) => {
  const { settings } = usePrescriptionStore();

  // Ensure settings are properly initialized
  if (!settings || !settings.page || !settings.header || !settings.footer || !settings.font) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="bg-gray-100 p-4 rounded-lg w-full max-w-sm">
          <div className="text-xs text-gray-500 mb-2 text-center">
            Loading preview...
          </div>
          <div className="bg-white border-2 border-gray-300 shadow-lg mx-auto relative flex flex-col" style={{ width: '200px', height: '280px' }}>
            <div className="p-4 h-full flex flex-col">
              <div className="border-b border-gray-200 pb-2 mb-2">
                <div className="text-center text-sm font-semibold">Header</div>
              </div>
              <div className="flex-1 flex items-center justify-center text-xs">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-light mb-1">Print Preview</div>
                  <div className="opacity-75">Content area</div>
                </div>
              </div>
              <div className="border-t-2 border-gray-300 bg-gray-50 pt-2 mt-2 flex-shrink-0">
                <div className="text-center text-xs text-gray-700 font-medium">Footer Area</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate scale to fit A4 in container without scrolling
  const scale = useMemo(() => {
    const containerWidth = 300; // Reduced container width for 1/3 of screen
    const containerHeight = 400; // Reduced container height to leave space for buttons
    const a4WidthPx = mmToPx(A4_WIDTH_MM);
    const a4HeightPx = mmToPx(A4_HEIGHT_MM);
    
    const scaleX = containerWidth / a4WidthPx;
    const scaleY = containerHeight / a4HeightPx;
    
    // Ensure minimum scale for visibility
    const calculatedScale = Math.min(scaleX, scaleY);
    return Math.max(calculatedScale, 0.25); // Minimum 25% scale for visibility
  }, []);

  const a4Width = mmToPx(A4_WIDTH_MM) * scale;
  const a4Height = mmToPx(A4_HEIGHT_MM) * scale;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription - ${new Date().toLocaleDateString()}</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              body { 
                margin: 0; 
                padding: 0; 
                font-family: ${settings.font?.family ?? 'Arial'}; 
                background: white;
              }
              .prescription { 
                width: 210mm; 
                height: 297mm; 
                margin: 0; 
                padding: ${(settings.page?.margin?.top ?? 20) * 0.264583}mm ${(settings.page?.margin?.right ?? 20) * 0.264583}mm ${(settings.page?.margin?.bottom ?? 20) * 0.264583}mm ${(settings.page?.margin?.left ?? 20) * 0.264583}mm;
                position: relative;
                background: white;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                page-break-after: always;
              }
              .header { 
                height: ${settings.header?.height ?? 20}mm; 
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
              }
              .header img {
                max-height: 100%;
                max-width: 100%;
                object-fit: contain;
              }
              .content { 
                flex: 1; 
                padding: 5mm;
                font-size: ${settings.font?.size ?? 12}px;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 0;
              }
              .footer { 
                height: ${settings.footer?.height ?? 15}mm; 
                border-top: 1px solid #eee;
                background-color: #f9fafb;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 2.5mm 5mm;
                position: relative;
                overflow: hidden;
                min-height: 10mm;
                flex-shrink: 0;
              }
              .footer img {
                max-height: 100%;
                max-width: 100%;
                object-fit: contain;
              }
              .signature { 
                width: ${settings.footer?.signatureWidth ?? 20}mm; 
                height: ${settings.footer?.signatureHeight ?? 10}mm;
                border: 1px dashed #ccc;
                background-color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #666;
                flex-shrink: 0;
                border-radius: 1mm;
                min-width: 6mm;
                min-height: 5mm;
              }
              .signature img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .prescription { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="prescription">
              <div class="header">
                ${settings.header?.showImage && settings.images?.header ? 
                  `<img src="${settings.images.header}" alt="Header" />` : 
                  ''
                }
                ${settings.header?.showText ? 
                  `<div style="text-align: center; font-size: ${settings.font?.size ?? 12}px;">
                    ${(settings.header?.text ?? '').split('\n').map(line => `<div>${line}</div>`).join('')}
                  </div>` : 
                  ''
                }
              </div>
              <div class="content">
                <div style="text-align: center; color: #666;">
                  <div style="font-size: 24px; font-weight: 300; margin-bottom: 10px;">PRESCRIPTION</div>
                  <div style="font-size: 14px; opacity: 0.75;">Content area for prescription details</div>
                </div>
              </div>
              <div class="footer">
                <div class="flex-1">
                  ${settings.footer?.showImage && settings.images?.footer ? 
                    `<img src="${settings.images.footer}" alt="Footer" />` : 
                    ''
                  }
                  ${settings.footer?.showText && settings.footer?.text ? 
                    `<div style="font-size: ${settings.font?.size ?? 12}px;">${settings.footer.text}</div>` : 
                    ''
                  }
                </div>
                <div class="flex-shrink-0 ml-4" style="display: flex; flex-direction: column; align-items: center;">
                  ${settings.footer?.showSignature ? 
                    `<div class="signature">
                      ${settings.images?.signature ? 
                        `<img src="${settings.images.signature}" alt="Signature" />` : 
                        'Dr. Signature'
                      }
                    </div>
                    <div style="text-align: center; font-size: 10px; margin-top: 2px; color: #666; line-height: 1.2;">
                      ${settings.footer?.doctorName ? `<div style="font-weight: bold;">${settings.footer.doctorName}</div>` : ''}
                    </div>` : 
                    ''
                  }
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  };

  const handlePreview = () => {
    // Open print preview
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription Preview</title>
            <style>
              body { margin: 0; padding: 20px; font-family: ${settings.font.family}; }
              .prescription { 
                width: 210mm; 
                height: 297mm; 
                margin: 0 auto; 
                border: 1px solid #ccc;
                position: relative;
                background: white;
                display: flex;
                flex-direction: column;
              }
              .header { 
                height: ${settings.header?.height ?? 80}px; 
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
              }
              .header img {
                max-height: 100%;
                max-width: 100%;
                object-fit: contain;
              }
              .content { 
                flex: 1; 
                padding: 20px;
                font-size: ${settings.font?.size ?? 12}px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .footer { 
                height: ${settings.footer?.height ?? 60}px; 
                border-top: 2px solid #ccc;
                background-color: #f9fafb;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                position: relative;
                overflow: hidden;
                min-height: 40px;
                flex-shrink: 0;
              }
              .footer img {
                max-height: 100%;
                max-width: 100%;
                object-fit: contain;
              }
              .signature { 
                width: ${settings.footer?.signatureWidth ?? 80}px; 
                height: ${settings.footer?.signatureHeight ?? 40}px;
                border: 2px dashed #999;
                background-color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #666;
                flex-shrink: 0;
                border-radius: 4px;
                min-width: 25px;
                min-height: 20px;
              }
              .signature img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .prescription { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="prescription">
              <div class="header">
                ${settings.header?.showImage && settings.images?.header ? 
                  `<img src="${settings.images.header}" alt="Header" style="max-height: 100%; max-width: 100%;" />` : 
                  ''
                }
                ${settings.header?.showText ? 
                  `<div style="text-align: center; font-size: ${settings.font?.size ?? 12}px;">
                    ${(settings.header?.text ?? '').split('\n').map(line => `<div>${line}</div>`).join('')}
                  </div>` : 
                  ''
                }
              </div>
              <div class="content">
                <div style="text-align: center; color: #666; padding: 40px 20px;">
                  <div style="font-size: 24px; font-weight: 300; margin-bottom: 10px;">Print Preview</div>
                  <div style="font-size: 14px; opacity: 0.75;">Content area for prescription</div>
                </div>
              </div>
              <div class="footer">
                <div class="flex-1">
                  ${settings.footer?.showImage && settings.images?.footer ? 
                    `<img src="${settings.images.footer}" alt="Footer" />` : 
                    ''
                  }
                  ${settings.footer?.showText && settings.footer?.text ? 
                    `<div style="font-size: ${settings.font?.size ?? 12}px;">${settings.footer.text}</div>` : 
                    ''
                  }
                </div>
                <div class="flex-shrink-0 ml-4" style="display: flex; flex-direction: column; align-items: center;">
                  ${settings.footer?.showSignature ? 
                    `<div class="signature">
                      ${settings.images?.signature ? 
                        `<img src="${settings.images.signature}" alt="Signature" />` : 
                        'Dr. Signature'
                      }
                    </div>
                    <div style="text-align: center; font-size: 10px; margin-top: 2px; color: #666; line-height: 1.2;">
                      ${settings.footer?.doctorName ? `<div style="font-weight: bold;">${settings.footer.doctorName}</div>` : ''}
                    </div>` : 
                    ''
                  }
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 w-full ${className}`}>
      {/* A4 Preview */}
      <div className="relative bg-gray-100 p-4 rounded-lg w-full max-w-sm">
        <div className="text-xs text-gray-500 mb-2 text-center">
          A4 Preview (Scale: {Math.round(scale * 100)}%) - Size: {Math.round(a4Width)}x{Math.round(a4Height)}px
        </div>
        <div
          className="bg-white border-2 border-gray-300 shadow-lg mx-auto relative flex flex-col"
          style={{
            width: Math.max(a4Width, 200), // Minimum width of 200px
            height: Math.max(a4Height, 280), // Minimum height of 280px
            minWidth: '200px',
            minHeight: '280px',
            padding: `${(settings.page?.margin?.top ?? 20) * scale}px ${(settings.page?.margin?.right ?? 20) * scale}px ${(settings.page?.margin?.bottom ?? 20) * scale}px ${(settings.page?.margin?.left ?? 20) * scale}px`,
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Margin Guides */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top margin guide */}
            <div 
              className="absolute bg-blue-200 opacity-30"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: `${(settings.page?.margin?.top ?? 20) * scale}px`,
              }}
            />
            {/* Right margin guide */}
            <div 
              className="absolute bg-blue-200 opacity-30"
              style={{
                top: 0,
                right: 0,
                bottom: 0,
                width: `${(settings.page?.margin?.right ?? 20) * scale}px`,
              }}
            />
            {/* Bottom margin guide */}
            <div 
              className="absolute bg-blue-200 opacity-30"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                height: `${(settings.page?.margin?.bottom ?? 20) * scale}px`,
              }}
            />
            {/* Left margin guide */}
            <div 
              className="absolute bg-blue-200 opacity-30"
              style={{
                top: 0,
                left: 0,
                bottom: 0,
                width: `${(settings.page?.margin?.left ?? 20) * scale}px`,
              }}
            />
          </div>
          {/* Header */}
          <div
            className="border-b border-gray-200 flex items-center justify-center relative overflow-hidden flex-shrink-0"
            style={{ 
              height: Math.max((settings.header?.height ?? 20) * scale * 3.779527559, 30),
              minHeight: '30px'
            }}
          >
            {settings.header?.showImage && settings.images?.header && (
              <img
                src={settings.images.header}
                alt="Header"
                className="max-h-full max-w-full object-contain"
                style={{
                  maxHeight: `${Math.max((settings.header?.height ?? 20) * scale * 3.779527559, 30)}px`,
                  maxWidth: `${Math.max((settings.header?.width ?? 100) * (a4Width / 100), 100)}px`
                }}
              />
            )}
            {settings.header?.showText && (
              <div
                className="text-center absolute inset-0 flex items-center justify-center"
                style={{ 
                  fontSize: Math.max((settings.font?.size ?? 12) * scale, 8),
                  lineHeight: '1.2'
                }}
              >
                {(settings.header?.text ?? '').split('\n').map((line, index) => (
                  <div key={index} className="whitespace-nowrap">{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div
            className="flex-1 flex items-center justify-center min-h-0"
            style={{ 
              fontSize: Math.max((settings.font?.size ?? 12) * scale, 10),
              padding: `${5 * scale}px`
            }}
          >
            <div className="text-center text-gray-500">
              <div className="text-2xl font-light mb-2">PRESCRIPTION</div>
              <div className="text-sm opacity-75">Content area for prescription details</div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="border-t border-gray-200 bg-gray-50 flex items-center justify-between relative overflow-hidden min-h-0 flex-shrink-0"
            style={{ 
              height: Math.max((settings.footer?.height ?? 15) * scale * 3.779527559, 40),
              minHeight: '40px',
              padding: `${2.5 * scale}px ${5 * scale}px`
            }}
          >
            <div className="flex-1 flex items-center">
              {settings.footer?.showImage && settings.images?.footer && (
                <img
                  src={settings.images.footer}
                  alt="Footer"
                  className="max-h-full max-w-full object-contain"
                  style={{
                    maxHeight: `${Math.max((settings.footer?.height ?? 15) * scale * 3.779527559, 40)}px`,
                    maxWidth: `${Math.max((settings.footer?.width ?? 100) * (a4Width / 100), 100)}px`
                  }}
                />
              )}
              {settings.footer?.showText && settings.footer?.text && (
                <div 
                  className="text-gray-700"
                  style={{ 
                    fontSize: Math.max((settings.font?.size ?? 12) * scale, 9),
                    lineHeight: '1.3',
                    fontWeight: '500'
                  }}
                >
                  {settings.footer.text}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-center">
              {settings.footer?.showSignature && (
                <>
                  <div
                    className="border border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-600"
                    style={{
                      width: Math.max((settings.footer?.signatureWidth ?? 20) * scale * 3.779527559, 25),
                      height: Math.max((settings.footer?.signatureHeight ?? 10) * scale * 3.779527559, 20),
                      fontSize: Math.max(10 * scale, 7),
                      minWidth: '25px',
                      minHeight: '20px'
                    }}
                  >
                    {settings.images?.signature ? (
                      <img
                        src={settings.images.signature}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center">Dr. Signature</span>
                    )}
                  </div>
                  <div 
                    className="text-center text-gray-700 mt-1 space-y-0.5"
                    style={{ fontSize: Math.max(8 * scale, 6) }}
                  >
                    {settings.footer?.doctorName && (
                      <div className="font-semibold">{settings.footer.doctorName}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 relative z-10">
        <Button
          onClick={handlePreview}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button
          onClick={handlePrint}
          size="sm"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
};
