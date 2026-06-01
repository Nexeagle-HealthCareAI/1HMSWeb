import { BillCumReceiptPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// Invoice-cum-receipt: the FULL itemised invoice (line items, discounts, GST, totals, and the
// day-wise breakup for admitted patients) followed by a clear "Payment Received" section — so the
// patient gets one document showing exactly what was charged and what was paid.
export const buildBillCumReceiptA4 = (data: BillCumReceiptPrintData, settings: PrintSettings): string => {
    const inv = data.invoice;
    const rcpt = data.receipt;
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const rows = inv.items.map((item, idx) => `
        <tr style="background:${idx % 2 ? '#f8fafc' : '#ffffff'};">
            <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:600; color:#0f172a;">${item.description}${item.period ? `<div style="font-size:8pt; font-weight:400; color:#64748b; margin-top:2px;">📅 ${item.period}</div>` : ''}</td>
            <td style="text-align:right;">${inr(item.rate)}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right; color:#b91c1c;">${item.discount > 0 ? '- ' + inr(item.discount) : '—'}</td>
            <td style="text-align:right; font-weight:700; color:#0f172a;">${inr(item.total)}</td>
        </tr>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Invoice cum Receipt - ${inv.invoiceNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 16pt; font-weight: 800; color: #4f46e5; letter-spacing: .5px; }
            .badge { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; margin-top: 6px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .meta td { font-size: 9pt; padding: 2px 0; }
            .meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 22px; }
            table.items thead th { background: #4f46e5; color: #fff; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .6px; padding: 9px 10px; }
            table.items td { padding: 9px 10px; border-bottom: 1px solid #eef2f7; font-size: 9.5pt; }
            .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
            .totals table { width: 300px; }
            .totals td { padding: 5px 0; font-size: 9.5pt; }
            .totals td.k { color: #64748b; }
            .totals td.v { text-align: right; font-weight: 600; color: #0f172a; }
            .totals .grand td { border-top: 2px solid #4f46e5; padding-top: 10px; font-size: 13pt; font-weight: 800; color: #4f46e5; }
            .totals .paid td.v { color: #047857; }
            .totals .due td { border-top: 1px solid #e2e8f0; padding-top: 8px; font-weight: 800; }
            .totals .due td.v { color: ${inv.balanceDue > 0 ? '#b91c1c' : '#047857'}; }
            .receipt { margin-top: 26px; border: 1px solid #a7f3d0; border-radius: 10px; overflow: hidden; }
            .receipt .r-head { background: #ecfdf5; padding: 8px 14px; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #047857; display: flex; justify-content: space-between; }
            .receipt .r-body { padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
            .receipt .r-amt { font-size: 15pt; font-weight: 800; color: #047857; }
            .receipt .r-meta { font-size: 8.5pt; color: #64748b; line-height: 1.6; text-align: right; }
            .foot { margin-top: 34px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .terms { font-size: 7.5pt; color: #94a3b8; max-width: 320px; line-height: 1.5; }
            .sign .line { border-top: 1px solid #94a3b8; width: 180px; padding-top: 6px; font-size: 8.5pt; color: #64748b; text-align: center; }
        </style>
    </head>
    <body>
        <div class="head">
            <div>
                <h1 class="h-name">${settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? `<br/>${settings.phone}` : ''}${settings.email ? ` &nbsp;·&nbsp; ${settings.email}` : ''}<br/>
                    ${settings.gstin ? `GSTIN: ${settings.gstin}` : ''}${settings.pan ? ` &nbsp;·&nbsp; PAN: ${settings.pan}` : ''}${settings.nabhNumber ? ` &nbsp;·&nbsp; NABH: ${settings.nabhNumber}` : ''}
                </p>
            </div>
            <div class="title">
                <div class="t">INVOICE CUM RECEIPT</div>
                <div class="badge">${inv.balanceDue > 0 ? 'Part Paid' : 'Paid'}</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Billed To</div>
                <div class="pname">${inv.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${inv.patientId}<br/>
                    ${inv.ageGender ? `${inv.ageGender}<br/>` : ''}
                    ${inv.mobile ? `Mobile: ${inv.mobile}` : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="meta" style="margin-left:auto;">
                    <tr><td class="k">Invoice No</td><td class="v">${inv.invoiceNo}</td></tr>
                    <tr><td class="k">Date</td><td class="v">${format(new Date(inv.date), 'dd MMM yyyy')}</td></tr>
                    ${inv.doctorName ? `<tr><td class="k">Doctor</td><td class="v">${inv.doctorName}</td></tr>` : ''}
                    ${inv.department ? `<tr><td class="k">Department</td><td class="v">${inv.department}</td></tr>` : ''}
                </table>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:36px; text-align:center;">#</th>
                    <th>Description</th>
                    <th style="text-align:right; width:90px;">Rate</th>
                    <th style="text-align:center; width:50px;">Qty</th>
                    <th style="text-align:right; width:90px;">Discount</th>
                    <th style="text-align:right; width:100px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:24px;">No charges on this invoice.</td></tr>'}
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr><td class="k">Sub Total</td><td class="v">${inr(inv.subTotal)}</td></tr>
                ${inv.discountTotal > 0 ? `<tr><td class="k">Discount</td><td class="v" style="color:#b91c1c;">- ${inr(inv.discountTotal)}</td></tr>` : ''}
                ${inv.taxTotal > 0 ? `<tr><td class="k">GST</td><td class="v">${inr(inv.taxTotal)}</td></tr>` : ''}
                <tr class="grand"><td>Grand Total</td><td style="text-align:right;">${inr(inv.grandTotal)}</td></tr>
                <tr class="paid"><td class="k">Amount Paid</td><td class="v">${inr(inv.amountPaid)}</td></tr>
                <tr class="due"><td class="k">Balance Due</td><td class="v">${inr(inv.balanceDue)}</td></tr>
            </table>
        </div>

        ${inv.dayWise && inv.dayWise.length > 0 ? `
        <div style="margin-top:22px;">
            <div style="font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-bottom:6px;">Day-wise Breakup</div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="text-align:left; background:#f1f5f9; color:#475569; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px;">Day</th>
                        <th style="text-align:left; background:#f1f5f9; color:#475569; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px;">Period</th>
                        <th style="text-align:right; background:#f1f5f9; color:#475569; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.dayWise.map(d => `<tr>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; font-weight:600; color:#0f172a;">Day ${d.dayNumber}</td>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:8.5pt; color:#64748b;">${d.label}</td>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; text-align:right; font-weight:700; color:#0f172a;">${inr(d.netAmount)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <!-- Payment received -->
        <div class="receipt">
            <div class="r-head">
                <span>Payment Received</span>
                <span>Receipt No: ${rcpt.receiptNo}</span>
            </div>
            <div class="r-body">
                <div>
                    <div class="r-amt">${inr(rcpt.amount)}</div>
                    <div style="font-size:8pt; color:#64748b; margin-top:2px;">Received with thanks via ${rcpt.mode}${rcpt.transactionId ? ` · Txn ${rcpt.transactionId}` : ''}</div>
                </div>
                <div class="r-meta">
                    Date: ${format(new Date(rcpt.date), 'dd MMM yyyy HH:mm')}<br/>
                    Balance after payment: <b>${inr(rcpt.invoiceBalanceAfter)}</b><br/>
                    ${rcpt.receivedBy ? `Received by: ${rcpt.receivedBy}` : ''}
                </div>
            </div>
        </div>

        <div class="foot">
            <div class="terms">
                ${settings.footerText || 'Thank you for choosing us. This is a computer-generated invoice-cum-receipt.'}
            </div>
            <div class="sign"><div class="line">Authorised Signatory</div></div>
        </div>
    </body>
    </html>
    `;
};
