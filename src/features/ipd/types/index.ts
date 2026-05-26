export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED';

export type WardType = 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'ICU' | 'HDU' | 'NICU' | 'PICU' | 'EMERGENCY';

export type Bed = {
    id: string;
    bedNumber: string;
    status: BedStatus;
    wardId: string;
    patientId?: string;
    patientName?: string;
    admissionId?: string;
    pricePerDay: number;
};

export type Ward = {
    id: string;
    name: string;
    type: WardType;
    totalBeds: number;
    availableBeds: number;
    floor: string;
    beds: Bed[];
};

export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED' | 'PENDING_ADMISSION' | 'CANCELLED';

export type AdmissionPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type Admission = {
    id: string;
    encounterId?: string;
    admissionNo?: string;
    patientId: string;
    patientName: string;
    patientMobile?: string;
    age: number;
    sex: 'M' | 'F' | 'O';
    admissionDate: string; // ISO string
    expectedDischargeDate?: string;
    dischargeDate?: string;
    status: AdmissionStatus;
    priority: AdmissionPriority;
    wardId: string;
    wardName: string;
    bedId: string;
    bedNumber: string;
    attendingDoctor: string;
    attendingDoctorId?: string;
    diagnosis?: string;
    chiefComplaint?: string;
    referredBy?: string;
    notes?: string;
    totalBillEstimate?: number;
    paidAmount?: number;
};

export type IPDSummaries = {
    totalAdmissions: number;
    occupancyRate: number;
    availableBeds: number;
    emergencyAdmissions: number;
    todayAdmissions: number;
    todayDischarges: number;
    pendingDischarges: number;
};

export type NewAdmissionFormData = {
    patientId: string;
    patientName: string;
    patientMobile: string;
    age: number;
    sex: 'M' | 'F' | 'O';
    wardId: string;
    bedId: string;
    departmentId: string;
    attendingDoctor: string;
    attendingDoctorId: string;
    diagnosis: string;
    chiefComplaint: string;
    priority: AdmissionPriority;
    expectedDischargeDate: string;
    referredBy: string;
    notes: string;
    // Advance payment
    estimatedStayDays: number;
    advanceAmount: number;
    paymentMode: 'CASH' | 'CARD' | 'UPI' | 'NETBANKING' | 'INSURANCE' | '';
    transactionRef: string;
    insuranceName: string;
    insurancePolicyNo: string;
};

// ─── IPD Bill ─────────────────────────────────────────────────────────────────

export type BillItemCategory =
    | 'Bed Charges'
    | 'Nursing'
    | 'Doctor Visits'
    | 'Procedures'
    | 'Investigations'
    | 'Medicines'
    | 'OT Charges'
    | 'ICU Charges'
    | 'Miscellaneous';

export type IPDBillItem = {
    id: string;
    description: string;
    category: BillItemCategory;
    qty: number;
    rate: number;
    discountPct: number;
    total: number;
};

export type PaymentEntry = {
    id: string;
    date: string;
    amount: number;
    mode: 'CASH' | 'CARD' | 'UPI' | 'NETBANKING' | 'INSURANCE';
    transactionRef?: string;
    receivedBy: string;
};

export type IPDBill = {
    billNo: string;
    admissionId: string;
    patientName: string;
    patientId: string;
    attendingDoctor: string;
    wardName: string;
    bedNumber: string;
    admissionDate: string;
    dischargeDate?: string;
    los: number;
    items: IPDBillItem[];
    subTotal: number;
    discountTotal: number;
    grandTotal: number;
    payments: PaymentEntry[];
    totalPaid: number;
    balanceDue: number;
    status: 'INTERIM' | 'FINAL';
};

// ─── Discharge Certificate ────────────────────────────────────────────────────

export type DischargeCondition = 'STABLE' | 'IMPROVED' | 'RECOVERED' | 'REFERRED' | 'LAMA' | 'EXPIRED';

export type DischargeCertificate = {
    certificateNo: string;
    admission: Admission;
    finalDiagnosis: string;
    proceduresPerformed: string[];
    treatmentSummary: string;
    conditionAtDischarge: DischargeCondition;
    followUpDate?: string;
    followUpInstructions: string;
    medications: string[];
    diet: string;
    activityRestrictions: string;
    issuedAt: string;
};
