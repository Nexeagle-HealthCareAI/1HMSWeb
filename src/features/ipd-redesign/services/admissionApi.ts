import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

// ─── Returning-patient fast search (UHID / name / mobile / Aadhaar partial / ABHA) ──
export interface PatientSearchResult {
    patientId: string;
    fullName?: string | null;
    mobile?: string | null;
    sex?: string | null;
    age?: number | null;
    city?: string | null;
}

interface SearchPatientResponse {
    items?: PatientSearchResult[];
}

// ─── Returning-patient detail (demographics for prefill + admission history) ────────
export interface AdmissionPatientDetail {
    patientId: string;
    fullName?: string | null;
    mobile?: string | null;
    ageYears?: number | null;
    dateOfBirth?: string | null;
    sex?: string | null;
    bloodGroup?: string | null;
    religion?: string | null;
    nationality?: string | null;
    flatHouse?: string | null;
    street?: string | null;
    addressLine?: string | null;
    block?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
    alternateMobile?: string | null;
    email?: string | null;
    emergencyContactName?: string | null;
    emergencyContactRelation?: string | null;
    emergencyContactPhone?: string | null;
    aadhaarMasked?: string | null;
    panNumber?: string | null;
    abhaId?: string | null;
}

export interface AdmissionHistoryItem {
    admissionId: string;
    admissionNo: string;
    admissionType?: string | null;
    admittedAt: string;
    dischargedAt?: string | null;
    statusCode: string;
    admissionReason?: string | null;
    diagnosis?: string | null;
    dischargeNotesPreview?: string | null;
}

export interface GetPatientAdmissionsResponse {
    success?: boolean;
    message?: string;
    patient?: AdmissionPatientDetail | null;
    admissions: AdmissionHistoryItem[];
}

// ─── Admit (register-or-reuse patient + open admission) ─────────────────────────────
export type AdmissionTypeCode = 'EMERGENCY' | 'ELECTIVE' | 'DAYCARE' | 'LAMA';

export interface AdmitPatientPayload {
    patientId?: string | null;        // present => returning patient (demographics refreshed)
    fullName?: string;
    mobile?: string;
    ageYears?: number | null;
    dateOfBirth?: string | null;
    sex?: string;
    bloodGroup?: string;
    religion?: string;
    nationality?: string;

    flatHouse?: string;
    street?: string;
    addressLine?: string;
    block?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    country?: string;

    alternateMobile?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;

    aadhaarNumber?: string;
    panNumber?: string;
    abhaId?: string;

    admissionType?: AdmissionTypeCode;
    admittedAt?: string | null;
    expectedDischargeAt?: string | null;
    admissionReason?: string;
    diagnosis?: string;

    referralSource?: 'SELF' | 'DOCTOR' | 'HOSPITAL' | '';
    referralName?: string;
}

export interface AdmitPatientResponse {
    success?: boolean;
    message?: string;
    admissionId?: string;
    admissionNo?: string;
    patientId?: string;
    isNewPatient?: boolean;
    admittedAt?: string;
    wasExisting?: boolean;
}

// ─── Duplicate detection ────────────────────────────────────────────────────────
export type DuplicateConfidence = 'NEAR_CERTAIN' | 'PROBABLE' | 'POSSIBLE';

export interface DuplicateMatch {
    patientId: string;
    fullName?: string | null;
    mobile?: string | null;
    ageYears?: number | null;
    sex?: string | null;
    city?: string | null;
    similarity: number;
    confidence: DuplicateConfidence;
    matchedOn: string[];
}

export interface CheckDuplicatesPayload {
    fullName?: string;
    mobile?: string;
    dateOfBirth?: string | null;
    aadhaarNumber?: string;
    excludePatientId?: string;
}

interface CheckDuplicatesResponse {
    success?: boolean;
    matches?: DuplicateMatch[];
}

export const admissionApi = {
    searchPatients: (searchText: string, hospitalId?: string): Promise<PatientSearchResult[]> =>
        ipdApiClient
            .get<SearchPatientResponse>('/patient/search', {
                params: { searchText, hospitalId: hospitalIdOrThrow(hospitalId) },
            })
            .then(r => r.items ?? []),

    getPatientAdmissions: (patientId: string, hospitalId?: string): Promise<GetPatientAdmissionsResponse> =>
        ipdApiClient.get<GetPatientAdmissionsResponse>('/admission/patient', {
            params: { hospitalId: hospitalIdOrThrow(hospitalId), patientId },
        }),

    admit: (payload: AdmitPatientPayload, hospitalId?: string): Promise<AdmitPatientResponse> =>
        ipdApiClient.post<AdmitPatientResponse>('/admission', {
            ...payload,
            hospitalId: hospitalIdOrThrow(hospitalId),
        }),

    checkDuplicates: (payload: CheckDuplicatesPayload, hospitalId?: string): Promise<DuplicateMatch[]> =>
        ipdApiClient
            .post<CheckDuplicatesResponse>('/patient/check-duplicates', {
                ...payload,
                hospitalId: hospitalIdOrThrow(hospitalId),
            })
            .then(r => r.matches ?? [])
            .catch(() => []),
};
