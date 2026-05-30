import { GetEncounterEventsResponse } from '../services/ipdBillingService';
import { HospitalData } from '@/features/hospital/services/hospitalApi';
import {
    InvoicePrintData, ReceiptPrintData, BillCumReceiptPrintData, PrintSettings, PrintItem,
} from '@/types/print';
import { buildInvoiceA4 } from '@/printTemplates/invoiceA4';
import { buildReceiptA4 } from '@/printTemplates/receiptA4';
import { buildBillCumReceiptA4 } from '@/printTemplates/billCumReceiptA4';

export type OpdDocKind = 'invoice' | 'receipt' | 'billcum';

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

const mapStatus = (s?: string | null): 'OPEN' | 'FINAL' | 'CANCELLED' => {
    const up = (s ?? '').toUpperCase();
    if (up === 'FINALIZED' || up === 'FINAL' || up === 'PAID') return 'FINAL';
    if (up === 'CANCELLED' || up === 'CANCELED') return 'CANCELLED';
    return 'OPEN';
};

export const mapEventsToInvoiceData = (data: EventsData, ctx: OpdDocContext): InvoicePrintData => {
    const inv = data.currentInvoice;
    const charges = data.charges ?? [];
    const items: PrintItem[] = charges.map((c, i) => ({
        srNo: i + 1,
        description: c.displayName ?? c.categoryCode ?? 'Charge',
        qty: c.qty ?? 1,
        rate: c.rate ?? 0,
        discount: c.discountAmount ?? 0,
        total: c.netAmount ?? 0,
    }));
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

// Renders the requested document to a full HTML string using the shared A4 templates.
export const getOpdDocHtml = (
    kind: OpdDocKind,
    data: EventsData,
    settings: PrintSettings,
    ctx: OpdDocContext,
): string => {
    if (kind === 'invoice') return buildInvoiceA4(mapEventsToInvoiceData(data, ctx), settings);
    if (kind === 'receipt') return buildReceiptA4(mapEventsToReceiptData(data, ctx), settings);
    const billcum: BillCumReceiptPrintData = {
        invoice: mapEventsToInvoiceData(data, ctx),
        receipt: mapEventsToReceiptData(data, ctx),
    };
    return buildBillCumReceiptA4(billcum, settings);
};
