import { InterimBillPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// Provisional, per-admission-day interim bill. NOT a tax invoice — it's a running
// statement of one billing day's charges plus the cumulative position to date.
export const buildInterimBillA4 = (data: InterimBillPrintData, settings: PrintSettings): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const rows = data.lines.map((item) => `
        <tr style="background:${item.srNo % 2 ? '#f8fafc' : '#ffffff'};">
            <td style="text-align:center; color:#94a3b8;">${item.srNo}</td>
            <td style="font-weight:600; color:#0f172a;">${item.description}</td>
            <td style="text-align:center; color:#64748b; font-size:8.5pt;">${item.serviceDate}</td>
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
        <title>Interim Bill - ${data.interimBillNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; position: relative; }
            .watermark { position: fixed; top: 44%; left: 50%; transform: translate(-50%,-50%) rotate(-24deg); font-size: 64pt; font-weight: 800; color: rgba(15,23,42,0.05); letter-spacing: 6px; z-index: 0; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 14px; position: relative; z-index: 1; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 16pt; font-weight: 800; color: #0f172a; letter-spacing: .5px; }
            .badge { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; margin-top: 6px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; position: relative; z-index: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .meta td { font-size: 9pt; padding: 2px 0; }
            .meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 20px; position: relative; z-index: 1; }
            table.items thead th { background: #0f172a; color: #fff; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .6px; padding: 9px 10px; }
            table.items td { padding: 9px 10px; border-bottom: 1px solid #eef2f7; font-size: 9.5pt; }
            .totals { display: flex; justify-content: flex-end; margin-top: 16px; position: relative; z-index: 1; }
            .totals table { width: 320px; }
            .totals td { padding: 5px 0; font-size: 9.5pt; }
            .totals td.k { color: #64748b; }
            .totals td.v { text-align: right; font-weight: 600; color: #0f172a; }
            .totals .day td { border-top: 2px solid #0f172a; padding-top: 9px; font-size: 11.5pt; font-weight: 800; }
            .totals .due td { border-top: 1px solid #e2e8f0; padding-top: 8px; font-weight: 800; }
            .totals .due td.v { color: ${data.balanceDue > 0 ? '#b91c1c' : '#047857'}; }
            .note { margin-top: 18px; font-size: 8pt; color: #94a3b8; line-height: 1.5; position: relative; z-index: 1; }
            .foot { margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 1; }
            .sign .line { border-top: 1px solid #94a3b8; width: 180px; padding-top: 6px; font-size: 8.5pt; color: #64748b; text-align: center; }
        </style>
    </head>
    <body>
        <div class="watermark">PROVISIONAL</div>
        <div class="head">
            <div>
                <h1 class="h-name">${settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? `<br/>${settings.phone}` : ''}${settings.email ? ` &nbsp;·&nbsp; ${settings.email}` : ''}<br/>
                    ${settings.gstin ? `GSTIN: ${settings.gstin}` : ''}${settings.nabhNumber ? ` &nbsp;·&nbsp; NABH: ${settings.nabhNumber}` : ''}
                </p>
            </div>
            <div class="title">
                <div class="t">INTERIM BILL</div>
                <div class="badge">Provisional · Day ${data.dayNumber}</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Patient</div>
                <div class="pname">${data.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${data.patientId}<br/>
                    ${data.ageGender ? `${data.ageGender}<br/>` : ''}
                    ${data.mobile ? `Mobile: ${data.mobile}` : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="meta" style="margin-left:auto;">
                    <tr><td class="k">Interim Bill No</td><td class="v">${data.interimBillNo}</td></tr>
                    ${data.admissionNo ? `<tr><td class="k">Admission</td><td class="v">${data.admissionNo}</td></tr>` : ''}
                    <tr><td class="k">Day</td><td class="v">Day ${data.dayNumber}</td></tr>
                    <tr><td class="k">Period</td><td class="v">${data.fromLabel} → ${data.toLabel}</td></tr>
                    <tr><td class="k">Printed</td><td class="v">${format(new Date(data.date), 'dd MMM yyyy HH:mm')}</td></tr>
                </table>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:34px; text-align:center;">#</th>
                    <th>Particular</th>
                    <th style="width:110px; text-align:center;">Service Date</th>
                    <th style="text-align:right; width:80px;">Rate</th>
                    <th style="text-align:center; width:44px;">Qty</th>
                    <th style="text-align:right; width:80px;">Disc</th>
                    <th style="text-align:right; width:96px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:24px;">No charges on this day.</td></tr>'}
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr class="day"><td>Day ${data.dayNumber} Charges</td><td style="text-align:right;">${inr(data.dayNet)}</td></tr>
                <tr><td class="k">Cumulative (to date)</td><td class="v">${inr(data.cumulativeNet)}</td></tr>
                <tr><td class="k">Advance / Received</td><td class="v" style="color:#047857;">${inr(data.advanceReceived)}</td></tr>
                <tr class="due"><td class="k">Balance Due</td><td class="v">${inr(data.balanceDue)}</td></tr>
            </table>
        </div>

        <div class="note">
            This is a <b>provisional interim bill</b> for the day shown and does not constitute a tax invoice.
            A consolidated tax invoice is issued at discharge. Charges, taxes and totals are subject to revision.
        </div>

        <div class="foot">
            <div style="font-size:7.5pt; color:#94a3b8; max-width:320px; line-height:1.5;">
                ${settings.footerText || 'Computer-generated interim bill.'}
            </div>
            <div class="sign"><div class="line">Authorised Signatory</div></div>
        </div>
    </body>
    </html>
    `;
};
