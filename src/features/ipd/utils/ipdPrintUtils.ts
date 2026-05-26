import { format } from 'date-fns';
import { IPDBill, DischargeCertificate, DischargeCondition } from '../types';

const CONDITION_LABEL: Record<DischargeCondition, string> = {
    STABLE: 'Stable',
    IMPROVED: 'Improved',
    RECOVERED: 'Fully Recovered',
    REFERRED: 'Referred to Higher Centre',
    LAMA: 'Left Against Medical Advice (LAMA)',
    EXPIRED: 'Expired',
};

const HOSPITAL_NAME = 'EasyHMS Hospital'; // TODO: pull from settings
const HOSPITAL_ADDRESS = 'Medical Complex, Health Nagar, India';
const HOSPITAL_PHONE = '+91-000-000-0000';

// ─── Common Styles ─────────────────────────────────────────────────────────────

const BASE_STYLES = `
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 9.5pt;
        line-height: 1.5;
        color: #1e293b;
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 12px;
        border-bottom: 2px solid #4f46e5;
        margin-bottom: 18px;
    }
    .hospital-name { font-size: 18pt; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
    .hospital-sub { font-size: 8.5pt; color: #64748b; margin-top: 3px; }
    .doc-title {
        text-align: right;
    }
    .doc-title h2 { font-size: 14pt; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title .doc-no { font-size: 8pt; color: #94a3b8; margin-top: 3px; }
    .section-label {
        font-size: 7.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #4f46e5;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
        margin-bottom: 10px;
        margin-top: 16px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .info-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 2px; }
    .info-value { font-size: 10pt; font-weight: 600; color: #1e293b; }
    .info-value.accent { color: #4f46e5; }
    table { width: 100%; border-collapse: collapse; }
    th {
        background: #f1f5f9;
        padding: 8px 10px;
        font-size: 8pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
        text-align: left;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 9pt; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer-sig {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-top: 50px;
    }
    .sig-box { border-top: 1.5px solid #1e293b; padding-top: 6px; }
    .sig-label { font-size: 8pt; color: #64748b; font-weight: 600; }
    .watermark {
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 60pt;
        font-weight: 900;
        color: rgba(79,70,229,0.05);
        letter-spacing: 4px;
        pointer-events: none;
        z-index: -1;
    }
    .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 8pt;
        font-weight: 700;
    }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef9c3; color: #854d0e; }
    .badge-blue  { background: #dbeafe; color: #1d4ed8; }
    .badge-red   { background: #fee2e2; color: #991b1b; }
    .badge-indigo { background: #e0e7ff; color: #3730a3; }
    @media print {
        .no-print { display: none; }
    }
`;

// ─── IPD Bill ─────────────────────────────────────────────────────────────────

