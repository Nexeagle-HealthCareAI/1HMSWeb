import { SurgeryCasePrintData, PrintSettings } from '../types/print';
import { format } from 'date-fns';

const fmt = (iso?: string | null, pattern = 'dd MMM yyyy, HH:mm'): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : format(d, pattern);
};

const yesNo = (b: boolean): string => b
    ? '<span style="color:#047857; font-weight:700;">Yes</span>'
    : '<span style="color:#b91c1c; font-weight:700;">No</span>';

const checklistPhaseBlock = (phase: SurgeryCasePrintData['checklistPhases'][number]): string => `
    <div style="margin-top:14px; break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
            <div style="font-size:9.5pt; font-weight:700; color:#0f172a;">${phase.label}</div>
            ${phase.completedAt
                ? `<div style="font-size:8pt; color:#047857; font-weight:700;">Completed ${fmt(phase.completedAt)}${phase.completedBy ? ` · ${phase.completedBy}` : ''}</div>`
                : `<div style="font-size:8pt; color:#94a3b8; font-weight:700;">Not recorded</div>`}
        </div>
        <table style="width:100%; border-collapse:collapse; margin-top:6px;">
            ${phase.items.map(it => `
            <tr>
                <td style="width:16px; padding:2.5px 0; vertical-align:top; font-size:9.5pt;">${it.checked ? '☑' : '☐'}</td>
                <td style="padding:2.5px 0; font-size:8.8pt; color:#334155; line-height:1.4;">${it.label}</td>
            </tr>`).join('')}
        </table>
    </div>`;

