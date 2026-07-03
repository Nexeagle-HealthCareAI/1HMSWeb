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
    primaryDoctorId?: string;          // admitting consultant
    admittedAt?: string | null;
    expectedDischargeAt?: string | null;
    admissionReason?: string;
    diagnosis?: string;
    // Elective only: patient hasn't physically arrived yet — creates a PRE_ADMIT admission instead
    // of a completed one; confirm arrival later via admissionApi.confirmArrival.
    isPreRegistration?: boolean;

    referralSource?: 'SELF' | 'DOCTOR' | 'HOSPITAL' | '';
    referralName?: string;
    // Structured "referred/transferred in from an outside facility" — distinct from referralSource/
    // referralName above, which track referral commission, not provenance.
    referringFacilityName?: string;
    referringFacilityType?: 'PHC' | 'NURSING_HOME' | 'HOSPITAL' | 'OTHER' | '';
    referringFacilityContact?: string;

    // ── Payer branch (CASH is fully wired; TPA/SCHEME are capture-only in Phase 1) ──
    payerType?: 'CASH' | 'TPA' | 'SCHEME';
    depositExpected?: number | null;
    enableIpdBilling?: boolean;        // opens an IPD billing encounter; default true server-side
    clientRequestId?: string;         // offline-resync idempotency key
    bedId?: string | null;            // optional bed to assign at admit time

    // Coverage detail — only meaningful when payerType is TPA / SCHEME.
    payerName?: string;
    policyOrBeneficiaryNo?: string;
    preAuthNo?: string;
    packageCode?: string;
    sanctionedAmount?: number | null;
    entitledRoomCategory?: string;     // drives the bed-entitlement warning + TPA-split proration
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
    statusCode?: string;    // ADMITTED, or PRE_ADMIT when isPreRegistration was set
    encounterId?: string | null;
    payerType?: string | null;
    bedId?: string | null;
    bedAssignmentId?: string | null;
}

export interface ConfirmArrivalResponse {
    success?: boolean;
    message?: string;
    admissionId?: string;
    admittedAt?: string;
    bedId?: string | null;
    bedAssignmentId?: string | null;
}

export interface HospitalDoctorItem {
    doctorId: string;
    fullName?: string | null;
    departmentName?: string | null;
}

interface GetHospitalDoctorsResponse {
    success?: boolean;
    doctors?: HospitalDoctorItem[];
}

// ─── Active admissions (real data — every currently-open admission for the hospital) ─
export type AdmissionStatusFilter = 'ACTIVE' | 'DISCHARGED' | 'ALL';

export interface ActiveAdmissionItem {
    admissionId: string;
    admissionNo: string;
    admissionType?: string | null;
    statusCode: string;
    payerType: string;
    admittedAt: string;
    admissionReason?: string | null;
    diagnosis?: string | null;
    patientId?: string | null;
    patientName?: string | null;
    patientAge?: number | null;
    patientSex?: string | null;
    bedCode?: string | null;      // null => no bed assigned yet
    wardName?: string | null;
    encounterId?: string | null;
    entitledRoomCategory?: string | null;   // drives the bed-entitlement warning at assign/transfer
}

interface GetActiveAdmissionsResponse {
    success?: boolean;
    message?: string;
    items?: ActiveAdmissionItem[];
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

    getActiveAdmissions: (statusFilter?: AdmissionStatusFilter, hospitalId?: string): Promise<ActiveAdmissionItem[]> =>
        ipdApiClient
            .get<GetActiveAdmissionsResponse>('/admission/active', { params: { hospitalId: hospitalIdOrThrow(hospitalId), statusFilter } })
            .then(r => r.items ?? []),

    admit: (payload: AdmitPatientPayload, hospitalId?: string): Promise<AdmitPatientResponse> =>
        ipdApiClient.post<AdmitPatientResponse>('/admission', {
            ...payload,
            hospitalId: hospitalIdOrThrow(hospitalId),
        }),

    confirmArrival: (admissionId: string, bedId?: string, hospitalId?: string): Promise<ConfirmArrivalResponse> =>
        ipdApiClient.post<ConfirmArrivalResponse>('/admission/confirm-arrival', {
            hospitalId: hospitalIdOrThrow(hospitalId), admissionId, bedId: bedId || undefined,
        }),

    getHospitalDoctors: (hospitalId?: string): Promise<HospitalDoctorItem[]> =>
        ipdApiClient
            .get<GetHospitalDoctorsResponse>('/doctors/hospital', { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.doctors ?? []),

    checkDuplicates: (payload: CheckDuplicatesPayload, hospitalId?: string): Promise<DuplicateMatch[]> =>
        ipdApiClient
            .post<CheckDuplicatesResponse>('/patient/check-duplicates', {
                ...payload,
                hospitalId: hospitalIdOrThrow(hospitalId),
            })
            .then(r => r.matches ?? [])
            .catch(() => []),
};
