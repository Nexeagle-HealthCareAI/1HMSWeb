import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type CaseType = 'EMERGENCY' | 'PLANNED' | 'URGENT';
export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'NOT_ADMITTED' | 'FOLLOW_UP';

export interface AdviseAdmissionRequest {
    hospitalId?: string;
    patientId: string;
    referringDoctorId: string;
    appointmentId?: string;
    otPlanId?: string;
    procedureName?: string;
    probableAdmissionDate?: string;
    caseType: CaseType;
    notes?: string;
}

export interface AdviseAdmissionResponse {
    success: boolean;
    message?: string;
    referralId?: string;
}

export interface AdmissionReferralItem {
    referralId: string;
    patientId: string;
    patientName?: string;
    patientMobile?: string;
    referringDoctorId: string;
    referringDoctorName?: string;
    otPlanId?: string;
    otPlanName?: string;
    procedureName?: string;
    probableAdmissionDate?: string;
    caseType: CaseType;
    notes?: string;
    statusCode: ReferralStatus;
    notAdmittedReason?: string;
    followUpDate?: string;
    followUpNotes?: string;
    convertedAdmissionId?: string;
    createdAt: string;
}

export interface GetAdmissionReferralsResponse {
    success: boolean;
    message?: string;
    referrals: AdmissionReferralItem[];
}

export interface ListReferralsFilters {
    hospitalId?: string;
    statusCode?: ReferralStatus;
    caseType?: CaseType;
    referringDoctorId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface UpdateReferralStatusRequest {
    referralId: string;
    statusCode: 'PENDING' | 'NOT_ADMITTED' | 'FOLLOW_UP';
    notAdmittedReason?: string;
    followUpDate?: string;
    followUpNotes?: string;
}

export interface UpdateReferralStatusResponse {
    success: boolean;
    message?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const admissionReferralApi = {
    adviseAdmission: (req: AdviseAdmissionRequest): Promise<AdviseAdmissionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.ADVISE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (filters: ListReferralsFilters = {}): Promise<GetAdmissionReferralsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.LIST(hospitalIdOrThrow(filters.hospitalId), filters)),

    updateStatus: (req: UpdateReferralStatusRequest): Promise<UpdateReferralStatusResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.UPDATE_STATUS, req),
};
