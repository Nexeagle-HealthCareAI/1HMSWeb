import {
    Ward, Room, Bed, Patient, Admission, VitalReading, MedicationDose, RoundNote, LedgerEntry, IcdCode, BillingPolicy,
    Beneficiary, IncentiveAccrual,
} from '../types';

// Charge categories that earn a referral incentive (exclude pass-through: BED, PHARMACY, CONSUMABLE).
export const COMMISSIONABLE_CATEGORIES = ['CONSULT', 'LAB', 'PROCEDURE'];

// ── Beneficiaries (referrers earning incentives) ────────────────────────────────
export const beneficiaries: Beneficiary[] = [
    { beneficiaryId: 'bf1', name: 'Dr. Anand (External GP)', type: 'REFERRER', phone: '9810011111', email: 'dr.anand@example.com', address: '12 Civil Lines, Kanpur', pan: 'ABCPA1234A', defaultRatePercent: 10, isActive: true },
    { beneficiaryId: 'bf2', name: 'CarePlus Diagnostics (Agent)', type: 'AGENT', phone: '9810022222', email: 'ops@careplus.in', address: '88 Mall Road, Lucknow', pan: 'AAACX5678B', defaultRatePercent: 12, isActive: true },
    { beneficiaryId: 'bf3', name: 'Sunrise Polyclinic', type: 'REFERRER', phone: '9810033333', address: 'Sector 4, Indira Nagar', defaultRatePercent: 8, isActive: true },
    { beneficiaryId: 'bf4', name: 'Walk-in / Self', type: 'REFERRER', defaultRatePercent: 0, isActive: true },
];

// ── Auto-billing policy (defaults) ──────────────────────────────────────────────
export const billingPolicy: BillingPolicy = {
    autoConsultFeeOnAdmission: true,
    autoDailyBedCharge: true,
    doctorConsultFees: {
        'Dr. Mehta': 800,
        'Dr. Rao': 600,
        'Dr. Kapoor': 1000,
        'Dr. Iyer': 700,
        'Dr. Khan': 900,
    },
};

// ── Wards (Building → Floor → Ward) ───────────────────────────────────────────
export const wards: Ward[] = [
    { wardId: 'w1', wardCode: 'GW-M', wardName: 'General Ward (Male)', wardType: 'GENERAL', building: 'Block A', floor: '1', dailyRate: 1200, totalBeds: 6 },
    { wardId: 'w2', wardCode: 'GW-F', wardName: 'General Ward (Female)', wardType: 'GENERAL', building: 'Block A', floor: '1', dailyRate: 1200, totalBeds: 6 },
    { wardId: 'w3', wardCode: 'ICU', wardName: 'Intensive Care Unit', wardType: 'ICU', building: 'Block A', floor: '2', dailyRate: 6000, totalBeds: 4 },
    { wardId: 'w4', wardCode: 'PVT', wardName: 'Private Rooms', wardType: 'PRIVATE', building: 'Block B', floor: '3', dailyRate: 4500, totalBeds: 4 },
];

// ── Rooms (Ward → Room, room carries tariff for private/deluxe) ─────────────────
export const rooms: Room[] = [
    { roomId: 'rm1', wardId: 'w1', roomCode: 'GW-M-Hall', roomType: 'GENERAL_HALL', dailyTariff: 1200 },
    { roomId: 'rm2', wardId: 'w2', roomCode: 'GW-F-Hall', roomType: 'GENERAL_HALL', dailyTariff: 1200 },
    { roomId: 'rm3', wardId: 'w3', roomCode: 'ICU-Bay', roomType: 'ICU_BAY', dailyTariff: 6000 },
    { roomId: 'rm4', wardId: 'w4', roomCode: 'PVT-101', roomType: 'SINGLE_AC', dailyTariff: 4500 },
    { roomId: 'rm5', wardId: 'w4', roomCode: 'PVT-102', roomType: 'DELUXE', dailyTariff: 7000 },
    { roomId: 'rm6', wardId: 'w4', roomCode: 'PVT-SUITE', roomType: 'SUITE', dailyTariff: 12000 }, // > ₹5000 → 5% GST applies
];

