import { apiClient } from '@/services/axiosClient';
import { useAuthStore } from '@/store/authStore';

export interface DoctorFeeRow {
    doctorId: string;
    doctorName?: string | null;
    departmentName?: string | null;
    opdConsultFee: number;
    ipdVisitFee: number;
    emergencyFee: number;
    // OPD_CONSULT only. Days a follow-up stays free after a paid visit. 0 = no free window,
    // every visit is chargeable.
    freeFollowUpDays: number;
}

export interface GetDoctorFeesResponse {
    items: DoctorFeeRow[];
}

export interface UpsertDoctorFeeRequest {
    doctorId: string;
    opdConsultFee: number;
    ipdVisitFee: number;
    emergencyFee: number;
    freeFollowUpDays: number;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const doctorFeeService = {
    list: (hospitalId?: string): Promise<GetDoctorFeesResponse> =>
        apiClient.get(`/doctor-fees?hospitalId=${encodeURIComponent(hospitalIdOrThrow(hospitalId))}`),

    upsert: (req: UpsertDoctorFeeRequest, hospitalId?: string): Promise<{ isSuccess: boolean; message?: string }> =>
        apiClient.put(`/doctor-fees?hospitalId=${encodeURIComponent(hospitalIdOrThrow(hospitalId))}`, req),
};
