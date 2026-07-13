import { ReceiptPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

export const buildReceiptThermal80 = (data: ReceiptPrintData, settings: PrintSettings): string => {
    const money = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2);
    const itemRows = (data.items ?? []).map(item => `
        <div style="margin-bottom:4px;">
            <div class="row"><span>${item.description}</span><span>${money(item.total)}</span></div>
            <div style="font-size:7pt; color:#333;">${item.qty} x ${money(item.rate)}${item.discount > 0 ? ` &nbsp;(- ${money(item.discount)})` : ''}</div>
        </div>`).join('');
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt - Thermo</title>
        <style>
            @page { size: 80mm auto; margin: 2mm; }
            body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 76mm; 
                font-size: 9pt; 
                line-height: 1.2; 
                color: #000;
                margin: 0 auto;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .label { font-size: 8pt; }
            .big-amount { font-size: 16pt; font-weight: bold; margin: 10px 0; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="text-center">
            <div class="bold" style="font-size:11pt;">${settings.hospitalName}</div>
            <div style="font-size:7pt;">${settings.phone}</div>
            ${settings.gstin ? `<div style="font-size:7pt;">GSTIN: ${settings.gstin}</div>` : ''}
            ${settings.pan ? `<div style="font-size:7pt;">PAN: ${settings.pan}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="text-center bold">PAYMENT RECEIPT</div>
         <div class="divider"></div>

        <div class="row">
            <span class="label">Date:</span>
            <span>${format(new Date(data.date), 'dd-MM-yy HH:mm')}</span>
        </div>
        <div class="row">
            <span class="label">Rcpt #:</span>
            <span>${data.receiptNo}</span>
        </div>
         <div class="row">
            <span class="label">Inv #:</span>
            <span>${data.invoiceNo}</span>
        </div>
        
        <div class="divider"></div>

        <div style="margin: 5px 0;">
             <div class="label">Patient:</div>
             <div class="bold">${data.patientName} (${data.patientId})</div>
        </div>

        ${data.items && data.items.length > 0 ? `
        <div class="divider"></div>
        <div class="label bold">Services</div>
        ${itemRows}
        <div class="row"><span class="label">Sub Total:</span><span>${money(data.subTotal)}</span></div>
        ${data.discountTotal > 0 ? `<div class="row"><span class="label">Discount:</span><span>- ${money(data.discountTotal)}</span></div>` : ''}
        ` : ''}

        <div class="divider"></div>

        <div class="text-center">
            <div class="label">AMOUNT RECEIVED</div>
            <div class="big-amount">Rs. ${data.amount}</div>
            <div>${data.mode} ${data.transactionId ? ` / ${data.transactionId.slice(-4)}` : ''}</div>
        </div>

        <div class="divider"></div>
        
        <div class="row">
            <span class="label">Prev Bal:</span>
            <span>${data.invoiceBalanceBefore}</span>
        </div>
        <div class="row">
            <span class="label bold">Curr Due:</span>
            <span class="bold">${data.invoiceBalanceAfter}</span>
        </div>
        
        <div class="divider"></div>
        <div class="text-center" style="font-size:8pt; margin-top:10px;">
            Received By: ${data.receivedBy}<br/>
            Thank You
        </div>
        <br/><br/>
    </body>
    </html>
    `;
};
