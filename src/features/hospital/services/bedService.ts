import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type ApiBedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED' | 'BLOCKED';

export interface BedMasterItem {
    bedId: string;
    roomId?: string;
    wardCode?: string;
    wardName?: string;
    wardType?: string;
    floorNo?: string;
    roomCode?: string;
    roomType?: string;
    capacityInRoom?: number;
    wardRoomDailyRate: number;
    bedDailyRateOverride?: number;
    effectiveDailyRate: number;
    incentiveAmount?: number;
    bedCode?: string;
    bedName?: string;
    statusCode?: ApiBedStatus | string;
    genderRestriction?: string;
    isActive: boolean;
    sortOrder: number;
    lastStatusAt?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface GetBedMastersResponse {
    items: BedMasterItem[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface BedMasterDetail extends BedMasterItem {
    hospitalId: string;
    createdAt: string;
    createdBy?: string;
}

export interface UpsertBedMasterRequest {
    bedId?: string;
    hospitalId?: string;
    roomId?: string;
    wardCode?: string;
    wardName?: string;
    wardType?: string;
    floorNo?: string;
    roomCode?: string;
    roomType?: string;
    capacityInRoom?: number;
    wardRoomDailyRate: number;
    bedDailyRateOverride?: number;
    incentiveAmount?: number;
    bedCode?: string;
    bedName?: string;
    statusCode?: string;
    genderRestriction?: string;
    isActive: boolean;
    sortOrder?: number;
}

export interface UpsertBedMasterResponse {
    bedId: string;
    bedCode?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface BulkCreateBedMasterRequest {
    hospitalId?: string;
    roomId?: string;
    wardCode?: string;
    wardName?: string;
    wardType?: string;
    floorNo?: string;
    roomCode?: string;
    roomType?: string;
    capacityInRoom?: number;
    wardRoomDailyRate: number;
    bedDailyRateOverride?: number;
    incentiveAmount?: number;
    genderRestriction?: string;
    statusCode?: string;
    isActive: boolean;
    bedCodePrefix?: string;
    count: number;
}

export interface BulkCreateBedMasterResponse {
    success: boolean;
    createdCount: number;
    firstBedCode?: string;
    lastBedCode?: string;
    message?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const bedService = {
    list: (opts: { page?: number; pageSize?: number; hospitalId?: string } = {}): Promise<GetBedMastersResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BED.GET_MASTERS(
            hospitalIdOrThrow(opts.hospitalId),
            opts.page ?? 1,
            opts.pageSize ?? 50,
        )),

    getById: (bedId: string, hospitalId?: string): Promise<BedMasterDetail> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.BED.GET_MASTER_BY_ID(bedId, hospitalIdOrThrow(hospitalId))),

    upsert: (req: UpsertBedMasterRequest): Promise<UpsertBedMasterResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.BED.UPSERT_MASTER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    bulkCreate: (req: BulkCreateBedMasterRequest): Promise<BulkCreateBedMasterResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.BED.BULK_CREATE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
