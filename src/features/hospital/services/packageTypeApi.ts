import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export interface PackageTypeItem {
    packageTypeId: string;
    name: string;
    price?: number | null;
    components: string[];
    isActive: boolean;
    updatedAt: string;
    updatedBy?: string;
}

export interface GetPackageTypesResponse {
    success: boolean;
    message?: string;
    packageTypes: PackageTypeItem[];
}

export interface UpsertPackageTypeRequest {
    packageTypeId?: string;
    hospitalId?: string;
    name: string;
    price?: number | null;
    components?: string[];
    isActive?: boolean;
}

export interface UpsertPackageTypeResponse {
    success: boolean;
    message?: string;
    packageTypeId?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const packageTypeApi = {
    list: (opts: { hospitalId?: string; includeInactive?: boolean } = {}): Promise<GetPackageTypesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.PACKAGE_TYPE.LIST(hospitalIdOrThrow(opts.hospitalId), opts.includeInactive)),

    upsert: (req: UpsertPackageTypeRequest): Promise<UpsertPackageTypeResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.PACKAGE_TYPE.UPSERT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
            isActive: req.isActive ?? true,
        }),
};