export const buildIPDBillA4 = (bill: IPDBill): string => {
    const admDate = format(new Date(bill.admissionDate), 'dd MMM yyyy');
    const disDate = bill.dischargeDate ? format(new Date(bill.dischargeDate), 'dd MMM yyyy') : 'Ongoing';
    const printDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
    const isInterim = bill.status === 'INTERIM';

    const itemRows = bill.items.map((item, i) => {
        const gross = item.qty * item.rate;
        const disc = (gross * item.discountPct) / 100;
        return `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div style="font-weight:600;">${item.description}</div>
                <div style="font-size:8pt;color:#94a3b8;">${item.category}</div>
            </td>
            <td class="text-right">₹${item.rate.toLocaleString('en-IN')}</td>
            <td class="text-center">${item.qty}</td>
            <td class="text-right">${item.discountPct > 0 ? `${item.discountPct}%` : '—'}</td>
            <td class="text-right" style="font-weight:600;">₹${item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
        </tr>`;
    }).join('');

    const paymentRows = bill.payments.map(p => `
        <tr>
            <td>${format(new Date(p.date), 'dd MMM yyyy')}</td>
            <td>${p.mode}</td>
            <td>${p.transactionRef ?? '—'}</td>
            <td>${p.receivedBy}</td>
            <td class="text-right" style="font-weight:600;color:#166534;">₹${p.amount.toLocaleString('en-IN')}</td>
        </tr>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>IPD Bill – ${bill.billNo}</title>
    <style>${BASE_STYLES}
        .totals-wrap { display: flex; justify-content: flex-end; margin: 16px 0; }
        .totals-table { width: 260px; }
        .totals-table td { border-bottom: none; padding: 4px 8px; font-size: 9.5pt; }
        .totals-table .grand td { border-top: 2px solid #1e293b; font-size: 12pt; font-weight: 800; padding-top: 8px; }
        .totals-table .balance td { color: ${bill.balanceDue > 0 ? '#dc2626' : '#166534'}; font-weight: 700; }
    </style>
</head>
<body>
    ${isInterim ? '<div class="watermark">INTERIM</div>' : ''}

    <div class="header">
        <div>
            <div class="hospital-name">${HOSPITAL_NAME}</div>
            <div class="hospital-sub">${HOSPITAL_ADDRESS}<br>${HOSPITAL_PHONE}</div>
        </div>
        <div class="doc-title">
            <h2>IPD Bill</h2>
            <div class="doc-no">${bill.billNo}</div>
            <div class="doc-no" style="margin-top:4px;">Printed: ${printDate}</div>
            <div style="margin-top:6px;">
                <span class="badge ${isInterim ? 'badge-amber' : 'badge-green'}">${isInterim ? 'INTERIM' : 'FINAL'}</span>
            </div>
        </div>
    </div>

    <div class="grid-2">
        <div class="info-box">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <div class="info-label">Patient</div>
                    <div class="info-value">${bill.patientName}</div>
                </div>
                <div>
                    <div class="info-label">Patient ID</div>
                    <div class="info-value accent">${bill.patientId}</div>
                </div>
                <div>
                    <div class="info-label">Attending Doctor</div>
                    <div class="info-value">${bill.attendingDoctor}</div>
                </div>
                <div>
                    <div class="info-label">Ward / Bed</div>
                    <div class="info-value">${bill.wardName} / ${bill.bedNumber}</div>
                </div>
            </div>
        </div>
        <div class="info-box">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                    <div class="info-label">Admission Date</div>
                    <div class="info-value">${admDate}</div>
                </div>
                <div>
                    <div class="info-label">Discharge Date</div>
                    <div class="info-value">${disDate}</div>
                </div>
                <div>
                    <div class="info-label">Length of Stay</div>
                    <div class="info-value accent">${bill.los} day${bill.los !== 1 ? 's' : ''}</div>
                </div>
                <div>
                    <div class="info-label">Bill No.</div>
                    <div class="info-value accent">${bill.billNo}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section-label">Charges Breakdown</div>
    <table>
        <thead>
            <tr>
                <th style="width:30px;">#</th>
                <th>Description</th>
                <th class="text-right" style="width:90px;">Rate</th>
                <th class="text-center" style="width:50px;">Qty</th>
                <th class="text-right" style="width:60px;">Disc</th>
                <th class="text-right" style="width:90px;">Amount</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>

    <div class="totals-wrap">
        <table class="totals-table">
            <tr><td>Sub Total</td><td class="text-right">₹${bill.subTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><td>Discount</td><td class="text-right" style="color:#dc2626;">− ₹${bill.discountTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr class="grand"><td>Grand Total</td><td class="text-right">₹${bill.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><td>Total Paid</td><td class="text-right" style="color:#166534;">₹${bill.totalPaid.toLocaleString('en-IN')}</td></tr>
            <tr class="balance"><td>Balance Due</td><td class="text-right">₹${bill.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
        </table>
    </div>

    ${bill.payments.length > 0 ? `
    <div class="section-label">Payment History</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Transaction Ref.</th>
                <th>Received By</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
    </table>` : ''}

    <div class="footer-sig">
        <div class="sig-box">
            <div class="sig-label">Patient / Attendant Signature</div>
        </div>
        <div class="sig-box" style="text-align:right;">
            <div class="sig-label">Authorised Signatory</div>
            <div style="font-size:8.5pt;color:#64748b;margin-top:2px;">${HOSPITAL_NAME}</div>
        </div>
    </div>

    <div style="margin-top:20px;text-align:center;font-size:7.5pt;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:10px;">
        This is a computer-generated document. For queries, contact billing department.
    </div>
</body>
</html>`;
};

// ─── Discharge Certificate ────────────────────────────────────────────────────

export const buildDischargeCertificateA4 = (cert: DischargeCertificate): string => {
    const { admission } = cert;
    const admDate = format(new Date(admission.admissionDate), 'dd MMMM yyyy');
    const disDate = cert.admission.dischargeDate
        ? format(new Date(cert.admission.dischargeDate), 'dd MMMM yyyy')
        : format(new Date(), 'dd MMMM yyyy');
    const los = cert.admission.dischargeDate
        ? differenceInDays(new Date(cert.admission.dischargeDate), new Date(admission.admissionDate))
        : differenceInDays(new Date(), new Date(admission.admissionDate));
    const followUp = cert.followUpDate ? format(new Date(cert.followUpDate), 'dd MMMM yyyy') : null;
    const issuedDate = format(new Date(cert.issuedAt), 'dd MMMM yyyy');

    const conditionBadge = cert.conditionAtDischarge === 'RECOVERED' || cert.conditionAtDischarge === 'STABLE' || cert.conditionAtDischarge === 'IMPROVED'
        ? 'badge-green' : cert.conditionAtDischarge === 'LAMA' ? 'badge-amber' : 'badge-red';

    const procedureList = cert.proceduresPerformed.map(p => `<li style="margin-bottom:3px;">${p}</li>`).join('');
    const medList = cert.medications.map(m => `<li style="margin-bottom:3px;">${m}</li>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Discharge Certificate – ${cert.certificateNo}</title>
    <style>${BASE_STYLES}
        .cert-stamp {
            border: 3px double #4f46e5;
            border-radius: 12px;
            padding: 6px 16px;
            display: inline-block;
            font-size: 8pt;
            font-weight: 700;
            color: #4f46e5;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }
        .highlight-box {
            background: #f0f4ff;
            border: 1.5px solid #c7d2fe;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 14px;
        }
        li { margin-left: 16px; }
        p { margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="hospital-name">${HOSPITAL_NAME}</div>
            <div class="hospital-sub">${HOSPITAL_ADDRESS}<br>${HOSPITAL_PHONE}</div>
        </div>
        <div class="doc-title">
            <h2>Discharge Certificate</h2>
            <div class="doc-no">${cert.certificateNo}</div>
            <div style="margin-top:8px;"><div class="cert-stamp">Medical Record</div></div>
        </div>
    </div>

    <div class="grid-3">
        <div class="info-box">
            <div class="info-label">Patient Name</div>
            <div class="info-value">${admission.patientName}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Age / Sex</div>
            <div class="info-value">${admission.age} years / ${admission.sex === 'M' ? 'Male' : admission.sex === 'F' ? 'Female' : 'Other'}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Patient ID</div>
            <div class="info-value accent">${admission.patientId || admission.id}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Admission Date</div>
            <div class="info-value">${admDate}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Discharge Date</div>
            <div class="info-value">${disDate}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Length of Stay</div>
            <div class="info-value accent">${los} day${los !== 1 ? 's' : ''}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Ward / Bed</div>
            <div class="info-value">${admission.wardName} / Bed ${admission.bedNumber}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Attending Physician</div>
            <div class="info-value">${admission.attendingDoctor}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Condition at Discharge</div>
            <div class="info-value">
                <span class="badge ${conditionBadge}">${CONDITION_LABEL[cert.conditionAtDischarge]}</span>
            </div>
        </div>
    </div>

    <div class="section-label">Chief Complaint</div>
    <div class="highlight-box">
        <p>${admission.chiefComplaint ?? '—'}</p>
    </div>

    <div class="section-label">Final Diagnosis</div>
    <div class="highlight-box">
        <p style="font-weight:700;font-size:11pt;">${cert.finalDiagnosis}</p>
    </div>

    <div class="section-label">Treatment Summary</div>
    <div class="highlight-box">
        <p>${cert.treatmentSummary}</p>
    </div>

    ${cert.proceduresPerformed.length > 0 ? `
    <div class="section-label">Procedures Performed</div>
    <div class="highlight-box">
        <ul>${procedureList}</ul>
    </div>` : ''}

    <div class="section-label">Discharge Instructions</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div class="highlight-box" style="margin-bottom:0;">
            <div class="info-label" style="margin-bottom:6px;">Medications Prescribed</div>
            <ul>${medList}</ul>
        </div>
        <div>
            <div class="highlight-box" style="margin-bottom:10px;">
                <div class="info-label" style="margin-bottom:4px;">Diet Advice</div>
                <p>${cert.diet}</p>
            </div>
            <div class="highlight-box" style="margin-bottom:10px;">
                <div class="info-label" style="margin-bottom:4px;">Activity Restrictions</div>
                <p>${cert.activityRestrictions}</p>
            </div>
            ${followUp ? `
            <div class="highlight-box" style="margin-bottom:0;background:#fdf4ff;border-color:#e9d5ff;">
                <div class="info-label" style="margin-bottom:4px;color:#7e22ce;">Follow-Up Visit</div>
                <p style="font-weight:700;color:#6b21a8;">${followUp}</p>
            </div>` : ''}
        </div>
    </div>

    <div class="highlight-box" style="background:#fffbeb;border-color:#fde68a;">
        <div class="info-label" style="margin-bottom:4px;color:#92400e;">Follow-Up Instructions</div>
        <p>${cert.followUpInstructions}</p>
    </div>

    <div style="margin-top:6px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:8pt;color:#7f1d1d;">
        <strong>Emergency:</strong> If symptoms recur or worsen, please visit the Emergency Department immediately or call ${HOSPITAL_PHONE}.
    </div>

    <div class="footer-sig">
        <div class="sig-box">
            <div class="sig-label">Patient / Attendant Signature</div>
        </div>
        <div class="sig-box" style="text-align:right;">
            <div class="sig-label">${admission.attendingDoctor}</div>
            <div style="font-size:8pt;color:#64748b;margin-top:2px;">Attending Physician</div>
        </div>
    </div>

    <div style="margin-top:20px;text-align:center;font-size:7.5pt;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px;">
        Issued on ${issuedDate} | ${HOSPITAL_NAME} | ${HOSPITAL_ADDRESS}
    </div>
</body>
</html>`;
};

// ─── Helper: import differenceInDays for use in this file ─────────────────────
function differenceInDays(a: Date, b: Date): number {
    return Math.floor((a.getTime() - b.getTime()) / 86400000);
}
