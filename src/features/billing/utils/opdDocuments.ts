import { GetEncounterEventsResponse } from '../services/ipdBillingService';
import { HospitalData } from '@/features/hospital/services/hospitalApi';
import {
    InvoicePrintData, ReceiptPrintData, BillCumReceiptPrintData, PrintSettings, PrintItem,
    PaymentStatementPrintData, PaymentStatementLine, InvoiceDayWiseRow,
} from '@/types/print';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { buildReceiptA4 } from '@/printTemplates/receiptA4';
import { buildReceiptThermal80 } from '@/printTemplates/receiptThermal80';
import { buildBillCumReceiptA4 } from '@/printTemplates/billCumReceiptA4';
import { buildPaymentStatementA4 } from '@/printTemplates/paymentStatementA4';

export type OpdDocKind = 'invoice' | 'receipt' | 'billcum' | 'statement';

// Patient/visit context the billing-event payload doesn't carry on its own.
export interface OpdDocContext {
    patientName: string;
    patientId: string;
    ageGender?: string;
    mobile?: string;
    doctorName?: string;
    department?: string;
}

type EventsData = NonNullable<GetEncounterEventsResponse['data']>;

// Maps the hospital profile onto the print header.
export const buildPrintSettingsFromHospital = (h?: HospitalData | null): PrintSettings => {
    const addressParts = [h?.location, h?.city, h?.state, h?.pincode].filter(Boolean);
    return {
        hospitalName: h?.name ?? '',
        address: addressParts.join(', '),
        phone: h?.contact ?? '',
        email: h?.email ?? '',
        website: h?.website ?? '',
        gstin: h?.gstin,
        pan: h?.pan,
        nabhNumber: h?.nabhNumber,
    };
};

// Bed/room charges carry their stay date-range inside the display name as a trailing
// "(01 Jan 2026–03 Jan 2026, 3d)". Split it out so the name and the period can be shown
// separately (a dedicated Period column / line) — gated to BED so other charges are untouched.
export const splitChargePeriod = (displayName?: string | null, categoryCode?: string | null): { name: string; period: string } => {
    const name = (displayName ?? '').trim();
    if ((categoryCode ?? '').toUpperCase() !== 'BED') return { name, period: '' };
    const m = name.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    if (m && /\d{4}/.test(m[2])) return { name: m[1].trim(), period: m[2].trim() };
    return { name, period: '' };
};

const mapStatus = (s?: string | null): 'OPEN' | 'FINAL' | 'CANCELLED' => {
    const up = (s ?? '').toUpperCase();
    if (up === 'FINALIZED' || up === 'FINAL' || up === 'PAID') return 'FINAL';
    if (up === 'CANCELLED' || up === 'CANCELED') return 'CANCELLED';
    return 'OPEN';
};

export const mapEventsToInvoiceData = (data: EventsData, ctx: OpdDocContext): InvoicePrintData => {
    const inv = data.currentInvoice;
    const charges = data.charges ?? [];
    const items: PrintItem[] = charges.map((c, i) => {
        const { name, period } = splitChargePeriod(c.displayName ?? c.categoryCode ?? 'Charge', c.categoryCode);
        return {
            srNo: i + 1,
            description: name || (c.categoryCode ?? 'Charge'),
            period: period || undefined,
            qty: c.qty ?? 1,
            rate: c.rate ?? 0,
            discount: c.discountAmount ?? 0,
            total: c.netAmount ?? 0,
        };
    });
    const subTotal = charges.reduce((s, c) => s + (c.grossAmount ?? 0), 0);
    const discountTotal = charges.reduce((s, c) => s + (c.discountAmount ?? 0), 0);
    const taxTotal = inv?.taxAmount ?? charges.reduce((s, c) => s + (c.taxAmount ?? 0), 0);
    return {
        invoiceNo: inv?.invoiceNo ?? '—',
        date: inv?.invoiceDate ?? new Date().toISOString(),
        patientName: ctx.patientName,
        patientId: ctx.patientId,
        ageGender: ctx.ageGender ?? '',
        mobile: ctx.mobile ?? '',
        doctorName: ctx.doctorName ?? '',
        department: ctx.department,
        status: mapStatus(inv?.statusCode),
        items,
        subTotal,
        discountTotal,
        taxTotal,
        grandTotal: data.totalBilledAmount ?? inv?.netAmount ?? 0,
        amountPaid: data.amountReceived ?? 0,
        balanceDue: data.netBalance ?? 0,
    };
};

