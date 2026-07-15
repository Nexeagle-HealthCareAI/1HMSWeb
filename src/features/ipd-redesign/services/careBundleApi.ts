import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface CareBundleItemDef {
    key: string;
    label: string;
}

export interface CareBundleItemResult {
    key: string;
    compliant: boolean;
}

export interface DeviceCareBundleCheckItem {
    checkId: string;
    items: CareBundleItemResult[];
    compliantCount: number;
    totalItems: number;
    allCompliant: boolean;
    notes?: string | null;
    checkedBy: string;
    checkedAt: string;
}

interface GetDeviceCareBundleChecksResponse {
    success?: boolean;
    message?: string;
    canonicalItems?: CareBundleItemDef[];
    checks?: DeviceCareBundleCheckItem[];
}

export const careBundleApi = {
    getChecks: (deviceAssignmentId: string, hospitalId?: string): Promise<{ canonicalItems: CareBundleItemDef[]; checks: DeviceCareBundleCheckItem[] }> =>
        ipdApiClient
            .get<GetDeviceCareBundleChecksResponse>('/devices/bundle-check', { params: { hospitalId: hospitalIdOrThrow(hospitalId), deviceAssignmentId } })
            .then(r => ({ canonicalItems: r.canonicalItems ?? [], checks: r.checks ?? [] })),

    submit: async (deviceAssignmentId: string, items: CareBundleItemResult[], notes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/devices/bundle-check', { hospitalId: hospitalIdOrThrow(hospitalId), deviceAssignmentId, items, notes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the bundle check.'));
        }
    },
};
