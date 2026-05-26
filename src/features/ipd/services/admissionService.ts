import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type ApiAdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'CANCELLED';

export interface AdmitPatientRequest {
    hospitalId?: string;
    patientId: string;
    bedId: string;
    primaryDoctorId?: string;
    expectedDischargeAt?: string;
    admissionReason?: string;
    diagnosis?: string;
}

export interface AdmitPatientResponse {
    success: boolean;
    message?: string;
    data?: {
        admissionId: string;
        admissionNo: string;
        encounterId: string;
        bedAssignmentId: string;
        bedId: string;
        bedCode?: string;
        dailyRate: number;
    };
}

export interface TransferBedRequest {
    hospitalId?: string;
    admissionId: string;
    newBedId: string;
    notes?: string;
}

export interface TransferBedResponse {
    success: boolean;
    message?: string;
    data?: {
        admissionId: string;
        oldBedId: string;
        newBedId: string;
        newAssignmentId: string;
        newDailyRate: number;
    };
}

export interface DischargePatientRequest {
    hospitalId?: string;
    admissionId: string;
    dischargeNotes?: string;
}

export interface DischargePatientResponse {
    success: boolean;
    message?: string;
    data?: {
        admissionId: string;
        dischargedAt: string;
        lengthOfStayDays: number;
        encounterId: string;
    };
}

export interface CancelAdmissionRequest {
    hospitalId?: string;
    admissionId: string;
    cancelReason: string;
}

export interface CancelAdmissionResponse {
    success: boolean;
    message?: string;
}

export interface CurrentBedInfo {
    assignmentId: string;
    bedId: string;
    bedCode?: string;
    wardName?: string;
    roomCode?: string;
    dailyRate: number;
    assignedAt: string;
}

export interface BedHistoryItem {
    assignmentId: string;
    bedId: string;
    bedCode?: string;
    wardName?: string;
    assignedAt: string;
    releasedAt?: string;
    dailyRateSnapshot: number;
    statusCode?: string;
}

export interface AdmissionDetail {
    admissionId: string;
    hospitalId: string;
    patientId: string;
    patientName?: string;
    patientMobile?: string;
    patientAgeYears?: number;
    patientSex?: string;
    encounterId: string;
    primaryDoctorId?: string;
    primaryDoctorName?: string;
    admissionNo?: string;
    admittedAt: string;
    expectedDischargeAt?: string;
    dischargedAt?: string;
    dischargedBy?: string;
    dischargeNotes?: string;
    statusCode?: ApiAdmissionStatus | string;
    admissionReason?: string;
    diagnosis?: string;
    currentBed?: CurrentBedInfo;
    bedHistory: BedHistoryItem[];
}

export interface GetAdmissionResponse {
    success: boolean;
    message?: string;
    data?: AdmissionDetail;
}

export interface AdmissionListItem {
    admissionId: string;
    encounterId?: string;
    patientId?: string;
    patientName?: string;
    patientMobile?: string;
    patientAgeYears?: number;
    patientSex?: string;
    primaryDoctorId?: string;
    primaryDoctorName?: string;
    admissionNo?: string;
    admittedAt: string;
    dischargedAt?: string;
    statusCode?: string;
    diagnosis?: string;
    currentBedId?: string;
    currentBedCode?: string;
    currentWardName?: string;
    currentWardCode?: string;
}

export interface GetAdmissionsResponse {
    success: boolean;
    message?: string;
    items: AdmissionListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const admissionService = {
    admit: (req: AdmitPatientRequest): Promise<AdmitPatientResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION.ADMIT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    transfer: (req: TransferBedRequest): Promise<TransferBedResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION.TRANSFER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    discharge: (req: DischargePatientRequest): Promise<DischargePatientResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION.DISCHARGE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    cancel: (req: CancelAdmissionRequest): Promise<CancelAdmissionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION.CANCEL, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    getById: (admissionId: string, hospitalId?: string): Promise<GetAdmissionResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION.GET_BY_ID(admissionId, hospitalIdOrThrow(hospitalId))),

    list: (opts: { statusCode?: string; page?: number; pageSize?: number; hospitalId?: string } = {}): Promise<GetAdmissionsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION.LIST(
            hospitalIdOrThrow(opts.hospitalId),
            opts.statusCode,
            opts.page ?? 1,
            opts.pageSize ?? 50,
        )),
};