// ── Beds (Bed → Room → Ward) ────────────────────────────────────────────────────
export const beds: Bed[] = [
    { bedId: 'b1', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-01', status: 'OCCUPIED', admissionId: 'a1', features: ['OXYGEN'] },
    { bedId: 'b2', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-02', status: 'OCCUPIED', admissionId: 'a2' },
    { bedId: 'b3', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-03', status: 'AVAILABLE' },
    { bedId: 'b4', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-04', status: 'CLEANING' },
    { bedId: 'b5', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-05', status: 'AVAILABLE' },
    { bedId: 'b6', wardId: 'w1', roomId: 'rm1', bedCode: 'GW-M-06', status: 'AVAILABLE' },
    { bedId: 'b7', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-01', status: 'OCCUPIED', admissionId: 'a3' },
    { bedId: 'b8', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-02', status: 'AVAILABLE' },
    { bedId: 'b9', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-03', status: 'RESERVED' },
    { bedId: 'b10', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-04', status: 'AVAILABLE' },
    { bedId: 'b11', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-05', status: 'AVAILABLE' },
    { bedId: 'b12', wardId: 'w2', roomId: 'rm2', bedCode: 'GW-F-06', status: 'BLOCKED' },
    { bedId: 'b13', wardId: 'w3', roomId: 'rm3', bedCode: 'ICU-01', status: 'OCCUPIED', admissionId: 'a4', features: ['OXYGEN', 'VENTILATOR'] },
    { bedId: 'b14', wardId: 'w3', roomId: 'rm3', bedCode: 'ICU-02', status: 'OCCUPIED', admissionId: 'a5', features: ['OXYGEN', 'VENTILATOR'] },
    { bedId: 'b15', wardId: 'w3', roomId: 'rm3', bedCode: 'ICU-03', status: 'AVAILABLE', features: ['OXYGEN', 'VENTILATOR'] },
    { bedId: 'b16', wardId: 'w3', roomId: 'rm3', bedCode: 'ICU-04', status: 'CLEANING', features: ['OXYGEN'] },
    { bedId: 'b17', wardId: 'w4', roomId: 'rm4', bedCode: 'PVT-101-A', status: 'OCCUPIED', admissionId: 'a6' },
    { bedId: 'b18', wardId: 'w4', roomId: 'rm5', bedCode: 'PVT-102-A', status: 'AVAILABLE' },
    { bedId: 'b19', wardId: 'w4', roomId: 'rm6', bedCode: 'PVT-SUITE-A', status: 'AVAILABLE' },
    { bedId: 'b20', wardId: 'w4', roomId: 'rm4', bedCode: 'PVT-101-B', status: 'RESERVED' },
];

// ── ICD-10 mini catalogue (type 3 chars to autocomplete in the admit flow) ──────
export const icdCatalog: IcdCode[] = [
    { code: 'J18.9', label: 'Pneumonia, unspecified organism' },
    { code: 'A09', label: 'Infectious gastroenteritis & colitis, unspecified' },
    { code: 'A90', label: 'Dengue fever (classical)' },
    { code: 'I21.9', label: 'Acute myocardial infarction, unspecified' },
    { code: 'A41.9', label: 'Sepsis, unspecified organism' },
    { code: 'K40.9', label: 'Inguinal hernia, without obstruction/gangrene' },
    { code: 'E11.9', label: 'Type 2 diabetes mellitus without complications' },
    { code: 'I10', label: 'Essential (primary) hypertension' },
    { code: 'J44.9', label: 'COPD, unspecified' },
    { code: 'N39.0', label: 'Urinary tract infection, site not specified' },
    { code: 'O80', label: 'Single spontaneous delivery' },
    { code: 'S06.9', label: 'Intracranial injury, unspecified' },
    { code: 'K35.80', label: 'Acute appendicitis, unspecified' },
    { code: 'J45.909', label: 'Unspecified asthma, uncomplicated' },
    { code: 'I63.9', label: 'Cerebral infarction, unspecified (stroke)' },
];

export const patients: Patient[] = [
    { patientId: 'p1', uhid: 'UH0001', name: 'Ramesh Kumar', age: 54, sex: 'M', mobile: '9876543210', bloodGroup: 'B+', allergies: ['Penicillin'] },
    { patientId: 'p2', uhid: 'UH0002', name: 'Suresh Patel', age: 38, sex: 'M', mobile: '9876500002', bloodGroup: 'O+' },
    { patientId: 'p3', uhid: 'UH0003', name: 'Anita Sharma', age: 29, sex: 'F', mobile: '9876500003', bloodGroup: 'A+' },
    { patientId: 'p4', uhid: 'UH0004', name: 'Mohammed Irfan', age: 61, sex: 'M', mobile: '9876500004', bloodGroup: 'AB+', allergies: ['Sulfa drugs'] },
    { patientId: 'p5', uhid: 'UH0005', name: 'Lakshmi Iyer', age: 72, sex: 'F', mobile: '9876500005', bloodGroup: 'O-' },
    { patientId: 'p6', uhid: 'UH0006', name: 'Vikram Singh', age: 45, sex: 'M', mobile: '9876500006', bloodGroup: 'B-' },
    { patientId: 'p7', uhid: 'UH0007', name: 'Pooja Reddy', age: 33, sex: 'F', mobile: '9876500007', bloodGroup: 'A-' },
    { patientId: 'p8', uhid: 'UH0008', name: 'Arjun Nair', age: 50, sex: 'M', mobile: '9876500008', bloodGroup: 'O+' },
];

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();
const todayAt = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString(); };

const icd = (code: string) => icdCatalog.find(c => c.code === code);

export const admissions: Admission[] = [
    { admissionId: 'a1', admissionNo: 'ADM-2026-0041', patientId: 'p1', wardId: 'w1', roomId: 'rm1', bedId: 'b1', admissionType: 'EMERGENCY', attendingDoctor: 'Dr. Mehta', treatingTeam: ['Dr. Mehta', 'Dr. Sharma (Resident)'], admittedAt: daysAgo(3), status: 'ADMITTED', provisionalDiagnosis: 'Community-acquired pneumonia', icd: icd('J18.9'), beneficiaryId: 'bf1', consentCaptured: true, depositPaid: 10000, estimatedDailyCost: 3500, expectedDischarge: todayAt(16), isMlc: false },
    { admissionId: 'a2', admissionNo: 'ADM-2026-0042', patientId: 'p2', wardId: 'w1', roomId: 'rm1', bedId: 'b2', admissionType: 'EMERGENCY', attendingDoctor: 'Dr. Rao', admittedAt: daysAgo(1), status: 'ADMITTED', provisionalDiagnosis: 'Acute gastroenteritis', icd: icd('A09'), consentCaptured: true, depositPaid: 5000, estimatedDailyCost: 2800 },
    { admissionId: 'a3', admissionNo: 'ADM-2026-0043', patientId: 'p3', wardId: 'w2', roomId: 'rm2', bedId: 'b7', admissionType: 'EMERGENCY', attendingDoctor: 'Dr. Kapoor', admittedAt: daysAgo(2), status: 'ADMITTED', provisionalDiagnosis: 'Dengue fever', icd: icd('A90'), beneficiaryId: 'bf2', consentCaptured: true, depositPaid: 8000, estimatedDailyCost: 3000 },
    { admissionId: 'a4', admissionNo: 'ADM-2026-0044', patientId: 'p4', wardId: 'w3', roomId: 'rm3', bedId: 'b13', admissionType: 'EMERGENCY', attendingDoctor: 'Dr. Mehta', admittedAt: daysAgo(5), status: 'ADMITTED', provisionalDiagnosis: 'Acute MI, post-PCI', icd: icd('I21.9'), consentCaptured: true, depositPaid: 50000, estimatedDailyCost: 12000 },
    { admissionId: 'a5', admissionNo: 'ADM-2026-0045', patientId: 'p5', wardId: 'w3', roomId: 'rm3', bedId: 'b14', admissionType: 'EMERGENCY', attendingDoctor: 'Dr. Rao', admittedAt: daysAgo(1), status: 'ADMITTED', provisionalDiagnosis: 'Septic shock', icd: icd('A41.9'), consentCaptured: true, depositPaid: 40000, estimatedDailyCost: 14000 },
    { admissionId: 'a6', admissionNo: 'ADM-2026-0046', patientId: 'p6', wardId: 'w4', roomId: 'rm4', bedId: 'b17', admissionType: 'ELECTIVE', attendingDoctor: 'Dr. Kapoor', admittedAt: daysAgo(2), status: 'DISCHARGE_INITIATED', provisionalDiagnosis: 'Elective hernia repair', icd: icd('K40.9'), finalDiagnosis: 'Inguinal hernia — repaired', consentCaptured: true, depositPaid: 25000, estimatedDailyCost: 6000, expectedDischarge: todayAt(12) },
];

export const vitals: VitalReading[] = [
    { id: 'v1', admissionId: 'a1', recordedAt: hoursAgo(18), temperatureF: 101.4, pulse: 96, systolic: 128, diastolic: 82, respRate: 22, spo2: 95, painScore: 4, recordedBy: 'Nurse Priya' },
    { id: 'v2', admissionId: 'a1', recordedAt: hoursAgo(12), temperatureF: 100.8, pulse: 92, systolic: 124, diastolic: 80, respRate: 20, spo2: 96, painScore: 3, recordedBy: 'Nurse Priya' },
    { id: 'v3', admissionId: 'a1', recordedAt: hoursAgo(6), temperatureF: 99.6, pulse: 84, systolic: 120, diastolic: 78, respRate: 18, spo2: 97, painScore: 2, recordedBy: 'Nurse Asha' },
    { id: 'v4', admissionId: 'a1', recordedAt: hoursAgo(1), temperatureF: 98.8, pulse: 78, systolic: 118, diastolic: 76, respRate: 16, spo2: 98, painScore: 1, recordedBy: 'Nurse Asha' },
    // ICU patient with abnormal vitals (drives the doctor "critical" flag)
    { id: 'v5', admissionId: 'a5', recordedAt: hoursAgo(2), temperatureF: 103.1, pulse: 124, systolic: 86, diastolic: 54, respRate: 28, spo2: 89, painScore: 5, recordedBy: 'Nurse Rekha' },
];

export const medications: MedicationDose[] = [
    { id: 'm1', admissionId: 'a1', drugName: 'Ceftriaxone', dose: '1 g', route: 'IV', scheduledAt: hoursAgo(12), status: 'GIVEN', givenBy: 'Nurse Priya', givenAt: hoursAgo(12), highAlert: false },
    { id: 'm2', admissionId: 'a1', drugName: 'Paracetamol', dose: '650 mg', route: 'PO', scheduledAt: hoursAgo(6), status: 'GIVEN', givenBy: 'Nurse Asha', givenAt: hoursAgo(6) },
    { id: 'm3', admissionId: 'a1', drugName: 'Ceftriaxone', dose: '1 g', route: 'IV', scheduledAt: hoursAgo(0.2), status: 'DUE', highAlert: false },
    { id: 'm4', admissionId: 'a1', drugName: 'Enoxaparin', dose: '40 mg', route: 'SC', scheduledAt: hoursAgo(-2), status: 'DUE', highAlert: true },
    { id: 'm5', admissionId: 'a1', drugName: 'Salbutamol neb', dose: '2.5 mg', route: 'NEB', scheduledAt: hoursAgo(8), status: 'MISSED' },
    { id: 'm6', admissionId: 'a5', drugName: 'Noradrenaline', dose: '0.1 mcg/kg/min', route: 'IV', scheduledAt: hoursAgo(0.1), status: 'DUE', highAlert: true },
];

export const roundNotes: RoundNote[] = [
    { id: 'r1', admissionId: 'a1', author: 'Dr. Mehta', authoredAt: daysAgo(2), subjective: 'Persistent cough, febrile overnight.', objective: 'T 101.4°F, crepitations right base.', assessment: 'CAP, responding slowly.', plan: 'Continue IV ceftriaxone, chest physio, review CXR.' },
    { id: 'r2', admissionId: 'a1', author: 'Dr. Mehta', authoredAt: hoursAgo(20), subjective: 'Feeling better, cough reducing.', objective: 'T 99.6°F, air entry improved.', assessment: 'CAP, improving.', plan: 'Step down to oral antibiotics tomorrow if afebrile.' },
];

export const ledger: LedgerEntry[] = [
    { id: 'l1', admissionId: 'a1', kind: 'PAYMENT', at: daysAgo(3), description: 'Admission deposit', category: 'PAYMENT', amount: 10000, mode: 'UPI' },
    { id: 'l2', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(3), description: 'Admission registration', category: 'CONSULT', qty: 1, rate: 500, amount: 500 },
    { id: 'l3', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(3), description: 'Bed charge — General Ward', category: 'BED', qty: 1, rate: 1200, amount: 1200 },
    { id: 'l4', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(2), description: 'Bed charge — General Ward', category: 'BED', qty: 1, rate: 1200, amount: 1200 },
    { id: 'l5', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(2), description: 'CBC + CRP', category: 'LAB', qty: 1, rate: 850, amount: 850 },
    { id: 'l6', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(2), description: 'Ceftriaxone 1g inj', category: 'PHARMACY', qty: 4, rate: 120, amount: 480 },
    { id: 'l7', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(1), description: 'Bed charge — General Ward', category: 'BED', qty: 1, rate: 1200, amount: 1200 },
    { id: 'l8', admissionId: 'a1', kind: 'CHARGE', at: daysAgo(1), description: 'Chest X-ray PA', category: 'LAB', qty: 1, rate: 600, amount: 600 },
    { id: 'l9', admissionId: 'a1', kind: 'PAYMENT', at: daysAgo(1), description: 'Interim payment', category: 'PAYMENT', amount: 3000, mode: 'CASH' },
];

// ── Seeded incentive accruals ───────────────────────────────────────────────────
// a1 referred by bf1 (Dr. Anand, 10%). The ₹3,000 interim payment accrued an incentive
// on its commissionable share (CONSULT+LAB charges on the bill).
export const incentiveAccruals: IncentiveAccrual[] = [
    { accrualId: 'ia1', beneficiaryId: 'bf1', sourceModule: 'IPD', patientId: 'p1', admissionId: 'a1', paymentId: 'l9', eligibleAmount: 1300, ratePercent: 10, incentiveAmount: 130, status: 'ACCRUED', accruedAt: daysAgo(1) },
];
