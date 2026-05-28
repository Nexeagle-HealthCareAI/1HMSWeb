import { create } from 'zustand';
import {
    Ward, Room, Bed, Patient, Admission, VitalReading, MedicationDose, RoundNote, LedgerEntry, AdmissionView,
    AdmissionType, IcdCode, BillingPolicy, Beneficiary, IncentiveAccrual,
} from './types';
import * as mock from './data/mockData';

let seq = 100;
const nextId = (prefix: string) => `${prefix}${++seq}`;

interface AdmitInput {
    patientId: string; wardId: string; roomId: string; bedId: string;
    admissionType: AdmissionType; attendingDoctor: string;
    provisionalDiagnosis: string; icd?: IcdCode; consentCaptured: boolean;
    depositPaid: number; estimatedDailyCost: number; isMlc?: boolean;
    beneficiaryId?: string;
}

interface IpdState {
    wards: Ward[];
    rooms: Room[];
    beds: Bed[];
    patients: Patient[];
    admissions: Admission[];
    vitals: VitalReading[];
    medications: MedicationDose[];
    roundNotes: RoundNote[];
    ledger: LedgerEntry[];
    icdCatalog: IcdCode[];
    policy: BillingPolicy;
    beneficiaries: Beneficiary[];
    incentiveAccruals: IncentiveAccrual[];

    // selectors
    admissionViews: () => AdmissionView[];
    admissionView: (id: string) => AdmissionView | undefined;
    availableBeds: (wardId?: string, roomId?: string) => Bed[];
    hasCriticalVitals: (admissionId: string) => boolean;
    pendingTaskCount: (admissionId: string) => number;

    // incentive selectors
    accrualsByBeneficiary: (beneficiaryId: string, status?: string) => IncentiveAccrual[];
    beneficiaryName: (beneficiaryId?: string) => string | undefined;

    // actions
    setPolicy: (patch: Partial<BillingPolicy>) => void;
    runNightlyBilling: () => { bedCharges: number; total: number };
    admitPatient: (input: AdmitInput) => string;
    upsertBeneficiary: (b: Omit<Beneficiary, 'beneficiaryId'> & { beneficiaryId?: string }) => string;
    payoutBeneficiary: (beneficiaryId: string) => { count: number; total: number };
    initiateDischarge: (admissionId: string, finalDiagnosis: string) => void;
    completeDischarge: (admissionId: string) => void;
    giveMedication: (medId: string, by: string) => void;
    addVital: (v: Omit<VitalReading, 'id'>) => void;
    addRoundNote: (n: Omit<RoundNote, 'id'>) => void;
    addCharge: (admissionId: string, e: { description: string; category: string; qty: number; rate: number }) => void;
    addPayment: (admissionId: string, amount: number, mode: string) => void;
}

