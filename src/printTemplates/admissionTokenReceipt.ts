import { PrintSettings } from '../types/print';
import { format } from 'date-fns';

export interface AdmissionTokenPrintData {
    patientId: string;
    patientName: string;
    admissionNo: string;
    token: string;
    date: string | Date;
    department?: string;
    doctorName?: string;
}

export const buildAdmissionTokenThermal80 = (data: AdmissionTokenPrintData, settings: PrintSettings): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admission Token</title>
        <style>
            @page { size: 80mm auto; margin: 2mm; }
            body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 76mm; 
                font-size: 9pt; 
                line-height: 1.2; 
                color: #000;
                margin: 0 auto;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .label { font-size: 8pt; }
            .big-token { font-size: 24pt; font-weight: bold; margin: 15px 0; letter-spacing: 2px; }
        </style>
    </head>
    <body onload="window.print()">
        <div class="text-center">
            <div class="bold" style="font-size:11pt;">${settings.hospitalName}</div>
            <div style="font-size:7pt;">${settings.phone}</div>
        </div>

        <div class="divider"></div>
        <div class="text-center bold">ADMISSION TOKEN</div>
        <div class="divider"></div>

        <div class="row">
            <span class="label">Date:</span>
            <span>${format(new Date(data.date), 'dd-MM-yy HH:mm')}</span>
        </div>
        <div class="row">
            <span class="label">UHID:</span>
            <span>${data.patientId}</span>
        </div>
        <div class="row">
            <span class="label">Admsn #:</span>
            <span>${data.admissionNo}</span>
        </div>
        
        <div class="divider"></div>

        <div style="margin: 5px 0;">
             <div class="label">Patient Name:</div>
             <div class="bold">${data.patientName}</div>
        </div>
        
        ${data.doctorName ? `
        <div style="margin: 5px 0;">
             <div class="label">Doctor:</div>
             <div>${data.doctorName}</div>
        </div>` : ''}

        <div class="divider"></div>

        <div class="text-center">
            <div class="label">YOUR TOKEN NUMBER</div>
            <div class="big-token">${data.token}</div>
        </div>

        <div class="divider"></div>
        <div class="text-center" style="font-size:8pt; margin-top:10px;">
            Please wait for your turn.<br/>
            Thank You
        </div>
        <br/><br/>
    </body>
    </html>
    `;
};
