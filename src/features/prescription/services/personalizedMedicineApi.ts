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
}

export interface PersonalizedMedicineResponse extends Partial<PersonalizedMedicinePayload> {
  prefferedId?: number | string;
  usageCount?: number;
  lastModifiedAt?: string;
  modifiedAt?: string;
}

const normalizeList = (data: any): PersonalizedMedicineResponse[] => {
  const items = Array.isArray(data?.data)
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
    const baseUrl = API_ENDPOINTS.E_PRESCRIPTION.PERSONALIZED_MEDICINE(doctorId, hospitalId);
    const url = `${baseUrl}?preferrredId=${encodeURIComponent(prefferedId ?? 'null')}`;
    return apiClient.put(url, payload);
  },

  async list(
    doctorId: string,
    hospitalId: string,
  ): Promise<PersonalizedMedicineResponse[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.E_PRESCRIPTION.PERSONALIZED_MEDICINE(doctorId, hospitalId)
    );
    return normalizeList(response);
  },
};
