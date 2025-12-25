import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export interface PersonalizedMedicinePayload {
  genericName: string;
  brandName: string;
  form: string;
  strengthValue: string;
  strengthUnit: string;
  route: string;
  dose: string;
  indication: string;
  notes: string;
  medicineId: string;
  usageDescription?: string;
  sideEffects?: string;
}

export interface PersonalizedMedicineResponse extends Partial<PersonalizedMedicinePayload> {
  prefferedId?: number | string;
  usageCount?: number;
  lastModifiedAt?: string;
  modifiedAt?: string;
}

const normalizeList = (data: any): PersonalizedMedicineResponse[] => {
  const items = Array.isArray(data?.preferredMedicines)
    ? data.preferredMedicines
    : Array.isArray(data?.data?.preferredMedicines)
      ? data.data.preferredMedicines
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

  return items.map((item: any, idx: number) => ({
    prefferedId: item?.prefferedId ?? item?.medicineId ?? idx,
    genericName: item?.genericName ?? '',
    brandName: item?.brandName ?? '',
    form: item?.form ?? '',
    strengthValue: item?.strengthValue ?? '',
    strengthUnit: item?.strengthUnit ?? '',
    route: item?.route ?? '',
    dose: item?.dose ?? '',
    indication: item?.indication ?? '',
    notes: item?.notes ?? '',
    medicineId: item?.medicineId ?? '',
    usageDescription: item?.usageDescription ?? '',
    sideEffects: item?.sideEffects ?? '',
    usageCount: typeof item?.usageCount === 'number' ? item.usageCount : 0,
    lastModifiedAt: item?.lastModifiedAt ?? '',
    modifiedAt: item?.modifiedAt ?? item?.lastModifiedAt ?? '',
  }));
};

export const personalizedMedicineApi = {
  async upsert(
    doctorId: string,
    hospitalId: string,
    payload: PersonalizedMedicinePayload,
    prefferedId: number | string | null
  ) {
    // New endpoint expects the identifiers in the body, not as query params
    return apiClient.put(API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE, {
      preferrredId: prefferedId ?? null,
      doctorId,
      hospitalId,
      medicine: payload,
    });
  },

  async remove(doctorId: string, hospitalId: string, preferredId: number | string) {
    return apiClient.delete(API_ENDPOINTS.E_PRESCRIPTION.MEDICINE_DOCTOR_PREFERENCE, {
      data: {
        preferredId,
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