const losDays = (admittedAt: string) => Math.max(1, Math.ceil((Date.now() - new Date(admittedAt).getTime()) / 86400_000));
const isToday = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export const useIpdStore = create<IpdState>((set, get) => ({
    wards: mock.wards,
    rooms: mock.rooms,
    beds: mock.beds.map(b => ({ ...b })),
    patients: mock.patients,
    admissions: mock.admissions.map(a => ({ ...a })),
    vitals: mock.vitals.map(v => ({ ...v })),
    medications: mock.medications.map(m => ({ ...m })),
    roundNotes: mock.roundNotes.map(r => ({ ...r })),
    ledger: mock.ledger.map(l => ({ ...l })),
    icdCatalog: mock.icdCatalog,
    policy: { ...mock.billingPolicy, doctorConsultFees: { ...mock.billingPolicy.doctorConsultFees } },
    beneficiaries: mock.beneficiaries.map(b => ({ ...b })),
    incentiveAccruals: mock.incentiveAccruals.map(a => ({ ...a })),

    admissionViews: () => {
        const s = get();
        return s.admissions
            .filter(a => a.status === 'ADMITTED' || a.status === 'DISCHARGE_INITIATED')
            .map(a => s.admissionView(a.admissionId)!)
            .filter(Boolean);
    },

    admissionView: (id: string) => {
        const s = get();
        const a = s.admissions.find(x => x.admissionId === id);
        if (!a) return undefined;
        const patient = s.patients.find(p => p.patientId === a.patientId)!;
        const ward = s.wards.find(w => w.wardId === a.wardId)!;
        const room = s.rooms.find(r => r.roomId === a.roomId) ?? { roomId: '', wardId: a.wardId, roomCode: '—', roomType: 'GENERAL_HALL' as const, dailyTariff: ward.dailyRate };
        const bed = s.beds.find(b => b.bedId === a.bedId)!;
        const effectiveDailyRate = bed.dailyRateOverride ?? room.dailyTariff ?? ward.dailyRate;
        const entries = s.ledger.filter(l => l.admissionId === id);
        const totalCharges = entries.filter(e => e.kind === 'CHARGE').reduce((t, e) => t + e.amount, 0);
        const totalPaid = entries.filter(e => e.kind === 'PAYMENT').reduce((t, e) => t + e.amount, 0);
        return {
            ...a, patient, ward, room, bed, effectiveDailyRate,
            lengthOfStayDays: losDays(a.admittedAt),
            totalCharges, totalPaid, balance: totalCharges - totalPaid,
            dueToday: isToday(a.expectedDischarge),
        };
    },

    availableBeds: (wardId?: string, roomId?: string) =>
        get().beds.filter(b => b.status === 'AVAILABLE'
            && (!wardId || b.wardId === wardId)
            && (!roomId || b.roomId === roomId)),

    hasCriticalVitals: (admissionId: string) => {
        const last = get().vitals.filter(v => v.admissionId === admissionId).slice(-1)[0];
        if (!last) return false;
        return (last.spo2 != null && last.spo2 < 92)
            || (last.systolic != null && (last.systolic < 90 || last.systolic > 180))
            || (last.temperatureF != null && last.temperatureF >= 103)
            || (last.pulse != null && last.pulse > 120);
    },

    pendingTaskCount: (admissionId: string) =>
        get().medications.filter(m => m.admissionId === admissionId && m.status === 'DUE').length,

    accrualsByBeneficiary: (beneficiaryId: string, status?: string) =>
        get().incentiveAccruals.filter(a => a.beneficiaryId === beneficiaryId && (!status || a.status === status)),

    beneficiaryName: (beneficiaryId?: string) =>
        beneficiaryId ? get().beneficiaries.find(b => b.beneficiaryId === beneficiaryId)?.name : undefined,

    setPolicy: (patch) => set(state => ({ policy: { ...state.policy, ...patch } })),

    // Simulate the nightly midnight job: post one bed charge per active admission that
    // doesn't already have a bed charge dated today. Mirrors NightJob's idempotent insert.
    runNightlyBilling: () => {
        const state = get();
        if (!state.policy.autoDailyBedCharge) return { bedCharges: 0, total: 0 };
        const today = new Date().toDateString();
        const active = state.admissions.filter(a => a.status === 'ADMITTED' || a.status === 'DISCHARGE_INITIATED');
        const newEntries: LedgerEntry[] = [];
        let total = 0;
        for (const a of active) {
            const alreadyToday = state.ledger.some(l =>
                l.admissionId === a.admissionId && l.category === 'BED' && new Date(l.at).toDateString() === today);
            if (alreadyToday) continue;
            const room = state.rooms.find(r => r.roomId === a.roomId);
            const ward = state.wards.find(w => w.wardId === a.wardId);
            const rate = room?.dailyTariff ?? ward?.dailyRate ?? 0;
            if (rate <= 0) continue;
            newEntries.push({
                id: nextId('l'), admissionId: a.admissionId, kind: 'CHARGE', at: new Date().toISOString(),
                description: `Bed charge — ${ward?.wardName ?? 'Ward'}`, category: 'BED', qty: 1, rate, amount: rate,
                auto: true, autoSource: 'BED_NIGHTLY',
            });
            total += rate;
        }
        if (newEntries.length) set(s => ({ ledger: [...s.ledger, ...newEntries] }));
        return { bedCharges: newEntries.length, total };
    },

    admitPatient: (input) => {
        const admissionId = nextId('a');
        const admissionNo = `ADM-2026-${String(seq).padStart(4, '0')}`;
        const policy = get().policy;
        const consultFee = policy.doctorConsultFees[input.attendingDoctor] ?? 500;
        const at = new Date().toISOString();
        const newLedger: LedgerEntry[] = [];
        if (input.depositPaid > 0) {
            newLedger.push({ id: nextId('l'), admissionId, kind: 'PAYMENT', at, description: 'Admission deposit', category: 'PAYMENT', amount: input.depositPaid, mode: 'CASH' });
        }
        if (policy.autoConsultFeeOnAdmission) {
            // Auto-posted consultant fee (the OPD-style consult charge), sourced from the doctor's fee.
            newLedger.push({ id: nextId('l'), admissionId, kind: 'CHARGE', at, description: `Consultation — ${input.attendingDoctor}`, category: 'CONSULT', qty: 1, rate: consultFee, amount: consultFee, auto: true, autoSource: 'CONSULT_ADMIT' });
        } else {
            // Manual fallback: flat registration charge
            newLedger.push({ id: nextId('l'), admissionId, kind: 'CHARGE', at, description: 'Admission registration', category: 'CONSULT', qty: 1, rate: 500, amount: 500 });
        }
        set(state => ({
            admissions: [
                ...state.admissions,
                {
                    admissionId, admissionNo,
                    patientId: input.patientId, wardId: input.wardId, roomId: input.roomId, bedId: input.bedId,
                    admissionType: input.admissionType, attendingDoctor: input.attendingDoctor,
                    admittedAt: at, status: 'ADMITTED',
                    provisionalDiagnosis: input.provisionalDiagnosis, icd: input.icd,
                    beneficiaryId: input.beneficiaryId,
                    consentCaptured: input.consentCaptured, depositPaid: input.depositPaid,
                    estimatedDailyCost: input.estimatedDailyCost, isMlc: input.isMlc,
                },
            ],
            beds: state.beds.map(b => b.bedId === input.bedId ? { ...b, status: 'OCCUPIED', admissionId } : b),
            ledger: [...state.ledger, ...newLedger],
        }));
        return admissionId;
    },

    initiateDischarge: (admissionId, finalDiagnosis) =>
        set(state => ({
            admissions: state.admissions.map(a => a.admissionId === admissionId
                ? { ...a, status: 'DISCHARGE_INITIATED', finalDiagnosis } : a),
        })),

    completeDischarge: (admissionId) =>
        set(state => {
            const a = state.admissions.find(x => x.admissionId === admissionId);
            return {
                admissions: state.admissions.map(x => x.admissionId === admissionId ? { ...x, status: 'DISCHARGED' } : x),
                beds: state.beds.map(b => a && b.bedId === a.bedId ? { ...b, status: 'CLEANING', admissionId: undefined } : b),
            };
        }),

    giveMedication: (medId, by) =>
        set(state => ({
            medications: state.medications.map(m => m.id === medId
                ? { ...m, status: 'GIVEN', givenBy: by, givenAt: new Date().toISOString() } : m),
        })),

    addVital: (v) => set(state => ({ vitals: [...state.vitals, { ...v, id: nextId('v') }] })),

    addRoundNote: (n) => set(state => ({ roundNotes: [...state.roundNotes, { ...n, id: nextId('r') }] })),

    addCharge: (admissionId, e) =>
        set(state => ({
            ledger: [...state.ledger, {
                id: nextId('l'), admissionId, kind: 'CHARGE', at: new Date().toISOString(),
                description: e.description, category: e.category, qty: e.qty, rate: e.rate, amount: e.qty * e.rate,
            }],
        })),

    addPayment: (admissionId, amount, mode) =>
        set(state => {
            const at = new Date().toISOString();
            const paymentId = nextId('l');
            const ledger = [...state.ledger, {
                id: paymentId, admissionId, kind: 'PAYMENT' as const, at,
                description: 'Payment received', category: 'PAYMENT', amount, mode,
            }];

            // ── Incentive accrual on payment received ──────────────────────────
            // Eligible = commissionable share of this payment (referral incentive accrues
            // only on money actually collected). Pass-through categories (BED/PHARMACY) excluded.
            const newAccruals: IncentiveAccrual[] = [];
            const admission = state.admissions.find(a => a.admissionId === admissionId);
            const beneficiary = admission?.beneficiaryId
                ? state.beneficiaries.find(b => b.beneficiaryId === admission.beneficiaryId && b.isActive)
                : undefined;
            if (beneficiary && beneficiary.defaultRatePercent > 0) {
                const charges = state.ledger.filter(l => l.admissionId === admissionId && l.kind === 'CHARGE');
                const totalCharges = charges.reduce((t, c) => t + c.amount, 0);
                const commissionable = charges
                    .filter(c => mock.COMMISSIONABLE_CATEGORIES.includes(c.category))
                    .reduce((t, c) => t + c.amount, 0);
                const share = totalCharges > 0 ? commissionable / totalCharges : 0;
                const eligible = Math.round(amount * share);
                const incentive = Math.round(eligible * beneficiary.defaultRatePercent / 100);
                if (incentive > 0) {
                    newAccruals.push({
                        accrualId: nextId('ia'), beneficiaryId: beneficiary.beneficiaryId,
                        sourceModule: 'IPD', patientId: admission!.patientId, admissionId,
                        paymentId, eligibleAmount: eligible, ratePercent: beneficiary.defaultRatePercent,
                        incentiveAmount: incentive, status: 'ACCRUED', accruedAt: at,
                    });
                }
            }

            return {
                ledger,
                incentiveAccruals: newAccruals.length ? [...state.incentiveAccruals, ...newAccruals] : state.incentiveAccruals,
            };
        }),

    upsertBeneficiary: (b) => {
        const id = b.beneficiaryId ?? nextId('bf');
        set(state => ({
            beneficiaries: b.beneficiaryId
                ? state.beneficiaries.map(x => x.beneficiaryId === b.beneficiaryId ? { ...x, ...b, beneficiaryId: id } : x)
                : [...state.beneficiaries, { ...b, beneficiaryId: id }],
        }));
        return id;
    },

    payoutBeneficiary: (beneficiaryId) => {
        const pending = get().incentiveAccruals.filter(a => a.beneficiaryId === beneficiaryId && a.status === 'ACCRUED');
        const total = pending.reduce((t, a) => t + a.incentiveAmount, 0);
        if (pending.length) {
            set(state => ({
                incentiveAccruals: state.incentiveAccruals.map(a =>
                    a.beneficiaryId === beneficiaryId && a.status === 'ACCRUED' ? { ...a, status: 'PAID' as const } : a),
            }));
        }
        return { count: pending.length, total };
    },
}));
