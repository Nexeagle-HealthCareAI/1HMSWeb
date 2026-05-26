import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export interface MrdRecordItem {
    admissionId: string;
    encounterId: string;
    admissionNo?: string;
    patientId?: string;
    patientName?: string;
    mobile?: string;
    ageYears?: number;
    sex?: string;
    admittedAt: string;
    dischargedAt?: string;
    lengthOfStayDays?: number;
    status: string;
    attendingDoctorId?: string;
    attendingDoctorName?: string;
    wardCode?: string;
    bedCode?: string;
    admissionReason?: string;
    admissionDiagnosis?: string;
    finalDiagnosis?: string;
    proceduresPerformed?: string;
    conditionAtDischarge?: string;
    dischargeSummarySigned: boolean;
}

export interface GetMrdRecordsResponse {
    success: boolean;
    message?: string;
    totalMatches: number;
    items: MrdRecordItem[];
}

export interface MrdSearchParams {
    year?: number;
    fromUtc?: string;
    toUtc?: string;
    patientId?: string;
    patientName?: string;
    mobile?: string;
    admissionNo?: string;
    attendingDoctorId?: string;
    wardCode?: string;
    diagnosis?: string;
    procedure?: string;
    status?: 'ADMITTED' | 'DISCHARGED' | 'CANCELLED' | 'ALL' | string;
    take?: number;
    hospitalId?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const mrdService = {
    search: (params: MrdSearchParams): Promise<GetMrdRecordsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MRD.RECORDS(hospitalIdOrThrow(params.hospitalId), params)),
};
