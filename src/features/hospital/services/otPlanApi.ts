import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type RoomCategory = 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE';
export type IcuLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export interface OTPlanItem {
    otPlanId: string;
    departmentId?: string | null;
    departmentName?: string | null;
    packageTypeId?: string | null;
    packageTypeName?: string | null;
    packageTypePrice?: number | null;
    planName: string;
    procedureName: string;
    defaultRoomCategory?: RoomCategory | null;
    suggestedIcuLevel?: IcuLevel | null;
    isActive: boolean;
    displayOrder: number;
    updatedAt: string;
    updatedBy?: string;
}

export interface GetOTPlansResponse {
    success: boolean;
    message?: string;
    plans: OTPlanItem[];
}

export interface UpsertOTPlanRequest {
    otPlanId?: string;
    hospitalId?: string;
    departmentId?: string | null;
    packageTypeId?: string | null;
    planName: string;
    procedureName: string;
    defaultRoomCategory?: RoomCategory | null;
    suggestedIcuLevel?: IcuLevel | null;
    isActive: boolean;
    displayOrder?: number;
}

export interface UpsertOTPlanResponse {
    success: boolean;
    message?: string;
    otPlanId?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const otPlanApi = {
    list: (opts: { hospitalId?: string; departmentId?: string; includeInactive?: boolean } = {}): Promise<GetOTPlansResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.OT_PLAN.LIST(hospitalIdOrThrow(opts.hospitalId), opts.departmentId, opts.includeInactive)),

    upsert: (req: UpsertOTPlanRequest): Promise<UpsertOTPlanResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.OT_PLAN.UPSERT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
