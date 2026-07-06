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

export interface VendorItem {
    vendorId: string;
    vendorCode: string;
    vendorName: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstNumber?: string | null;
    drugLicenseNumber?: string | null;
    paymentTermsDays: number;
    isActive: boolean;
}

export interface UpsertVendorInput {
    vendorId?: string;
    vendorCode: string;
    vendorName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstNumber?: string;
    drugLicenseNumber?: string;
    paymentTermsDays: number;
    isActive: boolean;
}

export const vendorService = {
    getVendors: (hospitalId?: string, includeInactive = false): Promise<VendorItem[]> =>
        ipdApiClient
            .get<{ vendors?: VendorItem[] }>('/inventory/vendors', { params: { hospitalId: hospitalIdOrThrow(hospitalId), includeInactive } })
            .then(r => r.vendors ?? []),

    upsertVendor: async (input: UpsertVendorInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/inventory/vendors', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the vendor.'));
        }
    },
};
