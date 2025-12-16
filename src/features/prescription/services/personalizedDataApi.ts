import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export type PersonalizedLookupType =
  | 'CHIEF_COMPLAINT'
  | 'HISTORY'
  | 'COMORBIDITY'
  | 'EXAMINATION'
  | 'DIAGNOSIS'
  | 'INVESTIGATION'
  | 'PROCEDURE'
  | 'MEDICATION';

export interface PersonalizedDataPayload {
  personalId: string | null;
  name: string;
  code: string;
  shortDesc: string;
  synonyms: string;
}

export interface PersonalizedDataResponse extends Partial<PersonalizedDataPayload> {
  id?: string;
  usageCount?: number;
  createdAt?: string;
  modifiedAt?: string;
}

const normalizeList = (data: any, fallbackKey: string): PersonalizedDataResponse[] => {
  const items = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  return items.map((item: any, idx: number) => ({
    id: item?.id ?? item?.personalId ?? item?.code ?? item?.name ?? `${fallbackKey}-${idx}`,
    personalId: item?.personalId ?? null,
    name: item?.name ?? '',
    code: item?.code ?? '',
    shortDesc: item?.shortDesc ?? '',
    synonyms: item?.synonyms ?? '',
    usageCount: typeof item?.usageCount === 'number' ? item.usageCount : 0,
    createdAt: item?.createdAt ?? '',
    modifiedAt: item?.modifiedAt ?? '',
  }));
};

export const personalizedDataApi = {
  async upsert(
    doctorId: string,
    hospitalId: string,
    lookupType: PersonalizedLookupType,
    payload: PersonalizedDataPayload
  ) {
    return apiClient.put(
      API_ENDPOINTS.E_PRESCRIPTION.PERSONALIZED_DATA(doctorId, hospitalId, lookupType),
      payload
    );
  },

  async remove(
    doctorId: string,
    hospitalId: string,
    personalId: string
  ) {
    const url = `${API_ENDPOINTS.E_PRESCRIPTION.PERSONALIZED_DATA(doctorId, hospitalId)}&personalId=${encodeURIComponent(personalId)}`;
    return apiClient.delete(url);
  },

  async list(
    doctorId: string,
    hospitalId: string,
    lookupType: PersonalizedLookupType
  ): Promise<PersonalizedDataResponse[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.E_PRESCRIPTION.PERSONALIZED_DATA(doctorId, hospitalId, lookupType)
    );
    return normalizeList(response, lookupType);
  },
};
