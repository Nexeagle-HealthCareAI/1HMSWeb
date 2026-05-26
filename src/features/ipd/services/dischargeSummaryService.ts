import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type DischargeCondition = 'STABLE' | 'IMPROVED' | 'RECOVERED' | 'REFERRED' | 'LAMA' | 'EXPIRED';

export interface AdmissionContext {
    admissionId: string;
    encounterId: string;
    admissionNo?: string;
    patientId?: string;
    patientName?: string;
    patientAgeYears?: number;
    patientSex?: string;
    patientMobile?: string;
    attendingDoctorName?: string;
    admittedAt: string;
    dischargedAt?: string;
    lengthOfStayDays?: number;
    statusCode?: string;
    wardName?: string;
    bedCode?: string;
    admissionReason?: string;
    diagnosis?: string;
}

export interface DischargeSummaryData {
    dischargeSummaryId?: string;
    admittingDiagnosis?: string;
    finalDiagnosis?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    courseInHospital?: string;
    proceduresPerformed?: string;
    conditionAtDischarge?: DischargeCondition | string;
    dischargeMedications?: string;
    followUpInstructions?: string;
    followUpDate?: string;
    dietInstructions?: string;
    activityRestrictions?: string;
    additionalNotes?: string;

    isSigned: boolean;
    signedAt?: string;
    signedBy?: string;
    signedByDoctorName?: string;

    createdAt?: string;
    updatedAt?: string;

    admission: AdmissionContext;

    nabhBreach: boolean;
    nabhDueAt?: string;
}

export interface GetDischargeSummaryResponse {
    success: boolean;
    message?: string;
    data?: DischargeSummaryData;
}

export interface SaveDischargeSummaryRequest {
    hospitalId?: string;
    admissionId: string;
    admittingDiagnosis?: string;
    finalDiagnosis?: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    courseInHospital?: string;
    proceduresPerformed?: string;
    conditionAtDischarge?: DischargeCondition | string;
    dischargeMedications?: string;
    followUpInstructions?: string;
    followUpDate?: string;
    dietInstructions?: string;
    activityRestrictions?: string;
    additionalNotes?: string;
}

export interface SaveDischargeSummaryResponse {
    success: boolean;
    message?: string;
    dischargeSummaryId?: string;
}

export interface SignDischargeSummaryRequest {
    hospitalId?: string;
    admissionId: string;
    doctorId?: string;
}

export interface SignDischargeSummaryResponse {
    success: boolean;
    message?: string;
    dischargeSummaryId?: string;
    signedAt?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const dischargeSummaryService = {
    get: (admissionId: string, hospitalId?: string): Promise<GetDischargeSummaryResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.DISCHARGE_SUMMARY.GET(hospitalIdOrThrow(hospitalId), admissionId)),

    save: (req: SaveDischargeSummaryRequest): Promise<SaveDischargeSummaryResponse> =>
        ipdApiClient.put(IPD_API_ENDPOINTS.DISCHARGE_SUMMARY.SAVE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    sign: (req: SignDischargeSummaryRequest): Promise<SignDischargeSummaryResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.DISCHARGE_SUMMARY.SIGN, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),
};
