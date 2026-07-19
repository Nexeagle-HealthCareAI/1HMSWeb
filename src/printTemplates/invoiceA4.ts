import { InvoicePrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

export const buildInvoiceA4 = (data: InvoicePrintData, settings: PrintSettings): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const statusMap: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
        FINAL: { label: 'Paid / Final', bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
        OPEN: { label: 'Estimate', bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
        CANCELLED: { label: 'Cancelled', bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
    };
    const st = statusMap[data.status] ?? statusMap.OPEN;

    const regularItems = data.items.filter(i => !i.isExtraCharge);
    const extraCharges = data.items.filter(i => i.isExtraCharge);

    const rows = regularItems.map((item, idx) => `
        <tr style="background:${idx % 2 ? '#f8fafc' : '#ffffff'};">
            <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:600; color:#0f172a;">${item.description}${item.period ? `<div style="font-size:8pt; font-weight:400; color:#64748b; margin-top:2px;">📅 ${item.period}</div>` : ''}</td>
            <td style="text-align:right;">${inr(item.rate)}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right; color:#b91c1c;">${item.discount > 0 ? '- ' + inr(item.discount) : '—'}</td>
            <td style="text-align:right; font-weight:700; color:#0f172a;">${inr(item.total)}</td>
        </tr>`).join('');

    const extraChargeRows = extraCharges.map((item, idx) => `
        <tr style="background:#fff7ed;">
            <td style="text-align:center; color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:600; color:#c2410c;">${item.description}</td>
            <td style="text-align:right;">${inr(item.rate)}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right; color:#b91c1c;">—</td>
            <td style="text-align:right; font-weight:700; color:#c2410c;">${inr(item.total)}</td>
        </tr>`).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Invoice - ${data.invoiceNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; position: relative; }
            .watermark { position: fixed; top: 42%; left: 50%; transform: translate(-50%,-50%) rotate(-24deg); font-size: 70pt; font-weight: 800; color: rgba(79,70,229,0.06); letter-spacing: 6px; z-index: 0; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; position: relative; z-index: 1; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 17pt; font-weight: 800; color: #4f46e5; letter-spacing: 1px; }
            .badge { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; background: ${st.bg}; color: ${st.fg}; border: 1px solid ${st.bd}; margin-top: 6px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; position: relative; z-index: 1; }
            .parties .box { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .inv-meta td { font-size: 9pt; padding: 2px 0; }
            .inv-meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .inv-meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 22px; position: relative; z-index: 1; }
            table.items thead th { background: #4f46e5; color: #fff; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .6px; padding: 9px 10px; }
            table.items thead th:first-child { border-top-left-radius: 8px; }
            table.items thead th:last-child { border-top-right-radius: 8px; }
            table.items td { padding: 9px 10px; border-bottom: 1px solid #eef2f7; font-size: 9.5pt; }
            .totals { display: flex; justify-content: flex-end; margin-top: 16px; position: relative; z-index: 1; }
            .totals table { width: 300px; }
            .totals td { padding: 5px 0; font-size: 9.5pt; }
            .totals td.k { color: #64748b; }
            .totals td.v { text-align: right; font-weight: 600; color: #0f172a; }
            .totals .grand td { border-top: 2px solid #4f46e5; padding-top: 10px; font-size: 13pt; font-weight: 800; color: #4f46e5; }
            .totals .paid td.v { color: #047857; }
            .totals .due td { border-top: 1px solid #e2e8f0; padding-top: 8px; font-weight: 800; }
            .totals .due td.v { color: ${data.balanceDue > 0 ? '#b91c1c' : '#047857'}; }
            .foot { margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; }
            .terms { font-size: 7.5pt; color: #94a3b8; max-width: 320px; line-height: 1.5; }
            .sign { text-align: center; }
            .sign .line { border-top: 1px solid #94a3b8; width: 180px; padding-top: 6px; font-size: 8.5pt; color: #64748b; }
        </style>
    </head>
    <body>
        ${data.status !== 'FINAL' ? '<div class="watermark">ESTIMATE</div>' : ''}
        <div class="head">
            <div>
                <h1 class="h-name">${settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? `<br/>${settings.phone}` : ''}${settings.email ? ` &nbsp;·&nbsp; ${settings.email}` : ''}<br/>
                    ${settings.gstin ? `GSTIN: ${settings.gstin}` : ''}${settings.pan ? ` &nbsp;·&nbsp; PAN: ${settings.pan}` : ''}${settings.nabhNumber ? ` &nbsp;·&nbsp; NABH: ${settings.nabhNumber}` : ''}
                </p>
            </div>
            <div class="title">
                <div class="t">TAX INVOICE</div>
                <div class="badge">${st.label}</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Billed To</div>
                <div class="pname">${data.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${data.patientId}<br/>
                    ${data.ageGender ? `${data.ageGender}<br/>` : ''}
                    ${data.mobile ? `Mobile: ${data.mobile}` : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="inv-meta" style="margin-left:auto;">
                    <tr><td class="k">Invoice No</td><td class="v">${data.invoiceNo}</td></tr>
                    <tr><td class="k">Date</td><td class="v">${format(new Date(data.date), 'dd MMM yyyy')}</td></tr>
                    ${data.doctorName ? `<tr><td class="k">Doctor</td><td class="v">${data.doctorName}</td></tr>` : ''}
                    ${data.department ? `<tr><td class="k">Department</td><td class="v">${data.department}</td></tr>` : ''}
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

        ${extraCharges.length > 0 ? `
        <div style="margin-top:22px; position:relative; z-index:1;">
            <div style="font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#c2410c; font-weight:700; margin-bottom:6px;">Extra Charges</div>
            <table class="items" style="margin-top:0;">
                <thead>
                    <tr style="background:#ea580c;">
                        <th style="width:36px; text-align:center;">#</th>
                        <th>Description</th>
                        <th style="text-align:right; width:90px;">Rate</th>
                        <th style="text-align:center; width:50px;">Qty</th>
                        <th style="text-align:right; width:90px;">Discount</th>
                        <th style="text-align:right; width:100px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${extraChargeRows}
                </tbody>
            </table>
        </div>` : ''}

        <div class="totals">
            <table>
                <tr><td class="k">Sub Total</td><td class="v">${inr(data.subTotal)}</td></tr>
                ${data.discountTotal > 0 ? `<tr><td class="k">Discount</td><td class="v" style="color:#b91c1c;">- ${inr(data.discountTotal)}</td></tr>` : ''}
                ${data.taxTotal > 0 ? `<tr><td class="k">GST</td><td class="v">${inr(data.taxTotal)}</td></tr>` : ''}
                <tr class="grand"><td>Grand Total</td><td style="text-align:right;">${inr(data.grandTotal)}</td></tr>
            </table>
        </div>

        ${data.dayWise && data.dayWise.length > 0 ? `
        <div style="margin-top:22px; position:relative; z-index:1;">
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
                    ${data.dayWise.map(d => `<tr>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; font-weight:600; color:#0f172a;">Day ${d.dayNumber}</td>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:8.5pt; color:#64748b;">${d.label}</td>
                        <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; text-align:right; font-weight:700; color:#0f172a;">${inr(d.netAmount)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div class="foot">
            <div class="terms">
                ${settings.footerText || 'Thank you for choosing us. This is a computer-generated tax invoice.'}
            </div>
            <div class="sign"><div class="line">Authorised Signatory</div></div>
        </div>
    </body>
    </html>
    `;
};
