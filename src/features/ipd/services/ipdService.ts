import {
    Admission, Ward, Bed, IPDSummaries, NewAdmissionFormData,
    IPDBill, IPDBillItem, PaymentEntry, DischargeCertificate,
    AdmissionStatus, AdmissionPriority, BedStatus, WardType,
} from '../types';
import { admissionService, type AdmissionListItem, type AdmissionDetail } from './admissionService';
import { bedService, type BedMasterItem } from './bedService';
import { differenceInDays } from 'date-fns';

// ───────────────────────────────────────────────────────────────────────────────
// Mapping helpers (backend shapes → frontend shapes)
// ───────────────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, AdmissionStatus> = {
    ADMITTED: 'ADMITTED',
    DISCHARGED: 'DISCHARGED',
    CANCELLED: 'CANCELLED',
};

const BED_STATUS_MAP: Record<string, BedStatus> = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    CLEANING: 'CLEANING',
    RESERVED: 'RESERVED',
    BLOCKED: 'MAINTENANCE',
};

const WARD_TYPE_MAP: Record<string, WardType> = {
    GENERAL: 'GENERAL',
    SEMI_PRIVATE: 'SEMI_PRIVATE',
    PRIVATE: 'PRIVATE',
    ICU: 'ICU',
    HDU: 'HDU',
    NICU: 'NICU',
    PICU: 'PICU',
    EMERGENCY: 'EMERGENCY',
    OTHER: 'GENERAL',
};

const toStatus = (s?: string): AdmissionStatus => STATUS_MAP[(s ?? '').toUpperCase()] ?? 'ADMITTED';
const toBedStatus = (s?: string): BedStatus => BED_STATUS_MAP[(s ?? '').toUpperCase()] ?? 'AVAILABLE';
const toWardType = (t?: string): WardType => WARD_TYPE_MAP[(t ?? '').toUpperCase()] ?? 'GENERAL';
const toSex = (s?: string): 'M' | 'F' | 'O' => {
    const u = (s ?? '').trim().toUpperCase();
    if (u === 'M' || u === 'MALE') return 'M';
    if (u === 'F' || u === 'FEMALE') return 'F';
    return 'O';
};

// Backend has no `priority` field today — defaulting to ROUTINE.
// TODO: add `priority` to Admission entity when fast-track admissions land.
const PRIORITY_DEFAULT: AdmissionPriority = 'ROUTINE';

const mapListItemToAdmission = (item: AdmissionListItem): Admission => ({
    id: item.admissionId,
    encounterId: item.encounterId,
    admissionNo: item.admissionNo,
    patientId: item.patientId ?? '',
    patientName: item.patientName ?? item.patientId ?? 'Unknown',
    patientMobile: item.patientMobile,
    age: item.patientAgeYears ?? 0,
    sex: toSex(item.patientSex),
    admissionDate: item.admittedAt,
    dischargeDate: item.dischargedAt,
    status: toStatus(item.statusCode),
    priority: PRIORITY_DEFAULT,
    wardId: item.currentWardCode ?? '',
    wardName: item.currentWardName ?? '—',
    bedId: item.currentBedId ?? '',
    bedNumber: item.currentBedCode ?? '—',
    attendingDoctor: item.primaryDoctorName ?? '—',
    attendingDoctorId: item.primaryDoctorId,
    diagnosis: item.diagnosis ?? undefined,
});

const mapDetailToAdmission = (d: AdmissionDetail): Admission => ({
    id: d.admissionId,
    encounterId: d.encounterId,
    admissionNo: d.admissionNo,
    patientId: d.patientId ?? '',
    patientName: d.patientName ?? d.patientId ?? 'Unknown',
    patientMobile: d.patientMobile,
    age: d.patientAgeYears ?? 0,
    sex: toSex(d.patientSex),
    admissionDate: d.admittedAt,
    expectedDischargeDate: d.expectedDischargeAt,
    dischargeDate: d.dischargedAt,
    status: toStatus(d.statusCode),
    priority: PRIORITY_DEFAULT,
    wardId: d.currentBed?.bedCode ? '' : '',
    wardName: d.currentBed?.wardName ?? '—',
    bedId: d.currentBed?.bedId ?? '',
    bedNumber: d.currentBed?.bedCode ?? '—',
    attendingDoctor: d.primaryDoctorName ?? '—',
    attendingDoctorId: d.primaryDoctorId,
    diagnosis: d.diagnosis ?? undefined,
    chiefComplaint: d.admissionReason ?? undefined,
});

const mapBedToFrontend = (b: BedMasterItem, admissionsByBedId: Map<string, AdmissionListItem>): Bed => {
    const occupant = admissionsByBedId.get(b.bedId);
    return {
        id: b.bedId,
        bedNumber: b.bedCode ?? '—',
        status: toBedStatus(b.statusCode),
        wardId: b.wardCode ?? '',
        patientId: occupant?.patientId,
        patientName: occupant?.patientName,
        admissionId: occupant?.admissionId,
        pricePerDay: b.effectiveDailyRate,
    };
};

