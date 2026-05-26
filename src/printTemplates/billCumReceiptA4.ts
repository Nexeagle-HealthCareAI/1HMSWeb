import { BillCumReceiptPrintData, PrintSettings } from '../types/print';
import { buildInvoiceA4 } from './invoiceA4';
import { buildReceiptA4 } from './receiptA4';

export const buildBillCumReceiptA4 = (data: BillCumReceiptPrintData, settings: PrintSettings): string => {
    // Basic implementation: Concatenate invoice and receipt with a page break or visual separator
    // For a cleaner approach, standard Bill-Cum-Receipts are often Invoices with a "Payment Details" footer.
    // Let's create a custom hybrid layout.

    // leveraging buildInvoiceA4 but injecting receipt info? 
    // Or just putting both on one page if small enough, or distinct sections.
    // Let's do distinct sections on one A4 if possible, or 2 pages.
    // A better text might be to reuse the logic but style it as one doc.

    return `
    <!DOCTYPE html>
    <html>
    <head>
         <title>Invoice-Cum-Receipt</title>
         <style>
             @page { size: A4; margin: 10mm; }
             body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; color: #333; }
             .container { display: flex; flex-direction: column; height: 100%; }
             .section { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
             .header { text-align: center; margin-bottom: 20px; }
             .h1 { font-size: 16pt; font-weight: bold; margin: 0; }
             .separator { border-bottom: 2px dashed #bbb; margin: 20px 0; position: relative; }
             .separator::after { content: 'CUT HERE'; position: absolute; left: 50%; top: -10px; background: #fff; padding: 0 10px; color: #999; font-size: 8pt; transform: translateX(-50%); }
         </style>
    </head>
    <body>
        
        <div class="header">
             <h1 class="h1">${settings.hospitalName}</h1>
             <p>${settings.address}</p>
             <p style="font-size: 8pt; color: #666;">
                ${settings.gstin ? `<span style="margin-right:10px;">GSTIN: ${settings.gstin}</span>` : ''}
                ${settings.pan ? `<span style="margin-right:10px;">PAN: ${settings.pan}</span>` : ''}
                ${settings.nabhNumber ? `<span style="margin-right:10px;">NABH/NABL No.: ${settings.nabhNumber}</span>` : ''}
             </p>
             <h3>INVOICE CUM RECEIPTS</h3>
        </div>

        <!-- Upper Half: Invoice Summary -->
        <div class="section">
             <h4>INVOICE PORTION - #${data.invoice.invoiceNo}</h4>
             <table style="width:100%">
                <tr>
                    <td><strong>Patient:</strong> ${data.invoice.patientName}</td>
                    <td style="text-align:right"><strong>Date:</strong> ${data.invoice.date.split('T')[0]}</td>
                </tr>
                 <tr>
                    <td colspan="2"><br/>
                        <strong>Total Bill:</strong> ₹ ${data.invoice.grandTotal}<br/>
                        <strong>Amount Paid (Total):</strong> ₹ ${data.invoice.amountPaid}<br/>
                        <strong>Balance Due:</strong> ₹ ${data.invoice.balanceDue}
                    </td>
                </tr>
             </table>
        </div>

        <div class="separator"></div>

        <!-- Lower Half: Current Receipt -->
        <div class="section" style="background-color:#f9f9f9;">
             <h4>RECEIPT PORTION - #${data.receipt.receiptNo}</h4>
             <table style="width:100%">
                 <tr>
                    <td><strong>Received From:</strong> ${data.receipt.patientName}</td>
                    <td style="text-align:right"><strong>Date:</strong> ${data.receipt.date.split('T')[0]}</td>
                </tr>
                <tr>
                    <td colspan="2" style="font-size:14pt; padding: 20px 0; text-align:center;">
                        Received with thanks details of <strong>₹ ${data.receipt.amount}</strong> via ${data.receipt.mode}
                    </td>
                </tr>
                <tr>
                    <td><small>Received By: ${data.receipt.receivedBy}</small></td>
                    <td style="text-align:right"><small>Authorized Signatory</small></td>
                </tr>
             </table>
        </div>

        <div style="text-align:center; font-size:8pt; margin-top:50px;">
            This is a computer generated document.
        </div>
    </body>
    </html>
    `;
};
