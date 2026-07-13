import { apiClient } from '@/services/axiosClient';

export interface HospitalDoctorItem {
    doctorId: string;
    fullName?: string | null;
    departmentName?: string | null;
    isPubliclyListed: boolean;
}

export interface GetHospitalDoctorsResponse {
    success: boolean;
    message?: string | null;
    doctors: HospitalDoctorItem[];
}

export interface UpdateDoctorPublicListingResponse {
    success: boolean;
    message?: string | null;
}

// Doctor roster for the public-directory toggle list — reuses the same GET doctors/hospital
// endpoint the IPD admitting-consultant picker uses (see admissionApi.ts), now also returning
// isPubliclyListed per doctor.
export const publicDirectoryDoctorsApi = {
    list: (hospitalId: string): Promise<GetHospitalDoctorsResponse> =>
        apiClient.get(`/doctors/hospital?hospitalId=${encodeURIComponent(hospitalId)}`),

    updatePublicListing: (
        hospitalId: string,
        doctorId: string,
        isPubliclyListed: boolean
    ): Promise<UpdateDoctorPublicListingResponse> =>
        apiClient.patch(`/doctors/public-listing?hospitalId=${encodeURIComponent(hospitalId)}`, {
            doctorId,
            isPubliclyListed,
        }),
};
