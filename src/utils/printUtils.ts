// Opens a blank tab immediately — call this SYNCHRONOUSLY, as the first thing inside a click
// handler, before any `await`. Browsers only treat window.open() as a direct, un-blockable
// response to a user gesture when it runs before the handler yields to the event loop; once an
// async caller has awaited anything (e.g. an API call for extra print data), a later window.open()
// can be treated as a background popup and silently blocked or opened as an empty/blank tab.
export const openBlankPrintWindow = (): Window | null => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups for this site.");
    return null;
  }
  printWindow.document.write(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">Preparing document…</body></html>'
  );
  return printWindow;
};

// Writes the final HTML into a tab already opened via openBlankPrintWindow() and prints it.
export const writeAndPrint = (printWindow: Window, htmlContent: string) => {
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close(); // necessary for IE >= 10
  printWindow.focus(); // necessary for IE >= 10

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    // Optional: close after print
    // printWindow.close();
  }, 500);
};

// Convenience wrapper for callers with the HTML ready synchronously (no async work in between).
export const openPrintHtml = (htmlContent: string) => {
  const printWindow = openBlankPrintWindow();
  if (!printWindow) return;
  writeAndPrint(printWindow, htmlContent);
};

export const openPreviewHtml = (htmlContent: string) => {
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.document.write(htmlContent);
    previewWindow.document.close();
  } else {
    alert("Pop-up blocked! Please allow pop-ups for this site.");
  }
};

// Renders a full HTML document (e.g. an A4 print template) into an off-screen iframe,
// rasterizes it with html2canvas, and saves it as a paginated A4 PDF via jsPDF.
export const downloadHtmlAsPdf = async (htmlContent: string, filename: string): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '794px';   // ~A4 width at 96dpi
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Could not create print frame.');
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give images / fonts a moment to load before rasterizing.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
};