export const buildSurgeryCaseA4 = (data: SurgeryCasePrintData, settings: PrintSettings): string => {
    const preOpFlags = data.preOp ? [
        { label: 'NPO confirmed', v: data.preOp.npoConfirmed },
        { label: 'Allergies reviewed', v: data.preOp.allergiesReviewed },
        { label: 'Investigations reviewed', v: data.preOp.investigationsReviewed },
        { label: 'Consent confirmed', v: data.preOp.consentConfirmed },
    ] : [];

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Surgical Case Record - ${data.admissionNo}</title>
        <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 14mm; font-size: 10pt; }
            .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; }
            .h-name { font-size: 19pt; font-weight: 800; color: #0f172a; letter-spacing: -.3px; margin: 0; }
            .h-sub { font-size: 8.5pt; color: #64748b; margin: 3px 0 0; line-height: 1.5; }
            .title { text-align: right; }
            .title .t { font-size: 15pt; font-weight: 800; color: #4f46e5; letter-spacing: 1px; }
            .title .s { font-size: 8pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
            .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 18px; }
            .parties .box { flex: 1; }
            .label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
            .pname { font-size: 12pt; font-weight: 700; color: #0f172a; }
            .pmeta { font-size: 8.5pt; color: #64748b; line-height: 1.6; margin-top: 2px; }
            .adm-meta td { font-size: 9pt; padding: 2px 0; }
            .adm-meta td.k { color: #94a3b8; padding-right: 14px; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .5px; }
            .adm-meta td.v { color: #0f172a; font-weight: 700; text-align: right; }
            .panel { margin-top: 18px; border: 1px solid #eef2f7; border-radius: 8px; padding: 12px 14px; break-inside: avoid; }
            .panel-title { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; font-weight: 800; margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
            .cell .k { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; font-weight: 700; }
            .cell .v { font-size: 9.5pt; color: #0f172a; font-weight: 600; margin-top: 2px; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 4px; }
            table.items th { text-align: left; background: #f8fafc; color: #475569; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .5px; padding: 6px 8px; }
            table.items td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 9pt; color: #0f172a; }
            .foot { margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: space-between; gap: 20px; }
            .sign { text-align: center; flex: 1; }
            .sign .line { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 8.5pt; color: #64748b; }
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
                <div class="t">SURGICAL CASE RECORD</div>
                <div class="s">${data.statusCode.replace('_', ' ')}</div>
            </div>
        </div>

        <div class="parties">
            <div class="box">
                <div class="label">Patient</div>
                <div class="pname">${data.patientName}</div>
                <div class="pmeta">
                    Patient ID: ${data.patientId}${data.ageGender ? ` &nbsp;·&nbsp; ${data.ageGender}` : ''}${data.mobile ? ` &nbsp;·&nbsp; ${data.mobile}` : ''}<br/>
                    ${data.wardBed ? data.wardBed : ''}
                </div>
            </div>
            <div class="box" style="text-align:right;">
                <table class="adm-meta" style="margin-left:auto;">
                    <tr><td class="k">Admission No</td><td class="v">${data.admissionNo}</td></tr>
                    <tr><td class="k">Surgeon</td><td class="v">${data.surgeonName || '—'}</td></tr>
                    <tr><td class="k">Anaesthetist</td><td class="v">${data.anaesthetistName || '—'}</td></tr>
                </table>
            </div>
        </div>

        <div class="panel">
            <div class="panel-title">Procedure</div>
            <div class="grid">
                <div class="cell"><div class="k">Procedure name</div><div class="v">${data.procedureName}</div></div>
                <div class="cell"><div class="k">Type / Urgency</div><div class="v">${data.surgeryType} · ${data.urgency}</div></div>
                ${data.statusCode === 'CANCELLED' && data.cancelledReason ? `<div class="cell" style="grid-column: span 2;"><div class="k">Cancelled — reason</div><div class="v" style="color:#b91c1c;">${data.cancelledReason}</div></div>` : ''}
            </div>
        </div>

        ${data.booking ? `
        <div class="panel">
            <div class="panel-title">Schedule</div>
            <div class="grid">
                <div class="cell"><div class="k">Theatre</div><div class="v">${data.booking.theatreName || '—'}</div></div>
                <div class="cell"><div class="k">Booking status</div><div class="v">${data.booking.statusCode}</div></div>
                <div class="cell"><div class="k">Scheduled start</div><div class="v">${fmt(data.booking.scheduledStart)}</div></div>
                <div class="cell"><div class="k">Scheduled end</div><div class="v">${fmt(data.booking.scheduledEnd)}</div></div>
            </div>
        </div>` : ''}

        ${data.preOp ? `
        <div class="panel">
            <div class="panel-title">Pre-Op Assessment</div>
            <div class="grid">
                <div class="cell"><div class="k">ASA grade</div><div class="v">${data.preOp.asaGrade || '—'}</div></div>
                <div class="cell"><div class="k">Assessed by</div><div class="v">${data.preOp.assessedBy} · ${fmt(data.preOp.assessedAt)}</div></div>
                ${preOpFlags.map(f => `<div class="cell"><div class="k">${f.label}</div><div class="v">${yesNo(f.v)}</div></div>`).join('')}
                ${data.preOp.notes ? `<div class="cell" style="grid-column: span 2;"><div class="k">Notes</div><div class="v" style="font-weight:400;">${data.preOp.notes}</div></div>` : ''}
            </div>
        </div>` : ''}

        ${data.checklistPhases.length > 0 ? `
        <div class="panel">
            <div class="panel-title">WHO Surgical Safety Checklist</div>
            ${data.checklistPhases.map(checklistPhaseBlock).join('')}
        </div>` : ''}

        ${data.intraOp ? `
        <div class="panel">
            <div class="panel-title">Intra-Op Record</div>
            <div class="grid">
                <div class="cell"><div class="k">Anaesthesia type</div><div class="v">${data.intraOp.anaesthesiaType || '—'}</div></div>
                <div class="cell"><div class="k">Est. blood loss</div><div class="v">${data.intraOp.estimatedBloodLossMl != null ? `${data.intraOp.estimatedBloodLossMl} ml` : '—'}</div></div>
                <div class="cell"><div class="k">Surgery start (incision)</div><div class="v">${fmt(data.intraOp.surgeryStartAt)}</div></div>
                <div class="cell"><div class="k">Surgery end (closure)</div><div class="v">${fmt(data.intraOp.surgeryEndAt)}</div></div>
                ${data.intraOp.procedurePerformed ? `<div class="cell" style="grid-column: span 2;"><div class="k">Procedure performed (actual)</div><div class="v">${data.intraOp.procedurePerformed}</div></div>` : ''}
                ${data.intraOp.surgicalTeam ? `<div class="cell" style="grid-column: span 2;"><div class="k">Surgical team</div><div class="v" style="font-weight:400;">${data.intraOp.surgicalTeam}</div></div>` : ''}
                ${data.intraOp.findings ? `<div class="cell" style="grid-column: span 2;"><div class="k">Findings</div><div class="v" style="font-weight:400;">${data.intraOp.findings}</div></div>` : ''}
                ${data.intraOp.complicationsNotes ? `<div class="cell" style="grid-column: span 2;"><div class="k">Complications</div><div class="v" style="font-weight:400; color:#b91c1c;">${data.intraOp.complicationsNotes}</div></div>` : ''}
            </div>
        </div>` : ''}

        ${data.itemsUsed.length > 0 ? `
        <div class="panel">
            <div class="panel-title">Consumables &amp; Implants Used</div>
            <table class="items">
                <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Lot / Serial</th></tr></thead>
                <tbody>
                    ${data.itemsUsed.map(u => `<tr>
                        <td>${u.itemName}</td>
                        <td>${u.category}</td>
                        <td>${u.qty}</td>
                        <td>${[u.lotNumber, u.serialNumber].filter(Boolean).join(' / ') || '—'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div class="foot">
            <div class="sign"><div class="line">Surgeon</div></div>
            <div class="sign"><div class="line">Anaesthetist</div></div>
            <div class="sign"><div class="line">OT In-charge</div></div>
        </div>
    </body>
    </html>
    `;
};