export const mapEventsToReceiptData = (data: EventsData, ctx: OpdDocContext): ReceiptPrintData => {
    const payments = [...(data.payments ?? [])]
        .sort((a, b) => (b.createdDateTime ?? '').localeCompare(a.createdDateTime ?? ''));
    const latest = payments[0];
    const inv = data.currentInvoice;
    const invoiceTotal = data.totalBilledAmount ?? inv?.netAmount ?? 0;
    const balanceAfter = data.netBalance ?? 0;
    const amount = latest?.amount ?? 0;
    return {
        receiptNo: latest?.receiptNo ?? '—',
        date: latest?.createdDateTime ?? new Date().toISOString(),
        invoiceNo: inv?.invoiceNo ?? '—',
        patientName: ctx.patientName,
        patientId: ctx.patientId,
        amount,
        mode: (latest?.paymentMode ?? 'CASH').toString(),
        receivedBy: '',
        remarks: latest?.paymentDescription,
        invoiceTotal,
        invoiceBalanceBefore: balanceAfter + amount,
        invoiceBalanceAfter: balanceAfter,
    };
};

const signedReceived = (p: EventsData['payments'][number]) =>
    ((p.paymentType ?? '').toUpperCase() === 'REFUND' ? -(p.amount ?? 0) : (p.amount ?? 0));

// Receipt for ONE specific payment (multi-step billing). Computes the invoice balance
// before/after this exact payment from the running total of payments up to it.
export const mapPaymentToReceiptData = (data: EventsData, ctx: OpdDocContext, paymentId: string): ReceiptPrintData => {
    const inv = data.currentInvoice;
    const invoiceTotal = data.totalBilledAmount ?? inv?.netAmount ?? 0;
    const chrono = [...(data.payments ?? [])].sort((a, b) => (a.createdDateTime ?? '').localeCompare(b.createdDateTime ?? ''));
    const idx = chrono.findIndex(p => p.paymentId === paymentId);
    const pos = idx >= 0 ? idx : chrono.length - 1;
    const target = chrono[pos];
    const cumulativeUpToHere = chrono.slice(0, pos + 1).reduce((s, p) => s + signedReceived(p), 0);
    const balanceAfter = invoiceTotal - cumulativeUpToHere;
    const balanceBefore = balanceAfter + (target ? signedReceived(target) : 0);
    return {
        receiptNo: target?.receiptNo ?? '—',
        date: target?.createdDateTime ?? new Date().toISOString(),
        invoiceNo: inv?.invoiceNo ?? '—',
        patientName: ctx.patientName,
        patientId: ctx.patientId,
        amount: target?.amount ?? 0,
        mode: (target?.paymentMode ?? 'CASH').toString(),
        receivedBy: '',
        remarks: target?.paymentDescription,
        invoiceTotal,
        invoiceBalanceBefore: balanceBefore,
        invoiceBalanceAfter: balanceAfter,
    };
};

// Consolidated statement listing every payment/refund against the invoice.
export const mapEventsToStatementData = (data: EventsData, ctx: OpdDocContext): PaymentStatementPrintData => {
    const inv = data.currentInvoice;
    const chrono = [...(data.payments ?? [])].sort((a, b) => (a.createdDateTime ?? '').localeCompare(b.createdDateTime ?? ''));
    const payments: PaymentStatementLine[] = chrono.map((p, i) => ({
        srNo: i + 1,
        date: p.createdDateTime ?? new Date().toISOString(),
        receiptNo: p.receiptNo ?? '—',
        mode: (p.paymentMode ?? '—').toString(),
        type: (p.paymentType ?? 'PAYMENT').toString(),
        amount: p.amount ?? 0,
    }));
    return {
        invoiceNo: inv?.invoiceNo ?? '—',
        patientName: ctx.patientName,
        patientId: ctx.patientId,
        ageGender: ctx.ageGender,
        mobile: ctx.mobile,
        date: inv?.invoiceDate ?? new Date().toISOString(),
        invoiceTotal: data.totalBilledAmount ?? inv?.netAmount ?? 0,
        totalReceived: data.amountReceived ?? 0,
        balanceDue: data.netBalance ?? 0,
        payments,
    };
};

// Renders the requested document to a full HTML string using the shared A4 templates.
// Pass opts.paymentId to print the receipt for a specific payment (multi-step billing).
export const getOpdDocHtml = (
    kind: OpdDocKind,
    data: EventsData,
    settings: PrintSettings,
    ctx: OpdDocContext,
    opts?: { paymentId?: string; dayWise?: InvoiceDayWiseRow[]; paperFormat?: 'a4' | 'thermal' },
): string => {
    if (kind === 'invoice') return buildInvoiceA4({ ...mapEventsToInvoiceData(data, ctx), dayWise: opts?.dayWise }, settings);
    if (kind === 'statement') return buildPaymentStatementA4(mapEventsToStatementData(data, ctx), settings);
    const receipt = opts?.paymentId
        ? mapPaymentToReceiptData(data, ctx, opts.paymentId)
        : mapEventsToReceiptData(data, ctx);
    if (kind === 'receipt') return opts?.paperFormat === 'thermal' ? buildReceiptThermal80(receipt, settings) : buildReceiptA4(receipt, settings);
    const billcum: BillCumReceiptPrintData = {
        invoice: { ...mapEventsToInvoiceData(data, ctx), dayWise: opts?.dayWise },
        receipt,
    };
    return buildBillCumReceiptA4(billcum, settings);
};
