import { PharmacyCreditNotePrintData, PharmacyPrintFields, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// Pharmacy Phase 3d — patient return refund slip. Mirrors receiptA4.ts's layout, statutory
// DL/FSSAI/pharmacist fields borrowed from the pharmacy receipt convention (pharmacyReceiptThermal80.ts).
export const buildPharmacyCreditNoteA4 = (
    data: PharmacyCreditNotePrintData,
    settings: PrintSettings,
    pharmacy: PharmacyPrintFields,
): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const itemRows = data.items.map((item, idx) => `
        <tr style="background:${idx % 2 ? '#fef2f2' : '#ffffff'};">
            <td style="text-align:center; color:#94a3b8;">${item.srNo}</td>
            <td style="font-weight:600; color:#0f172a;">${item.itemName}</td>
            <td style="text-align:center; font-family:monospace; font-size:8pt;">${item.batchNumber}</td>
            <td style="text-align:center;">${item.expiryDate ?? '—'}</td>
            <td style="text-align:center;">${item.returnedQty}</td>
            <td style="text-align:right;">${inr(item.unitPrice)}</td>
            <td style="text-align:right; font-weight:700; color:#0f172a;">${inr(item.refundAmount)}</td>
        </tr>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Return Credit Note - ${data.returnNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10.5pt; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b91c1c; padding-bottom: 14px; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .badge { display: inline-block; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 999px; padding: 4px 14px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .meta { text-align: right; font-size: 9pt; color: #475569; }
            .meta b { color: #0f172a; }
            .statutory { font-size: 7.5pt; color: #94a3b8; margin-top: 6px; line-height: 1.5; }
            .grid { display: flex; gap: 24px; margin-top: 22px; }
            .grid .col { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 3px; }
            .val { font-size: 10.5pt; color: #0f172a; font-weight: 600; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 20px; }
            table.items thead th { background: #b91c1c; color: #fff; text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .6px; padding: 7px 8px; }
            table.items td { padding: 7px 8px; border-bottom: 1px solid #eef2f7; font-size: 9pt; }
            .amount-box { margin: 26px 0; background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fca5a5; border-radius: 14px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
            .amount-box .ttl { font-size: 9pt; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .amount-box .amt { font-size: 26pt; font-weight: 800; color: #b91c1c; }
            .rows { width: 100%; border-collapse: collapse; margin-top: 6px; }
            .rows td { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 9.5pt; }
            .rows td.k { color: #64748b; width: 42%; }
            .rows td.v { color: #0f172a; font-weight: 600; text-align: right; }
            .sign { margin-top: 48px; display: flex; justify-content: flex-end; }
            .sign .line { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 6px; font-size: 8.5pt; color: #64748b; }
            .foot { margin-top: 30px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="head">
            <div>
                <h1 class="h-name">${pharmacy.tradeName || settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? ` &nbsp;·&nbsp; ${settings.phone}` : ''}<br/>
                    ${settings.gstin ? `GSTIN: ${settings.gstin}` : ''}
                </p>
                <p class="statutory">
                    ${pharmacy.dl20BNumber ? `DL 20B: ${pharmacy.dl20BNumber} &nbsp;` : ''}${pharmacy.dl21BNumber ? `DL 21B: ${pharmacy.dl21BNumber} &nbsp;` : ''}${pharmacy.fssaiNumber ? `FSSAI: ${pharmacy.fssaiNumber}` : ''}
                </p>
            </div>
            <div class="meta">
                <div class="badge">Return Credit Note</div>
                <div style="margin-top:10px;">Return&nbsp; <b>${data.returnNo}</b></div>
                <div>${format(new Date(data.returnedAt), 'dd MMM yyyy, hh:mm a')}</div>
            </div>
        </div>

        <div class="grid">
            <div class="col">
                <div class="label">Returned By / Patient</div>
                <div class="val">${data.patientName || 'Walk-in Customer'}</div>
                ${data.patientId ? `<div style="font-size:8.5pt; color:#64748b; margin-top:2px;">ID: ${data.patientId}</div>` : ''}
            </div>
            <div class="col" style="text-align:right;">
                <div class="label">Against Invoice</div>
                <div class="val">${data.invoiceNo}</div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:28px; text-align:center;">#</th>
                    <th>Medicine</th>
                    <th style="text-align:center; width:90px;">Batch</th>
                    <th style="text-align:center; width:70px;">Expiry</th>
                    <th style="text-align:center; width:50px;">Qty</th>
                    <th style="text-align:right; width:80px;">Rate</th>
                    <th style="text-align:right; width:90px;">Refund</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>

        <div class="amount-box">
            <span class="ttl">Total Refund</span>
            <span class="amt">${inr(data.totalRefundAmount)}</span>
        </div>

        <table class="rows">
            ${data.refundMode ? `<tr><td class="k">Refund Mode</td><td class="v">${data.refundMode}</td></tr>` : ''}
            ${data.returnedBy ? `<tr><td class="k">Processed By</td><td class="v">${data.returnedBy}</td></tr>` : ''}
            ${data.notes ? `<tr><td class="k">Notes</td><td class="v">${data.notes}</td></tr>` : ''}
        </table>

        ${pharmacy.returnPolicyText ? `<div class="statutory" style="margin-top:20px;">${pharmacy.returnPolicyText}</div>` : ''}

        <div class="sign"><div class="line">Authorised Signatory</div></div>

        <div class="foot">${settings.footerText || 'This is a computer-generated return note and does not require a physical signature.'}</div>
    </body>
    </html>
    `;
};
