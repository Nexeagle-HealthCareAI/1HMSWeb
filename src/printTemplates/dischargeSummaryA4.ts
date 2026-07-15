import { DischargeSummaryPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

const conditionBadge: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
    STABLE: { label: 'Stable', bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
    IMPROVED: { label: 'Improved', bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
    RECOVERED: { label: 'Recovered', bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
    REFERRED: { label: 'Referred', bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
    LAMA: { label: 'LAMA', bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
    EXPIRED: { label: 'Expired', bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' },
};

const section = (title: string, body?: string): string => {
    if (!body) return '';
    return `
    <div style="margin-top:16px;">
        <div style="font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-bottom:5px;">${title}</div>
        <div style="font-size:9.5pt; color:#1e293b; white-space:pre-wrap; line-height:1.5;">${body}</div>
    </div>`;
};

export const buildDischargeSummaryA4 = (data: DischargeSummaryPrintData, settings: PrintSettings): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const cond = conditionBadge[data.conditionAtDischarge] ?? conditionBadge.STABLE;

    const tpaSection = data.tpaSplit ? `
    <div style="margin-top:22px; position:relative; z-index:1;">
        <div style="font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-bottom:6px;">Non-Payable Items Annexure</div>
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th style="text-align:left; background:#f1f5f9; color:#475569; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px;">Item</th>
                    <th style="text-align:right; background:#f1f5f9; color:#475569; font-size:7.5pt; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${data.tpaSplit.nonPayableLines.map(l => `<tr>
                    <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; color:#0f172a;">${l.displayName}</td>
                    <td style="padding:5px 10px; border-bottom:1px solid #eef2f7; font-size:9pt; text-align:right; font-weight:600; color:#b91c1c;">${inr(l.netAmount)}</td>
                </tr>`).join('') || '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:12px; font-size:8.5pt;">No non-payable items.</td></tr>'}
            </tbody>
        </table>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
            <table style="width:280px;">
                <tr><td style="padding:3px 0; font-size:9pt; color:#64748b;">Payable</td><td style="padding:3px 0; font-size:9pt; text-align:right; font-weight:700; color:#047857;">${inr(data.tpaSplit.payableTotal)}</td></tr>
                <tr><td style="padding:3px 0; font-size:9pt; color:#64748b;">Non-Payable</td><td style="padding:3px 0; font-size:9pt; text-align:right; font-weight:700; color:#b91c1c;">${inr(data.tpaSplit.nonPayableTotal)}</td></tr>
                ${data.tpaSplit.unclassifiedTotal > 0 ? `<tr><td style="padding:3px 0; font-size:9pt; color:#64748b;">Unclassified</td><td style="padding:3px 0; font-size:9pt; text-align:right; font-weight:700; color:#94a3b8;">${inr(data.tpaSplit.unclassifiedTotal)}</td></tr>` : ''}
            </table>
        </div>
    </div>` : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Discharge Summary - ${data.admissionNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; position: relative; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 17pt; font-weight: 800; color: #4f46e5; letter-spacing: 1px; }
            .badge { display: inline-block; border-radius: 999px; padding: 3px 12px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; background: ${cond.bg}; color: ${cond.fg}; border: 1px solid ${cond.bd}; margin-top: 6px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; }
            .parties .box { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .adm-meta td { font-size: 9pt; padding: 2px 0; }
            .adm-meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .adm-meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            .foot { margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
            .terms { font-size: 7.5pt; color: #94a3b8; max-width: 320px; line-height: 1.5; }
            .sign { text-align: center; }
            .sign .line { border-top: 1px solid #94a3b8; width: 200px; padding-top: 6px; font-size: 8.5pt; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="head">
            <div>
                <h1 class="h-name">${settings.hospitalName}</h1>
                <p class="h-sub">
                    ${settings.address}${settings.phone ? `<br/>${settings.phone}` : ''}${settings.email ? ` &nbsp;·&nbsp; ${settings.email}` : ''}<br/>
                    ${settings.nabhNumber ? `NABH: ${settings.nabhNumber}` : ''}
                </p>
            </div>
            <div class="title">
                <div class="t">DISCHARGE SUMMARY</div>
                <div class="badge">${cond.label}</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Patient</div>
                <div class="pname">${data.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${data.patientId}<br/>
                    ${data.ageGender ? `${data.ageGender}<br/>` : ''}
                    ${data.mobile ? `Mobile: ${data.mobile}<br/>` : ''}
                    ${data.patientAddress ? `${data.patientAddress}<br/>` : ''}
                    ${data.referredBy ? `Referred by: ${data.referredBy}` : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="adm-meta" style="margin-left:auto;">
                    <tr><td class="k">Admission No</td><td class="v">${data.admissionNo}</td></tr>
                    <tr><td class="k">Admitted</td><td class="v">${format(new Date(data.admittedAt), 'dd MMM yyyy, HH:mm')}</td></tr>
                    <tr><td class="k">Discharged</td><td class="v">${format(new Date(data.dischargedAt), 'dd MMM yyyy, HH:mm')}</td></tr>
                </table>
            </div>
        </div>

        ${section('Admitting Diagnosis', data.admittingDiagnosis)}
        ${section('Final Diagnosis', data.finalDiagnosisIcd10Code
            ? `${data.finalDiagnosis ?? ''} <span style="color:#64748b;">(ICD-10: ${data.finalDiagnosisIcd10Code} — ${data.finalDiagnosisIcd10Name ?? ''})</span>`
            : data.finalDiagnosis)}
        ${section('Chief Complaint', data.chiefComplaint)}
        ${section('History of Present Illness', data.historyOfPresentIllness)}
        ${section('Course in Hospital', data.courseInHospital)}
        ${section('Procedures Performed', data.proceduresPerformed)}
        ${section('Discharge Medications', data.dischargeMedications)}
        ${section('Follow-up Instructions', data.followUpInstructions)}
        ${data.followUpDate ? section('Follow-up Date', format(new Date(data.followUpDate), 'dd MMM yyyy')) : ''}
        ${section('Diet Instructions', data.dietInstructions)}
        ${section('Activity Restrictions', data.activityRestrictions)}
        ${section('Additional Notes', data.additionalNotes)}

        ${tpaSection}

        <div class="foot">
            <div class="terms">
                ${settings.footerText || 'This is a computer-generated discharge summary.'}
            </div>
            <div class="sign">
                <div class="line">${data.signedByDoctorName ?? ''}${data.signedAt ? `<br/>${format(new Date(data.signedAt), 'dd MMM yyyy, HH:mm')}` : ''}</div>
            </div>
        </div>
    </body>
    </html>
    `;
};
