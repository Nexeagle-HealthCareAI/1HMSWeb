export interface PrintSettings {
    hospitalName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    gstin?: string;
    logoUrl?: string;
    footerText?: string;
    terms?: string[];
}

export interface PrintItem {
    srNo: number;
    description: string;
    qty: number;
    rate: number;
    discount: number;
    total: number;
}

export interface InvoicePrintData {
    invoiceNo: string;
    date: string;
    patientName: string;
    patientId: string;
    ageGender: string;
    mobile: string;
    doctorName: string;
    department?: string;
    status: 'OPEN' | 'FINAL' | 'CANCELLED';
    items: PrintItem[];
    subTotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
}

export interface ReceiptPrintData {
    receiptNo: string;
    date: string;
    invoiceNo: string;
    patientName: string;
    patientId: string;
    amount: number;
    mode: string; // CASH | CARD | UPI
    transactionId?: string;
    receivedBy: string;
    remarks?: string;
    invoiceTotal: number;
    invoiceBalanceBefore: number;
    invoiceBalanceAfter: number;
}

export interface BillCumReceiptPrintData {
    invoice: InvoicePrintData;
    receipt: ReceiptPrintData;
}

export interface DashboardInvoice {
    id: string; // Visit ID
    patientName: string;
    patientId: string;
    date: string;
    status: 'OPEN' | 'FINAL';
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    latestReceiptNo?: string;
}

export interface LedgerEntry {
    date: string;
    particulars: string;
    type: 'CHARGE' | 'PAYMENT' | 'DISCOUNT' | 'REFUND';
    debit: number;
    credit: number;
    balance: number;
}
