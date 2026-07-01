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

export interface MedicationOrderLineItem {
    orderLineId: string;
    drugName?: string | null;
    saltName?: string | null;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    durationDays?: number | null;
    instructions?: string | null;
    qty: number;
    statusCode: string;          // ACTIVE / DISCONTINUED
    chargeEventId?: string | null;
    chargedAmount?: number | null;
    chargeVoided: boolean;
}

export interface MedicationOrderItem {
    orderId: string;
    statusCode: string;          // ACTIVE / DISCONTINUED / COMPLETED
    orderedAt: string;
    orderedBy?: string | null;
    notes?: string | null;
    lines: MedicationOrderLineItem[];
}

interface GetMedicationOrdersResponse {
    success?: boolean;
    message?: string;
    orders?: MedicationOrderItem[];
}

export interface MedicationOrderLineInput {
    chargeId?: string;            // ChargeMaster pharmacy item — omit for a drug with no billing link
    drugName: string;
    saltName?: string;
    dose?: string;
    route?: string;
    frequency?: string;
    durationDays?: number;
    instructions?: string;
    qty?: number;
}

export const medicationOrderApi = {
    getOrders: (admissionId: string, hospitalId?: string): Promise<MedicationOrderItem[]> =>
        ipdApiClient
            .get<GetMedicationOrdersResponse>('/medication-order', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.orders ?? []),

    placeOrder: async (admissionId: string, lines: MedicationOrderLineInput[], notes?: string, orderedByDoctorId?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/medication-order', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                admissionId,
                orderedByDoctorId,
                notes,
                lines,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not place the medication order.'));
        }
    },

    discontinueLine: async (orderLineId: string, reason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/medication-order/discontinue-line', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                orderLineId,
                reason,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not discontinue the order line.'));
        }
    },
};
