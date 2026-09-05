import { InvoicePrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// 80mm thermal counterpart to invoiceA4.ts -- same data, condensed for a receipt printer instead
// of a full A4 sheet. Mirrors receiptThermal80.ts's layout conventions.
export const buildInvoiceThermal80 = (data: InvoicePrintData, settings: PrintSettings): string => {
    const money = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2);
    const regularItems = (data.items ?? []).filter(i => !i.isExtraCharge);
    const extraCharges = (data.items ?? []).filter(i => i.isExtraCharge);

    const itemRows = regularItems.map(item => `
        <div style="margin-bottom:4px;">
            <div class="row"><span>${item.description}</span><span>${money(item.total)}</span></div>
            <div style="font-size:7pt; color:#333;">${item.qty} x ${money(item.rate)}${item.discount > 0 ? ` &nbsp;(- ${money(item.discount)})` : ''}</div>
        </div>`).join('');

    const extraChargeRows = extraCharges.map(item => `
        <div style="margin-bottom:4px; font-weight:bold;">
            <div class="row"><span>${item.description}</span><span>${money(item.total)}</span></div>
        </div>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice - ${data.invoiceNo}</title>
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
            .big-amount { font-size: 14pt; font-weight: bold; margin: 8px 0; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="text-center">
            <div class="bold" style="font-size:11pt;">${settings.hospitalName}</div>
            <div style="font-size:7pt;">${settings.phone}</div>
            ${settings.gstin ? `<div style="font-size:7pt;">GSTIN: ${settings.gstin}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="text-center bold">INVOICE</div>
        <div class="divider"></div>

        <div class="row">
            <span class="label">Date:</span>
            <span>${format(new Date(data.date), 'dd-MM-yy HH:mm')}</span>
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
        ${extraCharges.length > 0 ? `
        <div class="divider" style="border-top:1px dotted #000; margin: 4px 0;"></div>
        <div class="label bold">Extra Charges</div>
        ${extraChargeRows}
        ` : ''}
        ` : ''}

        <div class="divider"></div>

        <div class="row"><span class="label">Sub Total:</span><span>${money(data.subTotal)}</span></div>
        ${data.discountTotal > 0 ? `<div class="row"><span class="label">Discount:</span><span>- ${money(data.discountTotal)}</span></div>` : ''}
        ${data.taxTotal > 0 ? `<div class="row"><span class="label">Tax:</span><span>${money(data.taxTotal)}</span></div>` : ''}

        <div class="divider"></div>

        <div class="text-center">
            <div class="label">GRAND TOTAL</div>
            <div class="big-amount">Rs. ${money(data.grandTotal)}</div>
        </div>

        <div class="divider"></div>

        <div class="row">
            <span class="label">Paid:</span>
            <span>${money(data.amountPaid)}</span>
        </div>
        <div class="row">
            <span class="label bold">Balance Due:</span>
            <span class="bold">${money(data.balanceDue)}</span>
        </div>

        <div class="divider"></div>
        <div class="text-center" style="font-size:8pt; margin-top:10px;">
            Thank You
        </div>
        <br/><br/>
    </body>
    </html>
    `;
};
