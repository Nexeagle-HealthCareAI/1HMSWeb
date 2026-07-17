import React, { useEffect, useState } from 'react';
import { BillingPage } from './BillingPage';
import { patientService } from '../services/patientService';
import { ipdBillingService, type GetEncounterEventsResponse } from '../services/ipdBillingService';
import type { Patient } from '../types';
import { useAuthStore } from '@/store/authStore';

/**
 * DEV-ONLY preview harness for the Billing Ledger page (the "+ New Bill" / per-patient billing
 * flow — search a patient, pick or create a visit, add charges/payments). Stubs patient search and
 * the encounter/ledger reads with mock data so it can be reviewed without a login or live backend.
 * Routed at /billing-ledger-preview only under import.meta.env.DEV (see AppRoutes).
 */

const MOCK_PATIENT: Patient = { id: 'p1', patientId: 'UHID-100482', name: 'Rajesh Kumar Sharma', mobile: '98200 11223', age: 54, sex: 'M' };

const now = () => new Date().toISOString();

patientService.searchPatients = async (query: string): Promise<Patient[]> => {
    await new Promise(r => setTimeout(r, 200));
    if (query.length < 3) return [];
    return [MOCK_PATIENT];
};

ipdBillingService.getPatientEvents = async (): Promise<any> => {
    await new Promise(r => setTimeout(r, 150));
    return {
        success: true,
        data: {
            encounters: [
                { encounterId: 'enc-1', invoiceNo: 'INV-2026-0481', invoiceDate: now(), doctorName: 'Dr. Meera Kulkarni', status: 'OPEN', isCancelled: false, totalBilled: 48500, balance: 28500, paymentStatus: 'PART' },
            ],
        },
    };
};

const EVENTS_RESPONSE: GetEncounterEventsResponse = {
    success: true,
    data: {
        totalBilledAmount: 48500,
        amountReceived: 20000,
        netBalance: 28500,
        currentInvoice: { invoiceId: 'inv-1', invoiceNo: 'INV-2026-0481', statusCode: 'DRAFT', invoiceDate: now(), discountAmount: 0 },
        charges: [
            { chargeEventId: 'c1', createdDateTime: now(), displayName: 'ICU Room Charge — 16 Jul', categoryCode: 'ROOM', rate: 12000, qty: 1, grossAmount: 12000, discountAmount: 0, netAmount: 12000, statusCode: 'POSTED', isInvoiced: true },
            { chargeEventId: 'c2', createdDateTime: now(), displayName: 'Coronary Angiography', categoryCode: 'PROCEDURE', rate: 25000, qty: 1, grossAmount: 25000, discountAmount: 2500, netAmount: 22500, statusCode: 'POSTED', isInvoiced: true },
            { chargeEventId: 'c3', createdDateTime: now(), displayName: 'CBC, Lipid Profile', categoryCode: 'LAB', rate: 1500, qty: 1, grossAmount: 1500, discountAmount: 0, netAmount: 1500, statusCode: 'POSTED', isInvoiced: true },
            { chargeEventId: 'c4', createdDateTime: now(), displayName: 'Cardiologist Consult', categoryCode: 'CONSULT', rate: 1500, qty: 1, grossAmount: 1500, discountAmount: 0, netAmount: 1500, statusCode: 'VOID', isInvoiced: false },
        ],
        payments: [
            { paymentId: 'p1', createdDateTime: now(), paymentType: 'PAYMENT', paymentMode: 'CASH', receiptNo: 'RCPT-1001', amount: 20000 },
        ],
    },
};
ipdBillingService.getEncounterEvents = async (): Promise<GetEncounterEventsResponse> => {
    await new Promise(r => setTimeout(r, 150));
    return EVENTS_RESPONSE;
};

const BillingLedgerPreview: React.FC = () => {
    const [, setTick] = useState(0);
    useEffect(() => {
        useAuthStore.setState({ hospitalId: 'PREVIEW-HOSPITAL' });
        setTick(t => t + 1);
    }, []);

    return <BillingPage />;
};

export default BillingLedgerPreview;
