import type { DischargeSummaryData } from '../services/dischargeSummaryService';
import type { GetEncounterEventsResponse } from '@/features/billing/services/ipdBillingService';

interface HospitalLetterhead {
    hospitalName?: string;
    address?: string;
    phone?: string;
    gstin?: string;
}

const inr = (n?: number | null) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const safe = (s?: string | null) =>
    !s ? '—' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const safeMultiline = (s?: string | null) =>
    !s ? '<span style="color:#94a3b8;font-style:italic;">Not recorded</span>'
       : safe(s).replace(/\n/g, '<br/>');

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

const sectionBlock = (title: string, body: string) => `
    <section style="margin-top: 14px;">
        <h3 style="margin: 0 0 4px 0; font-size: 11pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">${safe(title)}</h3>
        <div style="font-size: 10pt; color: #334155; line-height: 1.5;">${body}</div>
    </section>
`;

const buildSummaryPage = (s: DischargeSummaryData, hh: HospitalLetterhead) => `
    <article class="page">
        <header style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="margin: 0; font-size: 14pt; color: #1e3a8a;">${safe(hh.hospitalName ?? 'Hospital Name')}</h1>
                    <p style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">${safe(hh.address ?? '')}</p>
                    <p style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">
                        ${hh.phone ? `Tel: ${safe(hh.phone)}` : ''}
                        ${hh.gstin ? ` · GSTIN: ${safe(hh.gstin)}` : ''}
                    </p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 13pt; color: #0f172a;">DISCHARGE SUMMARY</h2>
                    ${s.admission.admissionNo ? `<p style="margin: 2px 0 0 0; font-size: 10pt; color: #475569;">Admission: <strong>${safe(s.admission.admissionNo)}</strong></p>` : ''}
                </div>
            </div>
        </header>

        <table style="width: 100%; font-size: 10pt; border-collapse: collapse;">
            <tr>
                <td style="padding: 4px 8px; width: 16%; color: #64748b;">Patient</td>
                <td style="padding: 4px 8px; width: 34%;"><strong>${safe(s.admission.patientName)}</strong> ${s.admission.patientId ? `<span style="color:#94a3b8;">(${safe(s.admission.patientId)})</span>` : ''}</td>
                <td style="padding: 4px 8px; width: 16%; color: #64748b;">Age / Sex</td>
                <td style="padding: 4px 8px; width: 34%;">${s.admission.patientAgeYears ?? '—'}y / ${safe(s.admission.patientSex)}</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Mobile</td>
                <td style="padding: 4px 8px;">${safe(s.admission.patientMobile)}</td>
                <td style="padding: 4px 8px; color: #64748b;">Attending</td>
                <td style="padding: 4px 8px;">${safe(s.admission.attendingDoctorName)}</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Admitted</td>
                <td style="padding: 4px 8px;">${fmtDateTime(s.admission.admittedAt)}</td>
                <td style="padding: 4px 8px; color: #64748b;">Discharged</td>
                <td style="padding: 4px 8px;">${fmtDateTime(s.admission.dischargedAt)}</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Length of Stay</td>
                <td style="padding: 4px 8px;"><strong>${s.admission.lengthOfStayDays ?? '—'} day(s)</strong></td>
                <td style="padding: 4px 8px; color: #64748b;">Ward / Bed</td>
                <td style="padding: 4px 8px;">${safe(s.admission.wardName)} / ${safe(s.admission.bedCode)}</td>
            </tr>
        </table>

        ${sectionBlock('Admitting Diagnosis', safeMultiline(s.admittingDiagnosis))}
        ${sectionBlock('Final Diagnosis', safeMultiline(s.finalDiagnosis))}
        ${sectionBlock('Chief Complaint', safeMultiline(s.chiefComplaint))}
        ${s.historyOfPresentIllness ? sectionBlock('History of Present Illness', safeMultiline(s.historyOfPresentIllness)) : ''}
        ${sectionBlock('Course in Hospital', safeMultiline(s.courseInHospital))}
        ${s.proceduresPerformed ? sectionBlock('Procedures Performed', safeMultiline(s.proceduresPerformed)) : ''}
        ${sectionBlock('Condition at Discharge', safeMultiline(s.conditionAtDischarge))}
        ${sectionBlock('Discharge Medications', safeMultiline(s.dischargeMedications))}
        ${sectionBlock('Follow-up Instructions', `
            ${safeMultiline(s.followUpInstructions)}
            ${s.followUpDate ? `<p style="margin-top:6px;"><strong>Follow-up date:</strong> ${fmtDate(s.followUpDate)}</p>` : ''}
        `)}
        ${s.dietInstructions ? sectionBlock('Diet', safeMultiline(s.dietInstructions)) : ''}
        ${s.activityRestrictions ? sectionBlock('Activity Restrictions', safeMultiline(s.activityRestrictions)) : ''}
        ${s.additionalNotes ? sectionBlock('Additional Notes', safeMultiline(s.additionalNotes)) : ''}

        <footer style="margin-top: 24px; padding-top: 12px; border-top: 1px dashed #94a3b8; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 9pt; color: #64748b;">
                ${s.isSigned
                    ? `<p style="margin:0;"><strong style="color:#059669;">SIGNED</strong> &nbsp;${s.signedAt ? `on ${fmtDateTime(s.signedAt)}` : ''}</p>`
                    : `<p style="margin:0;color:#d97706;"><strong>DRAFT</strong> &mdash; not signed</p>`}
            </div>
            <div style="font-size: 10pt; text-align: right;">
                <div style="border-top: 1px solid #0f172a; padding-top: 4px; min-width: 200px;">
                    ${safe(s.signedByDoctorName ?? s.admission.attendingDoctorName ?? '')}<br/>
                    <span style="font-size: 9pt; color: #64748b;">Attending Physician (signature)</span>
                </div>
            </div>
        </footer>
    </article>
`;

