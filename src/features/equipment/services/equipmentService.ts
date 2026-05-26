import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type EquipmentCategory = 'BIOMEDICAL' | 'ICT' | 'FACILITY' | 'FURNITURE' | 'OTHER';
export type EquipmentStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'RETIRED';
export type MaintenanceActivity = 'PM' | 'BREAKDOWN' | 'CALIBRATION' | 'INSPECTION' | 'REPAIR' | 'OTHER';
export type MaintenanceOutcome = 'PASS' | 'FAIL' | 'NEEDS_FOLLOWUP';

export interface EquipmentListItem {
    equipmentId: string;
    assetCode: string;
    name: string;
    model?: string;
    serialNumber?: string;
    category: EquipmentCategory | string;
    location?: string;
    department?: string;
    installedAt?: string;
    warrantyEndAt?: string;
    amcEndAt?: string;
    pmIntervalDays?: number;
    lastServiceAt?: string;
    nextDueAt?: string;
    isOverdue: boolean;
    isDueSoon: boolean;
    status: EquipmentStatus | string;
    updatedAt: string;
    updatedBy?: string;
}

export interface EquipmentDetail extends Omit<EquipmentListItem, 'isOverdue' | 'isDueSoon'> {
    manufacturer?: string;
    amcVendor?: string;
    notes?: string;
    createdAt: string;
    createdBy?: string;
}

export interface MaintenanceLogItem {
    maintenanceLogId: string;
    activityType: MaintenanceActivity | string;
    performedAt: string;
    performedBy: string;
    vendorName?: string;
    cost?: number;
    partsReplaced?: string;
    findings?: string;
    actionTaken?: string;
    outcome?: MaintenanceOutcome | string;
    nextDueAtOverride?: string;
    notes?: string;
}

export interface UpsertEquipmentRequest {
    equipmentId?: string;
    hospitalId?: string;
    assetCode: string;
    name: string;
    model?: string;
    serialNumber?: string;
    manufacturer?: string;
    category: EquipmentCategory | string;
    location?: string;
    department?: string;
    amcVendor?: string;
    installedAt?: string;
    warrantyEndAt?: string;
    amcEndAt?: string;
    pmIntervalDays?: number;
    nextDueAt?: string;
    status: EquipmentStatus | string;
    notes?: string;
}

export interface UpsertEquipmentResponse {
    success: boolean;
    message?: string;
    equipmentId?: string;
    assetCode?: string;
}

export interface RecordMaintenanceRequest {
    hospitalId?: string;
    equipmentId: string;
    activityType: MaintenanceActivity | string;
    performedAt?: string;
    performedBy?: string;
    vendorName?: string;
    cost?: number;
    partsReplaced?: string;
    findings?: string;
    actionTaken?: string;
    outcome?: MaintenanceOutcome | string;
    nextDueAtOverride?: string;
    notes?: string;
    attachments?: string;
}

export interface RecordMaintenanceResponse {
    success: boolean;
    message?: string;
    maintenanceLogId?: string;
    nextDueAt?: string;
    equipmentStatus?: string;
}

export interface EvaluatePmResponse {
    success: boolean;
    message?: string;
    scanned: number;
    overdueRaised: number;
    dueSoonRaised: number;
    skipped: number;
}

export interface GetEquipmentResponse {
    success: boolean;
    message?: string;
    items: EquipmentListItem[];
}

export interface GetEquipmentByIdResponse {
    success: boolean;
    message?: string;
    equipment?: EquipmentDetail;
    logs: MaintenanceLogItem[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const equipmentService = {
    upsert: (req: UpsertEquipmentRequest): Promise<UpsertEquipmentResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.EQUIPMENT.UPSERT, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (opts?: { category?: string; department?: string; status?: string; search?: string; dueSoonOnly?: boolean; dueSoonDays?: number; take?: number; hospitalId?: string }): Promise<GetEquipmentResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.EQUIPMENT.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    getById: (id: string, hospitalId?: string): Promise<GetEquipmentByIdResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.EQUIPMENT.GET_BY_ID(id, hospitalIdOrThrow(hospitalId))),

    recordMaintenance: (req: RecordMaintenanceRequest): Promise<RecordMaintenanceResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.EQUIPMENT.MAINTENANCE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    evaluatePm: (opts?: { dueSoonDays?: number; hospitalId?: string }): Promise<EvaluatePmResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.EQUIPMENT.EVALUATE_PM, {
            hospitalId: hospitalIdOrThrow(opts?.hospitalId),
            dueSoonDays: opts?.dueSoonDays,
        }),
};
