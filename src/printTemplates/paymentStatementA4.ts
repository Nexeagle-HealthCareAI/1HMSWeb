import { PaymentStatementPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

// A consolidated payment statement: lists every payment/refund recorded against an
// invoice (each with its own receipt number) plus the running totals. Used when a bill
// is settled across multiple steps.
export const buildPaymentStatementA4 = (data: PaymentStatementPrintData, settings: PrintSettings): string => {
    const rows = data.payments.map(p => {
        const isRefund = (p.type ?? '').toUpperCase() === 'REFUND';
        const sign = isRefund ? '-' : '';
        const color = isRefund ? '#c0392b' : '#27ae60';
        return `
            <tr>
                <td style="text-align:center;">${p.srNo}</td>
                <td>${format(new Date(p.date), 'dd MMM yyyy, hh:mm a')}</td>
                <td style="font-family:monospace;">${p.receiptNo || '—'}</td>
                <td>${p.mode || '—'}</td>
                <td>${p.type || 'PAYMENT'}</td>
                <td style="text-align:right; font-weight:600; color:${color};">${sign}₹ ${Math.abs(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Statement - ${data.invoiceNo}</title>
        <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
            .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #eee; padding-bottom: 14px; }
            .hA { font-size: 22pt; font-weight: bold; color: #2c3e50; margin: 0; }
            .hSub { font-size: 9pt; color: #7f8c8d; margin: 4px 0 0; }
            .title { font-size: 15pt; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
            .meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; font-size: 9.5pt; }
            .meta .label { color: #7f8c8d; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f5f3ff; color: #4f46e5; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .5px; padding: 8px; border-bottom: 2px solid #e9e5ff; }
            td { padding: 8px; border-bottom: 1px solid #f0f0f0; font-size: 9.5pt; }
            .totals { margin-top: 18px; margin-left: auto; width: 280px; font-size: 10pt; }
            .totals .row { display: flex; justify-content: space-between; padding: 5px 0; }
            .totals .grand { border-top: 2px solid #ddd; margin-top: 6px; padding-top: 10px; font-weight: bold; font-size: 12pt; }
            .due { color: #c0392b; } .paid { color: #27ae60; }
            .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #95a5a6; }
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

        <div class="title">Payment Statement</div>
        <div class="meta">
            <div>
                <div><span class="label">Patient:</span> <strong>${data.patientName}</strong> (${data.patientId})</div>
                ${data.ageGender ? `<div><span class="label">Age/Sex:</span> ${data.ageGender}</div>` : ''}
                ${data.mobile ? `<div><span class="label">Mobile:</span> ${data.mobile}</div>` : ''}
            </div>
            <div style="text-align:right;">
                <div><span class="label">Invoice:</span> ${data.invoiceNo}</div>
                <div><span class="label">Date:</span> ${format(new Date(data.date), 'dd MMM yyyy')}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="text-align:center; width:40px;">#</th>
                    <th>Date</th>
                    <th>Receipt No.</th>
                    <th>Mode</th>
                    <th>Type</th>
                    <th style="text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows || `<tr><td colspan="6" style="text-align:center; color:#999; padding:20px;">No payments recorded.</td></tr>`}
            </tbody>
        </table>

        <div class="totals">
            <div class="row"><span>Invoice Total</span><span>₹ ${data.invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div class="row"><span>Total Received</span><span class="paid">₹ ${data.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div class="row grand"><span>Balance Due</span><span class="${data.balanceDue > 0 ? 'due' : 'paid'}">₹ ${Math.abs(data.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${data.balanceDue < 0 ? ' CR' : ''}</span></div>
        </div>

        <div class="footer">
            ${settings.footerText || 'This is a computer-generated payment statement.'}
        </div>
    </body>
    </html>
    `;
};
