import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';
import type { BedMasterItem } from './bedService';

export interface RoomItem {
    roomId: string;
    wardCode?: string;
    wardName?: string;
    wardType?: string;
    floorNo?: string;
    roomNo?: string;
    roomType?: string;
    capacityInRoom: number;
    dailyRate: number;
    isActive: boolean;
    bedCount: number;
    occupiedBedCount: number;
    updatedAt: string;
    updatedBy?: string;
}

export interface GetRoomsResponse {
    items: RoomItem[];
    page: number;
    pageSize: number;
    totalCount: number;
}

export interface RoomDetail extends RoomItem {
    hospitalId: string;
    createdAt: string;
    createdBy?: string;
    beds: BedMasterItem[];
}

export interface UpsertRoomRequest {
    roomId?: string;
    hospitalId?: string;
    wardCode?: string;
    wardName?: string;
    wardType?: string;
    floorNo?: string;
    roomNo: string;
    roomType?: string;
    capacityInRoom: number;
    dailyRate: number;
    isActive: boolean;
}

export interface UpsertRoomResponse {
    success: boolean;
    message?: string;
    roomId: string;
    roomNo?: string;
    updatedAt: string;
    updatedBy?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const roomService = {
    list: (opts: { page?: number; pageSize?: number; hospitalId?: string } = {}): Promise<GetRoomsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ROOM.GET_MASTERS(
            hospitalIdOrThrow(opts.hospitalId),
            opts.page ?? 1,
            opts.pageSize ?? 50,
        )),

    getById: (roomId: string, hospitalId?: string): Promise<RoomDetail> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ROOM.GET_MASTER_BY_ID(roomId, hospitalIdOrThrow(hospitalId))),

    upsert: (req: UpsertRoomRequest): Promise<UpsertRoomResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.ROOM.UPSERT_MASTER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
