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

export type IcuDeviceType = 'CENTRAL_LINE' | 'URINARY_CATHETER' | 'ETT';

export interface DeviceAssignmentItem {
    deviceAssignmentId: string;
    deviceType: IcuDeviceType;
    insertionSite?: string | null;
    indication?: string | null;
    insertedByDoctorName: string;
    insertedAt: string;
    removedAt?: string | null;
    removedBy?: string | null;
    removalReason?: string | null;
    statusCode: 'ACTIVE' | 'REMOVED';
    notes?: string | null;
    daysInSitu: number;
}

export interface InsertDeviceFields {
    deviceType: IcuDeviceType;
    insertionSite?: string;
    indication?: string;
    insertedByDoctorName: string;
    notes?: string;
}

interface GetDeviceAssignmentsResponse {
    success?: boolean;
    message?: string;
    devices?: DeviceAssignmentItem[];
}

export const deviceApi = {
    getDevices: (admissionId: string, hospitalId?: string): Promise<DeviceAssignmentItem[]> =>
        ipdApiClient
            .get<GetDeviceAssignmentsResponse>('/devices', { params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId } })
            .then(r => r.devices ?? []),

    insert: async (admissionId: string, fields: InsertDeviceFields, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/devices', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, ...fields });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not insert the device.'));
        }
    },

    remove: async (deviceAssignmentId: string, removalReason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/devices/remove', { hospitalId: hospitalIdOrThrow(hospitalId), deviceAssignmentId, removalReason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not remove the device.'));
        }
    },
};