const buildBillPage = (bill: GetEncounterEventsResponse['data'] | null, summary: DischargeSummaryData, hh: HospitalLetterhead) => {
    if (!bill) return '';
    const inv = bill.currentInvoice;
    return `
    <article class="page" style="page-break-before: always;">
        <header style="border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1 style="margin: 0; font-size: 14pt; color: #1e3a8a;">${safe(hh.hospitalName ?? 'Hospital Name')}</h1>
                    <p style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">${safe(hh.address ?? '')}</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 13pt; color: #0f172a;">FINAL BILL</h2>
                    ${inv?.invoiceNo ? `<p style="margin: 2px 0 0 0; font-size: 10pt;">Invoice: <strong>${safe(inv.invoiceNo)}</strong></p>` : ''}
                    ${summary.admission.admissionNo ? `<p style="margin: 2px 0 0 0; font-size: 9pt; color: #475569;">Adm: ${safe(summary.admission.admissionNo)}</p>` : ''}
                </div>
            </div>
        </header>

        <table style="width: 100%; font-size: 10pt; border-collapse: collapse; margin-bottom: 10px;">
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Patient</td>
                <td style="padding: 4px 8px;"><strong>${safe(summary.admission.patientName)}</strong> ${summary.admission.patientId ? `(${safe(summary.admission.patientId)})` : ''}</td>
                <td style="padding: 4px 8px; color: #64748b;">Invoice Date</td>
                <td style="padding: 4px 8px;">${fmtDate(inv?.invoiceDate)}</td>
            </tr>
        </table>

        <table style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                    <th style="text-align:left; padding: 6px 8px;">Date</th>
                    <th style="text-align:left; padding: 6px 8px;">Item</th>
                    <th style="text-align:left; padding: 6px 8px;">Category</th>
                    <th style="text-align:right; padding: 6px 8px;">Qty</th>
                    <th style="text-align:right; padding: 6px 8px;">Rate</th>
                    <th style="text-align:right; padding: 6px 8px;">Net</th>
                </tr>
            </thead>
            <tbody>
                ${bill.charges
                    .filter(c => c.statusCode !== 'VOID')
                    .map(c => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 5px 8px; color: #64748b;">${fmtDateTime(c.createdDateTime)}</td>
                        <td style="padding: 5px 8px;">${safe(c.displayName)}</td>
                        <td style="padding: 5px 8px; color: #64748b;">${safe(c.categoryCode)}</td>
                        <td style="padding: 5px 8px; text-align: right;">${c.qty}</td>
                        <td style="padding: 5px 8px; text-align: right;">${inr(c.rate)}</td>
                        <td style="padding: 5px 8px; text-align: right; font-weight: 600;">${inr(c.netAmount)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>

        <table style="width: 50%; margin-left: 50%; margin-top: 10px; font-size: 10pt; border-collapse: collapse;">
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Gross</td>
                <td style="padding: 4px 8px; text-align: right;">${inr(bill.totalBilledAmount)}</td>
            </tr>
            ${inv?.discountAmount ? `<tr>
                <td style="padding: 4px 8px; color: #64748b;">Invoice discount</td>
                <td style="padding: 4px 8px; text-align: right; color: #d97706;">−${inr(inv.discountAmount)}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #0f172a;">
                <td style="padding: 6px 8px; font-weight: 700;">NET PAYABLE</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #1e3a8a; font-size: 11pt;">${inr(inv?.netAmount ?? bill.totalBilledAmount)}</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; color: #64748b;">Received</td>
                <td style="padding: 4px 8px; text-align: right; color: #059669;">${inr(bill.amountReceived)}</td>
            </tr>
            <tr>
                <td style="padding: 4px 8px; font-weight: 700;">BALANCE</td>
                <td style="padding: 4px 8px; text-align: right; font-weight: 700; color: ${bill.netBalance > 0 ? '#dc2626' : '#059669'};">
                    ${inr(Math.max(0, bill.netBalance))}${bill.netBalance < 0 ? ` <span style="font-size:9pt; font-weight: normal;">(credit ${inr(-bill.netBalance)})</span>` : ''}
                </td>
            </tr>
        </table>

        ${bill.payments.length > 0 ? `
        <h3 style="margin: 18px 0 6px 0; font-size: 11pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">Payments</h3>
        <table style="width:100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="text-align:left; padding: 5px 8px;">Date</th>
                    <th style="text-align:left; padding: 5px 8px;">Receipt</th>
                    <th style="text-align:left; padding: 5px 8px;">Type</th>
                    <th style="text-align:left; padding: 5px 8px;">Mode</th>
                    <th style="text-align:right; padding: 5px 8px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${bill.payments.map(p => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 4px 8px; color: #64748b;">${fmtDateTime(p.createdDateTime)}</td>
                    <td style="padding: 4px 8px;">${safe(p.receiptNo)}</td>
                    <td style="padding: 4px 8px;">${safe(p.paymentType)}</td>
                    <td style="padding: 4px 8px;">${safe(p.paymentMode)}</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: 600;">${inr(p.amount)}</td>
                </tr>`).join('')}
            </tbody>
        </table>` : ''}
    </article>
    `;
};

export interface DischargeBundleInput {
    summary: DischargeSummaryData;
    bill: GetEncounterEventsResponse['data'] | null;
    hospital: HospitalLetterhead;
}

export const buildDischargeBundleA4 = ({ summary, bill, hospital }: DischargeBundleInput): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Discharge Bundle · ${safe(summary.admission.patientName)}</title>
    <style>
        @page { size: A4; margin: 12mm 14mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; }
        .page { padding-bottom: 8mm; }
        @media print { .page { page-break-after: always; } }
    </style>
</head>
<body>
    ${buildSummaryPage(summary, hospital)}
    ${buildBillPage(bill, summary, hospital)}
</body>
</html>
`;
