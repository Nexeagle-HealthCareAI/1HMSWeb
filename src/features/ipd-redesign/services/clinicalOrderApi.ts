import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// The order/discontinue endpoints reply HTTP 400 on a business-rule failure (same convention as
// bedBoardApi) — normalize the axios rejection into a plain Error carrying the server's message.
const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

// One generic order type for every CPOE tab — Medication/Lab/Radiology/Procedure/Diet/Nursing.
export type ClinicalOrderType = 'MEDICATION' | 'LAB' | 'RADIOLOGY' | 'PROCEDURE' | 'DIET' | 'NURSING';
export type OrderUrgency = 'ROUTINE' | 'URGENT' | 'STAT';
// Fixed dosing frequencies for MEDICATION orders (drives MAR's computed dose schedule). Orders
// placed before this existed may still carry an arbitrary free-text Frequency string on the wire.
export type MedicationFrequency = 'STAT' | 'OD' | 'BD' | 'TDS' | 'QID' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'SOS';

export interface ClinicalOrderLineItem {
    orderLineId: string;
    itemName?: string | null;
    saltName?: string | null;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    durationDays?: number | null;
    instructions?: string | null;
    urgency?: string | null;
    scheduledAt?: string | null;
    isHighAlert: boolean;
    qty: number;
    statusCode: string;          // ACTIVE / DISCONTINUED
    chargeEventId?: string | null;
    chargedAmount?: number | null;
    chargeVoided: boolean;
}

export interface ClinicalOrderItem {
    orderId: string;
    statusCode: string;          // ACTIVE / DISCONTINUED / COMPLETED
    orderedAt: string;
    orderedBy?: string | null;
    notes?: string | null;
    lines: ClinicalOrderLineItem[];
}

interface GetClinicalOrdersResponse {
    success?: boolean;
    message?: string;
    orders?: ClinicalOrderItem[];
}

export interface ClinicalOrderLineInput {
    chargeId?: string;            // ChargeMaster item — omit for an item with no billing link
    itemName: string;
    saltName?: string;
    dose?: string;
    route?: string;
    frequency?: string;
    durationDays?: number;
    instructions?: string;
    urgency?: OrderUrgency;
    scheduledAt?: string;
    isHighAlert?: boolean;
    qty?: number;
}

export const clinicalOrderApi = {
    getOrders: (admissionId: string, orderType: ClinicalOrderType, hospitalId?: string): Promise<ClinicalOrderItem[]> =>
        ipdApiClient
            .get<GetClinicalOrdersResponse>('/clinical-order', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, orderType } })
            .then(r => r.orders ?? []),

    placeOrder: async (
        admissionId: string,
        orderType: ClinicalOrderType,
        lines: ClinicalOrderLineInput[],
        notes?: string,
        orderedByDoctorId?: string,
        hospitalId?: string,
    ) => {
        try {
            return await ipdApiClient.post('/clinical-order', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                admissionId,
                orderType,
                orderedByDoctorId,
                notes,
                lines,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not place the order.'));
        }
    },

    discontinueLine: async (orderLineId: string, reason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/clinical-order/discontinue-line', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                orderLineId,
                reason,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not discontinue the order line.'));
        }
    },
};
