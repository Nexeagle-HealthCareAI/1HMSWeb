import { InvoicePrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

export const buildInvoiceA4 = (data: InvoicePrintData, settings: PrintSettings): string => {
    const totalWords = "Five Hundred and Fifty Only"; // todo: implement number to words

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice - ${data.invoiceNo}</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            .hA { font-size: 22pt; font-weight: bold; color: #2c3e50; margin: 0; }
            .hSub { font-size: 10pt; color: #7f8c8d; margin: 5px 0 0; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .box { background: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #eee; }
            .label { font-size: 8pt; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 3px; }
            .value { font-size: 10pt; font-weight: 500; color: #2c3e50; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f4f6f7; padding: 10px; font-size: 9pt; font-weight: 600; border-bottom: 2px solid #ddd; color: #2c3e50; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 9.5pt; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-table { width: 300px; border-collapse: separate; border-spacing: 0 5px; }
            .totals-table td { border: none; padding: 3px 10px; }
            .total-row { font-weight: bold; font-size: 12pt; border-top: 2px solid #333; }
            .total-row td { padding-top: 10px; }
            
            .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #95a5a6; border-top: 1px solid #eee; padding-top: 10px; height: 30px; }
            .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(0,0,0,0.05); font-weight: bold; z-index: -1; pointer-events: none; border: 5px dashed rgba(0,0,0,0.05); padding: 20px; }
        </style>
    </head>
    <body>
        ${data.status !== 'FINAL' ? '<div class="watermark">ESTIMATE</div>' : ''}
        
        <div class="header">
            <h1 class="hA">${settings.hospitalName}</h1>
            <p class="hSub">${settings.address} | ${settings.phone}</p>
            ${settings.gstin ? `<p class="hSub">GSTIN: ${settings.gstin}</p>` : ''}
        </div>

        <div class="meta-grid">
            <div class="box">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <div class="label">Patient Name</div>
                        <div class="value">${data.patientName}</div>
                    </div>
                    <div>
                        <div class="label">Patient ID</div>
                        <div class="value">${data.patientId}</div>
                    </div>
                     <div>
                        <div class="label">Age / Sex</div>
                        <div class="value">${data.ageGender}</div>
                    </div>
                     <div>
                        <div class="label">Dr.</div>
                        <div class="value">${data.doctorName}</div>
                    </div>
                </div>
            </div>
             <div class="box">
                 <div style="display:grid; grid-template-columns: 1fr; gap:10px;">
                    <div>
                        <div class="label">Invoice No</div>
                        <div class="value" style="font-size:12pt; font-weight:bold;">${data.invoiceNo}</div>
                    </div>
                    <div>
                        <div class="label">Date</div>
                        <div class="value">${format(new Date(data.date), 'dd MMM yyyy, hh:mm a')}</div>
                    </div>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">#</th>
                    <th>Description</th>
                    <th class="text-right" style="width: 80px;">Rate</th>
                    <th class="text-center" style="width: 60px;">Qty</th>
                    <th class="text-right" style="width: 80px;">Disc</th>
                    <th class="text-right" style="width: 100px;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map((item, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${item.description}</td>
                    <td class="text-right">${item.rate.toFixed(2)}</td>
                    <td class="text-center">${item.qty}</td>
                    <td class="text-right">${item.discount > 0 ? item.discount.toFixed(2) : '-'}</td>
                    <td class="text-right">${item.total.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="text-right label">Sub Total</td>
                    <td class="text-right value">${data.subTotal.toFixed(2)}</td>
                </tr>
                 <tr>
                    <td class="text-right label">Discount</td>
                    <td class="text-right value">-${data.discountTotal.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td class="text-right">Grand Total</td>
                    <td class="text-right">₹ ${data.grandTotal.toFixed(2)}</td>
                </tr>
                 <tr>
                    <td class="text-right label" style="padding-top:10px;">Amount Paid</td>
                    <td class="text-right value" style="padding-top:10px;">${data.amountPaid.toFixed(2)}</td>
                </tr>
                  <tr>
                    <td class="text-right label">Balance Due</td>
                    <td class="text-right value" style="color: ${data.balanceDue > 0 ? '#e74c3c' : '#2ecc71'}">₹ ${data.balanceDue.toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin-top:20px; font-size:9pt;">
            <div class="label">Amount in Words</div>
            <div class="value" style="font-style:italic;">${totalWords}</div>
        </div>

        <div class="footer">
            ${settings.footerText || 'Computer Generated Invoice'}
        </div>
    </body>
    </html>
    `;
};
