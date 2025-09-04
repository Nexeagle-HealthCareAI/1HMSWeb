import React from 'react';
import { A4_WIDTH_MM, A4_HEIGHT_MM, mmToPx } from '../../utils/mm';
import { TemplateState } from '../../types/prescription';

interface A4PreviewProps {
  state: TemplateState;
}

export const A4Preview: React.FC<A4PreviewProps> = ({ state }) => {
  const {
    layoutMode,
    headerHtml,
    footerHtml,
    headerHeightMm,
    footerHeightMm,
    minContentHeightMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    signatureDataUrl,
    signatureWidthMm,
    signatureAnchor,
    zoomPct
  } = state;

  // Calculate available space for content
  const availableHeight = A4_HEIGHT_MM - marginTopMm - marginBottomMm;
  const headerSpace = layoutMode === 'header' ? headerHeightMm : 0;
  const footerSpace = layoutMode === 'footer' ? footerHeightMm : 0;
  const contentSpace = availableHeight - headerSpace - footerSpace;
  
  // Check if content space is sufficient
  const contentHeight = Math.max(contentSpace, minContentHeightMm);
  const adjustedHeaderHeight = layoutMode === 'header' && contentSpace < minContentHeightMm 
    ? Math.max(0, headerHeightMm - (minContentHeightMm - contentSpace))
    : headerHeightMm;
  const adjustedFooterHeight = layoutMode === 'footer' && contentSpace < minContentHeightMm 
    ? Math.max(0, footerHeightMm - (minContentHeightMm - contentSpace))
    : footerHeightMm;

  const showAdjustmentWarning = (layoutMode === 'header' && adjustedHeaderHeight < headerHeightMm) ||
                               (layoutMode === 'footer' && adjustedFooterHeight < footerHeightMm);

  // Convert mm to px for rendering
  const pageWidthPx = mmToPx(A4_WIDTH_MM);
  const pageHeightPx = mmToPx(A4_HEIGHT_MM);
  const marginTopPx = mmToPx(marginTopMm);
  const marginRightPx = mmToPx(marginRightMm);
  const marginBottomPx = mmToPx(marginBottomMm);
  const marginLeftPx = mmToPx(marginLeftMm);
  const headerHeightPx = mmToPx(adjustedHeaderHeight);
  const footerHeightPx = mmToPx(adjustedFooterHeight);
  const contentHeightPx = mmToPx(contentHeight);
  const signatureWidthPx = mmToPx(signatureWidthMm);

  // Calculate signature position
  const getSignatureStyle = () => {
    if (!signatureDataUrl) return { display: 'none' };
    
    const rightOffset = marginRightPx + 5; // 5px from margin
    const width = signatureWidthPx;
    
    if (signatureAnchor === 'top-right') {
      const topOffset = marginTopPx + headerHeightPx + 5; // 5px below header
      return {
        position: 'absolute' as const,
        top: topOffset,
        right: rightOffset,
        width: width,
        height: 'auto'
      };
    } else {
      const bottomOffset = marginBottomPx + footerHeightPx + 5; // 5px above footer
      return {
        position: 'absolute' as const,
        bottom: bottomOffset,
        right: rightOffset,
        width: width,
        height: 'auto'
      };
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        A4 Preview ({zoomPct}%)
      </div>
      
      {showAdjustmentWarning && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          ⚠️ Adjusted region height to maintain minimum content area
        </div>
      )}
      
      <div className="overflow-auto max-h-[80vh] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
        <div
          className="relative bg-white dark:bg-gray-900 shadow-lg"
          style={{
            width: pageWidthPx,
            height: pageHeightPx,
            transform: `scale(${zoomPct / 100})`,
            transformOrigin: 'top left',
            padding: `${marginTopPx}px ${marginRightPx}px ${marginBottomPx}px ${marginLeftPx}px`
          }}
        >
          {/* Safe margin guides */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: '1px dashed rgba(156, 163, 175, 0.3)',
              margin: `-${marginTopPx}px -${marginRightPx}px -${marginBottomPx}px -${marginLeftPx}px`
            }}
          />
          
          {/* Header region */}
          {layoutMode === 'header' && (
            <div
              className="border-b border-gray-200 dark:border-gray-700 pb-2"
              style={{ height: headerHeightPx, minHeight: headerHeightPx }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: headerHtml }}
                className="text-sm"
              />
            </div>
          )}
          
          {/* Content area */}
          <div
            className="flex-1"
            style={{ 
              minHeight: contentHeightPx,
              height: contentHeightPx
            }}
          >
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              Content Area
              <br />
              <span className="text-xs">(Min height: {minContentHeightMm}mm)</span>
            </div>
          </div>
          
          {/* Footer region */}
          {layoutMode === 'footer' && (
            <div
              className="border-t border-gray-200 dark:border-gray-700 pt-2"
              style={{ height: footerHeightPx, minHeight: footerHeightPx }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: footerHtml }}
                className="text-sm"
              />
            </div>
          )}
          
          {/* Signature */}
          {signatureDataUrl && (
            <img
              src={signatureDataUrl}
              alt="Signature"
              style={getSignatureStyle()}
              className="object-contain"
            />
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Page size: {A4_WIDTH_MM}mm × {A4_HEIGHT_MM}mm
      </div>
    </div>
  );
};
