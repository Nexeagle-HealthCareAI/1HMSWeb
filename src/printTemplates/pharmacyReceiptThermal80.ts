import { PharmacyReceiptPrintData, PharmacyPrintFields, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// Pharmacy Phase 3b — statutory 80mm thermal receipt: DL 20B/21B, FSSAI, registered pharmacist and
// return policy footer (Drugs & Cosmetics Act requirements), plus per-line batch/expiry/HSN so a
// FEFO-split purchase is legible to the patient. Mirrors receiptThermal80.ts's layout conventions.
export const buildPharmacyReceiptThermal80 = (
    data: PharmacyReceiptPrintData,
    settings: PrintSettings,
    pharmacy: PharmacyPrintFields,
): string => {
    const money = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2);

    const itemRows = data.items.map(item => `
        <div style="margin-bottom:5px;">
            <div class="row"><span>${item.srNo}. ${item.itemName}</span><span>${money(item.total)}</span></div>
            <div style="font-size:7pt; color:#333;">
                ${item.batchNumber ? `Batch ${item.batchNumber}` : ''}${item.expiryDate ? ` · Exp ${item.expiryDate}` : ''}${item.hsnSacCode ? ` · HSN ${item.hsnSacCode}` : ''}
            </div>
            <div style="font-size:7pt; color:#333;">
                ${item.qty} x ${item.mrp != null ? money(item.mrp) : '-'}${item.gstPercent > 0 ? ` · GST ${item.gstPercent}%` : ''}${item.discountAmount > 0 ? ` &nbsp;(- ${money(item.discountAmount)})` : ''}
            </div>
        </div>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pharmacy Receipt</title>
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
            .statutory { font-size: 6.5pt; line-height: 1.3; }
            .big-amount { font-size: 14pt; font-weight: bold; margin: 8px 0; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="text-center">
            <div class="bold" style="font-size:11pt;">${pharmacy.tradeName || settings.hospitalName}</div>
            <div style="font-size:7pt;">${settings.address}</div>
            <div style="font-size:7pt;">${settings.phone}</div>
            ${settings.gstin ? `<div style="font-size:7pt;">GSTIN: ${settings.gstin}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="statutory text-center">
            ${pharmacy.dl20BNumber ? `DL 20B: ${pharmacy.dl20BNumber}<br/>` : ''}
            ${pharmacy.dl21BNumber ? `DL 21B: ${pharmacy.dl21BNumber}<br/>` : ''}
            ${pharmacy.fssaiNumber ? `FSSAI: ${pharmacy.fssaiNumber}<br/>` : ''}
            ${pharmacy.pharmacistName ? `Pharmacist: ${pharmacy.pharmacistName}${pharmacy.pharmacistRegNo ? ` (Reg. ${pharmacy.pharmacistRegNo})` : ''}` : ''}
        </div>
        <div class="divider"></div>

        <div class="row"><span class="label">Date:</span><span>${format(new Date(data.date), 'dd-MM-yy HH:mm')}</span></div>
        <div class="row"><span class="label">Invoice #:</span><span>${data.invoiceNo}</span></div>

        <div class="divider"></div>
        <div style="margin: 5px 0;">
            <div class="label">Patient:</div>
            <div class="bold">${data.patientName}${data.patientId ? ` (${data.patientId})` : ''}</div>
            ${data.mobile ? `<div style="font-size:7pt;">${data.mobile}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="label bold">Medicines</div>
        ${itemRows}

        <div class="divider"></div>
        <div class="row"><span class="label">Sub Total:</span><span>${money(data.subTotal)}</span></div>
        ${data.discountTotal > 0 ? `<div class="row"><span class="label">Discount:</span><span>- ${money(data.discountTotal)}</span></div>` : ''}
        ${data.taxTotal > 0 ? `<div class="row"><span class="label">GST:</span><span>${money(data.taxTotal)}</span></div>` : ''}

        <div class="divider"></div>
        <div class="text-center">
            <div class="label">NET PAYABLE</div>
            <div class="big-amount">Rs. ${money(data.grandTotal)}</div>
            <div style="font-size:8pt;">Paid ${money(data.amountPaid)} via ${data.paymentMode}</div>
        </div>

        ${pharmacy.returnPolicyText ? `
        <div class="divider"></div>
        <div class="statutory text-center">${pharmacy.returnPolicyText}</div>
        ` : ''}

        <div class="divider"></div>
        <div class="text-center" style="font-size:8pt; margin-top:6px;">Thank You</div>
        <br/><br/>
    </body>
    </html>
    `;
};
