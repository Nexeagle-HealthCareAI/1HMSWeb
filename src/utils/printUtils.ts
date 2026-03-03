export const openPrintHtml = (htmlContent: string) => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("Pop-up blocked! Please allow pop-ups for this site.");
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close(); // necessary for IE >= 10
  printWindow.focus(); // necessary for IE >= 10*/

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    // Optional: close after print
    // printWindow.close(); 
  }, 500);
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
