import React, { useMemo, useState } from 'react';
import { usePrescriptionStore } from '@/store/prescription';
import { mmToPx, A4_WIDTH_MM, A4_HEIGHT_MM } from '@/utils/units';
import { Button } from '@/components/ui/button';
import { Printer, Eye, Grid3X3, Ruler, Maximize2, RotateCcw, Download, Settings, Square, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface A4PreviewProps {
  className?: string;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ className = '' }) => {
  const { settings } = usePrescriptionStore();
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showMargins, setShowMargins] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Ensure settings are properly initialized
  if (!settings || !settings.page || !settings.header || !settings.footer || !settings.font) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="bg-gray-100 p-4 rounded-lg w-full max-w-sm">
          <div className="text-xs text-gray-500 mb-2 text-center">
            Loading preview...
          </div>
          <div className="bg-white border-2 border-gray-300 shadow-lg mx-auto relative flex flex-col" style={{ width: '53mm', height: '74mm' }}>
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

  // Calculate enhanced scale for better A4 preview visualization
  const scale = useMemo(() => {
    const baseContainerWidth = isFullscreen ? 800 : 600; // Even larger base container for 50/50 layout
    const baseContainerHeight = isFullscreen ? 1000 : 700; // Even larger base container for 50/50 layout
    
    const containerWidth = baseContainerWidth * zoomLevel;
    const containerHeight = baseContainerHeight * zoomLevel;
    
    const a4WidthPx = mmToPx(A4_WIDTH_MM);
    const a4HeightPx = mmToPx(A4_HEIGHT_MM);
    
    const scaleX = containerWidth / a4WidthPx;
    const scaleY = containerHeight / a4HeightPx;
    
    // Enhanced scale calculation with better visibility
    const calculatedScale = Math.min(scaleX, scaleY, 2.0); // Max 200% scale
    return Math.max(calculatedScale, 0.4); // Minimum 40% scale for better visibility
  }, [isFullscreen, zoomLevel]);

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
                height: ${settings.useLetterhead ? (settings.letterhead?.headerHeight ?? 30) : (settings.header?.height ?? 20)}mm; 
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
                height: ${settings.useLetterhead ? (settings.letterhead?.footerHeight ?? 20) : (settings.footer?.height ?? 15)}mm; 
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
                ${settings.useLetterhead ? 
                  `<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background-color: #f3f4f6; position: relative;">
                    <div style="position: absolute; inset: 0; opacity: 0.3; background-image: repeating-linear-gradient(45deg, #333, #333 3px, transparent 3px, transparent 12px);"></div>
                    <div style="text-align: center; color: #6b7280; z-index: 10;">
                      <div style="font-size: 12px; font-weight: 500;">Header Disabled</div>
                      <div style="font-size: 10px;">Using default template</div>
                    </div>
                  </div>` : 
                  ''
                }
                ${!settings.useLetterhead && settings.header?.showImage && settings.images?.header ? 
                  `<img src="${settings.images.header}" alt="Header" />` : 
                  ''
                }
                ${!settings.useLetterhead && settings.header?.showText ? 
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
                ${settings.useLetterhead ? 
                  `<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background-color: #f3f4f6; position: relative;">
                    <div style="position: absolute; inset: 0; opacity: 0.3; background-image: repeating-linear-gradient(45deg, #333, #333 3px, transparent 3px, transparent 12px);"></div>
                    <div style="text-align: center; color: #6b7280; z-index: 10;">
                      <div style="font-size: 12px; font-weight: 500;">Footer Disabled</div>
                      <div style="font-size: 10px;">Using default template</div>
                    </div>
                  </div>` : 
                  `<div class="flex-1">
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
                          'Signature'
                        }
                      </div>
                      <div style="text-align: center; font-size: 10px; margin-top: 2px; color: #666; line-height: 1.2;">
                        ${settings.footer?.doctorName ? `<div style="font-weight: bold;">${settings.footer.doctorName}</div>` : ''}
                      </div>` : 
                      ''
                    }
                  </div>`
                }
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
      {/* Enhanced A4 Preview */}
      <div className={`relative bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl w-full shadow-lg border border-gray-200 ${isFullscreen ? 'max-w-none' : 'max-w-2xl'}`}>
        {/* Enhanced Preview Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
                <p className="text-xs text-gray-500">Real-time prescription preview</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3 w-3 text-gray-600" />
                </button>
                <span className="text-xs text-gray-600 px-2 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(2.0, zoomLevel + 0.1))}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3 w-3 text-gray-600" />
                </button>
              </div>
              
              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <Maximize2 className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Enhanced Status Bar */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-700 font-medium">Live Preview</span>
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Scale:</span> {Math.round(scale * 100)}% • 
                  <span className="font-medium"> Size:</span> {Math.round(A4_WIDTH_MM)}×{Math.round(A4_HEIGHT_MM)}mm
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Zoom:</span> {Math.round(zoomLevel * 100)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600 font-medium">A4 Standard</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Controls */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">View Options</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRulers(true);
                  setShowGrid(false);
                  setShowMargins(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset View
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                Reset Zoom
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowRulers(!showRulers)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                showRulers 
                  ? 'bg-purple-100 text-purple-700 border border-purple-300 shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Ruler className="h-3 w-3" />
              Rulers
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                showGrid 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Grid3X3 className="h-3 w-3" />
              Grid
            </button>
            <button
              onClick={() => setShowMargins(!showMargins)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                showMargins 
                  ? 'bg-green-100 text-green-700 border border-green-300 shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Square className="h-3 w-3" />
              Margins
            </button>
          </div>
        </div>

        <div className="relative bg-white rounded-lg p-4 shadow-inner border border-gray-200">
          {/* Horizontal Ruler */}
          {showRulers && (
            <div 
              className="absolute top-0 left-0 right-0 h-4 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-1 text-xs text-gray-600 z-40"
              style={{ height: `${16 * scale}px` }}
            >
            {/* Simplified ruler markings - only major divisions */}
            {Array.from({ length: Math.ceil(a4Width / 50) + 1 }, (_, i) => {
              const position = i * 50 * scale;
              const mm = i * 50;
              return (
                <div key={i} className="absolute flex flex-col items-center" style={{ left: `${position}px` }}>
                  <div 
                    className="bg-gray-500"
                    style={{ 
                      width: '1px', 
                      height: '8px',
                      marginTop: '2px'
                    }}
                  />
                  <div 
                    className="text-xs font-medium text-gray-600 mt-1"
                    style={{ fontSize: `${Math.max(7 * scale, 5)}px` }}
                  >
                    {mm}
                  </div>
                </div>
              );
            })}
            <div className="absolute right-1 top-1 text-xs text-gray-500" style={{ fontSize: `${Math.max(6 * scale, 4)}px` }}>
              {Math.round(a4Width)}mm
            </div>
            </div>
          )}

          {/* Vertical Ruler */}
          {showRulers && (
            <div 
              className="absolute top-0 left-0 bottom-0 w-4 bg-gray-100 border-r border-gray-300 flex flex-col items-center justify-between py-1 text-xs text-gray-600 z-40"
              style={{ width: `${16 * scale}px` }}
            >
            {/* Simplified ruler markings - only major divisions */}
            {Array.from({ length: Math.ceil(a4Height / 50) + 1 }, (_, i) => {
              const position = i * 50 * scale;
              const mm = i * 50;
              return (
                <div key={i} className="absolute flex flex-row items-center" style={{ top: `${position}px` }}>
                  <div 
                    className="bg-gray-500"
                    style={{ 
                      height: '1px', 
                      width: '8px',
                      marginLeft: '2px'
                    }}
                  />
                  <div 
                    className="text-xs font-medium text-gray-600 ml-1 transform -rotate-90 origin-center"
                    style={{ fontSize: `${Math.max(7 * scale, 5)}px` }}
                  >
                    {mm}
                  </div>
                </div>
              );
            })}
            <div className="absolute bottom-1 left-1 text-xs text-gray-500 transform -rotate-90 origin-center" style={{ fontSize: `${Math.max(6 * scale, 4)}px` }}>
              {Math.round(a4Height)}mm
            </div>
            </div>
          )}

          {/* Grid Overlay */}
          {showGrid && (
            <div 
              className="absolute inset-0 pointer-events-none z-10 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #ccc 1px, transparent 1px),
                  linear-gradient(to bottom, #ccc 1px, transparent 1px)
                `,
                backgroundSize: `${10 * scale}px ${10 * scale}px`,
                marginTop: showRulers ? `${16 * scale}px` : '0px',
                marginLeft: showRulers ? `${16 * scale}px` : '0px'
              }}
            />
          )}


          <div
            className="bg-white border-2 border-gray-300 shadow-2xl relative flex flex-col rounded-lg overflow-hidden"
            style={{
              width: Math.max(a4Width, 53), // Minimum width of 53mm
              height: Math.max(a4Height, 74), // Minimum height of 74mm
              minWidth: '53mm',
              minHeight: '74mm',
              padding: `${(settings.page?.margin?.top ?? 20) * scale}px ${(settings.page?.margin?.right ?? 20) * scale}px ${(settings.page?.margin?.bottom ?? 20) * scale}px ${(settings.page?.margin?.left ?? 20) * scale}px`,
              boxSizing: 'border-box',
              position: 'relative',
              marginTop: showRulers ? `${16 * scale}px` : '0px',
              marginLeft: showRulers ? `${16 * scale}px` : '0px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
          {/* Enhanced Margin Visualization */}
          {showMargins && (
            <div className="absolute inset-0 pointer-events-none">
              {settings.page?.margin && typeof settings.page.margin === 'object' && (
              <>
                {/* Top margin area with ruler */}
                <div 
                  className="absolute bg-blue-50 opacity-40 border-b-2 border-dashed border-blue-400"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${(settings.page.margin.top ?? 15) * scale}px`,
                  }}
                >
                  {/* Top margin ruler line */}
                  <div 
                    className="absolute bg-blue-500 opacity-70"
                    style={{
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                    }}
                  />
                  {/* Top margin label */}
                  <div 
                    className="absolute bg-blue-600 text-white text-xs font-medium px-1 py-0.5 rounded shadow-sm"
                    style={{
                      top: '2px',
                      left: '2px',
                      fontSize: `${Math.max(8 * scale, 6)}px`,
                    }}
                  >
                    {settings.page.margin.top ?? 15}mm
                  </div>
                </div>
                
                {/* Bottom margin area with ruler */}
                <div 
                  className="absolute bg-blue-50 opacity-40 border-t-2 border-dashed border-blue-400"
                  style={{
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${(settings.page.margin.bottom ?? 15) * scale}px`,
                  }}
                >
                  {/* Bottom margin ruler line */}
                  <div 
                    className="absolute bg-blue-500 opacity-70"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                    }}
                  />
                  {/* Bottom margin label */}
                  <div 
                    className="absolute bg-blue-600 text-white text-xs font-medium px-1 py-0.5 rounded shadow-sm"
                    style={{
                      bottom: '2px',
                      right: '2px',
                      fontSize: `${Math.max(8 * scale, 6)}px`,
                    }}
                  >
                    {settings.page.margin.bottom ?? 15}mm
                  </div>
                </div>
                
                {/* Left margin area with ruler */}
                <div 
                  className="absolute bg-blue-50 opacity-40 border-r-2 border-dashed border-blue-400"
                  style={{
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${(settings.page.margin.left ?? 15) * scale}px`,
                  }}
                >
                  {/* Left margin ruler line */}
                  <div 
                    className="absolute bg-blue-500 opacity-70"
                    style={{
                      top: 0,
                      bottom: 0,
                      right: 0,
                      width: '2px',
                    }}
                  />
                  {/* Left margin label */}
                  <div 
                    className="absolute bg-blue-600 text-white text-xs font-medium px-1 py-0.5 rounded shadow-sm transform -rotate-90 origin-center"
                    style={{
                      top: '50%',
                      left: '2px',
                      transform: 'translateY(-50%) rotate(-90deg)',
                      fontSize: `${Math.max(8 * scale, 6)}px`,
                    }}
                  >
                    {settings.page.margin.left ?? 15}mm
                  </div>
                </div>
                
                {/* Right margin area with ruler */}
                <div 
                  className="absolute bg-blue-50 opacity-40 border-l-2 border-dashed border-blue-400"
                  style={{
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: `${(settings.page.margin.right ?? 15) * scale}px`,
                  }}
                >
                  {/* Right margin ruler line */}
                  <div 
                    className="absolute bg-blue-500 opacity-70"
                    style={{
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: '2px',
                    }}
                  />
                  {/* Right margin label */}
                  <div 
                    className="absolute bg-blue-600 text-white text-xs font-medium px-1 py-0.5 rounded shadow-sm transform rotate-90 origin-center"
                    style={{
                      top: '50%',
                      right: '2px',
                      transform: 'translateY(-50%) rotate(90deg)',
                      fontSize: `${Math.max(8 * scale, 6)}px`,
                    }}
                  >
                    {settings.page.margin.right ?? 15}mm
                  </div>
                </div>

                {/* Content area indicator */}
                <div 
                  className="absolute bg-green-50 opacity-30 border-2 border-green-300 border-dashed"
                  style={{
                    top: `${(settings.page.margin.top ?? 15) * scale}px`,
                    left: `${(settings.page.margin.left ?? 15) * scale}px`,
                    right: `${(settings.page.margin.right ?? 15) * scale}px`,
                    bottom: `${(settings.page.margin.bottom ?? 15) * scale}px`,
                  }}
                >
                  {/* Content area label */}
                  <div 
                    className="absolute bg-green-600 text-white text-xs font-medium px-2 py-1 rounded shadow-sm"
                    style={{
                      top: '4px',
                      left: '4px',
                      fontSize: `${Math.max(9 * scale, 7)}px`,
                    }}
                  >
                    Content Area
                  </div>
                </div>
              </>
              )}
            </div>
          )}
          {/* Header */}
          <div
            className="border-b border-gray-200 flex items-center justify-center relative overflow-hidden flex-shrink-0"
            style={{ 
              height: Math.max((settings.useLetterhead ? (settings.letterhead?.headerHeight ?? 30) : (settings.header?.height ?? 20)) * scale * 3.779527559, 30),
              minHeight: '30px'
            }}
          >
            {settings.useLetterhead ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      #333,
                      #333 3px,
                      transparent 3px,
                      transparent 12px
                    )`
                  }}
                />
                <div className="text-center text-gray-500 z-10">
                  <div className="text-sm font-medium" style={{ fontSize: Math.max(10 * scale, 8) }}>
                    Header Disabled
                  </div>
                  <div className="text-xs" style={{ fontSize: Math.max(8 * scale, 6) }}>
                    Using default template
                  </div>
                </div>
              </div>
            ) : (
              <>
                {(!settings.header?.showImage && !settings.header?.showText) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          #666,
                          #666 2px,
                          transparent 2px,
                          transparent 8px
                        )`
                      }}
                    />
                    <div className="text-center text-gray-500 z-10">
                      <div className="text-sm font-medium" style={{ fontSize: Math.max(10 * scale, 8) }}>
                        Header Disabled
                      </div>
                      <div className="text-xs" style={{ fontSize: Math.max(8 * scale, 6) }}>
                        Enable header image or text
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </>
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
              height: Math.max((settings.useLetterhead ? (settings.letterhead?.footerHeight ?? 20) : (settings.footer?.height ?? 15)) * scale * 3.779527559, 40),
              minHeight: '40px',
              padding: `${2.5 * scale}px ${5 * scale}px`
            }}
          >
            {settings.useLetterhead ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      #333,
                      #333 3px,
                      transparent 3px,
                      transparent 12px
                    )`
                  }}
                />
                <div className="text-center text-gray-500 z-10">
                  <div className="text-sm font-medium" style={{ fontSize: Math.max(10 * scale, 8) }}>
                    Footer Disabled
                  </div>
                  <div className="text-xs" style={{ fontSize: Math.max(8 * scale, 6) }}>
                    Using default template
                  </div>
                </div>
              </div>
            ) : (
              <>
                {(!settings.footer?.showImage && !settings.footer?.showText && !settings.footer?.showSignature) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          #666,
                          #666 2px,
                          transparent 2px,
                          transparent 8px
                        )`
                      }}
                    />
                    <div className="text-center text-gray-500 z-10">
                      <div className="text-sm font-medium" style={{ fontSize: Math.max(10 * scale, 8) }}>
                        Footer Disabled
                      </div>
                      <div className="text-xs" style={{ fontSize: Math.max(8 * scale, 6) }}>
                        Enable footer image, text, or signature
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                              <span className="text-center">Signature</span>
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
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

        {/* Enhanced Action Buttons */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-700">Actions</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Settings className="h-3 w-3" />
              <span>Quick Actions</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePreview}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-9 text-xs font-medium border-gray-300 hover:bg-gray-50"
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="flex items-center gap-2 h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Printer className="h-3 w-3" />
              Print
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 h-8 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Download className="h-3 w-3" />
              Export PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 h-8 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
