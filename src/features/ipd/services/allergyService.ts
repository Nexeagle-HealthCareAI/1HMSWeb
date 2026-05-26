import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type AllergyType = 'DRUG' | 'FOOD' | 'ENVIRONMENT' | 'OTHER';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'ANAPHYLAXIS';
export type InteractionSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
export type OverallSeverity = 'NONE' | InteractionSeverity;

export interface PatientAllergy {
    patientAllergyId: string;
    allergyType: AllergyType | string;
    allergen: string;
    severity: AllergySeverity | string;
    reaction?: string;
    notes?: string;
    onsetDate?: string;
    isActive: boolean;
    createdAt: string;
    createdBy?: string;
}

export interface AddPatientAllergyRequest {
    hospitalId?: string;
    patientId: string;
    allergyType: AllergyType | string;
    allergen: string;
    severity: AllergySeverity | string;
    reaction?: string;
    notes?: string;
    onsetDate?: string;
}

export interface AddPatientAllergyResponse {
    success: boolean;
    message?: string;
    patientAllergyId?: string;
}

export interface DeactivatePatientAllergyRequest {
    hospitalId?: string;
    patientAllergyId: string;
}

export interface DeactivatePatientAllergyResponse {
    success: boolean;
    message?: string;
}

export interface GetPatientAllergiesResponse {
    success: boolean;
    message?: string;
    items: PatientAllergy[];
}

export interface AllergyHit {
    patientAllergyId: string;
    allergen: string;
    severity: AllergySeverity | string;
    reaction?: string;
    drugName: string;
    medicationOrderId?: string;
}

export interface InteractionHit {
    drugInteractionId: string;
    drugA: string;
    drugB: string;
    severity: InteractionSeverity | string;
    effect?: string;
    management?: string;
    orderIdA?: string;
    orderIdB?: string;
}

export interface CheckMedicationSafetyResponse {
    success: boolean;
    message?: string;
    overallSeverity: OverallSeverity | string;
    allergyHits: AllergyHit[];
    interactionHits: InteractionHit[];
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const allergyService = {
    add: (req: AddPatientAllergyRequest): Promise<AddPatientAllergyResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MEDICATION.ADD_ALLERGY, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    list: (patientId: string, includeInactive = false, hospitalId?: string): Promise<GetPatientAllergiesResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MEDICATION.LIST_ALLERGIES(hospitalIdOrThrow(hospitalId), patientId, includeInactive)),

    deactivate: (req: DeactivatePatientAllergyRequest): Promise<DeactivatePatientAllergyResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.MEDICATION.DEACTIVATE_ALLERGY, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    checkSafety: (
        admissionId: string,
        opts?: { proposedDrugName?: string; proposedGenericName?: string; includeExistingOrders?: boolean; hospitalId?: string },
    ): Promise<CheckMedicationSafetyResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.MEDICATION.CHECK_SAFETY(
            hospitalIdOrThrow(opts?.hospitalId),
            admissionId,
            opts?.proposedDrugName,
            opts?.proposedGenericName,
            opts?.includeExistingOrders ?? true,
        )),
};
