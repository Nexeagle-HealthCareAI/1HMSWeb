import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface PersonalizedMedicinePayload {
  preferrredId?: number;
  doctorId: string;
  hospitalId: string;
  medicine: {
    medicineName: string;
    manufacturer?: string;
    genericName: string;
    brandName: string;
    dosageForm: string;
    strength: string;
    price: number;
    usageDescription?: string;
    sideEffects?: string;
    notes?: string;
  };
}

export interface PersonalizedMedicineResponse {
  prefferedId: number;
  medicineName: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  usageDescription: string;
  sideEffects: string;
  price: number;
  notes: string;
  isActive: boolean;
  usageCount: number;
  lastModifiedAt: string;
  lastModifiedBy?: string;

  // Frontend compat fields (computed during normalization)
  form?: string;
}

const normalizeList = (data: any): PersonalizedMedicineResponse[] => {
  const items = Array.isArray(data?.preferredMedicines)
    ? data.preferredMedicines
    : Array.isArray(data?.data?.preferredMedicines)
      ? data.data.preferredMedicines
      : Array.isArray(data)
        ? data
        : [];

  return items.map((item: any) => ({
    prefferedId: item?.prefferedId ?? 0,
    medicineName: item?.medicineName ?? '',
    brandName: item?.brandName ?? '',
    genericName: item?.genericName ?? '',
    manufacturer: item?.manufacturer ?? '',
    dosageForm: item?.dosageForm ?? '',
    strength: item?.strength ?? '',
    usageDescription: item?.usageDescription ?? '',
    sideEffects: item?.sideEffects ?? '',
    price: typeof item?.price === 'number' ? item.price : 0,
    notes: item?.notes ?? '',
    isActive: item?.isActive ?? true,
    usageCount: typeof item?.usageCount === 'number' ? item.usageCount : 0,
    lastModifiedAt: item?.lastModifiedAt ?? '',

    // Mappings for frontend compatibility
    form: item?.dosageForm ?? '',
    strengthValue: item?.strength ?? '', // Map strength string to value
    strengthUnit: '', // No separate unit in new API
    route: '', // Not in new API
    dose: '', // Not in new API
    indication: '', // Not in new API
    medicineId: String(item?.prefferedId ?? ''),
  }));
};

export const personalizedMedicineApi = {
  async upsert(
    doctorId: string,
    hospitalId: string,
    payload: any, // Accepting loose payload to map to new structure
    prefferedId: number | string | null
  ) {
    // Construct the strict payload required by the new API
    const apiPayload: PersonalizedMedicinePayload = {
      doctorId,
      hospitalId,
      medicine: {
        medicineName: payload.medicineName || payload.genericName || payload.brandName || 'Medicine',
        manufacturer: payload.manufacturer || '',
        genericName: payload.genericName || '',
        brandName: payload.brandName || '',
        dosageForm: payload.form || payload.dosageForm || '',
        strength: payload.strength || `${payload.strengthValue || ''} ${payload.strengthUnit || ''}`.trim(),
        price: Number(payload.price || 0),
        usageDescription: payload.usageDescription || '',
        sideEffects: payload.sideEffects || '',
        notes: payload.notes || '',
      }
    };

    if (prefferedId) {
      apiPayload.preferrredId = Number(prefferedId);
    }

    return apiClient.put(API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE, apiPayload);
  },

  async remove(doctorId: string, hospitalId: string, preferredId: number | string) {
    return apiClient.delete(API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE, {
      data: {
        preferredId: Number(preferredId),
        doctorId,
        hospitalId,
      },
    });
  },

  async list(
    doctorId: string,
    hospitalId: string,
  ): Promise<PersonalizedMedicineResponse[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE_LIST(doctorId, hospitalId)
    );
    return normalizeList(response);
  },
};

