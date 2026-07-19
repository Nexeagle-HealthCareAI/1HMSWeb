import { ReceiptPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

export const buildReceiptA4 = (data: ReceiptPrintData, settings: PrintSettings): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const regularItems = (data.items ?? []).filter(i => !i.isExtraCharge);
    const extraCharges = (data.items ?? []).filter(i => i.isExtraCharge);

    const itemRows = regularItems.map((item, idx) => `
        <tr style="background:${idx % 2 ? '#f8fafc' : '#ffffff'};">
            <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:600; color:#0f172a;">${item.description}${item.period ? `<div style="font-size:8pt; font-weight:400; color:#64748b; margin-top:2px;">${item.period}</div>` : ''}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right;">${inr(item.rate)}</td>
            <td style="text-align:right; color:#b91c1c;">${item.discount > 0 ? '- ' + inr(item.discount) : '—'}</td>
            <td style="text-align:right; font-weight:700; color:#0f172a;">${inr(item.total)}</td>
        </tr>`).join('');

    const extraChargeRows = extraCharges.map((item, idx) => `
        <tr style="background:#fff7ed;">
            <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:600; color:#c2410c;">${item.description}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right;">${inr(item.rate)}</td>
            <td style="text-align:right; color:#b91c1c;">—</td>
            <td style="text-align:right; font-weight:700; color:#c2410c;">${inr(item.total)}</td>
        </tr>`).join('');
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Receipt - ${data.receiptNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10.5pt; }
            .accent { color: #047857; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #047857; padding-bottom: 14px; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 14px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .meta { text-align: right; font-size: 9pt; color: #475569; }
            .meta b { color: #0f172a; }
            .grid { display: flex; gap: 24px; margin-top: 22px; }
            .grid .col { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 3px; }
            .val { font-size: 10.5pt; color: #0f172a; font-weight: 600; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 20px; }
            table.items thead th { background: #047857; color: #fff; text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .6px; padding: 7px 8px; }
            table.items td { padding: 7px 8px; border-bottom: 1px solid #eef2f7; font-size: 9pt; }
            .item-totals { display: flex; justify-content: flex-end; margin-top: 10px; }
            .item-totals table { width: 260px; }
            .item-totals td { padding: 3px 0; font-size: 9pt; }
            .item-totals td.k { color: #64748b; }
            .item-totals td.v { text-align: right; font-weight: 600; color: #0f172a; }
            .item-totals .net td { border-top: 1px solid #e2e8f0; padding-top: 6px; font-weight: 800; color: #047857; }
            .amount-box { margin: 26px 0; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #6ee7b7; border-radius: 14px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
            .amount-box .ttl { font-size: 9pt; color: #047857; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
            .amount-box .amt { font-size: 26pt; font-weight: 800; color: #047857; }
            .rows { width: 100%; border-collapse: collapse; margin-top: 6px; }
            .rows td { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 9.5pt; }
            .rows td.k { color: #64748b; width: 42%; }
            .rows td.v { color: #0f172a; font-weight: 600; text-align: right; }
            .balwrap { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9.5pt; }
            .due { color: #b91c1c; font-weight: 800; }
            .sign { margin-top: 48px; display: flex; justify-content: flex-end; }
            .sign .line { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 6px; font-size: 8.5pt; color: #64748b; }
            .foot { margin-top: 30px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="head">
            <div>
                <h1 class="h-name">${settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? ` &nbsp;·&nbsp; ${settings.phone}` : ''}<br/>
                    ${settings.gstin ? `GSTIN: ${settings.gstin}` : ''}${settings.pan ? ` &nbsp;·&nbsp; PAN: ${settings.pan}` : ''}${settings.nabhNumber ? ` &nbsp;·&nbsp; NABH: ${settings.nabhNumber}` : ''}
                </p>
            </div>
            <div class="meta">
                <div class="badge">Payment Receipt</div>
                <div style="margin-top:10px;">Receipt&nbsp; <b>${data.receiptNo}</b></div>
                <div>${format(new Date(data.date), 'dd MMM yyyy, hh:mm a')}</div>
            </div>
        </div>

        <div class="grid">
            <div class="col">
                <div class="label">Received From</div>
                <div class="val">${data.patientName}</div>
                <div style="font-size:8.5pt; color:#64748b; margin-top:2px;">ID: ${data.patientId}</div>
            </div>
            <div class="col" style="text-align:right;">
                <div class="label">Against Invoice</div>
                <div class="val">${data.invoiceNo}</div>
            </div>
        </div>

        ${data.items && data.items.length > 0 ? `
        <table class="items">
            <thead>
                <tr>
                    <th style="width:28px; text-align:center;">#</th>
                    <th>Service</th>
                    <th style="text-align:center; width:44px;">Qty</th>
                    <th style="text-align:right; width:80px;">Rate</th>
                    <th style="text-align:right; width:80px;">Discount</th>
                    <th style="text-align:right; width:90px;">Amount</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>

        ${extraCharges.length > 0 ? `
        <div style="margin-top:16px;">
            <div style="font-size:7.5pt; text-transform:uppercase; letter-spacing:1px; color:#c2410c; font-weight:700; margin-bottom:4px;">Extra Charges</div>
            <table class="items" style="margin-top:0;">
                <thead>
                    <tr style="background:#ea580c;">
                        <th style="width:28px; text-align:center;">#</th>
                        <th>Service</th>
                        <th style="text-align:center; width:44px;">Qty</th>
                        <th style="text-align:right; width:80px;">Rate</th>
                        <th style="text-align:right; width:80px;">Discount</th>
                        <th style="text-align:right; width:90px;">Amount</th>
                    </tr>
                </thead>
                <tbody>${extraChargeRows}</tbody>
            </table>
        </div>` : ''}

        <div class="item-totals">
            <table>
                <tr><td class="k">Sub Total</td><td class="v">${inr(data.subTotal)}</td></tr>
                ${data.discountTotal > 0 ? `<tr><td class="k">Discount</td><td class="v" style="color:#b91c1c;">- ${inr(data.discountTotal)}</td></tr>` : ''}
                <tr class="net"><td class="k">Net Amount</td><td class="v">${inr(data.invoiceTotal)}</td></tr>
            </table>
        </div>` : ''}

        <div class="amount-box">
            <span class="ttl">Amount Received</span>
            <span class="amt">${inr(data.amount)}</span>
        </div>

        <table class="rows">
            <tr><td class="k">Payment Mode</td><td class="v">${data.mode}${data.transactionId ? ` &nbsp;(Ref: ${data.transactionId})` : ''}</td></tr>
            ${data.receivedBy ? `<tr><td class="k">Received By</td><td class="v">${data.receivedBy}</td></tr>` : ''}
            ${data.remarks ? `<tr><td class="k">Remarks</td><td class="v">${data.remarks}</td></tr>` : ''}
        </table>

        <div class="balwrap">
            <span style="color:#64748b;">Invoice balance before: <b style="color:#0f172a;">${inr(data.invoiceBalanceBefore)}</b></span>
            <span>Remaining due: <span class="due">${inr(data.invoiceBalanceAfter)}</span></span>
        </div>

        <div class="sign"><div class="line">Authorised Signatory</div></div>

        <div class="foot">${settings.footerText || 'This is a computer-generated receipt and does not require a physical signature.'}</div>
    </body>
    </html>
    `;
};
