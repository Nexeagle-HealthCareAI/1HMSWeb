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
    packageTypeId?: string;
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
    appointmentId?: string;
    sourceAppointmentCancelled?: boolean;
    otPlanId?: string;
    otPlanName?: string;
    packageTypeId?: string;
    packageTypeName?: string;
    packageTypePrice?: number;
    procedureName?: string;
    probableAdmissionDate?: string;
    caseType: CaseType;
    notes?: string;
    statusCode: ReferralStatus;
    notAdmittedReason?: string;
    followUpDate?: string;
    followUpNotes?: string;
    convertedAdmissionId?: string;
    admittedAt?: string;
    createdAt: string;
    commentCount?: number;
}

export interface ReferralStatusCount {
    statusCode: ReferralStatus;
    count: number;
}

export interface GetAdmissionReferralsResponse {
    success: boolean;
    message?: string;
    referrals: AdmissionReferralItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    statusCounts: ReferralStatusCount[];
}

export interface ListReferralsFilters {
    hospitalId?: string;
    patientId?: string;
    statusCode?: ReferralStatus;
    caseType?: CaseType;
    referringDoctorId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
}

export interface AdmissionReferralCommentItem {
    commentId: string;
    commentText: string;
    createdAt: string;
    createdBy?: string;
}

export interface GetAdmissionReferralCommentsResponse {
    success: boolean;
    message?: string;
    comments: AdmissionReferralCommentItem[];
}

export interface AddAdmissionReferralCommentRequest {
    hospitalId?: string;
    referralId: string;
    commentText: string;
}

export interface AddAdmissionReferralCommentResponse {
    success: boolean;
    message?: string;
    commentId?: string;
    createdAt?: string;
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

const dIso = (d: number) => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };
const dFuture = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };

const MOCK_REFERRALS: AdmissionReferralItem[] = [
    { referralId: 'r1', patientId: 'UHID-100482', patientName: 'Rajesh Kumar Sharma', patientMobile: '98200 11223', referringDoctorId: 'd1', referringDoctorName: 'Dr. Meera Kulkarni', procedureName: 'Coronary Angioplasty', otPlanName: 'Cath Lab — 90 min', probableAdmissionDate: dFuture(2), caseType: 'URGENT', statusCode: 'PENDING', createdAt: dIso(1), commentCount: 2 },
    { referralId: 'r2', patientId: 'UHID-100199', patientName: 'Anita Deshpande', patientMobile: '98200 44556', referringDoctorId: 'd2', referringDoctorName: 'Dr. Arjun Rao', procedureName: 'Total Knee Replacement', probableAdmissionDate: dFuture(5), caseType: 'PLANNED', statusCode: 'PENDING', createdAt: dIso(2), commentCount: 0 },
    { referralId: 'r3', patientId: 'UHID-100777', patientName: 'Mohammed Faiz', patientMobile: '98200 77889', referringDoctorId: 'd3', referringDoctorName: 'Dr. Sneha Pillai', procedureName: 'Appendectomy', caseType: 'EMERGENCY', statusCode: 'CONVERTED', convertedAdmissionId: 'adm-9', admittedAt: dIso(1), createdAt: dIso(3), commentCount: 1 },
    { referralId: 'r4', patientId: 'UHID-100051', patientName: 'Sunita Rani', patientMobile: '98200 12345', referringDoctorId: 'd1', referringDoctorName: 'Dr. Meera Kulkarni', procedureName: 'Cataract Surgery', probableAdmissionDate: dFuture(9), caseType: 'PLANNED', statusCode: 'FOLLOW_UP', followUpDate: dFuture(3), followUpNotes: 'Will confirm after discussing with family.', createdAt: dIso(6), commentCount: 3 },
    { referralId: 'r5', patientId: 'UHID-100888', patientName: 'Priya Nair', patientMobile: '98200 99001', referringDoctorId: 'd2', referringDoctorName: 'Dr. Arjun Rao', procedureName: 'Gallbladder Removal', caseType: 'PLANNED', statusCode: 'NOT_ADMITTED', notAdmittedReason: 'Patient opted for another hospital closer to home.', createdAt: dIso(8), commentCount: 0 },
];

