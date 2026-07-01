import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// Unlike /admission, the bed/status endpoints reply with HTTP 400 on a business-rule failure
// (bed already occupied, admission already closed, …) — axios rejects those, so every call here
// normalizes the rejection into a plain Error carrying the server's message.
const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface BedBoardItem {
    bedId: string;
    wardCode?: string | null;
    wardName?: string | null;
    wardType?: string | null;
    floorNo?: string | null;
    roomCode?: string | null;
    roomType?: string | null;
    bedCode?: string | null;
    bedName?: string | null;
    statusCode?: string | null;      // BedMaster status: AVAILABLE/OCCUPIED/CLEANING/RESERVED/BLOCKED
    genderRestriction?: string | null;
    isActive: boolean;
    effectiveDailyRate: number;
    sortOrder: number;

    // Occupancy — present only when a patient currently holds this bed.
    bedAssignmentId?: string | null;
    admissionId?: string | null;
    admissionNo?: string | null;
    admissionType?: string | null;
    payerType?: string | null;
    assignedAt?: string | null;
    patientId?: string | null;
    patientName?: string | null;
    patientAge?: number | null;
    patientSex?: string | null;
}

interface GetBedBoardResponse {
    success?: boolean;
    message?: string;
    items?: BedBoardItem[];
}

export type AdmissionExitStatus = 'DISCHARGE_INITIATED' | 'DISCHARGE_BILLED' | 'LAMA' | 'DAMA' | 'TRANSFERRED_OUT' | 'EXPIRED' | 'CANCELLED';

export const bedBoardApi = {
    getBoard: (wardCode?: string, hospitalId?: string): Promise<BedBoardItem[]> =>
        ipdApiClient
            .get<GetBedBoardResponse>('/bed/board', { params: { hospitalId: hospitalIdOrThrow(hospitalId), wardCode } })
            .then(r => r.items ?? []),

    assignBed: async (admissionId: string, bedId: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/bed/assign', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, bedId });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not assign the bed.'));
        }
    },

    releaseBed: async (admissionId: string, notes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/bed/release', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, notes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not release the bed.'));
        }
    },

    transferBed: async (admissionId: string, newBedId: string, notes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/bed/transfer', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, newBedId, notes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not transfer the bed.'));
        }
    },

    dischargeAdmission: async (admissionId: string, dischargeNotes?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/admission/discharge', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, dischargeNotes });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not discharge the patient.'));
        }
    },

    updateAdmissionStatus: async (admissionId: string, toStatus: AdmissionExitStatus, reason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/admission/status', { hospitalId: hospitalIdOrThrow(hospitalId), admissionId, toStatus, reason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not update the admission status.'));
        }
    },
};