// Group flat bed list by WardCode into Ward[] (client-side grouping per project decision)
const groupBedsByWard = (beds: BedMasterItem[], admissionsByBedId: Map<string, AdmissionListItem>): Ward[] => {
    const byWard = new Map<string, { name: string; type: WardType; floor: string; beds: Bed[] }>();
    for (const b of beds) {
        const key = b.wardCode ?? '_NO_WARD';
        if (!byWard.has(key)) {
            byWard.set(key, {
                name: b.wardName ?? key,
                type: toWardType(b.wardType),
                floor: b.floorNo ?? '',
                beds: [],
            });
        }
        byWard.get(key)!.beds.push(mapBedToFrontend(b, admissionsByBedId));
    }

    return Array.from(byWard.entries()).map(([wardCode, data]) => ({
        id: wardCode,
        name: data.name,
        type: data.type,
        floor: data.floor,
        totalBeds: data.beds.length,
        availableBeds: data.beds.filter(bed => bed.status === 'AVAILABLE').length,
        beds: data.beds,
    }));
};

// ───────────────────────────────────────────────────────────────────────────────
// Service
// ───────────────────────────────────────────────────────────────────────────────

let _wardsCache: { fetchedAt: number; data: Ward[] } | null = null;
const WARDS_TTL_MS = 30_000;

export const ipdService = {
    async getAdmissions(): Promise<Admission[]> {
        const res = await admissionService.list({ pageSize: 200 });
        return (res.items ?? []).map(mapListItemToAdmission);
    },

    async getActiveAdmissions(): Promise<Admission[]> {
        const res = await admissionService.list({ statusCode: 'ADMITTED', pageSize: 200 });
        return (res.items ?? []).map(mapListItemToAdmission);
    },

    async getDischargedAdmissions(): Promise<Admission[]> {
        const res = await admissionService.list({ statusCode: 'DISCHARGED', pageSize: 200 });
        return (res.items ?? []).map(mapListItemToAdmission);
    },

    async getSummaries(): Promise<IPDSummaries> {
        const [activeRes, wards] = await Promise.all([
            admissionService.list({ statusCode: 'ADMITTED', pageSize: 200 }),
            this.getWards(),
        ]);
        const active = activeRes.items ?? [];
        const totalBeds = wards.reduce((s, w) => s + w.totalBeds, 0);
        const availableBeds = wards.reduce((s, w) => s + w.availableBeds, 0);
        const occupiedBeds = totalBeds - availableBeds;
        const today = new Date().toDateString();
        const todayAdmissions = active.filter(a => new Date(a.admittedAt).toDateString() === today).length;

        return {
            totalAdmissions: active.length,
            occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
            availableBeds,
            // Priority not on backend yet — once added, count by 'EMERGENCY'.
            emergencyAdmissions: 0,
            todayAdmissions,
            todayDischarges: 0,
            pendingDischarges: 0,
        };
    },

    async getWards(force = false): Promise<Ward[]> {
        const now = Date.now();
        if (!force && _wardsCache && now - _wardsCache.fetchedAt < WARDS_TTL_MS) {
            return _wardsCache.data;
        }
        const [bedsRes, activeRes] = await Promise.all([
            bedService.list({ pageSize: 500 }),
            admissionService.list({ statusCode: 'ADMITTED', pageSize: 500 }),
        ]);
        const occupancyMap = new Map<string, AdmissionListItem>();
        for (const a of (activeRes.items ?? [])) {
            if (a.currentBedId) occupancyMap.set(a.currentBedId, a);
        }
        const wards = groupBedsByWard(bedsRes.items ?? [], occupancyMap);
        _wardsCache = { fetchedAt: now, data: wards };
        return wards;
    },

    async getAdmissionById(id: string): Promise<Admission | undefined> {
        try {
            const res = await admissionService.getById(id);
            return res.data ? mapDetailToAdmission(res.data) : undefined;
        } catch {
            return undefined;
        }
    },

    async createAdmission(data: NewAdmissionFormData): Promise<Admission> {
        if (!data.patientId) throw new Error('Patient must be selected before admitting');
        if (!data.bedId) throw new Error('Bed must be selected before admitting');
        const res = await admissionService.admit({
            patientId: data.patientId,
            bedId: data.bedId,
            primaryDoctorId: data.attendingDoctorId || undefined,
            expectedDischargeAt: data.expectedDischargeDate || undefined,
            admissionReason: data.chiefComplaint,
            diagnosis: data.diagnosis,
        });
        if (!res.success || !res.data) {
            throw new Error(res.message ?? 'Failed to admit patient');
        }
        // Invalidate wards cache because a bed flipped to OCCUPIED
        _wardsCache = null;
        const detail = await this.getAdmissionById(res.data.admissionId);
        if (!detail) throw new Error('Admission created but could not be loaded');
        return detail;
    },

    async dischargePatient(admissionId: string, dischargeNotes?: string): Promise<void> {
        const res = await admissionService.discharge({ admissionId, dischargeNotes });
        if (!res.success) {
            throw new Error(res.message ?? 'Failed to discharge patient');
        }
        _wardsCache = null;
    },

    async getAvailableBedsForWard(wardId: string): Promise<Bed[]> {
        const wards = await this.getWards();
        const ward = wards.find(w => w.id === wardId);
        return (ward?.beds ?? []).filter(b => b.status === 'AVAILABLE');
    },

    // Bill & discharge cert are wired in Phase 1.4 / 1.7 — placeholder for now.
    // Returning null keeps the EmptyBlock state in BillTab / DischargeCertificateTab valid.
    async getBillForAdmission(_admissionId: string): Promise<IPDBill | null> {
        return null;
    },

    async getDischargeCertificate(_admissionId: string): Promise<DischargeCertificate | null> {
        return null;
    },
};

// Re-exported types so callers don't break — keep public surface stable.
export type { IPDBill, IPDBillItem, PaymentEntry, DischargeCertificate };
