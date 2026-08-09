import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export interface OrderSetLine {
    itemName: string;
    orderType: string;   // MEDICATION / LAB / RADIOLOGY / PROCEDURE / DIET / NURSING
    saltName?: string | null;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    durationDays?: number | null;
    instructions?: string | null;
    isHighAlert: boolean;
    qty: number;
}

export interface OrderSetItem {
    orderSetId: string;
    name: string;
    category: string;
    lines: OrderSetLine[];
    isActive: boolean;
    updatedAt: string;
    updatedBy?: string | null;
}

export interface GetOrderSetsResponse {
    success: boolean;
    message?: string;
    orderSets: OrderSetItem[];
}

export interface UpsertOrderSetRequest {
    orderSetId?: string;
    hospitalId?: string;
    name: string;
    category?: string;
    lines: OrderSetLine[];
    isActive?: boolean;
}

export interface UpsertOrderSetResponse {
    success: boolean;
    message?: string;
    orderSetId?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const orderSetApi = {
    list: (opts: { hospitalId?: string; category?: string; includeInactive?: boolean } = {}): Promise<GetOrderSetsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ORDER_SET.LIST(hospitalIdOrThrow(opts.hospitalId), { category: opts.category, includeInactive: opts.includeInactive })),

    upsert: (req: UpsertOrderSetRequest): Promise<UpsertOrderSetResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.ORDER_SET.UPSERT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
            isActive: req.isActive ?? true,
        }),
};
