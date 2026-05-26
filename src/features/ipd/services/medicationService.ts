import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type FrequencyCode =
    | 'OD' | 'BID' | 'TID' | 'QID'
    | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H'
    | 'STAT' | 'PRN';

export type OrderStatus = 'ACTIVE' | 'HELD' | 'DISCONTINUED' | 'COMPLETED';

export type AdministrationAction =
    | 'ADMINISTERED'
    | 'HELD'
    | 'REFUSED'
    | 'PATIENT_NOT_AVAILABLE'
    | 'MISSED';

export type SlotStatus =
    | 'OVERDUE'
    | 'DUE'
    | 'UPCOMING'
    | 'DONE'
    | 'HELD'
    | 'REFUSED'
    | 'PATIENT_NOT_AVAILABLE'
    | 'MISSED';

export interface MedicationOrder {
    medicationOrderId: string;
    drugName: string;
    genericName?: string;
    strength?: string;
    dosageForm?: string;
    dose: string;
    route: string;
    frequencyCode: FrequencyCode | string;
    durationDays?: number | null;
    startAt: string;
    endAt?: string | null;
    highAlert: boolean;
    allergyOverride: boolean;
    allergyOverrideReason?: string;
    status: OrderStatus | string;
    discontinueReason?: string;
    discontinuedAt?: string | null;
    discontinuedBy?: string;
    prescribedByDoctorId?: string | null;
    prescribedByName?: string;
    prescribedAt: string;
    inventoryItemId?: string;
    qtyPerDose?: number;
    notes?: string;
}

export interface MedicationAdministrationRecord {
    medicationAdministrationId: string;
    medicationOrderId: string;
    drugName: string;
    scheduledFor: string;
    actionStatus: AdministrationAction | string;
    administeredDose?: string;
    administeredRoute?: string;
    administrationSite?: string;
    actedAt: string;
    actedBy?: string;
    witnessRequired: boolean;
    witnessName?: string;
    reason?: string;
    notes?: string;
}

export interface MedicationDueDose {
    medicationOrderId: string;
    drugName: string;
    genericName?: string;
    dose: string;
    route: string;
    frequencyCode: FrequencyCode | string;
    highAlert: boolean;
    allergyOverride: boolean;
    scheduledFor: string;
    slotStatus: SlotStatus | string;
    medicationAdministrationId?: string;
    actedAt?: string;
    actedBy?: string;
}

export interface CreateMedicationOrderRequest {
    hospitalId?: string;
    admissionId: string;
    drugName: string;
    genericName?: string;
    strength?: string;
    dosageForm?: string;
    dose: string;
    route: string;
    frequencyCode: FrequencyCode | string;
    durationDays?: number | null;
    startAt?: string;
    highAlert?: boolean;
    allergyOverride?: boolean;
    allergyOverrideReason?: string;
    prescribedByDoctorId?: string;
    prescribedByName?: string;
    // Auto-dispense link
    inventoryItemId?: string;
    qtyPerDose?: number;
    notes?: string;
}

export interface CreateMedicationOrderResponse {
    success: boolean;
    message?: string;
    medicationOrderId?: string;
    startAt?: string;
    endAt?: string | null;
}

export interface UpdateMedicationOrderStatusRequest {
    hospitalId?: string;
    medicationOrderId: string;
    status: OrderStatus | string;
    discontinueReason?: string;
}

export interface UpdateMedicationOrderStatusResponse {
    success: boolean;
    message?: string;
    status?: string;
}

export interface RecordMedicationAdministrationRequest {
    hospitalId?: string;
    admissionId: string;
    medicationOrderId: string;
    scheduledFor: string;
    actionStatus: AdministrationAction | string;
    administeredDose?: string;
    administeredRoute?: string;
    administrationSite?: string;
    actedAt?: string;
    witnessName?: string;
    witnessUserId?: string;
    reason?: string;
    notes?: string;
}

export interface RecordMedicationAdministrationResponse {
    success: boolean;
    message?: string;
    medicationAdministrationId?: string;
    witnessSatisfied?: boolean;
    // Auto-dispense outcome (populated when order was linked to inventory)
    dispensed?: boolean;
    dispensedQty?: number;
    currentStock?: number;
    lowStockReached?: boolean;
    chargeEventId?: string;
    inventoryMovementId?: string;
}

export interface GetMedicationOrdersResponse {
    success: boolean;
    message?: string;
    items: MedicationOrder[];
}

export interface GetMedicationAdministrationsResponse {
    success: boolean;
    message?: string;
    items: MedicationAdministrationRecord[];
}

export interface GetMedicationDueDosesResponse {
    success: boolean;
    message?: string;
    windowStartUtc: string;
    windowEndUtc: string;
    items: MedicationDueDose[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const medicationService = {
    createOrder: (req: CreateMedicationOrderRequest): Promise<CreateMedicationOrderResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MEDICATION.CREATE_ORDER, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listOrders: (admissionId: string, status?: string, hospitalId?: string): Promise<GetMedicationOrdersResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MEDICATION.LIST_ORDERS(hospitalIdOrThrow(hospitalId), admissionId, status)),

    updateOrderStatus: (req: UpdateMedicationOrderStatusRequest): Promise<UpdateMedicationOrderStatusResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MEDICATION.UPDATE_ORDER_STATUS, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    recordAdministration: (req: RecordMedicationAdministrationRequest): Promise<RecordMedicationAdministrationResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MEDICATION.RECORD_ADMINISTRATION, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    listAdministrations: (
        admissionId: string,
        opts?: { medicationOrderId?: string; fromUtc?: string; toUtc?: string; hospitalId?: string },
    ): Promise<GetMedicationAdministrationsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MEDICATION.LIST_ADMINISTRATIONS(
            hospitalIdOrThrow(opts?.hospitalId),
            admissionId,
            opts?.medicationOrderId,
            opts?.fromUtc,
            opts?.toUtc,
        )),

    listDueDoses: (
        admissionId: string,
        opts?: { windowStartUtc?: string; windowEndUtc?: string; hospitalId?: string },
    ): Promise<GetMedicationDueDosesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MEDICATION.LIST_DUE(
            hospitalIdOrThrow(opts?.hospitalId),
            admissionId,
            opts?.windowStartUtc,
            opts?.windowEndUtc,
        )),
};
