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

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A patient-advice section: the English, then — only when a translation was added — the translation in brackets. */
const adviceSection = (title: string, body: string | undefined, second?: { code: string; text?: string }): string => {
    if (!body) return '';
    const raw = second?.text?.trim();
    const tr = raw ? (/^[([].*[)\]]$/s.test(raw) ? raw : `(${raw})`) : '';
    return section(title, esc(body) + (tr ? `<div lang="${second!.code}" style="margin-top:4px; color:#334155; font-family:'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif;">${esc(tr)}</div>` : ''));
};

/** Length of stay in whole days (discharge date minus admission date, at least 1). */
export const stayText = (admittedAt: string, dischargedAt: string): string => {
    const a = new Date(admittedAt), d = new Date(dischargedAt);
    if (isNaN(a.getTime()) || isNaN(d.getTime())) return '';
    const days = Math.max(1, Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000));
    return `${days} day${days === 1 ? '' : 's'}`;
};

/** Take-home medicines: a table when the rows are available, otherwise the typed text. */
const medicinesBlock = (data: DischargeSummaryPrintData): string => {
    const rows = (data.medications ?? []).filter(m => m.name?.trim());
    if (rows.length === 0) return section('Discharge Medications', data.dischargeMedications);
    const td = (v?: string) => `<td>${esc(v?.trim() || '—')}</td>`;
    return `
    <div style="margin-top:16px;">
        <div style="font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-bottom:5px;">Medicines to take at home</div>
        <table class="med"><thead><tr><th style="width:5%;">#</th><th style="width:34%;">Medicine</th><th style="width:14%;">Dose</th><th style="width:15%;">When</th><th style="width:12%;">For</th><th>How</th></tr></thead>
        <tbody>${rows.map((m, i) => `<tr><td>${i + 1}</td><td><b>${esc(m.name.trim())}</b></td>${td(m.dose)}${td(m.frequency)}${td(m.duration)}${td([m.route, m.instructions].filter(v => v?.trim()).join(' · '))}</tr>`).join('')}</tbody></table>
    </div>`;
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
    const credentials = [data.doctorQualification, data.doctorSpeciality].filter(Boolean).join(' · ');
    const cell = (label: string, value?: string) => `<div><div class="label">${label}</div><div class="pval">${esc(value || '—')}</div></div>`;
    const translated = (key: string) => {
        const raw = data.secondLanguage?.fields[key]?.trim();
        if (!raw) return '';
        return `<div lang="${data.secondLanguage!.code}" style="margin-top:3px; color:#334155; font-family:'Noto Sans Devanagari','Nirmala UI','Mangal',sans-serif;">${esc(/^[([].*[)\]]$/s.test(raw) ? raw : `(${raw})`)}</div>`;
    };
    const sl = (key: string) => (data.secondLanguage ? { code: data.secondLanguage.code, text: data.secondLanguage.fields[key] } : undefined);

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
            .foot { margin-top: 44px; display: flex; justify-content: space-between; align-items: flex-end; }
            .pbox { margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
            .prow { display: flex; gap: 14px; padding: 9px 12px; }
            .prow > div { flex: 1; min-width: 0; }
            .pval { font-size: 9.5pt; font-weight: 700; color: #0f172a; }
            .med { width: 100%; border-collapse: collapse; font-size: 9pt; }
            .med th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px; color: #64748b; padding: 5px 8px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
            .med td { padding: 5px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
            .med tr { page-break-inside: avoid; }
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

        <div class="pbox">
            <div class="prow" style="background:#f8fafc;">
                <div style="flex:1.5;"><div class="label">Patient</div><div class="pname">${esc(data.patientName)}</div>
                    <div class="pmeta">${[data.ageGender, data.mobile].filter(Boolean).map(v => esc(String(v))).join(' &nbsp;·&nbsp; ')}</div></div>
                ${cell('Patient ID', data.patientId)}${cell('Admission no.', data.admissionNo)}${cell('Payer', data.payer)}
            </div>
            <div class="prow" style="border-top:1px solid #e2e8f0;">
                <div style="flex:1.5;"><div class="label">Consultant</div><div class="pval">${esc(data.consultant || data.signedByDoctorName || '—')}</div>
                    ${credentials ? `<div class="pmeta">${esc(credentials)}</div>` : ''}</div>
                ${cell('Admitted', format(new Date(data.admittedAt), 'dd MMM yyyy, HH:mm'))}${cell('Discharged', format(new Date(data.dischargedAt), 'dd MMM yyyy, HH:mm'))}${cell('Stay', [stayText(data.admittedAt, data.dischargedAt), data.wardBed].filter(Boolean).join(' · '))}
            </div>
        </div>
        ${data.patientAddress || data.referredBy ? `<div class="pmeta" style="margin-top:6px;">${[data.patientAddress, data.referredBy ? `Referred by: ${data.referredBy}` : ''].filter(Boolean).map(v => esc(String(v))).join(' &nbsp;·&nbsp; ')}</div>` : ''}

        ${data.finalDiagnosis || data.admittingDiagnosis ? `
        <div style="margin-top:16px; border-left:3px solid #4f46e5; padding:2px 0 2px 12px;">
            <div class="label">${data.finalDiagnosis ? 'Final diagnosis' : 'Admitting diagnosis'}</div>
            <div style="font-size:13pt; font-weight:800; color:#0f172a; white-space:pre-wrap;">${esc(data.finalDiagnosis || data.admittingDiagnosis || '')}</div>
            <div class="pmeta">${[data.finalDiagnosisIcd10Code ? `ICD-10 <b>${esc(data.finalDiagnosisIcd10Code)}</b>${data.finalDiagnosisIcd10Name ? ` ${esc(data.finalDiagnosisIcd10Name)}` : ''}` : '', data.finalDiagnosis && data.admittingDiagnosis ? `Admitted with: ${esc(data.admittingDiagnosis)}` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
        </div>` : ''}

        ${data.proceduresPerformed ? section('Procedures Performed', esc(data.proceduresPerformed)) : ''}
        ${data.chiefComplaint ? section('Chief Complaint', esc(data.chiefComplaint)) : ''}
        ${data.historyOfPresentIllness ? section('History of Present Illness', esc(data.historyOfPresentIllness)) : ''}
        ${data.courseInHospital ? section('Course in Hospital', esc(data.courseInHospital)) : ''}
        ${data.keyInvestigations ? section('Key Investigations', esc(data.keyInvestigations)) : ''}
        ${medicinesBlock(data)}

        ${data.followUpInstructions || data.followUpDate || data.warningSigns ? `
        <div style="display:flex; gap:12px; margin-top:16px; page-break-inside:avoid;">
            ${data.followUpInstructions || data.followUpDate ? `<div style="flex:1; border:1.5px solid #4f46e5; border-radius:8px; padding:9px 12px; background:#eef2ff;">
                <div class="label" style="color:#4338ca;">Next visit</div>
                ${data.followUpDate ? `<div style="font-size:12.5pt; font-weight:800; color:#0f172a;">${format(new Date(data.followUpDate), 'EEE, dd MMM yyyy')}</div>` : ''}
                ${data.followUpInstructions ? `<div style="white-space:pre-wrap; line-height:1.5;">${esc(data.followUpInstructions)}</div>` : ''}${translated('followUpInstructions')}
            </div>` : ''}
            ${data.warningSigns ? `<div style="flex:1; border:1.5px solid #dc2626; border-radius:8px; padding:9px 12px; background:#fef2f2;">
                <div class="label" style="color:#b91c1c;">Come back at once if</div>
                <div style="white-space:pre-wrap; line-height:1.5;">${esc(data.warningSigns)}</div>${translated('warningSigns')}
                ${data.hospitalPhone ? `<div style="font-weight:800; color:#b91c1c; margin-top:4px;">Hospital: ${esc(data.hospitalPhone)}</div>` : ''}
            </div>` : ''}
        </div>` : ''}
        ${adviceSection('Diet Instructions', data.dietInstructions, sl('dietInstructions'))}
        ${adviceSection('Activity Restrictions', data.activityRestrictions, sl('activityRestrictions'))}
        ${data.additionalNotes ? section('Additional Notes', esc(data.additionalNotes)) : ''}

        ${tpaSection}

        <div class="foot" style="page-break-inside:avoid;">
            <div class="sign"><div class="line" style="width:240px;">Patient / attendant — advice explained and understood</div></div>
            <div class="sign">
                <div class="line" style="width:240px;"><b style="color:#0f172a;">${esc(data.signedByDoctorName ?? data.consultant ?? "Doctor's signature")}</b>${credentials ? `<br/>${esc(credentials)}` : ''}${data.doctorRegistration ? `<br/>Reg. no. ${esc(data.doctorRegistration)}` : ''}${data.signedAt ? `<br/>Signed ${format(new Date(data.signedAt), 'dd MMM yyyy, HH:mm')}` : ''}</div>
            </div>
        </div>
        <div style="margin-top:14px; display:flex; justify-content:space-between; font-size:7.5pt; color:#94a3b8;">
            <span>${esc(data.patientName)} · ${esc(data.patientId)} · ${esc(data.admissionNo)}</span>
            <span>${esc(settings.footerText || 'This is a computer-generated discharge summary.')}</span>
        </div>
    </body>
    </html>
    `;
};
