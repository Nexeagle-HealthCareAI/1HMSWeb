import { apiClient } from '@/services/axiosClient';
import { API_ENDPOINTS } from '@/app/api';

export type LeadSource = 'DoctorDekho' | 'WhatsApp';
export type LeadType = 'DoctorNameSearch' | 'HospitalNameSearch' | 'DoctorProfileView' | 'HospitalPageView';

export interface HospitalLead {
    leadId: string;
    doctorId?: string | null;
    doctorName?: string | null;
    source: LeadSource;
    leadType: LeadType;
    searchQuery?: string | null;
    mobile?: string | null;
    patientName?: string | null;
    country?: string | null;
    region?: string | null;
    city?: string | null;
    occurredAt: string;
}

export interface GetHospitalLeadsResponse {
    success: boolean;
    message?: string;
    leads: HospitalLead[];
    page: number;
    pageSize: number;
    totalCount: number;
    // Respect the date-window filter but not source/leadType (those ARE the breakdown) -- see
    // the backend's own comment on GetHospitalLeadsResponseModel.
    countBySource: Record<string, number>;
    countByType: Record<string, number>;
}

export interface GetHospitalLeadsFilters {
    page?: number;
    pageSize?: number;
    source?: LeadSource;
    leadType?: LeadType;
    dateFrom?: string;
    dateTo?: string;
}

export const leadsApi = {
    getHospitalLeads: async (hospitalId: string, filters?: GetHospitalLeadsFilters): Promise<GetHospitalLeadsResponse> => {
        const endpoint = API_ENDPOINTS.LEADS.GET_LEADS(hospitalId, filters);
        return apiClient.get<GetHospitalLeadsResponse>(endpoint);
    },
};
