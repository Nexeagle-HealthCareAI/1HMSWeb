// IPD redesign — domain types (UI-first, backend-agnostic).
// These mirror the clinical workflow, not any current API. The API will be designed to fit these.

export type WardType = 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'DELUXE' | 'ICU' | 'NICU' | 'PICU' | 'HDU' | 'LABOUR' | 'ISOLATION' | 'BURNS' | 'PSYCHIATRY' | 'CASUALTY';
export type RoomType = 'SINGLE_AC' | 'SINGLE_NONAC' | 'TWIN_SHARING' | 'GENERAL_HALL' | 'DELUXE' | 'SUITE' | 'ICU_BAY';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED' | 'BLOCKED';
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGE_INITIATED' | 'DISCHARGED' | 'CANCELLED';
export type AdmissionType = 'EMERGENCY' | 'ELECTIVE' | 'DAY_CARE' | 'LAMA';
export type Sex = 'M' | 'F' | 'O';
export type AcuityColor = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';

// Prototype-only: drives role-scoped dashboards. Real app reads this from auth.
export type UserRole = 'RECEPTION' | 'DOCTOR' | 'NURSE';

export interface IcdCode {
    code: string;      // e.g. "J18.9"
    label: string;     // e.g. "Pneumonia, unspecified organism"
}

export interface Ward {
    wardId: string;
    wardCode: string;
    wardName: string;
    wardType: WardType;
    building: string;
    floor: string;
    dailyRate: number;   // ward-level fallback tariff
    totalBeds: number;
}

// Facility hierarchy: Ward → Room → Bed. Room carries the tariff for private/deluxe types.
export interface Room {
    roomId: string;
    wardId: string;
    roomCode: string;
    roomType: RoomType;
    dailyTariff: number;
}

export interface Bed {
    bedId: string;
    wardId: string;
    roomId: string;
    bedCode: string;
    status: BedStatus;
    admissionId?: string;     // set when OCCUPIED
    dailyRateOverride?: number;
    features?: string[];      // OXYGEN / VENTILATOR / SIDE_RAILS / TRACTION
}

export interface Patient {
    patientId: string;
    uhid: string;             // hospital-wide unique id
    name: string;
    age: number;
    sex: Sex;
    mobile: string;
    bloodGroup?: string;
    allergies?: string[];
}

export interface Admission {
    admissionId: string;
    admissionNo: string;      // e.g. ADM-2026-00042
    patientId: string;
    wardId: string;
    roomId: string;
    bedId: string;
    admissionType: AdmissionType;
    attendingDoctor: string;
    treatingTeam?: string[];
    admittedAt: string;       // ISO
    status: AdmissionStatus;
    provisionalDiagnosis: string;
    icd?: IcdCode;            // structured diagnosis
    finalDiagnosis?: string;
    beneficiaryId?: string;   // "Referred by" — who earns the referral incentive for this visit
    consentCaptured: boolean;
    depositPaid: number;
    estimatedDailyCost: number;
    expectedDischarge?: string;
    isMlc?: boolean;
    notes?: string;
}

export interface VitalReading {
    id: string;
    admissionId: string;
    recordedAt: string;
    temperatureF?: number;
    pulse?: number;
    systolic?: number;
    diastolic?: number;
    respRate?: number;
    spo2?: number;
    painScore?: number;
    recordedBy: string;
}

export type MedStatus = 'DUE' | 'GIVEN' | 'MISSED' | 'HELD';

export interface MedicationDose {
    id: string;
    admissionId: string;
    drugName: string;
    dose: string;            // "500 mg"
    route: string;           // "IV" / "PO"
    scheduledAt: string;
    status: MedStatus;
    givenBy?: string;
    givenAt?: string;
    highAlert?: boolean;
}

export interface RoundNote {
    id: string;
    admissionId: string;
    author: string;
    authoredAt: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export type LedgerKind = 'CHARGE' | 'PAYMENT';

export interface LedgerEntry {
    id: string;
    admissionId: string;
    kind: LedgerKind;
    at: string;
    description: string;
    category: string;        // BED / PHARMACY / LAB / PROCEDURE / CONSULT / PAYMENT
    qty?: number;
    rate?: number;
    amount: number;          // positive; sign implied by kind
    mode?: string;           // for payments: CASH/UPI/CARD
    auto?: boolean;          // true when posted by an auto-billing rule (not entered by hand)
    autoSource?: string;     // which rule posted it, e.g. 'BED_NIGHTLY' / 'CONSULT_ADMIT'
}

// ── Incentive system ────────────────────────────────────────────────────────
// Referral is one scheme type. A Beneficiary earns an incentive on the commissionable
// portion of bills, accrued when payment is RECEIVED (never on unpaid/cancelled bills).
export type BeneficiaryType = 'REFERRER' | 'DOCTOR' | 'STAFF' | 'AGENT' | 'DEPARTMENT';

// Which clinical module the incentive originated from — lets the ledger be sliced per department.
export type ServiceModule = 'OPD' | 'IPD' | 'LAB' | 'RAD' | 'PHARMACY';

// Referee master — captured at booking/admission so every referrer is trackable
// independent of any single visit.
export interface Beneficiary {
    beneficiaryId: string;
    name: string;
    type: BeneficiaryType;
    phone?: string;
    email?: string;
    address?: string;
    pan?: string;
    defaultRatePercent: number;   // % of commissionable amount (v1: REFERRAL scheme)
    isActive: boolean;
}

export type IncentiveStatus = 'ACCRUED' | 'PAID' | 'CANCELLED';

export interface IncentiveAccrual {
    accrualId: string;
    beneficiaryId: string;
    sourceModule: ServiceModule;  // OPD / IPD / LAB / RAD — slice the ledger by department
    patientId: string;            // who the incentive was earned "for"
    admissionId: string;
    paymentId: string;            // the payment that triggered this accrual
    eligibleAmount: number;       // commissionable portion of the payment
    ratePercent: number;
    incentiveAmount: number;
    status: IncentiveStatus;
    accruedAt: string;
}

// Auto-billing policy (prototype mirror of the real Billing Policy "integration triggers").
export interface BillingPolicy {
    autoConsultFeeOnAdmission: boolean;   // post the admitting consultant's fee at admission
    autoDailyBedCharge: boolean;          // post one bed charge per admission per day (nightly tick)
    // OPD consult fee source = per attending doctor (recommendation C)
    doctorConsultFees: Record<string, number>;
}

// Convenience joined view used across screens
export interface AdmissionView extends Admission {
    patient: Patient;
    ward: Ward;
    room: Room;
    bed: Bed;
    effectiveDailyRate: number;
    lengthOfStayDays: number;
    totalCharges: number;
    totalPaid: number;
    balance: number;
    dueToday: boolean;        // expected-discharge is today (discharge-planning dashboard)
}
