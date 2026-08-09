import axios from 'axios';
import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// Assign/release reply with HTTP 400 on a business-rule failure (invalid shift, ward not found,
// nurse already rostered, …) — axios rejects those, so every call here normalizes the rejection
// into a plain Error carrying the server's message.
const messageFrom = (err: unknown, fallback: string): string =>
    (axios.isAxiosError(err) && (err.response?.data as { message?: string } | undefined)?.message) || fallback;

export interface NurseRosterItem {
    nurseShiftAssignmentId: string;
    nurseUserId: string;
    nurseName?: string | null;
    wardCode: string;
    wardName?: string | null;
    shiftCode: string;
    shiftDate?: string | null;   // null = standing assignment
    statusCode: string;          // ACTIVE / RELEASED
    assignedAt: string;
    assignedBy?: string | null;
    unassignedAt?: string | null;
    unassignedBy?: string | null;
    notes?: string | null;
}

export interface HospitalNurseItem {
    userId: string;
    fullName?: string | null;
    mobileNumber: string;
}

export interface WardListItem {
    wardCode: string;
    wardName?: string | null;
    wardType?: string | null;
    bedCount: number;
}

export interface AssignNurseShiftInput {
    nurseUserId: string;
    wardCode: string;
    shiftCode: string;
    shiftDate?: string | null;
    notes?: string;
}

interface GetNurseRosterResponse {
    items?: NurseRosterItem[];
}

interface GetHospitalNursesResponse {
    nurses?: HospitalNurseItem[];
}

interface GetWardListResponse {
    wards?: WardListItem[];
}

export interface NursingStationPatientItem {
    admissionId: string;
    patientId?: string | null;
    patientName?: string | null;
    patientAge?: number | null;
    patientSex?: string | null;
    bedCode?: string | null;
    wardCode: string;
    wardName?: string | null;
    primaryDoctorName?: string | null;
    lastVitalAt?: string | null;
    lastPulse?: number | null;
    lastSystolicBP?: number | null;
    lastDiastolicBP?: number | null;
    lastTemperature?: number | null;
    lastSpO2?: number | null;
    medsDueCount: number;
    medsOverdueCount: number;
    nextDoseAtUtc?: string | null;
    assignedNurseNames: string[];
}

export interface PatientNurseAssignmentItem {
    patientNurseAssignmentId: string;
    nurseUserId: string;
    nurseName?: string | null;
    admissionId: string;
    shiftCode: string;
    shiftDate?: string | null;
    statusCode: string;
    assignedAt: string;
    assignedBy?: string | null;
    unassignedAt?: string | null;
    unassignedBy?: string | null;
    notes?: string | null;
}

export interface AssignPatientNurseInput {
    nurseUserId: string;
    admissionId: string;
    shiftCode: string;
    shiftDate?: string | null;
    notes?: string;
}

interface GetPatientNurseAssignmentsResponse {
    items?: PatientNurseAssignmentItem[];
}

export interface NursingStationSummary {
    nurseName?: string | null;
    hasAssignments: boolean;
    totalPatients: number;
    totalMedsDue: number;
    totalMedsOverdue: number;
    items: NursingStationPatientItem[];
}

interface GetNursingStationSummaryResponse {
    nurseName?: string | null;
    hasAssignments?: boolean;
    totalPatients?: number;
    totalMedsDue?: number;
    totalMedsOverdue?: number;
    items?: NursingStationPatientItem[];
}

export const nursingStationApi = {
    listRoster: (
        opts?: { wardCode?: string; shiftCode?: string; nurseUserId?: string; activeOnly?: boolean },
        hospitalId?: string,
    ): Promise<NurseRosterItem[]> =>
        ipdApiClient
            .get<GetNurseRosterResponse>('/nursing-station/roster', {
                params: {
                    hospitalId: hospitalIdOrThrow(hospitalId),
                    wardCode: opts?.wardCode,
                    shiftCode: opts?.shiftCode,
                    nurseUserId: opts?.nurseUserId,
                    activeOnly: opts?.activeOnly ?? true,
                },
            })
            .then(r => r.items ?? []),

    listNurses: (hospitalId?: string): Promise<HospitalNurseItem[]> =>
        ipdApiClient
            .get<GetHospitalNursesResponse>('/nursing-station/nurses', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.nurses ?? []),

    listWards: (hospitalId?: string): Promise<WardListItem[]> =>
        ipdApiClient
            .get<GetWardListResponse>('/bed/wards', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.wards ?? []),

    getSummary: (opts?: { nurseUserId?: string; wardCode?: string; shiftCode?: string }, hospitalId?: string): Promise<NursingStationSummary> =>
        ipdApiClient
            .get<GetNursingStationSummaryResponse>('/nursing-station/summary', {
                params: {
                    hospitalId: hospitalIdOrThrow(hospitalId),
                    nurseUserId: opts?.nurseUserId,
                    wardCode: opts?.wardCode,
                    shiftCode: opts?.shiftCode,
                },
            })
            .then(r => ({
                nurseName: r.nurseName,
                hasAssignments: r.hasAssignments ?? false,
                totalPatients: r.totalPatients ?? 0,
                totalMedsDue: r.totalMedsDue ?? 0,
                totalMedsOverdue: r.totalMedsOverdue ?? 0,
                items: r.items ?? [],
            })),

    assign: async (input: AssignNurseShiftInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-station/assignment', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not assign the nurse.'));
        }
    },

    release: async (nurseShiftAssignmentId: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-station/assignment/release', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                nurseShiftAssignmentId,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not release the nurse.'));
        }
    },

    // Per-patient assignment -- independent of the ward roster above.
    getPatientAssignments: (admissionId: string, hospitalId?: string): Promise<PatientNurseAssignmentItem[]> =>
        ipdApiClient
            .get<GetPatientNurseAssignmentsResponse>('/nursing-station/patient-assignments', {
                params: { hospitalId: hospitalIdOrThrow(hospitalId), admissionId },
            })
            .then(r => r.items ?? []),

    assignPatient: async (input: AssignPatientNurseInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-station/patient-assignment', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not assign the nurse.'));
        }
    },

    releasePatientAssignment: async (patientNurseAssignmentId: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/nursing-station/patient-assignment/release', {
                hospitalId: hospitalIdOrThrow(hospitalId),
                patientNurseAssignmentId,
            });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not release the nurse.'));
        }
    },
};
