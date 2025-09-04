/**
 * Print utilities for thermal printer receipts
 */

/**
 * Prints a specific DOM element via an invisible iframe
 */
export const printElement = (element: HTMLElement, cssText: string): void => {
  // Create invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }
  
  // Write content to iframe
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>${cssText}</style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();
  
  // Wait for content to load, then print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.print();
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      // Clean up iframe after printing
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };
  
  // Fallback cleanup
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 5000);
};

/**
 * Returns CSS optimized for thermal printer receipts
 * @param widthMm - Width in millimeters (58mm or 80mm)
 */
export const receiptCss = (widthMm: number = 58): string => {
  const widthPx = Math.round((widthMm * 203) / 25.4); // Convert mm to pixels at 203 DPI
  
  return `
    @page {
      size: ${widthMm}mm auto;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      width: ${widthPx}px;
      margin: 0 auto;
      background: white;
      color: black;
    }
    
    .receipt {
      width: 100%;
      padding: 8px 4px;
      text-align: center;
    }
    
    .hospital-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .counter-info {
      font-size: 11px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #000;
      padding-bottom: 6px;
    }
    
    .token-number {
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
      letter-spacing: 1px;
    }
    
    .section {
      margin: 6px 0;
      text-align: left;
      padding: 0 4px;
    }
    
    .section-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
    }
    
    .section-value {
      font-size: 12px;
      font-weight: bold;
      margin-top: 2px;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    
    .timestamp {
      font-size: 10px;
      color: #666;
      margin-top: 8px;
    }
    
    .qr-code {
      margin: 8px auto;
      text-align: center;
    }
    
    .qr-code img {
      max-width: 100px;
      height: auto;
    }
    
    .visit-id {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
    }
  `;
};
