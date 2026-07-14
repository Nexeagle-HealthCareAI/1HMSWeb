import React, { useEffect, useState } from 'react';
import { BillingDashboard } from './BillingDashboard';
import { ipdBillingService } from '../services/ipdBillingService';
import { expenseService, type ExpenseItem, type GetExpensesResponse } from '../services/expenseService';
import { creditApprovalService, type CreditApprovalItem, type GetCreditApprovalsResponse } from '../services/creditApprovalService';
import { referrerApi, type GetReferrersResponse } from '@/features/appointment/services/referrerApi';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Billing dashboard (Revenue / Expense / Incentive / Approvals
 * tabs). Stubs every API call with mock data so the mobile UI can be reviewed without a login or a
 * live backend. Routed at /billing-preview under import.meta.env.DEV (see AppRoutes).
 */

const iso = (daysAgo: number, h = 10, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
};

// ── Revenue tab: ipdBillingService.dashboard() ──
const DASHBOARD_MOCK = {
    success: true,
    data: [
        {
            patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma',
            encounters: [
                { encounterId: 'enc-1', visitType: 'IPD', invoiceDate: iso(0), status: 'OPEN', doctorName: 'Dr. Meera Kulkarni', netAmount: 48500, paidAmount: 20000, dueAmount: 28500 },
            ],
        },
        {
            patientId: 'UHID-100199', patientName: 'Anita Deshpande',
            encounters: [
                { encounterId: 'enc-2', visitType: 'OPD', invoiceDate: iso(0), status: 'FINALIZED', doctorName: 'Dr. Arjun Rao', netAmount: 2500, paidAmount: 2500, dueAmount: 0 },
            ],
        },
        {
            patientId: 'UHID-100777', patientName: 'Mohammed Faiz',
            encounters: [
                { encounterId: 'enc-3', visitType: 'ER', invoiceDate: iso(1), status: 'OPEN', doctorName: 'Dr. Sneha Pillai', netAmount: 9200, paidAmount: 10000, dueAmount: -800 },
            ],
        },
        {
            patientId: 'UHID-100051', patientName: 'Sunita Rani',
            encounters: [
                { encounterId: 'enc-4', visitType: 'IPD', invoiceDate: iso(2), status: 'FINALIZED', doctorName: 'Dr. Meera Kulkarni', netAmount: 132000, paidAmount: 100000, dueAmount: 32000 },
                { encounterId: 'enc-4b', visitType: 'OPD', invoiceDate: iso(20), status: 'FINALIZED', doctorName: 'Dr. Arjun Rao', netAmount: 1500, paidAmount: 1000, dueAmount: 500 },
            ],
        },
        {
            patientId: 'UHID-100634', patientName: 'Vikram Singh Rathore',
            encounters: [
                { encounterId: 'enc-5', visitType: 'LAB', invoiceDate: iso(3), status: 'CANCELLED', isCancelled: true, doctorName: 'Dr. Sneha Pillai', netAmount: 800, paidAmount: 0, dueAmount: 0, cancelReason: 'Duplicate order' },
            ],
        },
    ],
};
ipdBillingService.dashboard = async () => { await new Promise(r => setTimeout(r, 200)); return DASHBOARD_MOCK as any; };

