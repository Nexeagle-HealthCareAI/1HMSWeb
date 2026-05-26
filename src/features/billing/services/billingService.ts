import {
    ipdBillingService,
    type ChargeMaster as ApiChargeMaster,
    type AppliesTo,
    type UpsertChargeMasterRequest,
} from './ipdBillingService';

// Legacy alias types so existing UI compiles. These map onto the new ChargeMaster shape.
export type VisitType = AppliesTo;

export type ChargeCategory =
    | 'Consultation'
    | 'Laboratory'
    | 'Radiology'
    | 'Procedures'
    | 'Admission'
    | 'Bed Charges'
    | 'Nursing'
    | 'OT Charges'
    | 'Physiotherapy'
    | 'Vaccination'
    | 'Miscellaneous';

export type ChargeType = 'Service' | 'Product' | 'Bed' | 'Package' | 'Procedure';

export interface ChargeItem {
    chargeItemId: string;          // maps to chargeId
    hospitalId: string;
    chargeCode?: string;
    displayName: string;
    visitType: VisitType | string;  // maps to appliesTo
    category: ChargeCategory | string; // maps to categoryCode
    chargeType: ChargeType | string; // round-trips via subCategoryCode
    subCategoryCode?: string;
    defaultQty: number;
    defaultRate: number;
    defaultDiscountPercent: number; // maps to maxDiscountPercent

    // GST
    hsnSacCode?: string;
    isTaxable?: boolean;
    gstSlabPercent?: number;
    taxInclusive?: boolean;

    isActive: boolean;
    sortOrder: number;
    notes?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface ChargeItemRequest {
    chargeItemId?: string;
    chargeCode?: string;
    displayName: string;
    visitType: VisitType | string;
    category: ChargeCategory | string;
    chargeType: ChargeType | string;
    subCategoryCode?: string;
    defaultQty: number;
    defaultRate: number;
    defaultDiscountPercent: number;

    // GST
    hsnSacCode?: string;
    isTaxable?: boolean;
    gstSlabPercent?: number;
    taxInclusive?: boolean;

    isActive?: boolean;
    sortOrder?: number;
    notes?: string;
}

export interface ChargeItemResponse {
    success: boolean;
    message: string;
    chargeItemId: string;
}

export interface GetChargeItemsResponse {
    success: boolean;
    message: string;
    data: ChargeItem[];
}

export interface DeleteChargeItemResponse {
    success: boolean;
    message: string;
}

const VISIT_TO_APPLIES: Record<string, AppliesTo> = {
    OPD: 'OPD', IPD: 'IPD', LAB: 'LAB', PHARMACY: 'PHARMACY', RAD: 'RAD', ER: 'ANY', OTHER: 'ANY', ANY: 'ANY',
};

const toAppliesTo = (visitType: string): AppliesTo =>
    VISIT_TO_APPLIES[(visitType ?? '').toUpperCase()] ?? 'ANY';

// UI category labels → canonical schema codes (CategoryCode is NVARCHAR(30))
const UI_TO_CATEGORY_CODE: Record<string, string> = {
    'Consultation': 'CONSULT',
    'Laboratory': 'LAB',
    'Radiology': 'RAD',
    'Procedures': 'PROCEDURE',
    'Admission': 'BED',
    'Bed Charges': 'BED',
    'Nursing': 'SERVICE',
    'OT Charges': 'PROCEDURE',
    'Physiotherapy': 'SERVICE',
    'Vaccination': 'SERVICE',
    'Miscellaneous': 'OTHER',
};

const CATEGORY_CODE_TO_UI: Record<string, ChargeCategory> = {
    CONSULT: 'Consultation',
    LAB: 'Laboratory',
    RAD: 'Radiology',
    PROCEDURE: 'Procedures',
    BED: 'Bed Charges',
    SERVICE: 'Nursing',
    CONSUMABLE: 'Miscellaneous',
    OTHER: 'Miscellaneous',
};

const toCategoryCode = (uiCategory: string): string =>
    UI_TO_CATEGORY_CODE[uiCategory] ?? uiCategory.toUpperCase();

const fromCategoryCode = (code?: string): ChargeCategory => {
    if (!code) return 'Miscellaneous';
    return CATEGORY_CODE_TO_UI[code.toUpperCase()] ?? 'Miscellaneous';
};

const KNOWN_CHARGE_TYPES: ChargeType[] = ['Service', 'Product', 'Bed', 'Package', 'Procedure'];

const fromApiChargeMaster = (c: ApiChargeMaster, hospitalId: string): ChargeItem => {
    const sub = c.subCategoryCode ?? '';
    const chargeType = (KNOWN_CHARGE_TYPES as string[]).includes(sub) ? sub : 'Service';
    return {
        chargeItemId: c.chargeId,
        hospitalId,
        chargeCode: c.chargeCode,
        displayName: c.displayName ?? '',
        visitType: c.appliesTo ?? 'ANY',
        category: fromCategoryCode(c.categoryCode),
        chargeType,
        subCategoryCode: c.subCategoryCode,
        defaultQty: c.defaultQty,
        defaultRate: c.defaultRate,
        defaultDiscountPercent: c.maxDiscountPercent ?? 0,
        hsnSacCode: c.hsnSacCode,
        isTaxable: c.isTaxable,
        gstSlabPercent: c.gstSlabPercent,
        taxInclusive: c.taxInclusive,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        notes: c.notes,
        updatedAt: c.updatedAt,
        updatedBy: c.updatedBy,
    };
};

export const billingService = {
    createChargeItem: async (data: ChargeItemRequest): Promise<ChargeItemResponse> => {
        const payload: UpsertChargeMasterRequest = {
            chargeId: data.chargeItemId,
            chargeCode: data.chargeCode,
            displayName: data.displayName,
            categoryCode: toCategoryCode(String(data.category)),
            subCategoryCode: data.subCategoryCode ?? String(data.chargeType ?? 'Service'),
            appliesTo: toAppliesTo(String(data.visitType)),
            defaultRate: data.defaultRate,
            defaultQty: data.defaultQty,
            maxDiscountPercent: data.defaultDiscountPercent,
            hsnSacCode: data.hsnSacCode,
            isTaxable: data.isTaxable,
            gstSlabPercent: data.gstSlabPercent,
            taxInclusive: data.taxInclusive,
            isActive: data.isActive ?? true,
            sortOrder: data.sortOrder ?? 0,
            notes: data.notes,
        };
        const res = await ipdBillingService.upsertChargeMaster(payload);
        return {
            success: !!res.chargeId,
            message: data.chargeItemId ? 'Charge item updated successfully' : 'Charge item created successfully',
            chargeItemId: res.chargeId,
        };
    },

    getChargeItems: async (): Promise<GetChargeItemsResponse> => {
        const { useAuthStore } = await import('@/store/authStore');
        const hospitalId = useAuthStore.getState().getHospitalId() ?? '';
        const res = await ipdBillingService.listChargeMasters({ pageSize: 200 });
        return {
            success: true,
            message: 'OK',
            data: (res.items ?? []).map(c => fromApiChargeMaster(c, hospitalId)),
        };
    },

    deleteChargeItem: async (chargeItemId: string): Promise<DeleteChargeItemResponse> => {
        const res = await ipdBillingService.deleteChargeMaster(chargeItemId);
        return {
            success: !!res.isSucess,
            message: res.message ?? (res.isSucess ? 'Charge deleted successfully' : 'Failed to delete'),
        };
    },
};
