import { ipdApiClient } from '@/services/ipdApiClient';
import { useAuthStore } from '@/store/authStore';

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export type EquipmentCategory = 'BIOMEDICAL' | 'ICT' | 'FACILITY' | 'FURNITURE' | 'OTHER';
export type EquipmentStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'RETIRED';
export type MaintenanceActivityType = 'PM' | 'BREAKDOWN' | 'CALIBRATION' | 'INSPECTION' | 'REPAIR' | 'OTHER';
export type MaintenanceOutcome = 'PASS' | 'FAIL' | 'NEEDS_FOLLOWUP';

export interface EquipmentItem {
    equipmentId: string;
    assetCode: string;
    name: string;
    model?: string | null;
    serialNumber?: string | null;
    manufacturer?: string | null;
    category: EquipmentCategory;
    location?: string | null;
    department?: string | null;
    amcVendor?: string | null;
    installedAt?: string | null;
    warrantyEndAt?: string | null;
    amcEndAt?: string | null;
    pmIntervalDays?: number | null;
    lastServiceAt?: string | null;
    nextDueAt?: string | null;
    status: EquipmentStatus;
    notes?: string | null;
}

export interface UpsertEquipmentInput {
    equipmentId?: string;
    assetCode: string;
    name: string;
    model?: string;
    serialNumber?: string;
    manufacturer?: string;
    category: EquipmentCategory;
    location?: string;
    department?: string;
    amcVendor?: string;
    installedAt?: string;
    warrantyEndAt?: string;
    amcEndAt?: string;
    pmIntervalDays?: number | null;
    status?: EquipmentStatus;
    notes?: string;
}

export interface MaintenanceLogItem {
    maintenanceLogId: string;
    activityType: MaintenanceActivityType;
    performedAt: string;
    performedBy: string;
    vendorName?: string | null;
    cost?: number | null;
    partsReplaced?: string | null;
    findings?: string | null;
    actionTaken?: string | null;
    outcome?: MaintenanceOutcome | null;
    nextDueAtOverride?: string | null;
    notes?: string | null;
}

export interface RecordMaintenanceLogInput {
    activityType: MaintenanceActivityType;
    performedAt?: string;
    vendorName?: string;
    cost?: number;
    partsReplaced?: string;
    findings?: string;
    actionTaken?: string;
    outcome?: MaintenanceOutcome;
    nextDueAtOverride?: string;
    notes?: string;
}

export const equipmentApi = {
    getEquipment: (params: { status?: string; department?: string; category?: string; dueOnly?: boolean } = {}, hospitalId?: string): Promise<EquipmentItem[]> =>
        ipdApiClient
            .get<{ equipment?: EquipmentItem[] }>('/equipment', { params: { hospitalId: hospitalIdOrThrow(hospitalId), ...params } })
            .then(r => r.equipment ?? []),

    upsertEquipment: (input: UpsertEquipmentInput, hospitalId?: string) =>
        ipdApiClient.post('/equipment', { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),

    getMaintenanceLogHistory: (equipmentId: string, hospitalId?: string): Promise<MaintenanceLogItem[]> =>
        ipdApiClient
            .get<{ logs?: MaintenanceLogItem[] }>(`/equipment/${equipmentId}/maintenance-log`, { params: { hospitalId: hospitalIdOrThrow(hospitalId) } })
            .then(r => r.logs ?? []),

    recordMaintenanceLog: (equipmentId: string, input: RecordMaintenanceLogInput, hospitalId?: string) =>
        ipdApiClient.post(`/equipment/${equipmentId}/maintenance-log`, { hospitalId: hospitalIdOrThrow(hospitalId), ...input }),
};