// ── Expense tab ──
const EXPENSES: ExpenseItem[] = [
    { expenseId: 'e1', expenseDate: iso(0, 9, 15), categoryCode: 'FOOD', vendor: 'Annapurna Caterers', description: 'Staff lunch', amount: 3200, paymentMode: 'CASH', statusCode: 'PAID', updatedAt: iso(0) },
    { expenseId: 'e2', expenseDate: iso(0, 11, 0), categoryCode: 'PHARMACY_PURCHASE', vendor: 'MedPlus Distributors', description: 'Monthly medicine restock', amount: 84500, paymentMode: 'BANK', statusCode: 'PAID', updatedAt: iso(0) },
    { expenseId: 'e3', expenseDate: iso(1, 14, 30), categoryCode: 'EQUIPMENT', vendor: 'Siemens Healthineers', description: 'ECG machine service', amount: 12000, paymentMode: 'UPI', statusCode: 'PENDING', updatedAt: iso(1) },
    { expenseId: 'e4', expenseDate: iso(2, 10, 0), categoryCode: 'UTILITIES', vendor: 'State Electricity Board', description: 'Monthly power bill', amount: 45300, paymentMode: 'BANK', statusCode: 'PAID', updatedAt: iso(2) },
    { expenseId: 'e5', expenseDate: iso(3, 16, 0), categoryCode: 'MAINTENANCE', vendor: 'CleanPro Services', description: 'Housekeeping contract', amount: 18000, paymentMode: 'CASH', statusCode: 'PENDING', updatedAt: iso(3) },
];
const expensesResponse: GetExpensesResponse = {
    items: EXPENSES, page: 1, pageSize: 200, totalCount: EXPENSES.length,
    totalAmount: EXPENSES.reduce((s, e) => s + e.amount, 0),
    pendingAmount: EXPENSES.filter(e => e.statusCode === 'PENDING').reduce((s, e) => s + e.amount, 0),
    categoryCount: new Set(EXPENSES.map(e => e.categoryCode)).size,
};
expenseService.list = async () => { await new Promise(r => setTimeout(r, 150)); return expensesResponse; };
expenseService.upsert = async () => { await new Promise(r => setTimeout(r, 150)); return { expenseId: 'new-1' }; };
expenseService.remove = async () => { await new Promise(r => setTimeout(r, 150)); return { isSuccess: true }; };

// ── Incentive tab: referrerApi.getReferrers (via useReferrers/react-query) ──
const REFERRERS: GetReferrersResponse = {
    referrers: [
        { referrerId: 'r1', referrerName: 'Dr. Kavita Menon (ENT)', referrerType: 'DOCTOR', phone: '98200 11223', defaultRatePercent: 10, isActive: true, pan: 'ABCDE1234F' },
        { referrerId: 'r2', referrerName: 'City Diagnostics Lab', referrerType: 'AGENT', phone: '98200 44556', defaultRatePercent: 5, isActive: true },
        { referrerId: 'r3', referrerName: 'Suresh Patil (Field Agent)', referrerType: 'AGENT', phone: '98200 77889', defaultRatePercent: 7.5, isActive: true },
    ],
};
referrerApi.getReferrers = async () => { await new Promise(r => setTimeout(r, 150)); return REFERRERS; };

// ── Approvals tab ──
const APPROVALS: CreditApprovalItem[] = [
    { creditApprovalId: 'a1', encounterId: 'enc-1', patientId: 'UHID-100482', paymentType: 'ADVANCE', requestedAmount: 15000, paymentMode: 'CASH', resultingCreditBalance: 15000, reason: 'Advance for planned surgery', requestedBy: 'Front Desk', requestedAt: iso(0, 9, 0), status: 'PENDING' },
    { creditApprovalId: 'a2', encounterId: 'enc-3', patientId: 'UHID-100777', paymentType: 'REFUND', requestedAmount: 800, resultingCreditBalance: 0, reason: 'Overpayment refund', requestedBy: 'Reception', requestedAt: iso(1, 13, 0), status: 'PENDING' },
    { creditApprovalId: 'a3', encounterId: 'enc-4', patientId: 'UHID-100051', paymentType: 'DISCOUNT', requestedAmount: 5000, resultingCreditBalance: 0, reason: 'Loyalty discount', requestedBy: 'Billing Desk', requestedAt: iso(3), status: 'APPROVED', decidedAt: iso(2), decidedBy: 'Admin' },
];
const approvalsResponse: GetCreditApprovalsResponse = { success: true, items: APPROVALS };
creditApprovalService.list = async (opts) => {
    await new Promise(r => setTimeout(r, 150));
    const items = opts?.status ? APPROVALS.filter(a => a.status === opts.status) : APPROVALS;
    return { success: true, items };
};

const BillingDashboardPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL', userRoles: ['Admin'] });
        setTick(t => t + 1);
    }, []);

    return <BillingDashboard />;
};

export default BillingDashboardPreview;
