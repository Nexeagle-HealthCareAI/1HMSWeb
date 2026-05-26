import { ReceiptPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

export const buildReceiptA4 = (data: ReceiptPrintData, settings: PrintSettings): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt - ${data.receiptNo}</title>
        <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            .hA { font-size: 22pt; font-weight: bold; color: #2c3e50; margin: 0; }
            .hSub { font-size: 10pt; color: #7f8c8d; margin: 5px 0 0; }
            .box { border: 1px solid #ddd; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            
            .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px dashed #ddd; padding-bottom: 15px; }
            .title { font-size: 18pt; font-weight: bold; color: #2ecc71; text-transform: uppercase; }
            
            .row { display: flex; margin-bottom: 12px; }
            .label { width: 140px; font-weight: 600; color: #7f8c8d; }
            .value { flex: 1; font-weight: 500; color: #2c3e50; border-bottom: 1px dotted #eee; padding-bottom: 2px;}

            .amount-box { background: #f0fdf4; padding: 15px; border-radius: 6px; text-align: center; margin: 30px 0; border: 1px dashed #2ecc71; }
            .amount-val { font-size: 24pt; font-weight: bold; color: #2ecc71; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 8pt; color: #95a5a6; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="hA">${settings.hospitalName}</h1>
            <p class="hSub">${settings.address} | ${settings.phone}</p>
            <p class="hSub">
            ${settings.gstin ? `<span style="margin-right:15px;">GSTIN: ${settings.gstin}</span>` : ''}
            ${settings.pan ? `<span style="margin-right:15px;">PAN: ${settings.pan}</span>` : ''}
            ${settings.nabhNumber ? `<span style="margin-right:15px;">NABH/NABL No.: ${settings.nabhNumber}</span>` : ''}
            </p>
        </div>

        <div class="box">
            <div class="title-row">
                <div class="title">Payment Receipt</div>
                <div style="text-align:right;">
                    <div style="font-size:10pt; font-weight:bold;">${data.receiptNo}</div>
                    <div style="font-size:9pt; color:#777;">${format(new Date(data.date), 'dd MMM yyyy, hh:mm a')}</div>
                </div>
            </div>

            <div class="row">
                <div class="label">Received From</div>
                <div class="value"><strong>${data.patientName}</strong> (${data.patientId})</div>
            </div>
             <div class="row">
                <div class="label">Against Invoice</div>
                <div class="value">${data.invoiceNo}</div>
            </div>
            
            <div class="amount-box">
                <div style="font-size:10pt; color:#27ae60; margin-bottom:5px;">AMOUNT RECEIVED</div>
                <div class="amount-val">₹ ${data.amount.toLocaleString()}.00</div>
            </div>

            <div class="row">
                <div class="label">Payment Mode</div>
                <div class="value">${data.mode} ${data.transactionId ? `(Ref: ${data.transactionId})` : ''}</div>
            </div>
             <div class="row">
                <div class="label">Received By</div>
                <div class="value">${data.receivedBy}</div>
            </div>
            ${data.remarks ? `
             <div class="row">
                <div class="label">Remarks</div>
                <div class="value">${data.remarks}</div>
            </div>` : ''}

            <div style="margin-top:30px; font-size:9pt; color:#777; border-top:1px solid #eee; padding-top:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <span>Previous Invoice Balance: ₹ ${data.invoiceBalanceBefore.toFixed(2)}</span>
                    <span style="font-weight:bold;">Remaining Due: ₹ ${data.invoiceBalanceAfter.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            ${settings.footerText || 'Thank you.'}
        </div>
    </body>
    </html>
    `;
};