export const admissionReferralApi = {
    adviseAdmission: (req: AdviseAdmissionRequest): Promise<AdviseAdmissionResponse> => {
        const id = hospitalIdOrThrow(req.hospitalId);
        if (id === 'PREVIEW-HOSPITAL') {
            return Promise.resolve({ success: true, referralId: 'new-r' });
        }
        return ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.ADVISE, {
            ...req,
            hospitalId: id,
        });
    },

    list: (filters: ListReferralsFilters = {}): Promise<GetAdmissionReferralsResponse> => {
        const id = hospitalIdOrThrow(filters.hospitalId);
        if (id === 'PREVIEW-HOSPITAL') {
            let items = MOCK_REFERRALS;
            if (filters.statusCode) items = items.filter(r => r.statusCode === filters.statusCode);
            if (filters.caseType) items = items.filter(r => r.caseType === filters.caseType);
            const countBy = (s: string) => MOCK_REFERRALS.filter(r => r.statusCode === s).length;
            return Promise.resolve({
                success: true,
                referrals: items,
                page: filters.page ?? 1,
                pageSize: filters.pageSize ?? 10,
                totalCount: items.length,
                statusCounts: [
                    { statusCode: 'PENDING' as const, count: countBy('PENDING') },
                    { statusCode: 'CONVERTED' as const, count: countBy('CONVERTED') },
                    { statusCode: 'NOT_ADMITTED' as const, count: countBy('NOT_ADMITTED') },
                    { statusCode: 'FOLLOW_UP' as const, count: countBy('FOLLOW_UP') },
                ],
            });
        }
        return ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.LIST(id, filters));
    },

    updateStatus: (req: UpdateReferralStatusRequest): Promise<UpdateReferralStatusResponse> => {
        const activeUserHospitalId = useAuthStore.getState().getHospitalId();
        if (activeUserHospitalId === 'PREVIEW-HOSPITAL') {
            const match = MOCK_REFERRALS.find(r => r.referralId === req.referralId);
            if (match) {
                match.statusCode = req.statusCode as any;
                if (req.notAdmittedReason) match.notAdmittedReason = req.notAdmittedReason;
                if (req.followUpDate) match.followUpDate = req.followUpDate;
                if (req.followUpNotes) match.followUpNotes = req.followUpNotes;
            }
            return Promise.resolve({ success: true });
        }
        return ipdApiClient.put(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.UPDATE_STATUS, req);
    },

    getComments: (referralId: string, hospitalId?: string): Promise<GetAdmissionReferralCommentsResponse> => {
        const id = hospitalIdOrThrow(hospitalId);
        if (id === 'PREVIEW-HOSPITAL') {
            return Promise.resolve({
                success: true,
                comments: referralId === 'r1'
                    ? [
                        { commentId: 'c1', commentText: 'Pre-auth initiated with insurer.', createdBy: 'Front desk', createdAt: dIso(1) },
                        { commentId: 'c2', commentText: 'Patient confirmed for Thursday.', createdBy: 'Dr. Meera Kulkarni', createdAt: dIso(0) },
                    ]
                    : [],
            });
        }
        return ipdApiClient.get(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.COMMENTS(id, referralId));
    },

    addComment: (req: AddAdmissionReferralCommentRequest): Promise<AddAdmissionReferralCommentResponse> => {
        const id = hospitalIdOrThrow(req.hospitalId);
        if (id === 'PREVIEW-HOSPITAL') {
            return Promise.resolve({
                success: true,
                commentId: Math.random().toString(),
                createdAt: new Date().toISOString(),
            });
        }
        return ipdApiClient.post(IPD_API_ENDPOINTS.ADMISSION_REFERRAL.ADD_COMMENT, {
            ...req,
            hospitalId: id,
        });
    },
};
