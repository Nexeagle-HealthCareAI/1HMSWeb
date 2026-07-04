import { AdmissionConfirmationPrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

const PAYER_LABEL: Record<string, string> = { CASH: 'Cash', TPA: 'TPA / Insurance', SCHEME: 'Govt. scheme' };

export const buildAdmissionConfirmationA4 = (data: AdmissionConfirmationPrintData, settings: PrintSettings): string => {
    const inr = (n: number) => `₹ ${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Admission Confirmation - ${data.admissionNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; }
            .h-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 17pt; font-weight: 800; color: #4f46e5; letter-spacing: 1px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; }
            .parties .box { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .adm-meta td { font-size: 9pt; padding: 2px 0; }
            .adm-meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .adm-meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 22px; }
            .cell .k { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; font-weight: 700; }
            .cell .v { font-size: 10pt; color: #0f172a; font-weight: 600; margin-top: 2px; }
            .terms-box { margin-top: 24px; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 6px; padding: 12px 14px; font-size: 8pt; color: #64748b; line-height: 1.6; }
            .foot { margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
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
                <div class="t">ADMISSION CONFIRMATION</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Patient</div>
                <div class="pname">${data.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${data.patientId}<br/>
                    ${data.ageGender ? `${data.ageGender}` : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="adm-meta" style="margin-left:auto;">
                    <tr><td class="k">Admission No</td><td class="v">${data.admissionNo}</td></tr>
                    <tr><td class="k">Admitted</td><td class="v">${format(new Date(data.admittedAt), 'dd MMM yyyy, HH:mm')}</td></tr>
                    <tr><td class="k">Type</td><td class="v">${data.admissionType ?? '—'}</td></tr>
                </table>
            </div>
        </div>

        <div class="grid">
            <div class="cell"><div class="k">Ward / Bed</div><div class="v">${data.wardBed || 'To be assigned'}</div></div>
            <div class="cell"><div class="k">Admitting Consultant</div><div class="v">${data.admittingDoctorName || 'Not specified'}</div></div>
            <div class="cell"><div class="k">Provisional Diagnosis</div><div class="v">${data.provisionalDiagnosis || '—'}</div></div>
            <div class="cell"><div class="k">Payer Type</div><div class="v">${PAYER_LABEL[data.payerType] ?? data.payerType}${data.depositExpected ? ` &nbsp;·&nbsp; Deposit ${inr(data.depositExpected)}` : ''}</div></div>
            ${data.attendantName || data.attendantPhone ? `
            <div class="cell"><div class="k">Attendant</div><div class="v">${[data.attendantName, data.attendantPhone].filter(Boolean).join(' · ')}</div></div>
            ` : ''}
        </div>

        <div class="terms-box">
            This confirms the patient's admission to ${settings.hospitalName}. Billing accrues from the point of admission per the hospital's applicable tariff; an itemised running bill is available on request at the billing desk. Please retain this confirmation for your records.
        </div>

        <div class="foot">
            <div class="sign">
                <div class="line">Patient / Attendant Signature</div>
            </div>
            <div class="sign">
                <div class="line">Hospital Representative</div>
            </div>
        </div>
    </body>
    </html>
    `;
};
