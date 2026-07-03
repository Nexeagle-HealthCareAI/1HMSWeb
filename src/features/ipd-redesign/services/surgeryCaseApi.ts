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

export type SurgeryStatus = 'REQUESTED' | 'SCHEDULED' | 'PRE_OP' | 'IN_THEATRE' | 'POST_OP' | 'COMPLETED' | 'CANCELLED';

export interface SurgeryCaseSummary {
    surgeryCaseId: string;
    procedureName: string;
    surgeryType: 'ELECTIVE' | 'EMERGENCY';
    urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    statusCode: SurgeryStatus;
    requestedAt: string;
    surgeonName?: string | null;
    anaesthetistName?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    theatreName?: string | null;
}

export interface OTBookingDetail {
    otBookingId: string;
    theatreId: string;
    theatreCode?: string | null;
    theatreName?: string | null;
    scheduledStart: string;
    scheduledEnd: string;
    statusCode: string;
}

export interface PreOpAssessmentDetail {
    preOpAssessmentId: string;
    asaGrade?: string | null;
    npoConfirmed: boolean;
    allergiesReviewed: boolean;
    investigationsReviewed: boolean;
    consentConfirmed: boolean;
    notes?: string | null;
    assessedBy: string;
    assessedAt: string;
}

export interface ChecklistDetail {
    signInCompletedAt?: string | null;
    signInCompletedBy?: string | null;
    signInItems?: Record<string, boolean> | null;
    signInNotes?: string | null;
    timeOutCompletedAt?: string | null;
    timeOutCompletedBy?: string | null;
    timeOutItems?: Record<string, boolean> | null;
    timeOutNotes?: string | null;
    signOutCompletedAt?: string | null;
    signOutCompletedBy?: string | null;
    signOutItems?: Record<string, boolean> | null;
    signOutNotes?: string | null;
}

export interface IntraOpRecordDetail {
    intraOpRecordId: string;
    anaesthesiaType?: string | null;
    anaesthesiaStartAt?: string | null;
    anaesthesiaEndAt?: string | null;
    surgeryStartAt?: string | null;
    surgeryEndAt?: string | null;
    estimatedBloodLossMl?: number | null;
    findings?: string | null;
    procedurePerformed?: string | null;
    surgicalTeam?: string | null;
    complicationsNotes?: string | null;
    recordedBy: string;
    recordedAt: string;
}

export interface IntraOpItemUsageDetail {
    intraOpItemUsageId: string;
    itemName: string;
    category: 'CONSUMABLE' | 'IMPLANT';
    qty: number;
    lotNumber?: string | null;
    serialNumber?: string | null;
    isBilled: boolean;
    isStockDeducted: boolean;
    recordedBy: string;
    recordedAt: string;
}

export interface SurgeryCaseDetail {
    surgeryCaseId: string;
    admissionId: string;
    procedureName: string;
    surgeryType: 'ELECTIVE' | 'EMERGENCY';
    urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    statusCode: SurgeryStatus;
    surgeonName?: string | null;
    anaesthetistName?: string | null;
    cancelledReason?: string | null;
    booking?: OTBookingDetail | null;
    latestPreOpAssessment?: PreOpAssessmentDetail | null;
    checklist?: ChecklistDetail | null;
    intraOpRecord?: IntraOpRecordDetail | null;
    itemsUsed: IntraOpItemUsageDetail[];
}

export interface RequestSurgeryInput {
    admissionId: string;
    procedureName: string;
    surgeryType: 'ELECTIVE' | 'EMERGENCY';
    urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    surgeonDoctorId?: string;
    surgeonName?: string;
    anaesthetistDoctorId?: string;
    anaesthetistName?: string;
}

export interface PreOpAssessmentInput {
    asaGrade?: string;
    npoConfirmed: boolean;
    allergiesReviewed: boolean;
    investigationsReviewed: boolean;
    consentConfirmed: boolean;
    notes?: string;
}

export interface ChecklistPhaseInput {
    items: Record<string, boolean>;
    notes?: string;
}

export interface IntraOpRecordInput {
    anaesthesiaType?: string;
    anaesthesiaStartAt?: string;
    anaesthesiaEndAt?: string;
    surgeryStartAt?: string;
    surgeryEndAt?: string;
    estimatedBloodLossMl?: number;
    findings?: string;
    procedurePerformed?: string;
    surgicalTeam?: string;
    complicationsNotes?: string;
}

export interface ItemUsageInput {
    inventoryItemId?: string;
    itemName: string;
    category: 'CONSUMABLE' | 'IMPLANT';
    qty: number;
    lotNumber?: string;
    serialNumber?: string;
    chargeId?: string;
    unitRate?: number;
}

export const surgeryCaseApi = {
    getForAdmission: (admissionId: string, hospitalId?: string): Promise<SurgeryCaseSummary[]> =>
        ipdApiClient
            .get<{ cases?: SurgeryCaseSummary[] }>(`/surgery-case/admission/${admissionId}`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.cases ?? []),

    getDetail: (surgeryCaseId: string, hospitalId?: string): Promise<SurgeryCaseDetail> =>
        ipdApiClient.get<SurgeryCaseDetail>(`/surgery-case/${surgeryCaseId}`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } }),

    requestSurgery: async (input: RequestSurgeryInput, hospitalId?: string): Promise<{ surgeryCaseId: string }> => {
        try {
            return await ipdApiClient.post('/surgery-case/request', { hospitalId: hospitalIdOrThrow(hospitalId), ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not request the surgery.'));
        }
    },

    updateStatus: async (surgeryCaseId: string, toStatus: SurgeryStatus, reason?: string, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/status', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, toStatus, reason });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not update the surgery case status.'));
        }
    },

    recordPreOp: async (surgeryCaseId: string, input: PreOpAssessmentInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/pre-op', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record the pre-op assessment.'));
        }
    },

    recordSignIn: async (surgeryCaseId: string, input: ChecklistPhaseInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/checklist/sign-in', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record Sign-In.'));
        }
    },

    recordTimeOut: async (surgeryCaseId: string, input: ChecklistPhaseInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/checklist/time-out', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record Time-Out.'));
        }
    },

    recordSignOut: async (surgeryCaseId: string, input: ChecklistPhaseInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/checklist/sign-out', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record Sign-Out.'));
        }
    },

    saveIntraOp: async (surgeryCaseId: string, input: IntraOpRecordInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/intra-op', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not save the intra-op record.'));
        }
    },

    recordItemUsage: async (surgeryCaseId: string, input: ItemUsageInput, hospitalId?: string) => {
        try {
            return await ipdApiClient.post('/surgery-case/item-usage', { hospitalId: hospitalIdOrThrow(hospitalId), surgeryCaseId, ...input });
        } catch (err) {
            throw new Error(messageFrom(err, 'Could not record item usage.'));
        }
    },
};
